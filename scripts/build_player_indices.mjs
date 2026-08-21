import fs from 'fs';
import { INITIAL_TEAMS, CSV_PLAYER_CATALOG } from '../js/data/initialData.js';

const rawIndices = JSON.parse(fs.readFileSync('scripts/raw_player_indices.json', 'utf8'));

export const TITOLARITA_LABELS = {
  1: "Non gioca mai",
  2: "Subentra raramente",
  3: "Nelle rotazioni",
  4: "Titolare con concorrenza",
  5: "Titolare inamovibile"
};

export const AFFIDABILITA_LABELS = {
  1: "Del tutto inaffidabile a livello di voti",
  2: "Profilo altamente incostante",
  3: "Alterna buone prestazioni ad altre deludenti",
  4: "Quasi sempre sufficiente",
  5: "Rendimento super costante"
};

export const INTEGRITA_LABELS = {
  1: "Molto fragile",
  2: "Ha avuto diversi infortuni",
  3: "Ogni tanto salta qualche partita",
  4: "Pochissimi infortuni",
  5: "È sempre integro"
};

const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

const fullIndicesMap = { ...rawIndices };

// Flatten team players
const allTeamPlayers = [];
INITIAL_TEAMS.forEach(team => {
  const pList = [...Object.values(team.lineup || {}), ...(team.bench || [])].filter(Boolean);
  pList.forEach(p => allTeamPlayers.push({ ...p, teamName: team.name }));
});

let matchedTeam = 0;
let matchedCatalog = 0;

// Match against team players
allTeamPlayers.forEach(tp => {
  const normTp = normalize(tp.name);
  const normDisp = normalize(tp.displayName);

  let match = fullIndicesMap[normTp] || fullIndicesMap[normDisp] || fullIndicesMap[tp.id];
  if (!match) {
    for (const k in rawIndices) {
      if (k.length >= 4 && (normTp.includes(k) || k.includes(normTp) || (normDisp && (normDisp.includes(k) || k.includes(normDisp))))) {
        match = rawIndices[k];
        break;
      }
    }
  }

  if (match) {
    fullIndicesMap[tp.id] = match;
    fullIndicesMap[normTp] = match;
    if (tp.csvId) fullIndicesMap[tp.csvId.toString()] = match;
    matchedTeam++;
  }
});

// Match against CSV catalog
if (CSV_PLAYER_CATALOG && Array.isArray(CSV_PLAYER_CATALOG)) {
  CSV_PLAYER_CATALOG.forEach(cp => {
    const normCp = normalize(cp.name);
    const normDisp = normalize(cp.displayName);

    let match = fullIndicesMap[normCp] || fullIndicesMap[normDisp] || fullIndicesMap[cp.id];
    if (!match) {
      for (const k in rawIndices) {
        if (k.length >= 4 && (normCp.includes(k) || k.includes(normCp) || (normDisp && (normDisp.includes(k) || k.includes(normDisp))))) {
          match = rawIndices[k];
          break;
        }
      }
    }

    if (match) {
      if (cp.id) fullIndicesMap[cp.id] = match;
      if (cp.csvId) fullIndicesMap[cp.csvId.toString()] = match;
      fullIndicesMap[normCp] = match;
      matchedCatalog++;
    }
  });
}

console.log(`Matched against teams: ${matchedTeam}, catalog: ${matchedCatalog}`);
console.log('Total index keys generated:', Object.keys(fullIndicesMap).length);

const fileContent = `/**
 * Indici Ufficiali SOS Fanta: Titolarità, Affidabilità, Integrità (1..5)
 */

export const TITOLARITA_LABELS = ${JSON.stringify(TITOLARITA_LABELS, null, 2)};

export const AFFIDABILITA_LABELS = ${JSON.stringify(AFFIDABILITA_LABELS, null, 2)};

export const INTEGRITA_LABELS = ${JSON.stringify(INTEGRITA_LABELS, null, 2)};

export const PLAYER_INDICES_MAP = ${JSON.stringify(fullIndicesMap, null, 2)};

/**
 * Recupera l'oggetto indici per un calciatore (titolarità, affidabilità, integrità)
 * @param {Object|string} player Or playerId
 * @returns {{ titIndex: number, titDesc: string, affIndex: number, affDesc: string, infIndex: number, infDesc: string, xfmv?: number }}
 */
export function getPlayerIndices(player) {
  if (!player) {
    return {
      titIndex: 3,
      titDesc: TITOLARITA_LABELS[3],
      affIndex: 3,
      affDesc: AFFIDABILITA_LABELS[3],
      infIndex: 3,
      infDesc: INTEGRITA_LABELS[3]
    };
  }

  if (typeof player === 'string') {
    const norm = player.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return PLAYER_INDICES_MAP[player] || PLAYER_INDICES_MAP[norm] || {
      titIndex: 3,
      titDesc: TITOLARITA_LABELS[3],
      affIndex: 3,
      affDesc: AFFIDABILITA_LABELS[3],
      infIndex: 3,
      infDesc: INTEGRITA_LABELS[3]
    };
  }

  const id = player.id || '';
  const csvId = player.csvId ? player.csvId.toString() : '';
  const normName = (player.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const normDisp = (player.displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const found = PLAYER_INDICES_MAP[id] || 
                (csvId && PLAYER_INDICES_MAP[csvId]) || 
                (normName && PLAYER_INDICES_MAP[normName]) || 
                (normDisp && PLAYER_INDICES_MAP[normDisp]);

  if (found) {
    return {
      titIndex: found.titIndex ?? 3,
      titDesc: TITOLARITA_LABELS[found.titIndex ?? 3] || 'Nelle rotazioni',
      affIndex: found.affIndex ?? 3,
      affDesc: AFFIDABILITA_LABELS[found.affIndex ?? 3] || 'Alterna buone prestazioni',
      infIndex: found.infIndex ?? 3,
      infDesc: INTEGRITA_LABELS[found.infIndex ?? 3] || 'Pochissimi infortuni',
      xfmv: found.xfmv
    };
  }

  // Fallback basato sulle stats esistenti se non mappato
  const titNum = player.stats?.titolarita ?? player.titolaritaPerc ?? 50;
  let titIdx = 3;
  if (titNum >= 85) titIdx = 5;
  else if (titNum >= 65) titIdx = 4;
  else if (titNum >= 40) titIdx = 3;
  else if (titNum >= 20) titIdx = 2;
  else titIdx = 1;

  const fmNum = player.stats?.fantamedia ?? 6.0;
  let affIdx = 3;
  if (fmNum >= 7.2) affIdx = 5;
  else if (fmNum >= 6.5) affIdx = 4;
  else if (fmNum >= 6.0) affIdx = 3;
  else if (fmNum >= 5.5) affIdx = 2;
  else affIdx = 1;

  return {
    titIndex: titIdx,
    titDesc: TITOLARITA_LABELS[titIdx],
    affIndex: affIdx,
    affDesc: AFFIDABILITA_LABELS[affIdx],
    infIndex: 4,
    infDesc: INTEGRITA_LABELS[4]
  };
}
`;

fs.writeFileSync('js/data/playerIndices.js', fileContent);
console.log('Successfully written js/data/playerIndices.js!');
