// Client-side API caller to handle all requests securely with the private Express server.
import { UserProfile, Match, Bet, CallupBet, OfficialCallup, SystemStats } from './types';

const API_BASE = '/api';

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface AuthResponse {
  token: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  };
  profile: UserProfile;
}

export const api = {
  async register(email: string, displayName: string, password_hash: string, photoURL?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName, password: password_hash, photoURL }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro de registro' }));
      throw new Error(err.error || 'Erro ao registrar usuário');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  async login(email: string, password_hash: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: password_hash }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro de login' }));
      throw new Error(err.error || 'E-mail ou senha inválidos.');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  logout() {
    localStorage.removeItem('token');
  },

  async getMe(): Promise<{ user: any; profile: UserProfile } | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        localStorage.removeItem('token');
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  },

  async getMatches(): Promise<Match[]> {
    const res = await fetch(`${API_BASE}/matches`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Não foi possível carregar as partidas');
    return await res.json();
  },

  async getBets(): Promise<Record<string, Bet>> {
    const res = await fetch(`${API_BASE}/bets/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Não foi possível carregar seus palpites');
    return await res.json();
  },

  async getUserBets(userId: string): Promise<Record<string, Bet>> {
    const res = await fetch(`${API_BASE}/bets/user/${userId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Não foi possível carregar os palpites do usuário');
    return await res.json();
  },

  async saveBet(matchId: string, scoreA: number, scoreB: number): Promise<Bet> {
    const res = await fetch(`${API_BASE}/bets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ matchId, scoreA, scoreB }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao registrar palpite');
    }
    return await res.json();
  },

  async updateMatch(matchId: string, scoreA: number, scoreB: number, teamA: string, teamB: string, finalize: boolean): Promise<Match> {
    const res = await fetch(`${API_BASE}/matches/${matchId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ scoreA, scoreB, teamA, teamB, finalize }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao salvar partida');
    }
    return await res.json();
  },

  async getLeaderboard(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/users/leaderboard`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Não foi possível carregar o ranking');
    return await res.json();
  },

  async getAdminUsers(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Não foi possível carregar usuários administradamente');
    return await res.json();
  },

  async banUser(userId: string, ban: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ isBanned: ban }),
    });
    if (!res.ok) throw new Error('Erro ao banir usuário');
    return await res.json();
  },

  async deleteUser(userId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao excluir usuário');
    return await res.json();
  },

  async updateProfile(displayName: string, photoURL?: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ displayName, photoURL }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao salvar perfil');
    }
    return await res.json();
  },

  async getCallup(): Promise<CallupBet | null> {
    const res = await fetch(`${API_BASE}/callups/me`, { headers: getHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Não foi possível obter sua convocação');
    return await res.json();
  },

  async saveCallup(players: Record<string, string>): Promise<CallupBet> {
    const res = await fetch(`${API_BASE}/callups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ players }),
    });
    if (!res.ok) throw new Error('Erro ao salvar convocação');
    return await res.json();
  },

  async getOfficialCallup(): Promise<OfficialCallup> {
    const res = await fetch(`${API_BASE}/config/official_callup`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Não foi possível obter a convocação oficial');
    return await res.json();
  },

  async saveOfficialCallup(players: string[], finalize: boolean): Promise<OfficialCallup> {
    const res = await fetch(`${API_BASE}/config/official_callup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ players, finalize }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao salvar convocação oficial');
    }
    return await res.json();
  },

  async getStats(): Promise<SystemStats> {
    const res = await fetch(`${API_BASE}/system/stats`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao carregar estatísticas do sistema');
    return await res.json();
  },

  async syncWithGemini(): Promise<{ updatedCount: number }> {
    const res = await fetch(`${API_BASE}/matches/sync-gemini`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro de sincronização com a IA');
    }
    return await res.json();
  },

  async resetAll(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/reset`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao resetar banco');
    return await res.json();
  },
};
