const matches = [
  { id: 'm74', allowed: ['A', 'B', 'C', 'D', 'F'] },
  { id: 'm77', allowed: ['C', 'D', 'F', 'G', 'H'] },
  { id: 'm79', allowed: ['C', 'E', 'F', 'H', 'I'] },
  { id: 'm80', allowed: ['E', 'H', 'I', 'J', 'K'] },
  { id: 'm81', allowed: ['B', 'E', 'F', 'I', 'J'] },
  { id: 'm82', allowed: ['A', 'E', 'H', 'I', 'J'] },
  { id: 'm85', allowed: ['E', 'F', 'G', 'I', 'J'] },
  { id: 'm87', allowed: ['D', 'E', 'I', 'J', 'L'] }
];

function assignThirdPlaces(qualifiedGroups: string[]): Record<string, string> | null {
  const assignment: Record<string, string> = {};
  
  function solve(matchIndex: number, availableGroups: string[]): boolean {
    if (matchIndex === matches.length) return true;
    
    const match = matches[matchIndex];
    for (let i = 0; i < availableGroups.length; i++) {
      const g = availableGroups[i];
      if (match.allowed.includes(g)) {
        assignment[match.id] = g;
        const newAvailable = [...availableGroups];
        newAvailable.splice(i, 1);
        if (solve(matchIndex + 1, newAvailable)) {
          return true;
        }
      }
    }
    return false;
  }
  
  if (solve(0, qualifiedGroups)) {
    return assignment;
  }
  return null;
}

console.log(assignThirdPlaces(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']));
console.log(assignThirdPlaces(['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']));
