import { Pool } from 'pg';
import { UserProfile, Match, Bet, CallupBet, OfficialCallup, SystemStats } from '../src/types';
import { WORLD_CUP_MATCHES } from '../src/constants';

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

let pool: Pool | null = null;
let useMemoryFallback = false;

// Dual-mode memory store
const memoryDb = {
  users: [] as Array<UserProfile & { passwordHash: string; email: string; created_at: string }>,
  matches: [...WORLD_CUP_MATCHES] as Match[],
  bets: [] as Bet[],
  callups: [] as CallupBet[],
  config: {
    official_callup: {
      players: [] as string[],
      updatedAt: new Date().toISOString(),
      isFinalized: false
    } as OfficialCallup
  } as Record<string, any>,
  stats: {
    totalVisits: 0,
    geminiRequests: 0,
    lastUpdate: new Date().toISOString()
  } as SystemStats
};

// Initialize PostgreSQL Pool if connection string is present
if (connectionString) {
  console.log('PostgreSQL DATABASE_URL encontrado. Inicializando banco...');
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false } // Required for external Postgres on Render/Neon/Cloud SQL
  });
} else {
  console.log('--- AVISO ---');
  console.log(' DATABASE_URL não declarada em .env.');
  console.log(' Rodando em modo de Armazenamento Volátil Em Memória para desenvolvimento.');
  console.log(' Ao publicar no Coolify, declare a variável DATABASE_URL nas configurações para persistência total!');
  console.log('-------------');
  useMemoryFallback = true;
}

export async function initDb() {
  if (useMemoryFallback || !pool) return;

  try {
    const client = await pool.connect();
    console.log('Conectado ao PostgreSQL com sucesso.');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        photo_url TEXT,
        total_points INT DEFAULT 0,
        role VARCHAR(50) DEFAULT 'user',
        is_banned BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create matches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id VARCHAR(50) PRIMARY KEY,
        team_a VARCHAR(100) NOT NULL,
        team_b VARCHAR(100) NOT NULL,
        group_name VARCHAR(100),
        match_date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        score_a INT,
        score_b INT,
        status VARCHAR(50) DEFAULT 'pending'
      )
    `);

    // Create bets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bets (
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        match_id VARCHAR(50) REFERENCES matches(id) ON DELETE CASCADE,
        score_a INT NOT NULL,
        score_b INT NOT NULL,
        points_earned INT DEFAULT 0,
        PRIMARY KEY (user_id, match_id)
      )
    `);

    // Create callup_bets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS callup_bets (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        players JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        points_awarded INT DEFAULT 0
      )
    `);

    // Create config table
    await client.query(`
      CREATE TABLE IF NOT EXISTS config (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL
      )
    `);

    // Create stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_stats (
        key VARCHAR(100) PRIMARY KEY,
        total_visits INT DEFAULT 0,
        gemini_requests INT DEFAULT 0,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed matches if empty
    const { rows: matchCount } = await client.query('SELECT COUNT(*) FROM matches');
    if (parseInt(matchCount[0].count) === 0) {
      console.log('Semeando tabela de partidas com a tabela oficial da Copa 2026...');
      for (const m of WORLD_CUP_MATCHES) {
        await client.query(
          `INSERT INTO matches (id, team_a, team_b, group_name, match_date, location, score_a, score_b, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [m.id, m.teamA, m.teamB, m.group || '', m.date, m.location || '', m.scoreA ?? null, m.scoreB ?? null, m.status]
        );
      }
    }

    // Seed config default official callup if empty
    const { rows: configCount } = await client.query('SELECT COUNT(*) FROM config WHERE key = $1', ['official_callup']);
    if (parseInt(configCount[0].count) === 0) {
      await client.query('INSERT INTO config (key, value) VALUES ($1, $2)', [
        'official_callup',
        JSON.stringify({ players: [], updatedAt: new Date().toISOString(), isFinalized: false })
      ]);
    }

    // Seed stats if empty
    const { rows: statsCount } = await client.query('SELECT COUNT(*) FROM system_stats WHERE key = $1', ['stats']);
    if (parseInt(statsCount[0].count) === 0) {
      await client.query('INSERT INTO system_stats (key, total_visits, gemini_requests, last_update) VALUES ($1, $2, $3, $4)', [
        'stats',
        0,
        0,
        new Date().toISOString()
      ]);
    }

    client.release();
    console.log('Provisionamento de banco de dados concluído.');
  } catch (err) {
    console.error('Erro crítico ao inicializar o PostgreSQL:', err);
    console.log('Habilitando fallback em memória automático para manter o servidor de pé.');
    useMemoryFallback = true;
  }
}

// === DATABASE ACTIONS ===

