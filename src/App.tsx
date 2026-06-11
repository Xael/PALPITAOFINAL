/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  User, 
  LogOut, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  TrendingUp, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Search,
  CheckSquare,
  Plus,
  Trash2,
  RotateCcw,
  Info,
  ExternalLink,
  MapPin,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './api';
import { UserProfile, Match, Bet, CallupBet, CallupPlayer, OfficialCallup, SystemStats } from './types';
import { WORLD_CUP_MATCHES, COUNTRY_CODES, BRAZIL_PLAYERS, FIXED_THIRD_ASSIGNMENTS } from './constants';
import * as XLSX from 'xlsx';
import { SimulationTab } from './SimulationTab';

const PHASES = [
  { id: 'groups', name: 'Fase de Grupos' },
  { id: 'R32', name: '32-avos de Final' },
  { id: 'R16', name: 'Oitavas de Final' },
  { id: 'QF', name: 'Quartas de Final' },
  { id: 'SF', name: 'Semifinais' },
  { id: '3RD', name: '3º Lugar' },
  { id: 'FINAL', name: 'Final' }
];

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function UserProfileModal({ user, matches, onClose }: { user: UserProfile, matches: Match[], onClose: () => void }) {
  const [userBets, setUserBets] = useState<Record<string, Bet>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const betsMap = await api.getUserBets(user.uid);
        setUserBets(betsMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBets();
  }, [user.uid]);

  const finishedMatches = matches.filter(m => m.status === 'finished');

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-4">
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="" 
              className="w-16 h-16 rounded-full border-2 border-yellow-500 shadow-lg shadow-yellow-500/20"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-tight">{user.displayName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-yellow-500 font-black">{user.totalPoints} PONTOS</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Histórico de Palpites</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-800 rounded-2xl transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full"
              />
            </div>
          ) : finishedMatches.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-slate-800 mx-auto mb-4 opacity-20" />
              <p className="text-slate-500 font-bold uppercase italic tracking-widest">Nenhum jogo finalizado ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {finishedMatches.map(match => {
                const bet = userBets[match.id];
                return (
                  <div key={match.id} className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center -space-x-2">
                        <img src={`https://flagcdn.com/w40/${COUNTRY_CODES[match.teamA]}.png`} className="w-8 h-6 object-cover rounded border border-slate-800" alt="" referrerPolicy="no-referrer" />
                        <img src={`https://flagcdn.com/w40/${COUNTRY_CODES[match.teamB]}.png`} className="w-8 h-6 object-cover rounded border border-slate-800" alt="" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white uppercase tracking-tighter">{match.teamA} x {match.teamB}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Oficial: {match.scoreA} - {match.scoreB}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-1">Palpite</span>
                        <div className="flex items-center gap-2">
                          {bet ? (
                            <span className="text-lg font-black text-white font-mono">{bet.scoreA} - {bet.scoreB}</span>
                          ) : (
                            <span className="text-xs text-slate-700 font-bold uppercase">Sem palpite</span>
                          )}
                        </div>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${bet?.pointsEarned ? (bet.pointsEarned >= 15 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500') : 'bg-slate-800 text-slate-600'}`}>
                        <span className="text-lg font-black font-mono leading-none">{bet?.pointsEarned || 0}</span>
                        <span className="text-[8px] font-black uppercase tracking-tighter">pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const CALLUP_SLOTS = [
  { id: 'gk1', pos: 'Goleiro', label: 'Goleiro 1' },
  { id: 'gk2', pos: 'Goleiro', label: 'Goleiro 2' },
  { id: 'gk3', pos: 'Goleiro', label: 'Goleiro 3' },
  { id: 'df1', pos: 'Defensor', label: 'Defensor 1' },
  { id: 'df2', pos: 'Defensor', label: 'Defensor 2' },
  { id: 'df3', pos: 'Defensor', label: 'Defensor 3' },
  { id: 'df4', pos: 'Defensor', label: 'Defensor 4' },
  { id: 'df5', pos: 'Defensor', label: 'Defensor 5' },
  { id: 'df6', pos: 'Defensor', label: 'Defensor 6' },
  { id: 'df7', pos: 'Defensor', label: 'Defensor 7' },
  { id: 'df8', pos: 'Defensor', label: 'Defensor 8' },
  { id: 'mf1', pos: 'Meio-campista', label: 'Meio-campista 1' },
  { id: 'mf2', pos: 'Meio-campista', label: 'Meio-campista 2' },
  { id: 'mf3', pos: 'Meio-campista', label: 'Meio-campista 3' },
  { id: 'mf4', pos: 'Meio-campista', label: 'Meio-campista 4' },
  { id: 'mf5', pos: 'Meio-campista', label: 'Meio-campista 5' },
  { id: 'mf6', pos: 'Meio-campista', label: 'Meio-campista 6' },
  { id: 'fw1', pos: 'Atacante', label: 'Atacante 1' },
  { id: 'fw2', pos: 'Atacante', label: 'Atacante 2' },
  { id: 'fw3', pos: 'Atacante', label: 'Atacante 3' },
  { id: 'fw4', pos: 'Atacante', label: 'Atacante 4' },
  { id: 'fw5', pos: 'Atacante', label: 'Atacante 5' },
  { id: 'fw6', pos: 'Atacante', label: 'Atacante 6' },
];

function ConvocacaoTab({ userId, currentBet, officialCallup, onSave }: { userId: string, currentBet: CallupBet | null, officialCallup: OfficialCallup | null, onSave: (players: Record<string, string>) => void }) {
  const [selections, setSelections] = useState<Record<string, string>>(currentBet?.players || {});
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const deadline = new Date('2026-05-18T00:00:00Z');
  const isTooLate = new Date() > deadline;

  const handleSelect = (playerName: string) => {
    if (!activeSlot) return;
    setSelections(prev => ({ ...prev, [activeSlot]: playerName }));
    setActiveSlot(null);
    setSearchTerm('');
  };

  const activeSlotInfo = CALLUP_SLOTS.find(s => s.id === activeSlot);
  const selectedPlayerNames = Object.values(selections);
  const filteredPlayers = BRAZIL_PLAYERS.filter(p => 
    p.position === activeSlotInfo?.pos && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!selectedPlayerNames.includes(p.name) || selections[activeSlot as string] === p.name)
  );

  const isOfficial = !!officialCallup;
  const displayedSelections = (isOfficial && !currentBet) ? officialCallup.players : selections;

  const getSlotClass = (slotId: string, baseColor: string) => {
    const playerName = displayedSelections[slotId];
    if (!playerName) {
      return `bg-slate-900/80 border-slate-700 text-slate-500 hover:border-yellow-500`;
    }
    if (isOfficial) {
      if (currentBet) {
        const isHit = Object.values(officialCallup.players).includes(playerName);
        return isHit ? `bg-green-600 border-green-400 text-white` : `bg-red-900/50 border-red-500/50 text-slate-300`;
      } else {
        return `bg-blue-600 border-blue-400 text-white`;
      }
    }
    return baseColor;
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <MapPin className="w-32 h-32 text-yellow-500" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-block px-4 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Enquete Oficial</div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
            Lista de <span className="text-yellow-500">Convocação</span>
          </h2>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            {isOfficial ? (
              currentBet ? (
                <>Convocação oficial divulgada! Os jogadores em <span className="text-green-400 font-bold">verde</span> são os que você acertou e em <span className="text-red-400 font-bold">vermelho</span> os que você errou. Prazo encerrado.</>
              ) : (
                <>Convocação oficial divulgada! Como você não participou, estamos exibindo a lista oficial abaixo. Prazo encerrado.</>
              )
            ) : isTooLate ? (
              <>Prazo encerrado. Aguarde a divulgação da lista oficial de convocados!</>
            ) : (
              <>Quem Carlo Ancelotti levará para a Copa? Acerte os convocados e ganhe <span className="text-white font-bold">1 ponto extra</span> por cada acerto! Prazo limite: <span className="text-red-500 font-bold">17 de Maio de 2026</span>.</>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pitch Visualization */}
        <div className="lg:col-span-2 bg-green-900/20 rounded-[3rem] border-4 border-slate-800 p-8 relative min-h-[600px] flex flex-col justify-between overflow-hidden">
          {/* Pitch Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-white rounded-b-3xl" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-white rounded-t-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-full" />
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white" />
          </div>

          <div className="relative z-10 flex flex-col gap-12">
            {/* Goleiros */}
            <div className="flex justify-center gap-4">
              {CALLUP_SLOTS.filter(s => s.pos === 'Goleiro').map(slot => (
                <button 
                  key={slot.id}
                  disabled={isTooLate || isOfficial}
                  onClick={() => setActiveSlot(slot.id)}
                  className={`w-24 h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 text-center group ${getSlotClass(slot.id, 'bg-yellow-500 border-yellow-400 text-slate-950')}`}
                >
                  {displayedSelections[slot.id] ? (
                    <>
                      <div className="w-10 h-10 bg-slate-950/20 rounded-full flex items-center justify-center mb-1 overflow-hidden">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayedSelections[slot.id])}&background=1e293b&color=cbd5e1&bold=true`} 
                          alt={displayedSelections[slot.id]} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[10px] font-black uppercase leading-tight truncate w-full">{displayedSelections[slot.id]}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-6 h-6 mb-1 opacity-20 group-hover:opacity-100" />
                      <span className="text-[8px] font-black uppercase tracking-widest">{slot.label}</span>
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Defensores */}
            <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
              {CALLUP_SLOTS.filter(s => s.pos === 'Defensor').map(slot => (
                <button 
                  key={slot.id}
                  disabled={isTooLate || isOfficial}
                  onClick={() => setActiveSlot(slot.id)}
                  className={`w-20 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 text-center group ${getSlotClass(slot.id, 'bg-blue-600 border-blue-400 text-white')}`}
                >
                  {displayedSelections[slot.id] ? (
                    <>
                      <div className="w-8 h-8 rounded-full overflow-hidden mb-1 border border-white/20">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayedSelections[slot.id])}&background=1e293b&color=cbd5e1&bold=true`} 
                          alt={displayedSelections[slot.id]} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[9px] font-black uppercase leading-tight truncate w-full">{displayedSelections[slot.id]}</span>
                    </>
                  ) : (
                    <span className="text-[8px] font-black uppercase tracking-widest">{slot.label}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Meio-campistas */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              {CALLUP_SLOTS.filter(s => s.pos === 'Meio-campista').map(slot => (
                <button 
                  key={slot.id}
                  disabled={isTooLate || isOfficial}
                  onClick={() => setActiveSlot(slot.id)}
                  className={`w-20 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 text-center group ${getSlotClass(slot.id, 'bg-green-600 border-green-400 text-white')}`}
                >
                  {displayedSelections[slot.id] ? (
                    <>
                      <div className="w-8 h-8 rounded-full overflow-hidden mb-1 border border-white/20">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayedSelections[slot.id])}&background=1e293b&color=cbd5e1&bold=true`} 
                          alt={displayedSelections[slot.id]} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[9px] font-black uppercase leading-tight truncate w-full">{displayedSelections[slot.id]}</span>
                    </>
                  ) : (
                    <span className="text-[8px] font-black uppercase tracking-widest">{slot.label}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Atacantes */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              {CALLUP_SLOTS.filter(s => s.pos === 'Atacante').map(slot => (
                <button 
                  key={slot.id}
                  disabled={isTooLate || isOfficial}
                  onClick={() => setActiveSlot(slot.id)}
                  className={`w-20 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 text-center group ${getSlotClass(slot.id, 'bg-red-600 border-red-400 text-white')}`}
                >
                  {displayedSelections[slot.id] ? (
                    <>
                      <div className="w-8 h-8 rounded-full overflow-hidden mb-1 border border-white/20">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayedSelections[slot.id])}&background=1e293b&color=cbd5e1&bold=true`} 
                          alt={displayedSelections[slot.id]} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[9px] font-black uppercase leading-tight truncate w-full">{displayedSelections[slot.id]}</span>
                    </>
                  ) : (
                    <span className="text-[8px] font-black uppercase tracking-widest">{slot.label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar / Controls */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8">
            <h3 className="text-xl font-black text-white uppercase italic mb-6">{isOfficial ? 'Pontuação' : 'Progresso'}</h3>
            <div className="space-y-4">
              {['Goleiro', 'Defensor', 'Meio-campista', 'Atacante'].map(pos => {
                const total = CALLUP_SLOTS.filter(s => s.pos === pos).length;
                let selected = 0;
                let hits = 0;
                
                CALLUP_SLOTS.filter(s => s.pos === pos).forEach(s => {
                  if (selections[s.id]) selected++;
                  if (isOfficial && currentBet && selections[s.id]) {
                    if (Object.values(officialCallup.players).includes(selections[s.id])) {
                      hits++;
                    }
                  } else if (isOfficial && !currentBet && displayedSelections[s.id]) {
                    // Just count as full if there's no bet and we show official list
                    hits++;
                  }
                });

                const value = isOfficial ? hits : selected;
                const percentage = (value / total) * 100;

                return (
                  <div key={pos}>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span className="text-slate-500">{pos}s {isOfficial && currentBet && '- Acertos'}</span>
                      <span className="text-white">{value}/{total}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full ${pos === 'Goleiro' ? 'bg-yellow-500' : pos === 'Defensor' ? 'bg-blue-500' : pos === 'Meio-campista' ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!isOfficial && !isTooLate && (
              <button 
                onClick={() => onSave(selections)}
                disabled={Object.keys(selections).length === 0}
                className="w-full mt-8 py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salvar Lista
              </button>
            )}
            {(isOfficial || isTooLate) && (
              <div className="mt-8 p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  {isOfficial ? (currentBet ? 'Convocação Finalizada' : 'Você não participou') : 'Prazo Encerrado'}
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-6 h-6 text-blue-500" />
              <h4 className="font-black text-white uppercase italic">Como funciona?</h4>
            </div>
            <ul className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <li>• Selecione 23 jogadores para a lista final.</li>
              <li>• Cada acerto na lista oficial vale 1 ponto.</li>
              <li>• Você pode alterar sua lista até 17/05/2026.</li>
              <li>• Selecione apenas entre os jogadores da lista oficial prévia.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Player Selector Modal */}
      <AnimatePresence>
        {activeSlot && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSlot(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full flex flex-col max-h-[80vh]"
            >
              <h3 className="text-2xl font-black text-white uppercase italic mb-6">Selecionar {activeSlotInfo?.pos}</h3>
              
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Buscar jogador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:border-yellow-500 outline-none transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filteredPlayers.map(player => (
                  <button 
                    key={player.name}
                    onClick={() => handleSelect(player.name)}
                    className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white group-hover:text-yellow-500 transition-colors">{player.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-black">{player.club}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-all" />
                  </button>
                ))}
              </div>

              <button 
                onClick={() => {
                  setSelections(prev => {
                    const next = { ...prev };
                    delete next[activeSlot];
                    return next;
                  });
                  setActiveSlot(null);
                }}
                className="mt-6 py-3 text-red-500 font-bold uppercase text-xs hover:bg-red-500/10 rounded-xl transition-all"
              >
                Remover Seleção
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
function calculateStandings(matches: Match[], group: string) {
  const groupMatches = matches.filter(m => m.group === group && m.status === 'finished');
  const teams: Record<string, { name: string, mp: number, w: number, d: number, l: number, gf: number, ga: number, pts: number }> = {};

  // Initialize teams from all matches in this group (even if not finished)
  matches.filter(m => m.group === group).forEach(m => {
    if (!teams[m.teamA]) teams[m.teamA] = { name: m.teamA, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    if (!teams[m.teamB]) teams[m.teamB] = { name: m.teamB, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  });

  groupMatches.forEach(m => {
    const sA = m.scoreA || 0;
    const sB = m.scoreB || 0;
    
    teams[m.teamA].mp++;
    teams[m.teamB].mp++;
    teams[m.teamA].gf += sA;
    teams[m.teamA].ga += sB;
    teams[m.teamB].gf += sB;
    teams[m.teamB].ga += sA;

    if (sA > sB) {
      teams[m.teamA].w++;
      teams[m.teamA].pts += 3;
      teams[m.teamB].l++;
    } else if (sA < sB) {
      teams[m.teamB].w++;
      teams[m.teamB].pts += 3;
      teams[m.teamA].l++;
    } else {
      teams[m.teamA].d++;
      teams[m.teamB].d++;
      teams[m.teamA].pts += 1;
      teams[m.teamB].pts += 1;
    }
  });

  return Object.values(teams).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });
}

function KnockoutBracket({ matches }: { matches: Match[] }) {
  const getMatch = (id: string) => matches.find(m => m.id === id);

  const MatchNode = ({ id, color }: { id: string, color?: string }) => {
    const m = getMatch(id);
    if (!m) return null;
    return (
      <div className={`p-2 rounded-xl border border-slate-800 bg-slate-900/90 text-[10px] w-36 shadow-xl ${color} transition-all hover:border-slate-600 group/node`}>
        <div className="flex justify-between font-black text-slate-500 mb-1 uppercase tracking-tighter">
          <span>{m.id.toUpperCase()}</span>
          <span className="truncate ml-1 opacity-50">{m.location.split('(')[0]}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 truncate">
              {COUNTRY_CODES[m.teamA] ? (
                <img src={`https://flagcdn.com/w20/${COUNTRY_CODES[m.teamA]}.png`} className="w-4 h-3 object-cover rounded-sm" alt="" referrerPolicy="no-referrer" />
              ) : <div className="w-4 h-3 bg-slate-800 rounded-sm flex items-center justify-center text-[6px]">⚽</div>}
              <span className="truncate text-white font-bold">{m.teamA}</span>
            </div>
            <span className="font-black text-yellow-500">{m.scoreA ?? '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 truncate">
              {COUNTRY_CODES[m.teamB] ? (
                <img src={`https://flagcdn.com/w20/${COUNTRY_CODES[m.teamB]}.png`} className="w-4 h-3 object-cover rounded-sm" alt="" referrerPolicy="no-referrer" />
              ) : <div className="w-4 h-3 bg-slate-800 rounded-sm flex items-center justify-center text-[6px]">⚽</div>}
              <span className="truncate text-white font-bold">{m.teamB}</span>
            </div>
            <span className="font-black text-yellow-500">{m.scoreB ?? '-'}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-24 p-12 bg-slate-950 rounded-[4rem] border border-slate-800 overflow-x-auto relative shadow-2xl">
      <div className="min-w-[1200px] flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Fase Eliminatória</div>
          <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">
            Chaveamento <span className="text-yellow-500">Oficial</span>
          </h3>
        </div>

        <div className="flex items-center justify-between w-full gap-8">
          {/* Pathway 1 */}
          <div className="flex items-center gap-8">
             {/* R32 */}
             <div className="flex flex-col gap-4">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center mb-2">32-avos</div>
                <MatchNode id="m74" color="border-blue-500/30" />
                <MatchNode id="m77" color="border-blue-500/30" />
                <div className="h-4" />
                <MatchNode id="m73" color="border-blue-500/30" />
                <MatchNode id="m75" color="border-blue-500/30" />
                <div className="h-4" />
                <MatchNode id="m83" color="border-pink-500/30" />
                <MatchNode id="m84" color="border-pink-500/30" />
                <div className="h-4" />
                <MatchNode id="m81" color="border-cyan-500/30" />
                <MatchNode id="m82" color="border-cyan-500/30" />
             </div>
             {/* R16 */}
             <div className="flex flex-col gap-24">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center mb-2">Oitavas</div>
                <MatchNode id="m89" color="border-blue-500/50" />
                <MatchNode id="m90" color="border-blue-500/50" />
                <MatchNode id="m93" color="border-pink-500/50" />
                <MatchNode id="m94" color="border-cyan-500/50" />
             </div>
             {/* QF */}
             <div className="flex flex-col gap-64">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center mb-2">Quartas</div>
                <MatchNode id="m97" color="border-blue-500" />
                <MatchNode id="m98" color="border-cyan-500" />
             </div>
          </div>

          {/* Center: SF, Final, Trophy */}
          <div className="flex flex-col items-center justify-center gap-12 px-8">
             <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] rounded-full" />
                <div className="w-48 h-48 flex items-center justify-center relative z-10">
                  <Trophy className="w-32 h-32 text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                </div>
             </div>

             <div className="flex flex-col items-center gap-6">
                <div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Semifinais</div>
                <div className="flex gap-4">
                   <MatchNode id="m101" color="border-purple-500" />
                   <MatchNode id="m102" color="border-purple-500" />
                </div>
             </div>

             <div className="flex flex-col items-center gap-6">
                <div className="text-[10px] font-black text-white uppercase tracking-widest">Grande Final</div>
                <MatchNode id="m104" color="border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)] bg-slate-800" />
                <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-4">3º Lugar</div>
                <MatchNode id="m103" color="border-orange-500/50" />
             </div>
          </div>

          {/* Pathway 2 */}
          <div className="flex items-center gap-8">
             {/* QF */}
             <div className="flex flex-col gap-64">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center mb-2">Quartas</div>
                <MatchNode id="m99" color="border-cyan-500" />
                <MatchNode id="m100" color="border-pink-500" />
             </div>
             {/* R16 */}
             <div className="flex flex-col gap-24">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center mb-2">Oitavas</div>
                <MatchNode id="m91" color="border-cyan-500/50" />
                <MatchNode id="m92" color="border-cyan-500/50" />
                <MatchNode id="m95" color="border-pink-500/50" />
                <MatchNode id="m96" color="border-pink-500/50" />
             </div>
             {/* R32 */}
             <div className="flex flex-col gap-4">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center mb-2">32-avos</div>
                <MatchNode id="m76" color="border-cyan-500/30" />
                <MatchNode id="m78" color="border-cyan-500/30" />
                <div className="h-4" />
                <MatchNode id="m79" color="border-cyan-500/30" />
                <MatchNode id="m80" color="border-cyan-500/30" />
                <div className="h-4" />
                <MatchNode id="m86" color="border-pink-500/30" />
                <MatchNode id="m88" color="border-pink-500/30" />
                <div className="h-4" />
                <MatchNode id="m85" color="border-pink-500/30" />
                <MatchNode id="m87" color="border-pink-500/30" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<{ uid: string; displayName: string; email: string; photoURL?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Credentials Auth States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPhotoURL, setAuthPhotoURL] = useState('');

  const logout = () => {
    api.logout();
    setUser(null);
    setProfile(null);
  };
  const [matches, setMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<Record<string, Bet>>({});
  const [ranking, setRanking] = useState<UserProfile[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'ranking' | 'admin' | 'convocacao' | 'simulacao'>('matches');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scoringExplanation, setScoringExplanation] = useState<{ title: string, description: string } | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserProfile | null>(null);
  const [callupBet, setCallupBet] = useState<CallupBet | null>(null);
  const [officialCallup, setOfficialCallup] = useState<OfficialCallup | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const targetDate = new Date('2026-06-11T16:00:00Z').getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        setCountdown(null);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown({ days, hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const finishedMatchesCount = useMemo(() => matches.filter(m => m.status === 'finished').length, [matches]);

  const getUserStatus = (points: number) => {
    if (finishedMatchesCount === 0 || points === 0) return 'Novato';
    const maxPossible = finishedMatchesCount * 20;
    const percentage = (points / maxPossible) * 100;

    if (percentage >= 75) return 'Deus do Palpite';
    if (percentage >= 65) return 'Lendário';
    if (percentage >= 55) return 'Favorito';
    if (percentage >= 45) return 'Entusiasta';
    if (percentage >= 35) return 'Chuteiro';
    if (percentage >= 20) return 'Reserva';
    if (percentage >= 5) return 'Zona de Rebaixamento';
    return 'Azarado';
  };

  // Auth listener
  useEffect(() => {
    console.log('Initializing auth listener...');
    const checkAuth = async () => {
      try {
        const session = await api.getMe();
        if (session) {
          setUser(session.user);
          setProfile(session.profile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loadAllData = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const [matchesData, betsData, leaderboardData, callupData, officialCallupData] = await Promise.all([
        api.getMatches(),
        api.getBets(),
        api.getLeaderboard(),
        api.getCallup(),
        api.getOfficialCallup()
      ]);
      
      setMatches(matchesData);
      setBets(betsData);
      setRanking(leaderboardData);
      setCallupBet(callupData);
      setOfficialCallup(officialCallupData);
      
      const isUserAdmin = leaderboardData.find(u => u.uid === localStorage.getItem('userId'))?.role === 'admin' || profile?.role === 'admin';
      if (isUserAdmin || profile?.role === 'admin') {
        const [adminUsersData, statsData] = await Promise.all([
          api.getAdminUsers(),
          api.getStats()
        ]);
        setAdminUsers(adminUsersData);
        setStats(statsData);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados:', err);
    }
  };

  // Data listeners
  useEffect(() => {
    if (!user) return;
    console.log('Setting up data loading for user:', user.uid);

    // Track visit (once per session)
    if (!sessionStorage.getItem('visited')) {
      fetch('/api/system/stats?trackVisit=true', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(data => {
          setStats(data);
        })
        .catch(err => console.error('Error tracking visit:', err));
      sessionStorage.setItem('visited', 'true');
    }

    loadAllData();

    // Pool data every 15 seconds
    const interval = setInterval(loadAllData, 15000);
    return () => clearInterval(interval);
  }, [user, profile?.role]);

  // Derived matches with automatic knockout resolution
  const resolvedMatches = useMemo(() => {
    // 1. Calculate official group standings
    const officialStandings: Record<string, string[]> = {};
    GROUPS.forEach(g => {
      const s = calculateStandings(matches, g);
      // We resolve if there's enough data (could be partial, but usually for R32 we want group end)
      officialStandings[g] = s.map(t => t.name);
    });

    const resolveTeam = (matchId: string, teamLabel: string): string => {
      const placeholders = ['1º Grupo ', '2º Grupo ', '3º ', 'Venc. Jogo ', 'Perd. Jogo '];
      if (!placeholders.some(p => teamLabel.startsWith(p))) return teamLabel;

      if (teamLabel.startsWith('1º Grupo ')) {
        const g = teamLabel.charAt(9);
        const groupMatchesFinished = matches.filter(m => m.group === g).every(m => m.status === 'finished');
        return groupMatchesFinished ? (officialStandings[g]?.[0] || teamLabel) : teamLabel;
      }
      if (teamLabel.startsWith('2º Grupo ')) {
        const g = teamLabel.charAt(9);
        const groupMatchesFinished = matches.filter(m => m.group === g).every(m => m.status === 'finished');
        return groupMatchesFinished ? (officialStandings[g]?.[1] || teamLabel) : teamLabel;
      }
      if (teamLabel.startsWith('3º ')) {
        const g = FIXED_THIRD_ASSIGNMENTS[matchId];
        if (!g) return teamLabel;
        const groupMatchesFinished = matches.filter(m => m.group === g).every(m => m.status === 'finished');
        return groupMatchesFinished ? (officialStandings[g]?.[2] || teamLabel) : teamLabel;
      }
      if (teamLabel.startsWith('Venc. Jogo ')) {
        const mId = 'm' + teamLabel.split(' ')[2];
        const m = matches.find(m => m.id === mId);
        if (m && m.status === 'finished' && m.scoreA !== undefined && m.scoreB !== undefined) {
            return m.scoreA > m.scoreB ? m.teamA : m.teamB;
        }
        return teamLabel;
      }
      if (teamLabel.startsWith('Perd. Jogo ')) {
        const mId = 'm' + teamLabel.split(' ')[2];
        const m = matches.find(m => m.id === mId);
         if (m && m.status === 'finished' && m.scoreA !== undefined && m.scoreB !== undefined) {
            return m.scoreA > m.scoreB ? m.teamB : m.teamA;
        }
        return teamLabel;
      }
      return teamLabel;
    };

    return matches.map(m => ({
      ...m,
      teamA: resolveTeam(m.id, m.teamA),
      teamB: resolveTeam(m.id, m.teamB)
    }));
  }, [matches]);

  const handleSaveBet = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!user || profile?.isDeleted) return;
    
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    try {
      await api.saveBet(matchId, scoreA, scoreB);
      const updatedBets = await api.getBets();
      setBets(updatedBets);
      setSuccessMessage('Palpite registrado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar palpite:', err);
      setError(err.message || 'Erro ao registrar seu palpite.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleAdminUpdateMatch = async (match: Match, scoreA: number, scoreB: number, teamA: string, teamB: string, finalize: boolean) => {
    if (profile?.role !== 'admin') return;
    
    setLoading(true);
    try {
      await api.updateMatch(match.id, scoreA, scoreB, teamA, teamB, finalize);
      await loadAllData();
      setSuccessMessage('Partida atualizada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao salvar partida');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (profile?.role !== 'admin') return;
    
    try {
      setShowResetConfirm(false);
      setLoading(true);
      await api.resetAll();
      await loadAllData();
      setSuccessMessage('Sistema resetado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setError('Erro ao resetar banco do aplicativo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOfficialCallup = async (players: string[], finalize: boolean) => {
    if (profile?.role !== 'admin') return;
    if (finalize && officialCallup?.isFinalized) {
      alert('A convocação já foi finalizada e os pontos já foram distribuídos.');
      return;
    }

    try {
      setLoading(true);
      const data = await api.saveOfficialCallup(players, finalize);
      setOfficialCallup(data);
      await loadAllData();
      setSuccessMessage(finalize ? 'Convocação finalizada e pontos distribuídos!' : 'Rascunho da convocação salvo!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar convocação oficial:', err);
      setError(err.message || 'Erro ao salvar convocação oficial');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncResultsWithIA = async () => {
    if (profile?.role !== 'admin') return;
    setIsSyncing(true);
    setError(null);
    try {
      const res = await api.syncWithGemini();
      await loadAllData();
      if (res.updatedCount > 0) {
        setSuccessMessage(`${res.updatedCount} resultados atualizados via IA!`);
      } else {
        setSuccessMessage('Nenhuma atualização encontrada pela IA no momento.');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao sincronizar com a IA do servidor.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRandomizeMatches = async () => {
    if (profile?.role !== 'admin') return;
    
    const pendingMatches = matches.filter(m => m.status === 'pending');
    if (pendingMatches.length === 0) {
      setError('Não há jogos pendentes para sortear.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    let count = 0;
    const toProcess = pendingMatches.slice(0, 10);
    
    for (const match of toProcess) {
      const sA = Math.floor(Math.random() * 5);
      const sB = Math.floor(Math.random() * 3);
      try {
        await api.updateMatch(match.id, sA, sB, match.teamA, match.teamB, true);
        count++;
      } catch (err) {
        console.error(err);
      }
    }

    await loadAllData();
    setLoading(false);
    setSuccessMessage(`${count} resultados sorteados com sucesso!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleBanUser = async (uid: string, ban: boolean) => {
    if (profile?.role !== 'admin' || uid === user?.uid) return;
    try {
      await api.banUser(uid, ban);
      await loadAllData();
      setSuccessMessage(`Usuário ${ban ? 'banido' : 'desbanido'} com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro no banimento.');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (profile?.role !== 'admin' || uid === user?.uid) return;
    if (!confirm('Tem certeza que deseja desativar este usuário e todos os seus palpites?')) return;
    
    try {
      setLoading(true);
      await api.deleteUser(uid);
      await loadAllData();
      setSuccessMessage('Usuário desativado com sucesso (palpites removidos).');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreUser = async (uid: string) => {
    if (profile?.role !== 'admin') return;
    if (!confirm('Deseja restaurar este usuário? Note que seus palpites anteriores foram excluídos permanentemente.')) return;
    
    try {
      setLoading(true);
      await api.banUser(uid, false); 
      await loadAllData();
      setSuccessMessage('Usuário restaurado com sucesso.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDataToExcel = async () => {
    if (profile?.role !== 'admin') return;
    
    try {
      setLoading(true);
      const [usersData, matchesData] = await Promise.all([
        api.getAdminUsers(),
        api.getMatches()
      ]);

      const userMap: Record<string, string> = {};
      usersData.forEach(u => { userMap[u.uid] = u.displayName || 'Unknown'; });

      const wb = XLSX.utils.book_new();

      // Users Sheet
      const wsUsers = XLSX.utils.json_to_sheet(usersData.map(u => ({
        ID: u.uid,
        Nome: u.displayName,
        Pontos: u.totalPoints,
        Role: u.role,
        Banido: u.isBanned ? 'Sim' : 'Não',
        Removido: u.isDeleted ? 'Sim' : 'Não'
      })));
      XLSX.utils.book_append_sheet(wb, wsUsers, "Usuários");

      // Matches Sheet
      const wsMatches = XLSX.utils.json_to_sheet(matchesData.sort((a, b) => a.id.localeCompare(b.id)).map(m => ({
        ID: m.id,
        TimeA: m.teamA,
        TimeB: m.teamB,
        GolsA: m.scoreA ?? '-',
        GolsB: m.scoreB ?? '-',
        Status: m.status === 'finished' ? 'Finalizado' : 'Pendente',
        Grupo: m.group || '-',
        Data: m.date,
        Local: m.location
      })));
      XLSX.utils.book_append_sheet(wb, wsMatches, "Jogos Oficiais");

      XLSX.writeFile(wb, `Exportacao_Palpitao_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setSuccessMessage('Planilha Excel gerada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      setError('Falha ao gerar arquivo Excel.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemBackup = async () => {
    if (profile?.role !== 'admin') return;
    
    try {
      setLoading(true);
      const [usersData, matchesData, statsData, officialCallupData] = await Promise.all([
        api.getAdminUsers(),
        api.getMatches(),
        api.getStats(),
        api.getOfficialCallup()
      ]);

      const backup = {
        timestamp: new Date().toISOString(),
        users: usersData,
        matches: matchesData,
        officialCallup: officialCallupData,
        stats: statsData
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_Sistema_Palpitao_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage('Backup de sistema (JSON) concluído!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro no backup:', err);
      setError('Falha ao realizar backup do sistema.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center max-w-md w-full animate-fade-in"
        >
          <div className="mb-8 flex justify-center">
            <div className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl shadow-2xl shadow-yellow-500/20">
              <Trophy className="w-16 h-16 text-slate-950" />
            </div>
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">
            PALPITÃO <span className="text-yellow-500">COPA 2026</span>
          </h1>
          <p className="text-slate-400 text-lg mb-6 leading-relaxed">
            A maior experiência de palpites do mundo. Desafie seus amigos, acerte os placares e conquiste o topo do mundo!
          </p>

          <div className="mb-10 p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-yellow-500/30 rounded-[2rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-yellow-500/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 text-center">
              <img 
                src="https://http2.mlstatic.com/D_NQ_NP_2X_845652-MLB108199384343_032026-F.webp" 
                alt="Troféu Copa 2026" 
                className="w-32 h-32 mx-auto mb-4 object-contain drop-shadow-[0_10px_20px_rgba(234,179,8,0.3)] transition-transform group-hover:scale-110 duration-500"
                referrerPolicy="no-referrer"
              />
              <h4 className="text-white font-black uppercase italic text-sm tracking-tighter mb-1">Grande Prêmio</h4>
              <p className="text-yellow-500 font-black text-xl uppercase italic tracking-tighter leading-tight">
                TAÇA DA COPA PERSONALIZADA <br /> COM O SEU NOME!
              </p>
              <div className="mt-3 inline-block px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Exclusivo para o 1º Lugar</span>
              </div>
            </div>
          </div>

          {/* Feedback message overlay */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold text-left flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dual authentication form */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl text-left mb-8">
            <div className="flex gap-4 border-b border-slate-800 pb-4 mb-6">
              <button 
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`pb-1 font-black uppercase text-sm italic tracking-tighter transition-colors ${authMode === 'login' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Entrar
              </button>
              <button 
                type="button"
                onClick={() => { setAuthMode('register'); setError(null); }}
                className={`pb-1 font-black uppercase text-sm italic tracking-tighter transition-colors ${authMode === 'register' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Cadastrar-se
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              try {
                if (authMode === 'login') {
                  const data = await api.login(authEmail, authPassword);
                  setUser(data.user);
                  setProfile(data.profile);
                } else {
                  if (!authDisplayName) throw new Error('Nome de exibição é obrigatório.');
                  const data = await api.register(authEmail, authDisplayName, authPassword, authPhotoURL || undefined);
                  setUser(data.user);
                  setProfile(data.profile);
                }
              } catch (err: any) {
                console.error(err);
                setError(err.message || 'Erro de autenticação.');
              } finally {
                setLoading(false);
              }
            }} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-1">Nome Completo / Apelido</label>
                  <input 
                    type="text" 
                    value={authDisplayName} 
                    onChange={e => setAuthDisplayName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-bold text-sm focus:outline-none focus:border-yellow-500"
                    placeholder="Seu nome"
                  />
                </div>
              )}
              
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-1">E-mail</label>
                <input 
                  type="email" 
                  value={authEmail} 
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-bold text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="exemplo@email.com"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-1">Senha (Mínimo 6 e-mails/caracteres)</label>
                <input 
                  type="password" 
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-bold text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="Sua senha"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-1">Link de Foto de Perfil (Opcional)</label>
                  <input 
                    type="text" 
                    value={authPhotoURL} 
                    onChange={e => setAuthPhotoURL(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-bold text-sm focus:outline-none focus:border-yellow-500"
                    placeholder="https://exemplo.com/sua-foto.jpg"
                  />
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-4 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-widest mt-6 cursor-pointer"
              >
                {authMode === 'login' ? 'Entrar no Palpitão' : 'Criar Conta Oficial'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          </div>

          <div className="flex flex-col items-center gap-2 mb-8">
            <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">Regras de Pontuação</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase italic">"clique nos pontos"</span>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl mb-8 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-white font-bold block mb-1 uppercase tracking-tighter italic">Atenção aos Palpites:</span>
                O palpite é <span className="text-yellow-500 font-bold">imutável</span> e só poderá ser adicionado uma vez com uma antecedência de <span className="text-white font-bold">24 horas antes do jogo</span>. Após este prazo, a janela para palpitar será fechada.
              </p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-4 text-slate-500 text-[10px] font-bold uppercase tracking-tighter">
            <button 
              onClick={() => setScoringExplanation({ title: '20 PLACAR EXATO', description: 'Acerte o placar exato do jogo. Esta é a pontuação máxima.' })}
              className="flex flex-col items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-slate-950 text-xs">20</div>
              <span className="text-center">Placar Exato</span>
            </button>
            <button 
              onClick={() => setScoringExplanation({ title: '15 VENC + SALDO', description: 'Acerte o vencedor e o saldo de gols exato (Ex: Apostou 2-0, foi 3-1).' })}
              className="flex flex-col items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs">15</div>
              <span className="text-center">Venc + Saldo</span>
            </button>
            <button 
              onClick={() => setScoringExplanation({ title: '12 EMPATE (ERRO PLACAR)', description: 'Acerte o empate, mas erre o placar exato (Ex: Apostou 1-1, foi 0-0).' })}
              className="flex flex-col items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs">12</div>
              <span className="text-center">Empate</span>
            </button>
            <button 
              onClick={() => setScoringExplanation({ title: '10 VENCEDOR', description: 'Acerte apenas quem venceu o jogo.' })}
              className="flex flex-col items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs">10</div>
              <span className="text-center">Vencedor</span>
            </button>
            <button 
              onClick={() => setScoringExplanation({ title: '5 CONSOLAÇÃO', description: 'Errou o vencedor, mas acertou os gols de um dos times.' })}
              className="flex flex-col items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs">5</div>
              <span className="text-center">Consolação</span>
            </button>
          </div>

          <div className="mt-8 p-5 bg-slate-900/50 border border-slate-800 rounded-2xl text-left">
            <h4 className="text-yellow-500 font-black text-xs uppercase italic mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Resumo da Pontuação
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-2">
                <span className="text-white font-bold italic">20 PTS</span>
                <span className="text-slate-400">Placar Exato</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-2">
                <span className="text-white font-bold italic">15 PTS</span>
                <span className="text-slate-400">Vencedor + Saldo de Gols</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-2">
                <span className="text-white font-bold italic">12 PTS</span>
                <span className="text-slate-400">Empate (Placar Errado)</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-2">
                <span className="text-white font-bold italic">10 PTS</span>
                <span className="text-slate-400">Apenas o Vencedor</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-white font-bold italic">5 PTS</span>
                <span className="text-slate-400">Acertou gols de 1 time (Consolação)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-left">
            <h4 className="text-blue-500 font-black text-xs uppercase italic mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Observações Importantes
            </h4>
            <ul className="text-[10px] text-slate-400 space-y-2 font-bold leading-relaxed">
              <li>• <span className="text-white">NÃO CUMULATIVO:</span> Você recebe apenas a pontuação da sua melhor faixa de acerto.</li>
              <li>• <span className="text-white">PÊNALTIS:</span> Vale apenas o resultado do tempo regulamentar + prorrogação. Gols em disputas de pênaltis não contam.</li>
            </ul>
          </div>
        </motion.div>

        {/* Scoring Explanation Modal for Guest */}
        <AnimatePresence>
          {scoringExplanation && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setScoringExplanation(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center"
              >
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-10 h-10 text-yellow-500" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic mb-4">{scoringExplanation.title}</h3>
                <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                  {scoringExplanation.description}
                </p>
                <button 
                  onClick={() => setScoringExplanation(null)}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-xl shadow-yellow-500/20"
                >
                  Entendi!
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-yellow-500 selection:text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic hidden sm:block">
              PALPITÃO <span className="text-yellow-500">2026</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setActiveTab('matches')}
              className={`font-bold transition-colors ${activeTab === 'matches' ? 'text-yellow-500' : 'text-slate-400 hover:text-white'}`}
            >
              Jogos
            </button>
            <button 
              onClick={() => setActiveTab('ranking')}
              className={`font-bold transition-colors ${activeTab === 'ranking' ? 'text-yellow-500' : 'text-slate-400 hover:text-white'}`}
            >
              Ranking
            </button>
            <button 
              onClick={() => setActiveTab('convocacao')}
              className={`font-bold transition-colors ${activeTab === 'convocacao' ? 'text-yellow-500' : 'text-slate-400 hover:text-white'}`}
            >
              Convocação
            </button>
            <button 
              onClick={() => setActiveTab('simulacao')}
              className={`font-bold transition-colors ${activeTab === 'simulacao' ? 'text-yellow-500' : 'text-slate-400 hover:text-white'}`}
            >
              Simulação
            </button>
            <button 
              onClick={() => setShowRules(true)}
              className="font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              Regras
            </button>
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`font-bold transition-colors ${activeTab === 'admin' ? 'text-yellow-500' : 'text-slate-400 hover:text-white'}`}
              >
                Admin
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-white">{profile?.displayName}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{getUserStatus(profile?.totalPoints || 0)}</span>
                <span className="text-xs text-yellow-500 font-mono">{profile?.totalPoints} pts</span>
              </div>
            </div>
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-slate-800"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={logout}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-red-500"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button 
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-900 border-b border-slate-800 overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4">
              <button 
                onClick={() => { setActiveTab('matches'); setIsMenuOpen(false); }}
                className={`p-3 rounded-xl font-bold text-left ${activeTab === 'matches' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400'}`}
              >
                Jogos
              </button>
              <button 
                onClick={() => { setActiveTab('ranking'); setIsMenuOpen(false); }}
                className={`p-3 rounded-xl font-bold text-left ${activeTab === 'ranking' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400'}`}
              >
                Ranking
              </button>
              <button 
                onClick={() => { setActiveTab('convocacao'); setIsMenuOpen(false); }}
                className={`p-3 rounded-xl font-bold text-left ${activeTab === 'convocacao' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400'}`}
              >
                Convocação
              </button>
              <button 
                onClick={() => { setActiveTab('simulacao'); setIsMenuOpen(false); }}
                className={`p-3 rounded-xl font-bold text-left ${activeTab === 'simulacao' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400'}`}
              >
                Simulação
              </button>
              <button 
                onClick={() => { setShowRules(true); setIsMenuOpen(false); }}
                className="p-3 rounded-xl font-bold text-left text-slate-400 flex items-center gap-2"
              >
                <Info className="w-4 h-4" />
                Regras de Pontuação
              </button>
              {profile?.role === 'admin' && (
                <button 
                  onClick={() => { setActiveTab('admin'); setIsMenuOpen(false); }}
                  className={`p-3 rounded-xl font-bold text-left ${activeTab === 'admin' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Admin
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'matches' && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Tabela de <span className="text-yellow-500">Jogos</span></h2>
                <p className="text-slate-400">Dê seus palpites até 24h antes de cada partida.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <div className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-yellow-500" />
                    Junho/Julho 2026
                  </div>
                </div>
              </div>
            </div>

            {countdown && (
              <div className="flex justify-center sm:-mt-6">
                <div className="inline-flex flex-col items-center bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">A Copa Começa Em</div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-4xl sm:text-5xl font-black text-white leading-none tracking-tighter">{countdown.days}</div>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Dias</div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 pb-5">:</div>
                    <div className="text-center">
                      <div className="text-4xl sm:text-5xl font-black text-white leading-none tracking-tighter">{countdown.hours.toString().padStart(2, '0')}</div>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Horas</div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 pb-5">:</div>
                    <div className="text-center">
                      <div className="text-4xl sm:text-5xl font-black text-yellow-500 leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">{countdown.minutes.toString().padStart(2, '0')}</div>
                      <div className="text-[10px] sm:text-xs font-bold text-yellow-500/70 uppercase tracking-widest mt-2">Minutos</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {PHASES.map(phase => {
              const phaseMatches = matches.filter(m => {
                if (phase.id === 'groups') return GROUPS.includes(m.group || '');
                return m.group === phase.id;
              });

              if (phaseMatches.length === 0) return null;

              return (
                <div key={phase.id} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-800" />
                    <h3 className="text-xl font-black text-yellow-500 uppercase italic tracking-widest">{phase.name}</h3>
                    <div className="h-px flex-1 bg-slate-800" />
                  </div>

                  {phase.id === 'groups' ? (
                    <div className="space-y-16">
                      {GROUPS.map(group => {
                        const groupMatches = phaseMatches.filter(m => m.group === group);
                        const standings = calculateStandings(matches, group);
                        
                        return (
                          <div key={group} className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h4 className="text-2xl font-black text-white italic">Grupo <span className="text-yellow-500">{group}</span></h4>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {groupMatches.map(match => (
                                <MatchCard 
                                  key={match.id} 
                                  match={match} 
                                  bet={bets[match.id]} 
                                  isAdmin={profile?.role === 'admin'}
                                  onSave={(sA, sB) => handleSaveBet(match.id, sA, sB)}
                                />
                              ))}
                            </div>

                            {/* Group Standings Table */}
                            <div className="mt-4 bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-800/30 text-slate-500 font-bold uppercase tracking-tighter">
                                    <th className="px-4 py-2">Pos</th>
                                    <th className="px-4 py-2">Seleção</th>
                                    <th className="px-4 py-2 text-center">P</th>
                                    <th className="px-4 py-2 text-center">J</th>
                                    <th className="px-4 py-2 text-center">V</th>
                                    <th className="px-4 py-2 text-center">E</th>
                                    <th className="px-4 py-2 text-center">D</th>
                                    <th className="px-4 py-2 text-center">GP</th>
                                    <th className="px-4 py-2 text-center">GC</th>
                                    <th className="px-4 py-2 text-center">SG</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {standings.map((team, idx) => (
                                    <tr key={team.name} className={idx < 2 ? 'bg-green-500/5' : idx === 2 ? 'bg-blue-500/5' : ''}>
                                      <td className="px-4 py-2 font-bold text-slate-400">{idx + 1}</td>
                                      <td className="px-4 py-2 font-bold text-white flex items-center gap-2">
                                        <img 
                                          src={`https://flagcdn.com/w20/${COUNTRY_CODES[team.name]}.png`} 
                                          alt="" 
                                          className="w-4 h-3 object-cover rounded-sm"
                                          referrerPolicy="no-referrer"
                                        />
                                        {team.name}
                                      </td>
                                      <td className="px-4 py-2 text-center font-black text-yellow-500">{team.pts}</td>
                                      <td className="px-4 py-2 text-center text-slate-400">{team.mp}</td>
                                      <td className="px-4 py-2 text-center text-slate-400">{team.w}</td>
                                      <td className="px-4 py-2 text-center text-slate-400">{team.d}</td>
                                      <td className="px-4 py-2 text-center text-slate-400">{team.l}</td>
                                      <td className="px-4 py-2 text-center text-slate-400">{team.gf}</td>
                                      <td className="px-4 py-2 text-center text-slate-400">{team.ga}</td>
                                      <td className="px-4 py-2 text-center text-slate-400">{team.gf - team.ga}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {phaseMatches.map(match => (
                        <MatchCard 
                          key={match.id} 
                          match={match} 
                          bet={bets[match.id]} 
                          isAdmin={profile?.role === 'admin'}
                          onSave={(sA, sB) => handleSaveBet(match.id, sA, sB)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Visual Knockout Bracket */}
            <KnockoutBracket matches={resolvedMatches} />
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-4xl font-black tracking-tight text-white uppercase italic mb-2">Ranking <span className="text-yellow-500">Geral</span></h2>
              <p className="text-slate-400">Acompanhe quem está dominando o bolão.</p>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">Posição</th>
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4 text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ranking.map((player, index) => (
                      <tr 
                        key={player.uid} 
                        onClick={() => setSelectedUserForDetails(player)}
                        className={`group hover:bg-slate-800/30 transition-colors cursor-pointer ${player.uid === user.uid ? 'bg-yellow-500/5' : ''}`}
                      >
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-2">
                            {index === 0 ? (
                              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-slate-950 font-black shadow-lg shadow-yellow-500/20">1</div>
                            ) : index === 1 ? (
                              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-slate-950 font-black shadow-lg shadow-slate-300/20">2</div>
                            ) : index === 2 ? (
                              <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-600/20">3</div>
                            ) : (
                              <span className="w-8 text-center font-mono text-slate-500">{index + 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-3">
                            <img 
                              src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.uid}`} 
                              alt="" 
                              className="w-10 h-10 rounded-full border border-slate-700"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                {player.displayName}
                                {player.uid === user.uid && <span className="text-[10px] bg-yellow-500 text-slate-950 px-1.5 py-0.5 rounded font-black uppercase">Você</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{getUserStatus(player.totalPoints || 0)}</span>
                                <span className="text-[10px] text-slate-600">Participante</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <span className="text-2xl font-black text-yellow-500 font-mono">{player.totalPoints}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'convocacao' && (
          <ConvocacaoTab 
            userId={user.uid} 
            currentBet={callupBet} 
            officialCallup={officialCallup}
            onSave={async (players) => {
              if (profile?.isDeleted) return;
              try {
                const data = await api.saveCallup(players);
                setCallupBet(data);
                setSuccessMessage('Lista de convocação salva com sucesso!');
                setTimeout(() => setSuccessMessage(null), 3000);
              } catch (err) {
                console.error(err);
                setError('Erro ao salvar sua escalação.');
                setTimeout(() => setError(null), 3000);
              }
            }} 
          />
        )}

        {activeTab === 'simulacao' && (
          <SimulationTab officialMatches={resolvedMatches} />
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Painel <span className="text-yellow-500">Admin</span></h2>
                <p className="text-slate-400">Gerencie os resultados e a convocação oficial.</p>
              </div>
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase italic tracking-tighter hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/10"
              >
                Zerar Sistema
              </button>
            </div>

            {/* System Stats & Costs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl">
                    <User className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-black uppercase italic text-sm tracking-tighter">Engajamento</h4>
                    <p className="text-2xl font-black text-white leading-none">{ranking.length} Usuários</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">Total de Visitas</span>
                    <span className="text-white font-bold">{stats?.totalVisits || 0}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">Visitantes únicos registrados via sessão.</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-yellow-500/10 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-black uppercase italic text-sm tracking-tighter">Custo IA (Gemini)</h4>
                    <p className="text-2xl font-black text-white leading-none">R$ {((stats?.geminiRequests || 0) * 0.05).toFixed(2)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between text-xs mb-1 text-slate-500">
                    <span className="font-bold uppercase tracking-widest">Hits Gemini</span>
                    <span className="font-bold">{stats?.geminiRequests || 0}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">Projeção estimada baseada em $0.01 por request.</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl border-l-4 border-l-green-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-500/10 rounded-2xl">
                    <Save className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-black uppercase italic text-sm tracking-tighter">Budget Cloud</h4>
                    <p className="text-2xl font-black text-white leading-none">FREE TIER</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">Firestore Reads/Writes</span>
                    <span className="text-green-500 font-bold">Safe</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">Uso atual dentro das cotas Spark (50k reads, 20k writes dia).</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic">Automação e Testes</h3>
                  <p className="text-xs text-slate-500">Sincronize resultados reais ou gere dados aleatórios para teste.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleRandomizeMatches}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl font-black uppercase italic tracking-tighter transition-all shadow-xl shadow-yellow-500/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Sortear Resultados
                  </button>
                  <button 
                    onClick={handleSyncResultsWithIA}
                    disabled={isSyncing}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black uppercase italic tracking-tighter transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
                  >
                    {isSyncing ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Sincronizar Resultados (IA)
                      </>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 space-y-6 border-l-4 border-l-yellow-500">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic">Backup e Exportação</h3>
                  <p className="text-xs text-slate-500">Exporte os dados para Excel ou realize um backup completo do sistema.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleExportDataToExcel}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase italic tracking-tighter transition-all shadow-xl flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Exportar Excel
                  </button>
                  <button 
                    onClick={handleSystemBackup}
                    className="px-6 py-3 bg-green-600/10 text-green-500 border border-green-500/20 hover:bg-green-600 hover:text-white rounded-xl font-black uppercase italic tracking-tighter transition-all shadow-xl flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Backup Completo (JSON)
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 space-y-6">
              <h3 className="text-2xl font-black text-white uppercase italic">Gestão de Usuários</h3>
              <div className="space-y-4">
                {adminUsers.map(u => (
                  <div key={u.uid} className={`flex items-center justify-between p-4 rounded-2xl border ${u.isDeleted ? 'bg-red-500/5 border-red-500/20 opacity-70' : 'bg-slate-950/50 border-slate-800/50'}`}>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                          className={`w-10 h-10 rounded-full border ${u.isDeleted ? 'border-red-500/50 grayscale' : 'border-slate-800'}`}
                          alt=""
                        />
                        {u.isDeleted && (
                          <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                            <X className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {u.displayName}
                          {u.role === 'admin' && <ShieldCheck className="w-3 h-3 text-yellow-500" />}
                          {u.isDeleted && <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full uppercase">Removido</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-black">{u.totalPoints} pontos</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleBanUser(u.uid, !u.isBanned)}
                        disabled={u.role === 'admin'}
                        className={`p-2 rounded-lg transition-colors ${u.isBanned ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-red-500'}`}
                        title={u.isBanned ? "Desbanir" : "Banir"}
                      >
                        <AlertCircle className="w-5 h-5" />
                      </button>
                      {!u.isDeleted ? (
                        <button 
                          onClick={() => handleDeleteUser(u.uid)}
                          disabled={u.role === 'admin'}
                          className="p-2 bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remover da Competição"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleRestoreUser(u.uid)}
                          className="p-2 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-lg transition-colors"
                          title="Restaurar Usuário"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {adminUsers.length === 0 && <p className="text-center text-slate-600 py-8">Nenhum usuário encontrado.</p>}
              </div>
            </div>

            <OfficialCallupAdmin 
              officialCallup={officialCallup} 
              onSave={handleSaveOfficialCallup} 
            />

            <div className="space-y-6">
              <h3 className="text-2xl font-black text-white uppercase italic">Resultados das Partidas</h3>
              <div className="grid grid-cols-1 gap-4">
                {matches.map((match) => (
                  <AdminMatchRow 
                    key={match.id} 
                    match={match} 
                    onUpdate={(sA, sB, tA, tB, fin) => handleAdminUpdateMatch(match, sA, sB, tA, tB, fin)} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-800 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-green-600" />
            <div className="w-8 h-8 rounded-full bg-yellow-500" />
            <div className="w-8 h-8 rounded-full bg-blue-600" />
          </div>
          <p className="text-slate-500 text-sm">© 2026 Palpitão Espetacular - Todos os direitos reservados.</p>
          <p className="text-slate-600 text-xs mt-2 italic">Idealizado por Xael</p>
          <p className="text-slate-600 text-[10px] mt-1">Desenvolvido para a maior Copa da história.</p>
        </div>
      </footer>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRules(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => setShowRules(false)}
                className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-yellow-500" />
                </div>
                <h3 className="text-3xl font-black text-white uppercase italic mb-2">Regras de <span className="text-yellow-500">Pontuação</span></h3>
                <p className="text-slate-400">Entenda como funciona o sistema de pontos do Palpitão.</p>
              </div>

              <div className="space-y-4">
                <div className="p-8 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-[2.5rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Trophy className="w-24 h-24 text-yellow-500" />
                  </div>
                  <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                    <img 
                      src="https://http2.mlstatic.com/D_NQ_NP_2X_845652-MLB108199384343_032026-F.webp" 
                      alt="Troféu" 
                      className="w-32 h-32 object-contain drop-shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-center sm:text-left">
                      <h4 className="text-yellow-500 font-black uppercase italic text-xl tracking-tighter mb-2">Prêmio de Campeão</h4>
                      <p className="text-white text-sm leading-relaxed font-medium">
                        O vencedor oficial do Palpitão receberá em casa uma <span className="text-yellow-500 font-black italic">TAÇA DA COPA DO MUNDO PERSONALIZADA</span> com seu nome gravado na base!
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        Válido para o Ranking Geral
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-[2rem]">
                  <h4 className="text-blue-500 font-black uppercase italic mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Esclarecimentos Importantes
                  </h4>
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-white font-bold text-sm mb-1 uppercase tracking-tighter">1. Regras de Pontuação</h5>
                      <div className="space-y-1 mb-4 text-[11px]">
                         <p className="flex justify-between border-b border-slate-800 pb-1">
                           <span className="text-yellow-500 font-bold italic">20 PTS:</span>
                           <span className="text-slate-400">Placar Exato</span>
                         </p>
                         <p className="flex justify-between border-b border-slate-800 pb-1">
                           <span className="text-white font-bold italic">15 PTS:</span>
                           <span className="text-slate-400">Vencedor + Saldo de Gols</span>
                         </p>
                         <p className="flex justify-between border-b border-slate-800 pb-1">
                           <span className="text-white font-bold italic">12 PTS:</span>
                           <span className="text-slate-400">Empate (Placar Errado)</span>
                         </p>
                         <p className="flex justify-between border-b border-slate-800 pb-1">
                           <span className="text-white font-bold italic">10 PTS:</span>
                           <span className="text-slate-400">Apenas o Vencedor</span>
                         </p>
                         <p className="flex justify-between border-b border-slate-800 pb-1">
                           <span className="text-white font-bold italic">5 PTS:</span>
                           <span className="text-slate-400">Consolação (Gols de 1 Time)</span>
                         </p>
                      </div>
                      <h5 className="text-white font-bold text-sm mb-1 uppercase tracking-tighter">2. Pontuação Não Cumulativa</h5>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Você recebe apenas a pontuação da sua <span className="text-white">melhor faixa de acerto</span>. O sistema prioriza sempre o seu maior acerto.
                      </p>
                    </div>
                    <div>
                      <h5 className="text-white font-bold text-sm mb-1 uppercase tracking-tighter">2. Critério para Pênaltis</h5>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Para fins de computação de pontos, vale apenas o resultado do <span className="text-white">tempo regulamentar + prorrogação</span>. Gols marcados em disputas de pênaltis não são contabilizados no placar final do bolão.
                      </p>
                    </div>
                    <div>
                      <h5 className="text-white font-bold text-sm mb-1 uppercase tracking-tighter">3. Prazo para Palpites</h5>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Os palpites devem ser registrados com no mínimo <span className="text-white">24 horas de antecedência</span> do início da partida. Após este prazo, o jogo será trancado.
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowRules(false)}
                  className="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-xl shadow-yellow-500/20"
                >
                  Entendi as Regras!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Message Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 bg-green-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-6 h-6" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scoring Explanation Modal */}
      <AnimatePresence>
        {scoringExplanation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setScoringExplanation(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center"
            >
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic mb-4">{scoringExplanation.title}</h3>
              <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                {scoringExplanation.description}
              </p>
              <button 
                onClick={() => setScoringExplanation(null)}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-xl shadow-yellow-500/20"
              >
                Entendi!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile Details Modal */}
      <AnimatePresence>
        {selectedUserForDetails && (
          <UserProfileModal 
            user={selectedUserForDetails} 
            matches={matches} 
            onClose={() => setSelectedUserForDetails(null)} 
          />
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic mb-4">Tem Certeza?</h3>
              <p className="text-slate-400 mb-8">
                Esta ação é irreversível. Todos os palpites serão apagados e as pontuações de todos os usuários serão zeradas.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleResetAll}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-xl shadow-red-600/20"
                >
                  Sim, Zerar Tudo
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase italic tracking-tighter transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MatchCard({ match, bet, onSave, isAdmin }: { match: Match, bet?: Bet, onSave: (sA: number, sB: number) => void, isAdmin?: boolean }) {
  const [scoreA, setScoreA] = useState<string>(bet?.scoreA.toString() || '');
  const [scoreB, setScoreB] = useState<string>(bet?.scoreB.toString() || '');
  useEffect(() => {
    if (bet) {
      setScoreA(bet.scoreA.toString());
      setScoreB(bet.scoreB.toString());
    }
  }, [bet]);

  // Rules: 
  // 1. Cannot change after save
  // 2. Can only bet up to 24h before match
  // 3. Cannot bet if match finished
  const matchDate = new Date(match.date);
  const now = new Date();
  const diffHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const deadlineHours = 24;
  
  const hasBet = !!bet;
  const isTooLate = diffHours < deadlineHours;
  const isFinished = match.status === 'finished';
  const canBet = !hasBet && (isAdmin || !isTooLate) && !isFinished;

  const handleSave = () => {
    if (scoreA === '' || scoreB === '') return;
    if (parseInt(scoreA) < 0 || parseInt(scoreB) < 0) return;
    onSave(parseInt(scoreA), parseInt(scoreB));
  };

  const hasChanges = bet ? (bet.scoreA.toString() !== scoreA || bet.scoreB.toString() !== scoreB) : (scoreA !== '' && scoreB !== '');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-slate-900 rounded-3xl border border-slate-800 p-6 relative overflow-hidden group"
    >
      {/* Status Badge */}
      <div className="absolute top-0 right-0 p-4">
        {isFinished ? (
          <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-500/20">Finalizado</span>
        ) : match.status === 'in_progress' ? (
          <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20 flex items-center gap-2">
            <motion.span 
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 bg-blue-500 rounded-full"
            />
            Em Andamento
          </span>
        ) : isTooLate ? (
          <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-500/20">Encerrado</span>
        ) : hasBet ? (
          <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">Palpitado</span>
        ) : (
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-yellow-500/20">Aberto</span>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
              {match.group && GROUPS.includes(match.group) ? `Grupo ${match.group}` : 
               match.group === 'R32' ? '32-avos de Final' :
               match.group === 'R16' ? 'Oitavas de Final' :
               match.group === 'QF' ? 'Quartas de Final' :
               match.group === 'SF' ? 'Semifinais' :
               match.group === '3RD' ? 'Disputa 3º Lugar' : 'Grande Final'}
            </span>
            <span className="text-sm font-mono text-slate-400">{matchDate.toLocaleString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              {COUNTRY_CODES[match.teamA] ? (
                <img 
                  src={`https://flagcdn.com/w160/${COUNTRY_CODES[match.teamA]}.png`} 
                  alt={match.teamA}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-3xl">⚽</span>
              )}
            </div>
            <span className="font-black text-center text-white leading-tight">{match.teamA}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="0"
                value={scoreA}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseInt(val) >= 0) setScoreA(val);
                }}
                disabled={!canBet}
                className={`w-14 h-14 bg-slate-950 border-2 rounded-xl text-center text-2xl font-black text-white focus:border-yellow-500 outline-none transition-colors disabled:opacity-50 ${match.status === 'in_progress' ? 'border-blue-500/50' : 'border-slate-800'}`}
                placeholder="-"
              />
              <span className="text-slate-700 font-black text-xl">X</span>
              <input 
                type="number" 
                min="0"
                value={scoreB}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseInt(val) >= 0) setScoreB(val);
                }}
                disabled={!canBet}
                className={`w-14 h-14 bg-slate-950 border-2 rounded-xl text-center text-2xl font-black text-white focus:border-yellow-500 outline-none transition-colors disabled:opacity-50 ${match.status === 'in_progress' ? 'border-blue-500/50' : 'border-slate-800'}`}
                placeholder="-"
              />
            </div>
            {(isFinished || match.status === 'in_progress') && (
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-black text-slate-600 tracking-widest">{isFinished ? 'Oficial' : 'Placar Atual'}</span>
                <div className={`text-xl font-black ${isFinished ? 'text-green-500' : 'text-blue-500'}`}>
                  {match.scoreA} - {match.scoreB}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex-col items-center gap-3 flex">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              {COUNTRY_CODES[match.teamB] ? (
                <img 
                  src={`https://flagcdn.com/w160/${COUNTRY_CODES[match.teamB]}.png`} 
                  alt={match.teamB}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-3xl">⚽</span>
              )}
            </div>
            <span className="font-black text-center text-white leading-tight">{match.teamB}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{match.location}</span>
          </div>
          
          {canBet ? (
            <button 
              onClick={handleSave}
              disabled={scoreA === '' || scoreB === '' || !hasChanges}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${
                hasChanges 
                ? 'bg-yellow-500 text-slate-950 hover:shadow-lg hover:shadow-yellow-500/20 shadow-lg shadow-yellow-500/10' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              Confirmar
            </button>
          ) : hasBet ? (
            <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Palpite Registrado</span>
            </div>
          ) : isTooLate && !isFinished ? (
            <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Prazo Esgotado</span>
            </div>
          ) : null}

          {isFinished && bet && (
            <div className="flex items-center gap-2">
              <div className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${bet.pointsEarned === 20 ? 'bg-green-500 text-slate-950' : bet.pointsEarned === 10 ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                <TrendingUp className="w-4 h-4" />
                +{bet.pointsEarned || 0} pts
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AdminMatchRow({ match, onUpdate }: { match: Match, onUpdate: (sA: number, sB: number, tA: string, tB: string, finalize: boolean) => void }) {
  const [scoreA, setScoreA] = useState<string>(match.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState<string>(match.scoreB?.toString() || '');
  const [teamA, setTeamA] = useState<string>(match.teamA);
  const [teamB, setTeamB] = useState<string>(match.teamB);
  const [finalize, setFinalize] = useState<boolean>(match.status === 'finished');

  useEffect(() => {
    if (match.scoreA !== undefined) setScoreA(match.scoreA.toString());
    if (match.scoreB !== undefined) setScoreB(match.scoreB.toString());
    setTeamA(match.teamA);
    setTeamB(match.teamB);
    setFinalize(match.status === 'finished');
  }, [match]);

  return (
    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-[250px]">
        <div className="flex items-center -space-x-2">
          {COUNTRY_CODES[teamA] ? (
            <img 
              src={`https://flagcdn.com/w40/${COUNTRY_CODES[teamA]}.png`} 
              alt="" 
              className="w-8 h-6 object-cover rounded border border-slate-800 z-10"
              referrerPolicy="no-referrer"
            />
          ) : <div className="w-8 h-6 bg-slate-800 rounded flex items-center justify-center text-[10px] z-10">⚽</div>}
          {COUNTRY_CODES[teamB] ? (
            <img 
              src={`https://flagcdn.com/w40/${COUNTRY_CODES[teamB]}.png`} 
              alt="" 
              className="w-8 h-6 object-cover rounded border border-slate-800"
              referrerPolicy="no-referrer"
            />
          ) : <div className="w-8 h-6 bg-slate-800 rounded flex items-center justify-center text-[10px]">⚽</div>}
        </div>
        <div className="flex flex-col flex-1">
          <div className="flex gap-2 mb-2">
            <input 
              type="text" 
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm font-bold text-white w-full"
              placeholder="Time A"
            />
            <input 
              type="text" 
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm font-bold text-white w-full"
              placeholder="Time B"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {new Date(match.date).toLocaleDateString('pt-BR')} - {
              match.group && GROUPS.includes(match.group) ? `Grupo ${match.group}` : 
              match.group === 'R32' ? '32-avos' :
              match.group === 'R16' ? 'Oitavas' :
              match.group === 'QF' ? 'Quartas' :
              match.group === 'SF' ? 'Semifinais' :
              match.group === '3RD' ? '3º Lugar' : 'Final'
            }
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {match.status === 'in_progress' && (
          <div className="flex items-center gap-2 mr-4">
            <motion.div 
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 bg-blue-500 rounded-full"
            />
            <span className="text-[10px] font-black text-blue-500 uppercase">Em Andamento</span>
          </div>
        )}
        <input 
          type="number" 
          min="0"
          value={scoreA}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || parseInt(val) >= 0) setScoreA(val);
          }}
          className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-lg text-center font-black text-white"
        />
        <span className="text-slate-600">X</span>
        <input 
          type="number" 
          min="0"
          value={scoreB}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || parseInt(val) >= 0) setScoreB(val);
          }}
          className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-lg text-center font-black text-white"
        />
        <div className="flex items-center gap-4 ml-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={finalize}
              onChange={(e) => setFinalize(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-yellow-500"
            />
            <span className="text-[10px] font-black text-slate-500 uppercase">Finalizar</span>
          </label>
          <button 
            onClick={() => onUpdate(parseInt(scoreA) || 0, parseInt(scoreB) || 0, teamA, teamB, finalize)}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg font-bold text-sm transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function OfficialCallupAdmin({ 
  officialCallup, 
  onSave 
}: { 
  officialCallup: OfficialCallup | null, 
  onSave: (players: string[], finalize: boolean) => void 
}) {
  const [players, setPlayers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (officialCallup?.players) {
      setPlayers(officialCallup.players);
    }
  }, [officialCallup]);

  const togglePlayer = (name: string) => {
    if (players.includes(name)) {
      setPlayers(players.filter(p => p !== name));
    } else if (players.length < 23) {
      setPlayers([...players, name]);
    }
  };

  const filteredAvailable = BRAZIL_PLAYERS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-white uppercase italic">Convocação Oficial</h3>
          <p className="text-xs text-slate-500">Selecione os 23 jogadores que foram realmente convocados.</p>
        </div>
        <div className={`px-4 py-2 rounded-xl border font-black text-sm transition-all ${
          players.length === 23 ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}>
          {players.length}/23 SELECIONADOS
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-500" />
        </div>
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar na lista prévia..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-yellow-500 transition-all font-bold placeholder:text-slate-700 shadow-inner"
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Lista de Jogadores Disponíveis</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {filteredAvailable.map(p => {
            const isSelected = players.includes(p.name);
            return (
              <button
                key={p.name}
                onClick={() => togglePlayer(p.name)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                  isSelected 
                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_15px_-5px_rgba(234,179,8,0.3)]' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="font-bold text-xs truncate">{p.name}</div>
                  <div className="text-[9px] uppercase font-black opacity-50">{p.position} • {p.club}</div>
                </div>
                {isSelected && <CheckSquare className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>

      {players.length > 0 && (
        <div className="pt-4 border-t border-slate-800/50">
          <h4 className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em] mb-3">Sua Seleção Oficial</h4>
          <div className="flex flex-wrap gap-2">
            {players.map(p => (
              <div key={p} className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full group">
                <span className="text-[10px] font-bold text-white whitespace-nowrap">{p}</span>
                <button 
                  onClick={() => togglePlayer(p)} 
                  className="text-slate-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-800/50">
        <button 
          onClick={() => onSave(players, false)}
          className="flex-1 py-4 border border-slate-700 text-white rounded-2xl font-black uppercase italic tracking-tighter hover:bg-slate-800 transition-all font-bold"
        >
          Salvar Rascunho
        </button>
        <button 
          onClick={() => onSave(players, true)}
          disabled={players.length !== 23 || officialCallup?.isFinalized}
          className="flex-1 py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-2"
        >
          {officialCallup?.isFinalized ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Finalizado e Pontuado
            </>
          ) : (
            <>
              <Trophy className="w-5 h-5" />
              Finalizar e Pontuar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
