import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

import {
  initDb,
  getUser,
  createUser,
  updateProfile,
  getMatches,
  updateMatch,
  getBets,
  getAllBetsForMatch,
  saveBet,
  updateBetPoints,
  updateUserPoints,
  getLeaderboard,
  getAdminUsersList,
  banUser,
  deleteUser,
  getCallupBet,
  saveCallupBet,
  getAllCallupBets,
  updateCallupAwarded,
  getOfficialCallupConfig,
  saveOfficialCallupConfig,
  getSystemStats,
  incrementVisits,
  incrementGeminiRequests,
  resetAllData
} from './server/db';
import { Match, Bet, OfficialCallup } from './src/types';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'palpitao-copa-2026-super-secret-key-13579';

app.use(express.json());

// Helper for JWT signatures
function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

// Authentication Middleware
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const userProfile = await getUser(payload.userId);
    
    if (!userProfile) {
      return res.status(404).json({ error: 'Usuário não encontrado no banco' });
    }
    
    if (userProfile.isBanned) {
      return res.status(403).json({ error: 'Sua conta foi banida do sistema.' });
    }
    
    req.userId = payload.userId;
    req.user = {
      uid: userProfile.uid,
      displayName: userProfile.displayName,
      email: userProfile.email,
      photoURL: userProfile.photoURL
    };
    req.profile = userProfile;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

// Admin only check
function requireAdmin(req: any, res: any, next: any) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Operação restrita a administradores' });
  }
  next();
}

// API Routes

// Logged User Status
app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  res.json({
    user: req.user,
    profile: req.profile
  });
});

