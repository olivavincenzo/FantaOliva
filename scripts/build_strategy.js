import fs from 'fs';
import { INITIAL_TEAMS, CSV_PLAYER_CATALOG } from '../js/data/initialData.js';

const rawGiocatori = fs.readFileSync('sos-fanta/giocatori.html', 'utf8').trim();
const giocatori = JSON.parse(rawGiocatori);

const rawPlayerStrat = fs.readFileSync('sos-fanta/player-strategia.html', 'utf8').trim();
const playerStrat = JSON.parse(rawPlayerStrat);

const targetStratId = '16f4475f-bec4-463a-9ce2-0ad554345a1a';
const filtered = playerStrat.filter(ps => ps.strategy_id === targetStratId);

console.log('Filtered players:', filtered.length);

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

// Build tiersByRole containing the fasce used in that role (in order 1..20)
const tiersByRole = { P: [], D: [], C: [], A: [] };
const usedFasceByRole = { P: new Set(), D: new Set(), C: new Set(), A: new Set() };

filtered.forEach(ps => {
  const g = giocatori[ps.player_id] || {};
  const role = (g.role || ps.player?.role || 'C').toUpperCase();
  if (usedFasceByRole[role]) {
    usedFasceByRole[role].add(ps.fascia);
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

console.log('Tiers created per role:', {
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

let directMatches = 0;
let teamMatches = 0;
let catalogMatches = 0;

filtered.forEach(ps => {
  const g = giocatori[ps.player_id] || {};
  const rawName = (g.name || ps.player?.name || '').replace(/\n/g, ' ').trim();
  const role = (g.role || ps.player?.role || 'C').toUpperCase();
  const tierId = `tier_${role.toLowerCase()}_${ps.fascia}`;

  const normGName = normalize(rawName);
  if (!normGName) return;

  // 1. Direct name keys
  assignments[rawName.toLowerCase()] = tierId;
  assignments[normGName] = tierId;
  if (ps.comment) comments[normGName] = ps.comment.replace(/\n/g, ' ').trim();
  if (ps.price) prices[normGName] = ps.price;

  // 2. Match with allTeamPlayers
  allTeamPlayers.forEach(tp => {
    const normTp = normalize(tp.name);
    const tpRole = (tp.role || '').toUpperCase();
    const roleMatches = (tpRole === role || tpRole === '' || role === '');
    
    if (normTp === normGName || (normGName.length >= 4 && normTp.includes(normGName)) || (normTp.length >= 4 && normGName.includes(normTp))) {
      assignments[tp.id] = tierId;
      assignments[tp.name.toLowerCase().trim()] = tierId;
      assignments[normTp] = tierId;
      teamMatches++;
    }
  });

  // 3. Match with CSV_PLAYER_CATALOG
  if (CSV_PLAYER_CATALOG) {
    CSV_PLAYER_CATALOG.forEach(cp => {
      const normCp = normalize(cp.name);
      const cpRole = (cp.role || '').toUpperCase();
      
      if (normCp === normGName || (normGName.length >= 4 && normCp.includes(normGName)) || (normCp.length >= 4 && normGName.includes(normCp))) {
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
  createdAt: Date.now(),
  tiersByRole,
  assignments,
  playerComments: comments,
  playerPrices: prices
};

fs.writeFileSync('js/data/sosStrategy1.js', 'export const SOS_STRATEGY_1 = ' + JSON.stringify(strategy1, null, 2) + ';\n');
console.log('Saved js/data/sosStrategy1.js successfully!');
