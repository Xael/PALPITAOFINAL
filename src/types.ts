export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  totalPoints: number;
  role?: 'admin' | 'user';
  isBanned?: boolean;
  isDeleted?: boolean;
}

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  group?: string;
  date: string;
  location?: string;
  scoreA?: number;
  scoreB?: number;
  status: 'pending' | 'in_progress' | 'finished';
}

export interface Bet {
  userId: string;
  matchId: string;
  scoreA: number;
  scoreB: number;
  pointsEarned?: number;
}

export interface CallupBet {
  userId: string;
  players: Record<string, string>; // positionId -> playerName
  updatedAt: string;
  pointsAwarded?: number;
}

export interface CallupPlayer {
  name: string;
  position: 'Goleiro' | 'Defensor' | 'Meio-campista' | 'Atacante';
  club: string;
  photoUrl?: string;
}

export interface OfficialCallup {
  players: string[];
  updatedAt: string;
  isFinalized: boolean;
}

export interface SystemStats {
  totalVisits: number;
  geminiRequests: number;
  lastUpdate: string;
}