export async function getUser(emailOrId: string) {
  if (useMemoryFallback || !pool) {
    return memoryDb.users.find(u => u.uid === emailOrId || u.email === emailOrId) || null;
  }
  const { rows } = await pool.query(
    'SELECT id as uid, email, display_name, password_hash, photo_url, total_points, role, is_banned, is_deleted FROM users WHERE id = $1 OR email = $2',
    [emailOrId, emailOrId]
  );
  if (rows.length === 0) return null;
  const u = rows[0];
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.display_name,
    passwordHash: u.password_hash,
    photoURL: u.photo_url,
    totalPoints: u.total_points,
    role: u.role,
    isBanned: u.is_banned,
    isDeleted: u.is_deleted
  };
}

export async function createUser(id: string, email: string, displayName: string, passwordHash: string, photoURL?: string, role: 'admin' | 'user' = 'user') {
  if (useMemoryFallback || !pool) {
    const newUser = {
      uid: id,
      email,
      displayName,
      passwordHash,
      photoURL,
      totalPoints: 0,
      role,
      isBanned: false,
      isDeleted: false,
      created_at: new Date().toISOString()
    };
    memoryDb.users.push(newUser);
    return {
      uid: id,
      displayName,
      photoURL,
      totalPoints: 0,
      role,
      isBanned: false,
      isDeleted: false
    };
  }

  await pool.query(
    'INSERT INTO users (id, email, display_name, password_hash, photo_url, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, email, displayName, passwordHash, photoURL || null, role]
  );

  return {
    uid: id,
    displayName,
    photoURL,
    totalPoints: 0,
    role,
    isBanned: false,
    isDeleted: false
  };
}

export async function updateProfile(uid: string, displayName: string, photoURL?: string) {
  if (useMemoryFallback || !pool) {
    const user = memoryDb.users.find(u => u.uid === uid);
    if (user) {
      user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;
      return user;
    }
    throw new Error('Usuário não encontrado');
  }

  await pool.query(
    `UPDATE users SET display_name = $1${photoURL ? ', photo_url = $2' : ''} WHERE id = $${photoURL ? '3' : '2'}`,
    photoURL ? [displayName, photoURL, uid] : [displayName, uid]
  );

  return getUser(uid);
}

export async function getMatches(): Promise<Match[]> {
  if (useMemoryFallback || !pool) {
    return memoryDb.matches;
  }
  const { rows } = await pool.query('SELECT * FROM matches ORDER BY match_date ASC');
  return rows.map(r => ({
    id: r.id,
    teamA: r.team_a,
    teamB: r.team_b,
    group: r.group_name,
    date: r.match_date.toISOString(),
    location: r.location,
    scoreA: r.score_a !== null ? r.score_a : undefined,
    scoreB: r.score_b !== null ? r.score_b : undefined,
    status: r.status
  }));
}

export async function updateMatch(id: string, teamA: string, teamB: string, scoreA: number | undefined, scoreB: number | undefined, status: string) {
  if (useMemoryFallback || !pool) {
    const match = memoryDb.matches.find(m => m.id === id);
    if (match) {
      match.teamA = teamA;
      match.teamB = teamB;
      match.scoreA = scoreA;
      match.scoreB = scoreB;
      match.status = status as any;
      return match;
    }
    throw new Error('Partida inexistente');
  }

  await pool.query(
    'UPDATE matches SET team_a = $1, team_b = $2, score_a = $3, score_b = $4, status = $5 WHERE id = $6',
    [teamA, teamB, scoreA ?? null, scoreB ?? null, status, id]
  );
  return true;
}

export async function getBets(userId: string): Promise<Record<string, Bet>> {
  if (useMemoryFallback || !pool) {
    const list = memoryDb.bets.filter(b => b.userId === userId);
    return list.reduce((acc, cur) => {
      acc[cur.matchId] = cur;
      return acc;
    }, {} as Record<string, Bet>);
  }

  const { rows } = await pool.query('SELECT * FROM bets WHERE user_id = $1', [userId]);
  return rows.reduce((acc, r) => {
    acc[r.match_id] = {
      userId: r.user_id,
      matchId: r.match_id,
      scoreA: r.score_a,
      scoreB: r.score_b,
      pointsEarned: r.points_earned !== null ? r.points_earned : undefined
    };
    return acc;
  }, {} as Record<string, Bet>);
}

export async function getAllBetsForMatch(matchId: string): Promise<Bet[]> {
  if (useMemoryFallback || !pool) {
    return memoryDb.bets.filter(b => b.matchId === matchId);
  }
  const { rows } = await pool.query('SELECT * FROM bets WHERE match_id = $1', [matchId]);
  return rows.map(r => ({
    userId: r.user_id,
    matchId: r.match_id,
    scoreA: r.score_a,
    scoreB: r.score_b,
    pointsEarned: r.points_earned
  }));
}

