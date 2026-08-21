import fs from 'fs';
import { INITIAL_TEAMS, CSV_PLAYER_CATALOG } from '../js/data/initialData.js';

const sosPlayers = JSON.parse(fs.readFileSync('scripts/clean_sos_fanta.json', 'utf8'));
console.log('Loaded SOS players:', sosPlayers.length);

const FASCE_NAMES = {
  1: 'SUPER TOP',
  2: 'TOP',
  3: 'SEMITOP',
  4: 'SOTTO AI SEMITOP',
  5: 'FASCIA ALTA',
  6: 'JOLLY 1ª FASCIA',
  7: 'POSSIBILI SORPRESE',
  8: 'FASCIA MEDIA',
  9: 'INFORTUNATI',
  10: 'SCOMMESSE',
  11: 'SOPRA AI LOW COST',
  12: 'JOLLY 2ª FASCIA',
  13: 'LOW COST 1ª FASCIA',
  14: 'LOW COST 2ª FASCIA',
  15: 'LEGHE NUMEROSE',
  16: 'JOLLY 3ª FASCIA',
  17: 'JOLLY 4ª FASCIA',
  18: 'A RISCHIO',
  19: 'DA EVITARE',
  20: 'MERCATO'
};

const FASCE_COLORS = {
  1: '#f59e0b',
  2: '#38bdf8',
  3: '#a855f7',
  4: '#818cf8',
  5: '#4ade80',
  6: '#fb923c',
  7: '#34d399',
  8: '#22d3ee',
  9: '#f43f5e',
  10: '#ec4899',
  11: '#a3e635',
  12: '#f97316',
  13: '#94a3b8',
  14: '#64748b',
  15: '#a1a1aa',
  16: '#d97706',
  17: '#b45309',
  18: '#e11d48',
  19: '#ef4444',
  20: '#71717a'
};

const tiersByRole = { P: [], D: [], C: [], A: [] };
const usedFasceByRole = { P: new Set(), D: new Set(), C: new Set(), A: new Set() };

sosPlayers.forEach(p => {
  const role = (p.role || 'C').toUpperCase();
  if (usedFasceByRole[role] && p.fascia) {
    usedFasceByRole[role].add(p.fascia);
  }
});

['P', 'D', 'C', 'A'].forEach(r => {
  const sortedFasce = [...usedFasceByRole[r]].sort((a, b) => a - b);
  tiersByRole[r] = sortedFasce.map(fNum => ({
    id: `tier_${r.toLowerCase()}_${fNum}`,
    name: FASCE_NAMES[fNum] || `Fascia ${fNum}`,
    color: FASCE_COLORS[fNum] || '#38bdf8'
  }));
});

console.log('Tiers breakdown:', {
  P: tiersByRole.P.length,
  D: tiersByRole.D.length,
  C: tiersByRole.C.length,
  A: tiersByRole.A.length
});

const assignments = {};
const comments = {};
const prices = {};

// Flatten team players
const allTeamPlayers = [];
INITIAL_TEAMS.forEach(team => {
  const pList = [...Object.values(team.lineup || {}), ...(team.bench || [])].filter(Boolean);
  pList.forEach(p => allTeamPlayers.push({ ...p, teamName: team.name }));
});

const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

let teamMatches = 0;
let catalogMatches = 0;

sosPlayers.forEach(p => {
  const rawName = (p.name || '').trim();
  const role = (p.role || 'C').toUpperCase();
  const tierId = `tier_${role.toLowerCase()}_${p.fascia}`;

  const normGName = normalize(rawName);
  if (!normGName) return;

  // 1. Direct name keys
  assignments[rawName.toLowerCase()] = tierId;
  assignments[normGName] = tierId;
  if (p.comment) comments[normGName] = p.comment;
  if (p.price) prices[normGName] = p.price;

  // 2. Match with allTeamPlayers
  allTeamPlayers.forEach(tp => {
    const normTp = normalize(tp.name);
    const normDisp = normalize(tp.displayName);
    
    const isMatch = (
      normTp === normGName ||
      normDisp === normGName ||
      (normGName.length >= 4 && (normTp.includes(normGName) || normGName.includes(normTp))) ||
      (normGName.length >= 4 && normDisp && (normDisp.includes(normGName) || normGName.includes(normDisp)))
    );

    if (isMatch) {
      if (tp.id) assignments[tp.id] = tierId;
      if (tp.csvId) assignments[tp.csvId.toString()] = tierId;
      assignments[tp.name.toLowerCase().trim()] = tierId;
      assignments[normTp] = tierId;
      teamMatches++;
    }
  });

  // 3. Match with CSV_PLAYER_CATALOG
  if (CSV_PLAYER_CATALOG && Array.isArray(CSV_PLAYER_CATALOG)) {
    CSV_PLAYER_CATALOG.forEach(cp => {
      const normCp = normalize(cp.name);
      const normDisp = normalize(cp.displayName);

      const isMatch = (
        normCp === normGName ||
        normDisp === normGName ||
        (normGName.length >= 4 && (normCp.includes(normGName) || normGName.includes(normCp))) ||
        (normGName.length >= 4 && normDisp && (normDisp.includes(normGName) || normGName.includes(normDisp)))
      );

      if (isMatch) {
        if (cp.id) assignments[cp.id] = tierId;
        if (cp.csvId) assignments[cp.csvId.toString()] = tierId;
        assignments[cp.name.toLowerCase().trim()] = tierId;
        assignments[normCp] = tierId;
        catalogMatches++;
      }
    });
  }
});

console.log(`Matched against teams: ${teamMatches}, catalog: ${catalogMatches}`);
console.log('Total unique assignment keys:', Object.keys(assignments).length);

const strategy1 = {
  id: 'strat_1',
  name: "Guida all'Asta 2026/27",
  createdAt: 1724300000000,
  tiersByRole,
  assignments,
  playerComments: comments,
  playerPrices: prices
};

fs.writeFileSync('js/data/sosStrategy1.js', '// Strategia 1 SOS Fanta - Guida all\'Asta 2026/27\nexport const SOS_STRATEGY_1 = ' + JSON.stringify(strategy1, null, 2) + ';\n');
console.log('Successfully written js/data/sosStrategy1.js!');