// Authentication Register
app.post('/api/auth/register', async (req, res) => {
  const { email, displayName, password, photoURL } = req.body;

  if (!email || !displayName || !password) {
    return res.status(400).json({ error: 'Todos os campos (e-mail, nome, senha) são obrigatórios.' });
  }

  try {
    const existing = await getUser(email);
    if (existing) {
      return res.status(400).json({ error: 'Este endereço de e-mail já está sendo utilizado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = 'u_' + Math.random().toString(36).substring(2, 11);
    
    // Auto-admin rule matching Alex's original configuration or environment setting
    const adminEmail = process.env.ADMIN_EMAIL || 'alexblbn@gmail.com';
    const isFirstAdmin = email.toLowerCase() === adminEmail.toLowerCase();
    const role = isFirstAdmin ? 'admin' : 'user';

    const profile = await createUser(id, email.toLowerCase(), displayName, passwordHash, photoURL, role);
    const token = generateToken(id);

    res.json({
      token,
      user: {
        uid: id,
        email,
        displayName,
        photoURL
      },
      profile
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Erro interno durante o cadastro.' });
  }
});

// Authentication Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const userProfile = await getUser(email.toLowerCase());
    if (!userProfile) {
      return res.status(400).json({ error: 'Nenhuma conta encontrada com este e-mail.' });
    }

    if (userProfile.isBanned) {
      return res.status(403).json({ error: 'Sua conta foi banida do sistema.' });
    }

    const isMatch = await bcrypt.compare(password, userProfile.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Senha incorreta. Tente novamente.' });
    }

    const token = generateToken(userProfile.uid);
    res.json({
      token,
      user: {
        uid: userProfile.uid,
        email: userProfile.email,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL
      },
      profile: {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        totalPoints: userProfile.totalPoints,
        role: userProfile.role,
        isBanned: userProfile.isBanned,
        isDeleted: userProfile.isDeleted
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});

// Update Profile
app.put('/api/users/profile', authenticateToken, async (req: any, res) => {
  const { displayName, photoURL } = req.body;
  if (!displayName) {
    return res.status(400).json({ error: 'Nome de exibição é obrigatório' });
  }

  try {
    const updated = await updateProfile(req.userId, displayName, photoURL);
    res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar perfil' });
  }
});

// Matches list
app.get('/api/matches', authenticateToken, async (req, res) => {
  try {
    const data = await getMatches();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar partidas' });
  }
});

// Match update (admin)
app.put('/api/matches/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { scoreA, scoreB, teamA, teamB, finalize } = req.body;

  try {
    const matchesList = await getMatches();
    const match = matchesList.find(m => m.id === id);
    if (!match) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }

    const isFinishingFirstTime = finalize && match.status !== 'finished';
    const finalStatus = finalize ? 'finished' : match.status;

    await updateMatch(id, teamA, teamB, scoreA, scoreB, finalStatus);

    if (isFinishingFirstTime) {
      console.log(`Finalizando partida ${id} (${teamA} vs ${teamB}) e recalculando pontos...`);
      const bets = await getAllBetsForMatch(id);
      
      const realA = scoreA;
      const realB = scoreB;
      const winnerActual = realA > realB ? 'A' : realA < realB ? 'B' : 'Draw';

      for (const bet of bets) {
        let points = 0;
        const winnerBet = bet.scoreA > bet.scoreB ? 'A' : bet.scoreA < bet.scoreB ? 'B' : 'Draw';

        if (bet.scoreA === realA && bet.scoreB === realB) {
          points = 20; 
        } else if (winnerActual !== 'Draw' && winnerActual === winnerBet && (realA - realB === bet.scoreA - bet.scoreB)) {
          points = 15; // Winner + Goal Difference
        } else if (winnerActual === 'Draw' && winnerBet === 'Draw') {
          points = 12; // Draw (different score)
        } else if (winnerActual === winnerBet) {
          points = 10; // Winner only
        } else if (bet.scoreA === realA || bet.scoreB === realB) {
          points = 5; // One side's score correct
        }

        await updateBetPoints(bet.userId, id, points);
        await updateUserPoints(bet.userId, points);
      }
    }

    const updatedMatches = await getMatches();
    res.json(updatedMatches.find(m => m.id === id));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao salvar partida' });
  }
});

// Bets for logged user
app.get('/api/bets/me', authenticateToken, async (req: any, res) => {
  try {
    const bets = await getBets(req.userId);
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar palpites' });
  }
});

// Bets for a specific user (UserProfileModal)
app.get('/api/bets/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const bets = await getBets(userId);
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar palpites do usuário' });
  }
});

// Post a Bet
app.post('/api/bets', authenticateToken, async (req: any, res) => {
  const { matchId, scoreA, scoreB } = req.body;

  if (scoreA === undefined || scoreB === undefined || isNaN(scoreA) || isNaN(scoreB)) {
    return res.status(400).json({ error: 'Placares inválidos.' });
  }

  try {
    const matchesList = await getMatches();
    const match = matchesList.find(m => m.id === matchId);
    if (!match) {
      return res.status(404).json({ error: 'Partida não encontrada.' });
    }

    // Verify kick-off limit: 1h prior to game window
    const kickOffTime = new Date(match.date).getTime();
    const now = Date.now();
    const oneHour = 1 * 60 * 60 * 1000;

    if (kickOffTime - now < oneHour) {
      return res.status(400).json({ error: 'O prazo limite de palpites encerrou (limite de 24 horas antes do início da partida).' });
    }

    if (match.status !== 'pending') {
      return res.status(400).json({ error: 'A partida já iniciou ou foi finalizada. Não é possível alterar palpites.' });
    }

    const saved = await saveBet(req.userId, matchId, parseInt(scoreA), parseInt(scoreB));
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao registrar palpite.' });
  }
});

// Callup selections (me)
app.get('/api/callups/me', authenticateToken, async (req: any, res) => {
  try {
    const callup = await getCallupBet(req.userId);
    if (!callup) {
      return res.status(404).json({ error: 'Sem palpites de escalação salvos' });
    }
    res.json(callup);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter sua escalação' });
  }
});

// Save Callup
app.post('/api/callups', authenticateToken, async (req: any, res) => {
  const { players } = req.body;
  if (!players || typeof players !== 'object') {
    return res.status(400).json({ error: 'Lista de jogadores inválida' });
  }

  try {
    const config = await getOfficialCallupConfig();
    if (config?.isFinalized) {
      return res.status(400).json({ error: 'A convocação oficial já foi consolidada e o prazo de alteração expirou.' });
    }

    await saveCallupBet(req.userId, players);
    const updated = await getCallupBet(req.userId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar escalação' });
  }
});

// Official callup fetch
app.get('/api/config/official_callup', authenticateToken, async (req, res) => {
  try {
    const data = await getOfficialCallupConfig();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter convocação oficial' });
  }
});

// Save official callup (admin)
app.post('/api/config/official_callup', authenticateToken, requireAdmin, async (req, res) => {
  const { players, finalize } = req.body;

  try {
    const currentConfig = await getOfficialCallupConfig();
    if (finalize && currentConfig?.isFinalized) {
      return res.status(400).json({ error: 'Contabilidade de pontos já foi executada para essa convocação.' });
    }

    const updatedValue: OfficialCallup = {
      players,
      updatedAt: new Date().toISOString(),
      isFinalized: finalize
    };

    await saveOfficialCallupConfig(updatedValue);

    if (finalize) {
      console.log('Fechando convocação da Copa e creditando acertos dos usuários...');
      
      const normalize = (str: string) => {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
      };

      const isPlayerMatch = (predicted: string, official: string) => {
        const p = normalize(predicted);
        const o = normalize(official);
        if (!p || !o) return false;
        return p.includes(o) || o.includes(p);
      };

      const callups = await getAllCallupBets();
      for (const callup of callups) {
        let points = 0;
        const predictedPlayers = Object.values(callup.players);
        
        predictedPlayers.forEach(predicted => {
          const isCorrect = players.some((official: string) => isPlayerMatch(predicted, official));
          if (isCorrect) points += 1;
        });

        await updateCallupAwarded(callup.userId, points);
        await updateUserPoints(callup.userId, points);
      }
    }

    res.json(await getOfficialCallupConfig());
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao salvar convocação' });
  }
});

// Leaderboard / Ranking
app.get('/api/users/leaderboard', authenticateToken, async (req, res) => {
  try {
    const rank = await getLeaderboard();
    res.json(rank);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar ranking' });
  }
});

// Admin list users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersList = await getAdminUsersList();
    res.json(usersList);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter usuários' });
  }
});