export async function saveBet(userId: string, matchId: string, scoreA: number, scoreB: number) {
  if (useMemoryFallback || !pool) {
    const existing = memoryDb.bets.find(b => b.userId === userId && b.matchId === matchId);
    if (existing) {
      existing.scoreA = scoreA;
      existing.scoreB = scoreB;
    } else {
      memoryDb.bets.push({ userId, matchId, scoreA, scoreB });
    }
    return { userId, matchId, scoreA, scoreB };
  }

  await pool.query(
    `INSERT INTO bets (user_id, match_id, score_a, score_b) 
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, match_id) 
     DO UPDATE SET score_a = EXCLUDED.score_a, score_b = EXCLUDED.score_b`,
    [userId, matchId, scoreA, scoreB]
  );
  return { userId, matchId, scoreA, scoreB };
}

export async function updateBetPoints(userId: string, matchId: string, pointsEarned: number) {
  if (useMemoryFallback || !pool) {
    const bet = memoryDb.bets.find(b => b.userId === userId && b.matchId === matchId);
    if (bet) bet.pointsEarned = pointsEarned;
    return;
  }
  await pool.query('UPDATE bets SET points_earned = $1 WHERE user_id = $2 AND match_id = $3', [pointsEarned, userId, matchId]);
}

export async function updateUserPoints(userId: string, pointsToAdd: number) {
  if (useMemoryFallback || !pool) {
    const u = memoryDb.users.find(x => x.uid === userId);
    if (u) u.totalPoints += pointsToAdd;
    return;
  }
  await pool.query('UPDATE users SET total_points = total_points + $1 WHERE id = $2', [pointsToAdd, userId]);
}

