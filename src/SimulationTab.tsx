import React, { useState, useMemo, useEffect } from "react";
import { Match } from "./types";
import { WORLD_CUP_MATCHES, COUNTRY_CODES, SIGLAS, FIXED_THIRD_ASSIGNMENTS } from "./constants";
import { RefreshCw, Trophy, AlertTriangle, RotateCcw } from "lucide-react";

interface SimulationTabProps {
  officialMatches?: Match[];
}

export function SimulationTab({ officialMatches }: SimulationTabProps) {
  // Extract groups and teams
  const groupTeams = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    WORLD_CUP_MATCHES.forEach((m) => {
      if (m.group && m.group.length === 1 && m.group >= "A" && m.group <= "L") {
        if (!result[m.group]) result[m.group] = new Set<string>();
        if (m.teamA) result[m.group].add(m.teamA);
        if (m.teamB) result[m.group].add(m.teamB);
      }
    });
    const finalResult: Record<string, string[]> = {};
    Object.keys(result).forEach(
      (k) => (finalResult[k] = Array.from(result[k])),
    );
    return finalResult;
  }, []);

  const groups = Object.keys(groupTeams).sort();

  const [groupStandings, setGroupStandings] = useState<
    Record<string, { first: string; second: string; third: string }>
  >(() => {
    const saved = localStorage.getItem("world_cup_simulation_groups");
    return saved ? JSON.parse(saved) : {};
  });

  const [knockoutWinners, setKnockoutWinners] = useState<
    Record<string, string>
  >(() => {
    const saved = localStorage.getItem("world_cup_simulation_winners");
    return saved ? JSON.parse(saved) : {};
  }); // matchId -> winning team name

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("world_cup_simulation_groups", JSON.stringify(groupStandings));
  }, [groupStandings]);

  useEffect(() => {
    localStorage.setItem("world_cup_simulation_winners", JSON.stringify(knockoutWinners));
  }, [knockoutWinners]);

  // If no simulation exists, initialize from official results
  useEffect(() => {
    if (Object.keys(groupStandings).length === 0 && officialMatches && officialMatches.length > 0) {
      const initialStandings: Record<string, { first: string; second: string; third: string }> = {};
      
      // Calculate standings function local to avoid duplication or import complexity for this specific hook
      const calculateInternalStandings = (matches: Match[], group: string) => {
        const groupMatches = matches.filter(m => m.group === group && m.status === 'finished');
        if (groupMatches.length === 0) return [];
        
        const teams: Record<string, { name: string, mp: number, pts: number, gf: number, ga: number }> = {};
        matches.filter(m => m.group === group).forEach(m => {
          if (!teams[m.teamA]) teams[m.teamA] = { name: m.teamA, mp: 0, pts: 0, gf: 0, ga: 0 };
          if (!teams[m.teamB]) teams[m.teamB] = { name: m.teamB, mp: 0, pts: 0, gf: 0, ga: 0 };
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
          if (sA > sB) teams[m.teamA].pts += 3;
          else if (sA < sB) teams[m.teamB].pts += 3;
          else { teams[m.teamA].pts += 1; teams[m.teamB].pts += 1; }
        });

        return Object.values(teams).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
      };

      groups.forEach(g => {
        const s = calculateInternalStandings(officialMatches, g);
        // Only if group is fully played (assumes 4 teams, 6 matches per group)
        const isGroupFinished = officialMatches.filter(m => m.group === g).every(m => m.status === 'finished');
        if (isGroupFinished && s.length >= 3) {
          initialStandings[g] = { first: s[0].name, second: s[1].name, third: s[2] ? s[2].name : "" };
        }
      });

      if (Object.keys(initialStandings).length > 0) {
        setGroupStandings(initialStandings);
      }
    }
  }, [officialMatches, groups]);

  const handleGroupStandingChange = (
    group: string,
    pos: "first" | "second" | "third",
    team: string,
  ) => {
    setGroupStandings((prev) => {
      const current = prev[group] || { first: "", second: "", third: "" };
      return { ...prev, [group]: { ...current, [pos]: team } };
    });
    // Reset knockout if group standing changes
    setKnockoutWinners({});
  };

  const handleReset = () => {
    if (confirm("Deseja realmente resetar toda a sua simulação?")) {
      setGroupStandings({});
      setKnockoutWinners({});
      localStorage.removeItem("world_cup_simulation_groups");
      localStorage.removeItem("world_cup_simulation_winners");
    }
  };

  const handleImportReal = () => {
     if (!officialMatches) return;
     if (confirm("Deseja atualizar a simulação com os resultados reais atuais? Isso limpará sua progressão no mata-mata.")) {
        const initialStandings: Record<string, { first: string; second: string; third: string }> = {};
        
        const calculateInternalStandings = (matches: Match[], group: string) => {
          const groupMatches = matches.filter(m => m.group === group && m.status === 'finished');
          if (groupMatches.length === 0) return [];
          const teams: Record<string, { name: string, mp: number, pts: number, gf: number, ga: number }> = {};
          matches.filter(m => m.group === group).forEach(m => {
            if (!teams[m.teamA]) teams[m.teamA] = { name: m.teamA, mp: 0, pts: 0, gf: 0, ga: 0 };
            if (!teams[m.teamB]) teams[m.teamB] = { name: m.teamB, mp: 0, pts: 0, gf: 0, ga: 0 };
          });
          groupMatches.forEach(m => {
            const sA = m.scoreA || 0;
            const sB = m.scoreB || 0;
            teams[m.teamA].mp++; teams[m.teamB].mp++;
            teams[m.teamA].gf += sA; teams[m.teamA].ga += sB;
            teams[m.teamB].gf += sB; teams[m.teamB].ga += sA;
            if (sA > sB) teams[m.teamA].pts += 3;
            else if (sA < sB) teams[m.teamB].pts += 3;
            else { teams[m.teamA].pts += 1; teams[m.teamB].pts += 1; }
          });
          return Object.values(teams).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
        };

        groups.forEach(g => {
          const s = calculateInternalStandings(officialMatches, g);
          if (s.length >= 3) {
            initialStandings[g] = { first: s[0].name, second: s[1].name, third: s[2] ? s[2].name : "" };
          }
        });
        setGroupStandings(initialStandings);
        setKnockoutWinners({});
     }
  };

  // Derive R32 teams
  const r32Teams = useMemo(() => {
    const teams: Record<
      string,
      { teamA: string | null; teamB: string | null }
    > = {};

    WORLD_CUP_MATCHES.filter((m) => m.group === "R32").forEach((m) => {
      let tA: string | null = null;
      let tB: string | null = null;

      // Logic for Team A
      if (m.teamA.startsWith("1º Grupo ")) {
        const g = m.teamA.charAt(9);
        tA = groupStandings[g]?.first || null;
      } else if (m.teamA.startsWith("2º Grupo ")) {
        const g = m.teamA.charAt(9);
        tA = groupStandings[g]?.second || null;
      }

      // Logic for Team B
      if (m.teamB.startsWith("2º Grupo ")) {
        const g = m.teamB.charAt(9);
        tB = groupStandings[g]?.second || null;
      } else if (m.teamB.startsWith("3º ")) {
        const g = FIXED_THIRD_ASSIGNMENTS[m.id];
        tB = groupStandings[g]?.third || null;
      }

      teams[m.id] = { teamA: tA, teamB: tB };
    });

    return teams;
  }, [groupStandings]);

  // Derived teams for all subsequent knockout matches
  const getKnockoutTeam = (
    matchId: string,
    teamLabel: string,
    currentWinners: Record<string, string>,
  ): string | null => {
    if (teamLabel.startsWith("Venc. Jogo ")) {
      const sourceMatchId = "m" + teamLabel.split(" ")[2];
      return currentWinners[sourceMatchId] || null;
    }
    if (teamLabel.startsWith("Perd. Jogo ")) {
      const sourceMatchId = "m" + teamLabel.split(" ")[2];
      const sourceMatch = WORLD_CUP_MATCHES.find((m) => m.id === sourceMatchId);
      if (!sourceMatch) return null;
      const tA = getKnockoutTeam(
        sourceMatchId,
        sourceMatch.teamA,
        currentWinners,
      );
      const tB = getKnockoutTeam(
        sourceMatchId,
        sourceMatch.teamB,
        currentWinners,
      );
      if (currentWinners[sourceMatchId]) {
        return currentWinners[sourceMatchId] === tA ? tB : tA;
      }
      return null;
    }
    // For R32, it's defined by r32Teams
    if (r32Teams[matchId]) {
      if (
        teamLabel === WORLD_CUP_MATCHES.find((m) => m.id === matchId)?.teamA
      ) {
        return r32Teams[matchId].teamA;
      }
      return r32Teams[matchId].teamB;
    }
    return null;
  };

  const advanceTeam = (matchId: string, team: string | null) => {
    if (!team) return;
    setKnockoutWinners((prev) => {
      // If clicking the identical winner, we could do nothing, but allowing toggle isn't requested.
      if (prev[matchId] === team) return prev;

      const newState = { ...prev };
      newState[matchId] = team;

      // Recursive function to clear descendants
      const clearDescendants = (currentTargetMatchId: string) => {
        WORLD_CUP_MATCHES.forEach((m) => {
          let depends = false;
          if (m.teamA.includes("Jogo ")) {
            const mParts = m.teamA.split(" ");
            if (
              mParts.length >= 3 &&
              mParts[2] === currentTargetMatchId.replace("m", "")
            )
              depends = true;
          }
          if (m.teamB.includes("Jogo ")) {
            const mParts = m.teamB.split(" ");
            if (
              mParts.length >= 3 &&
              mParts[2] === currentTargetMatchId.replace("m", "")
            )
              depends = true;
          }

          if (depends && newState[m.id] !== undefined) {
            delete newState[m.id];
            clearDescendants(m.id);
          }
        });
      };

      clearDescendants(matchId);
      return newState;
    });
  };

  const getFlagUrl = (teamName: string | null) => {
    if (!teamName || teamName.includes(" Grupo ") || teamName.includes("Jogo ")) return "";
    const code = COUNTRY_CODES[teamName];
    if (!code) return "";
    if (code.includes("-")) {
      const [base] = code.split("-");
      return `https://flagcdn.com/24x18/${base}.png`; // fallback if needed
    }
    return `https://flagcdn.com/24x18/${code}.png`;
  };

  const getSigla = (name: string | null) => {
    if (!name) return "";
    if (SIGLAS[name]) return SIGLAS[name];
    if (name.includes(" ")) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 3)
        .toUpperCase();
    }
    return name.substring(0, 3).toUpperCase();
  };

  const getChildrenMatches = (matchId: string): [string, string] | null => {
    const match = WORLD_CUP_MATCHES.find((m) => m.id === matchId);
    if (!match) return null;
    let m1 = null;
    let m2 = null;
    if (match.teamA.startsWith("Venc. Jogo "))
      m1 = "m" + match.teamA.split(" ")[2];
    if (match.teamB.startsWith("Venc. Jogo "))
      m2 = "m" + match.teamB.split(" ")[2];

    if (m1 && m2) return [m1, m2];
    return null;
  };

  const renderMatchNode = (
    matchId: string,
    align: "left" | "right" = "left",
  ) => {
    const match = WORLD_CUP_MATCHES.find((m) => m.id === matchId);
    if (!match) return null;

    const tA = getKnockoutTeam(matchId, match.teamA, knockoutWinners);
    const tB = getKnockoutTeam(matchId, match.teamB, knockoutWinners);
    const winner = knockoutWinners[matchId];

    // Format placeholder text to be shorter and cleaner
    const formatPlaceholder = (label: string) => {
      if (label.startsWith("Venc. Jogo ")) return `V${label.split(" ")[2]}`;
      if (label.startsWith("Perd. Jogo ")) return `P${label.split(" ")[2]}`;
      if (label.startsWith("3º ")) return "3º";
      if (label.startsWith("1º Grupo ")) return `1º${label.charAt(9)}`;
      if (label.startsWith("2º Grupo ")) return `2º${label.charAt(9)}`;
      return label;
    };

    return (
      <div
        className={`flex flex-col gap-0.5 relative z-10 bg-slate-950 p-1.5 rounded-xl border border-slate-800 ${align === "right" ? "items-end" : "items-start"}`}
      >
        <button
          onClick={() => advanceTeam(matchId, tA)}
          className={`flex items-center gap-1.5 group transition-all ${winner === tA && tA ? "scale-110 z-20" : tA ? "hover:scale-110 cursor-pointer opacity-90 hover:opacity-100" : "opacity-40 cursor-not-allowed"}`}
          title={tA || match.teamA}
        >
          {align === "right" && (
            <span
              className={`text-[9px] xl:text-[10px] font-bold transition-colors ${winner === tA ? "text-yellow-500" : "text-slate-400 group-hover:text-white"}`}
            >
              {tA ? getSigla(tA) : formatPlaceholder(match.teamA)}
            </span>
          )}
          <div
            className={`w-6 h-6 xl:w-7 xl:h-7 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 shadow-lg bg-slate-800 ${winner === tA && tA ? "border-yellow-500 ring-2 ring-yellow-500/30" : tA ? "border-slate-500" : "border-slate-800"}`}
          >
            {tA ? (
              <img
                src={getFlagUrl(tA)}
                alt={tA}
                className="w-full h-full object-cover scale-150"
              />
            ) : (
              <div className="text-[7px] text-slate-500 font-bold px-0.5 text-center">
                {matchId.replace("m", "")}A
              </div>
            )}
          </div>
          {align === "left" && (
            <span
              className={`text-[9px] xl:text-[10px] font-bold transition-colors ${winner === tA ? "text-yellow-500" : "text-slate-400 group-hover:text-white"}`}
            >
              {tA ? getSigla(tA) : formatPlaceholder(match.teamA)}
            </span>
          )}
        </button>

        <button
          onClick={() => advanceTeam(matchId, tB)}
          className={`flex items-center gap-1.5 group transition-all ${winner === tB && tB ? "scale-110 z-20" : tB ? "hover:scale-110 cursor-pointer opacity-90 hover:opacity-100" : "opacity-40 cursor-not-allowed"}`}
          title={tB || match.teamB}
        >
          {align === "right" && (
            <span
              className={`text-[9px] xl:text-[10px] font-bold transition-colors ${winner === tB ? "text-yellow-500" : "text-slate-400 group-hover:text-white"}`}
            >
              {tB ? getSigla(tB) : formatPlaceholder(match.teamB)}
            </span>
          )}
          <div
            className={`w-6 h-6 xl:w-7 xl:h-7 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 shadow-lg bg-slate-800 ${winner === tB && tB ? "border-yellow-500 ring-2 ring-yellow-500/30" : tB ? "border-slate-500" : "border-slate-800"}`}
          >
            {tB ? (
              <img
                src={getFlagUrl(tB)}
                alt={tB}
                className="w-full h-full object-cover scale-150"
              />
            ) : (
              <div className="text-[7px] text-slate-500 font-bold px-0.5 text-center">
                {matchId.replace("m", "")}B
              </div>
            )}
          </div>
          {align === "left" && (
            <span
              className={`text-[9px] xl:text-[10px] font-bold transition-colors ${winner === tB ? "text-yellow-500" : "text-slate-400 group-hover:text-white"}`}
            >
              {tB ? getSigla(tB) : formatPlaceholder(match.teamB)}
            </span>
          )}
        </button>
      </div>
    );
  };

  const BracketNode = ({
    matchId,
    align,
  }: {
    matchId: string;
    align: "left" | "right";
  }) => {
    const children = getChildrenMatches(matchId);
    const mNode = renderMatchNode(matchId, align);

    if (!children) {
      return <div className={`relative flex items-center p-2`}>{mNode}</div>;
    }

    const [childA, childB] = children;

    return (
      <div
        className={`flex items-center ${align === "right" ? "flex-row-reverse" : "flex-row"}`}
      >
        <div className="flex flex-col justify-center py-1 h-full">
          <div className="relative flex items-center flex-1 min-h-[3rem]">
            <BracketNode matchId={childA} align={align} />
            {/* Top Connector */}
            <div
              className={`absolute ${align === "right" ? "left-0 border-l" : "right-0 border-r"} top-1/2 bottom-0 w-4 lg:w-6 border-b border-slate-700 ${align === "right" ? "rounded-bl-xl border-l-0" : "rounded-br-xl border-r-0"} -z-10`}
            />
          </div>
          <div className="relative flex items-center flex-1 min-h-[3rem]">
            <BracketNode matchId={childB} align={align} />
            {/* Bottom Connector */}
            <div
              className={`absolute ${align === "right" ? "left-0 border-l" : "right-0 border-r"} top-0 bottom-1/2 w-4 lg:w-6 border-t border-slate-700 ${align === "right" ? "rounded-tl-xl border-l-0" : "rounded-tr-xl border-r-0"} -z-10`}
            />
          </div>
        </div>
        <div className="w-4 lg:w-6 h-[1px] bg-slate-700 -z-10" />
        <div className="px-1">{mNode}</div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
            Simulação <span className="text-yellow-500">de Chaves</span>
          </h2>
          <p className="text-slate-400">
            Monte o chaveamento oficial da simulação.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleImportReal}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-blue-900/20"
            title="Sincronizar com Resultados Reais"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Sincronizar Real</span>
          </button>
          <button
            onClick={handleReset}
            className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-xl transition-colors"
            title="Reiniciar Simulação"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold uppercase italic border-l-4 border-yellow-500 pl-3">
          Fase de Grupos
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {groups.map((g) => (
            <div
              key={g}
              className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col gap-2"
            >
              <h4 className="font-bold text-center text-slate-400">
                Grupo {g}
              </h4>
              {["first", "second", "third"]
                .filter((p) => p !== "third" || g < "I")
                .map((posStr, i) => {
                  const pos = posStr as "first" | "second" | "third";
                  const currentSel = groupStandings[g]?.[pos] || "";
                  const otherSels = [
                    groupStandings[g]?.first,
                    groupStandings[g]?.second,
                    groupStandings[g]?.third,
                  ].filter((s) => s && s !== currentSel);

                  return (
                    <div
                      key={pos}
                      className="flex items-center justify-between gap-1.5"
                    >
                      <span className="text-[9px] xl:text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap w-[14px]">
                        {i + 1}º
                      </span>
                      {currentSel ? (
                        <div className="w-5 h-4 shrink-0 rounded-sm overflow-hidden bg-slate-800 border border-slate-700/50 flex flex-col justify-center">
                          <img
                            src={getFlagUrl(currentSel)}
                            alt={currentSel}
                            className="w-full h-full object-cover scale-150"
                          />
                        </div>
                      ) : (
                        <div className="w-5 h-4 shrink-0 rounded-sm border border-slate-800 bg-slate-900/50" />
                      )}
                      <select
                        value={currentSel}
                        onChange={(e) =>
                          handleGroupStandingChange(g, pos, e.target.value)
                        }
                        className="bg-slate-950 border border-slate-800 text-white rounded-lg p-1 text-[10px] xl:text-xs focus:outline-none focus:border-yellow-500 w-full"
                      >
                        <option value="">...</option>
                        {groupTeams[g]
                          .filter((t) => !otherSels.includes(t))
                          .map((t) => (
                            <option key={t} value={t}>
                              {getSigla(t)}
                            </option>
                          ))}
                      </select>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-bold uppercase italic border-l-4 border-yellow-500 pl-3">
          Chaveamento
        </h3>
        <div className="relative w-full overflow-x-auto custom-scrollbar bg-slate-900/50 rounded-3xl border border-slate-800">
          <div className="flex gap-2 lg:gap-4 justify-between md:justify-center items-center w-[max-content] min-w-full px-4 py-8">
            {/* Lado Esquerdo (Root: m101) */}
            <div className="flex justify-end">
              <BracketNode matchId="m101" align="left" />
            </div>

            {/* FINAL E TERCEIRO NO CENTRO */}
            <div className="flex flex-col justify-center items-center gap-6 shrink-0 w-[120px] lg:w-[140px] px-2">
              <div className="flex flex-col items-center gap-2">
                <Trophy className="w-8 h-8 lg:w-10 lg:h-10 text-yellow-500" />
                <div className="text-center w-full flex flex-col items-center">
                  <div className="text-[8px] lg:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                    Final
                  </div>
                  {renderMatchNode("m104", "left")}
                  {knockoutWinners["m104"] && (
                    <div className="mt-2 p-2 w-full max-w-[120px] rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-950 font-black text-center uppercase shadow-[0_0_20px_rgba(234,179,8,0.3)] transform scale-105">
                      <div className="text-[8px] opacity-70 mb-0.5 leading-none">
                        Campeão
                      </div>
                      <div className="text-sm lg:text-base leading-tight flex items-center justify-center gap-1.5">
                        <img
                          src={getFlagUrl(knockoutWinners["m104"])}
                          className="w-4 h-3 lg:w-5 lg:h-4 rounded-[1px]"
                        />
                        {getSigla(knockoutWinners["m104"])}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center mt-4 w-full flex flex-col items-center">
                <div className="text-[8px] lg:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  3º Lugar
                </div>
                {renderMatchNode("m103", "left")}
              </div>
            </div>

            {/* Lado Direito (Root: m102) */}
            <div className="flex justify-start">
              <BracketNode matchId="m102" align="right" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