// Admin ban user
app.post('/api/admin/users/:userId/ban', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { isBanned } = req.body;

  try {
    await banUser(userId, isBanned);
    res.json({ success: true, isBanned });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar banimento' });
  }
});

// Admin delete user
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    await deleteUser(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Visits / stats tracking
app.get('/api/system/stats', authenticateToken, async (req: any, res) => {
  try {
    // Record visit if requested once in session
    if (req.query.trackVisit === 'true') {
      await incrementVisits();
    }
    const stats = await getSystemStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Erro' });
  }
});

// Gemini score synchronization proxy (admin only)
app.post('/api/matches/sync-gemini', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Chave GEMINI_API_KEY não configurada no servidor próprio.' });
    }

    const allMatches = await getMatches();
    const activeMatches = allMatches.filter(m => m.status !== 'finished');

    if (activeMatches.length === 0) {
      return res.json({ updatedCount: 0, message: 'Não há partidas ativas para sincronizar.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';
    
    // Process matches in batches of 5
    const batchSize = 5;
    let updatedCount = 0;

    for (let i = 0; i < activeMatches.length; i += batchSize) {
      const currentBatch = activeMatches.slice(i, i + batchSize);
      const matchesList = currentBatch.map(m => `- ${m.teamA} vs ${m.teamB} (ID: ${m.id})`).join('\n');

      const prompt = `Você é um assistente de atualização de banco de dados esportivo. Sua tarefa é verificar o status e o placar em tempo real dos seguintes jogos da Copa do Mundo 2026. Utilize a ferramenta Google Search para obter os dados oficiais de hoje.
      
      Jogos para verificar:
      ${matchesList}

      Responda rigorosamente apenas um JSON que seja um array de objetos: [{"match_id": string, "time_a": string, "gols_a": number, "time_b": string, "gols_b": number, "status": "Encerrado" | "Em andamento" | "Não iniciado"}]`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        },
      });

      await incrementGeminiRequests();

      try {
        const results = JSON.parse(response.text || '');
        if (Array.isArray(results)) {
          for (const result of results) {
            const match = activeMatches.find(m => m.id === result.match_id);
            if (match) {
              if (result.status === 'Encerrado') {
                // Reuse admin calculation endpoint details
                await updateMatch(match.id, match.teamA, match.teamB, result.gols_a, result.gols_b, 'finished');
                
                // Recalculate
                const bets = await getAllBetsForMatch(match.id);
                const realA = result.gols_a;
                const realB = result.gols_b;
                const winnerActual = realA > realB ? 'A' : realA < realB ? 'B' : 'Draw';

                for (const bet of bets) {
                  let points = 0;
                  const winnerBet = bet.scoreA > bet.scoreB ? 'A' : bet.scoreA < bet.scoreB ? 'B' : 'Draw';

                  if (bet.scoreA === realA && bet.scoreB === realB) {
                    points = 20; 
                  } else if (winnerActual !== 'Draw' && winnerActual === winnerBet && (realA - realB === bet.scoreA - bet.scoreB)) {
                    points = 15;
                  } else if (winnerActual === 'Draw' && winnerBet === 'Draw') {
                    points = 12;
                  } else if (winnerActual === winnerBet) {
                    points = 10;
                  } else if (bet.scoreA === realA || bet.scoreB === realB) {
                    points = 5;
                  }

                  await updateBetPoints(bet.userId, match.id, points);
                  await updateUserPoints(bet.userId, points);
                }
                updatedCount++;
              } else if (result.status === 'Em andamento') {
                await updateMatch(match.id, match.teamA, match.teamB, result.gols_a, result.gols_b, 'in_progress');
                updatedCount++;
              }
            }
          }
        }
      } catch (errInner) {
        console.error('Error parsing sync gemini json batch:', errInner);
      }
    }

    res.json({ updatedCount });
  } catch (err: any) {
    console.error('IA sync error:', err);
    res.status(500).json({ error: err.message || 'Erro ao sincronizar com Gemini AI' });
  }
});

// Admin Reset Data
app.post('/api/admin/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await resetAllData();
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao resetar aplicativo' });
  }
});

// === MIDDLEWARE DE SERVIDORES DE VITE/DIST ===

async function startServer() {
  // Initialize Database schemas & connection string triggers
  await initDb();

  // Vite development or production compiled static loaders
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FULLSTACK] Servidor próprio ativo rodando na porta ${PORT}`);
  });
}

startServer();