export async function getLeaderboard(): Promise<UserProfile[]> {
  if (useMemoryFallback || !pool) {
    return memoryDb.users
      .filter(u => !u.isDeleted)
      .map(u => ({
        uid: u.uid,
        displayName: u.displayName,
        photoURL: u.photoURL,
        totalPoints: u.totalPoints,
        role: u.role as any,
        isBanned: u.isBanned,
        isDeleted: u.isDeleted
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  const { rows } = await pool.query(
    'SELECT id as uid, display_name, photo_url, total_points, role, is_banned, is_deleted FROM users WHERE is_deleted = false ORDER BY total_points DESC, display_name ASC LIMIT 100'
  );
  return rows.map(u => ({
    uid: u.uid,
    displayName: u.display_name,
    photoURL: u.photo_url || undefined,
    totalPoints: u.total_points,
    role: u.role,
    isBanned: u.is_banned,
    isDeleted: u.is_deleted
  }));
}

export async function getAdminUsersList(): Promise<UserProfile[]> {
  if (useMemoryFallback || !pool) {
    return memoryDb.users.map(u => ({
      uid: u.uid,
      displayName: u.displayName,
      photoURL: u.photoURL,
      totalPoints: u.totalPoints,
      role: u.role as any,
      isBanned: u.isBanned,
      isDeleted: u.isDeleted
    }));
  }

  const { rows } = await pool.query(
    'SELECT id as uid, display_name, photo_url, total_points, role, is_banned, is_deleted FROM users ORDER BY display_name ASC'
  );
  return rows.map(u => ({
    uid: u.uid,
    displayName: u.display_name,
    photoURL: u.photo_url || undefined,
    totalPoints: u.total_points,
    role: u.role,
    isBanned: u.is_banned,
    isDeleted: u.is_deleted
  }));
}

export async function banUser(userId: string, isBanned: boolean) {
  if (useMemoryFallback || !pool) {
    const user = memoryDb.users.find(u => u.uid === userId);
    if (user) user.isBanned = isBanned;
    return;
  }
  await pool.query('UPDATE users SET is_banned = $1 WHERE id = $2', [isBanned, userId]);
}

export async function deleteUser(userId: string) {
  if (useMemoryFallback || !pool) {
    const user = memoryDb.users.find(u => u.uid === userId);
    if (user) {
      user.isDeleted = true;
    }
    // Delete data
    memoryDb.bets = memoryDb.bets.filter(b => b.userId !== userId);
    memoryDb.callups = memoryDb.callups.filter(c => c.userId !== userId);
    return;
  }

  await pool.query('UPDATE users SET is_deleted = true, total_points = 0 WHERE id = $1', [userId]);
  await pool.query('DELETE FROM bets WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM callup_bets WHERE user_id = $1', [userId]);
}

export async function getCallupBet(userId: string): Promise<CallupBet | null> {
  if (useMemoryFallback || !pool) {
    return memoryDb.callups.find(c => c.userId === userId) || null;
  }
  const { rows } = await pool.query('SELECT * FROM callup_bets WHERE user_id = $1', [userId]);
  if (rows.length === 0) return null;
  return {
    userId: rows[0].user_id,
    players: rows[0].players,
    updatedAt: rows[0].updated_at.toISOString(),
    pointsAwarded: rows[0].points_awarded !== null ? rows[0].points_awarded : undefined
  };
}

export async function saveCallupBet(userId: string, players: Record<string, string>) {
  if (useMemoryFallback || !pool) {
    const existing = memoryDb.callups.find(c => c.userId === userId);
    if (existing) {
      existing.players = players;
      existing.updatedAt = new Date().toISOString();
    } else {
      memoryDb.callups.push({
        userId,
        players,
        updatedAt: new Date().toISOString()
      });
    }
    return;
  }

  await pool.query(
    `INSERT INTO callup_bets (user_id, players, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET players = EXCLUDED.players, updated_at = EXCLUDED.updated_at`,
    [userId, JSON.stringify(players), new Date().toISOString()]
  );
}

export async function getAllCallupBets(): Promise<CallupBet[]> {
  if (useMemoryFallback || !pool) {
    return memoryDb.callups;
  }
  const { rows } = await pool.query('SELECT * FROM callup_bets');
  return rows.map(r => ({
    userId: r.user_id,
    players: r.players,
    updatedAt: r.updated_at.toISOString(),
    pointsAwarded: r.points_awarded
  }));
}

export async function updateCallupAwarded(userId: string, points: number) {
  if (useMemoryFallback || !pool) {
    const c = memoryDb.callups.find(x => x.userId === userId);
    if (c) c.pointsAwarded = points;
    return;
  }
  await pool.query('UPDATE callup_bets SET points_awarded = $1 WHERE user_id = $2', [points, userId]);
}

export async function getOfficialCallupConfig(): Promise<OfficialCallup> {
  if (useMemoryFallback || !pool) {
    return memoryDb.config.official_callup;
  }
  const { rows } = await pool.query('SELECT value FROM config WHERE key = $1', ['official_callup']);
  if (rows.length === 0) {
    return { players: [], updatedAt: new Date().toISOString(), isFinalized: false };
  }
  return rows[0].value;
}

export async function saveOfficialCallupConfig(value: OfficialCallup) {
  if (useMemoryFallback || !pool) {
    memoryDb.config.official_callup = value;
    return;
  }
  await pool.query(
    'INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    ['official_callup', JSON.stringify(value)]
  );
}

export async function getSystemStats(): Promise<SystemStats> {
  if (useMemoryFallback || !pool) {
    return memoryDb.stats;
  }
  const { rows } = await pool.query('SELECT * FROM system_stats WHERE key = $1', ['stats']);
  if (rows.length === 0) {
    return { totalVisits: 0, geminiRequests: 0, lastUpdate: new Date().toISOString() };
  }
  return {
    totalVisits: rows[0].total_visits,
    geminiRequests: rows[0].gemini_requests,
    lastUpdate: rows[0].last_update.toISOString()
  };
}

export async function incrementVisits() {
  if (useMemoryFallback || !pool) {
    memoryDb.stats.totalVisits++;
    memoryDb.stats.lastUpdate = new Date().toISOString();
    return;
  }
  await pool.query('UPDATE system_stats SET total_visits = total_visits + 1, last_update = NOW() WHERE key = $1', ['stats']);
}

export async function incrementGeminiRequests() {
  if (useMemoryFallback || !pool) {
    memoryDb.stats.geminiRequests++;
    memoryDb.stats.lastUpdate = new Date().toISOString();
    return;
  }
  await pool.query('UPDATE system_stats SET gemini_requests = gemini_requests + 1, last_update = NOW() WHERE key = $1', ['stats']);
}

export async function resetAllData() {
  if (useMemoryFallback || !pool) {
    memoryDb.bets = [];
    memoryDb.callups = [];
    memoryDb.config.official_callup = {
      players: [],
      updatedAt: new Date().toISOString(),
      isFinalized: false
    };
    memoryDb.users.forEach(u => u.totalPoints = 0);
    memoryDb.matches.forEach(m => {
      delete m.scoreA;
      delete m.scoreB;
      m.status = 'pending';
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM bets');
    await client.query('UPDATE users SET total_points = 0');
    await client.query('UPDATE matches SET score_a = NULL, score_b = NULL, status = \'pending\'');
    await client.query('DELETE FROM callup_bets');
    await client.query('UPDATE config SET value = $1 WHERE key = $2', [
      JSON.stringify({ players: [], updatedAt: new Date().toISOString(), isFinalized: false }),
      'official_callup'
    ]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
