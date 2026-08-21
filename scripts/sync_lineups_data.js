import fs from 'fs';
import { INITIAL_TEAMS } from '../js/data/initialData.js';
import { SOS_TEAMS_DATA } from '../js/data/sosTeamsData.js';

const FORMATION_SLOT_MAP = {
  '3-5-2': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_9', 'pos_6', 'pos_7', 'pos_8', 'pos_10', 'pos_11'],
  '3-4-2-1': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_8', 'pos_6', 'pos_7', 'pos_9', 'pos_10', 'pos_11'],
  '3-4-3': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_8', 'pos_6', 'pos_7', 'pos_9', 'pos_10', 'pos_11'],
  '4-3-3': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_7', 'pos_6', 'pos_8', 'pos_9', 'pos_11', 'pos_10'],
  '4-2-3-1': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_6', 'pos_7', 'pos_8', 'pos_9', 'pos_10', 'pos_11'],
  '4-4-2': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_6', 'pos_7', 'pos_8', 'pos_9', 'pos_10', 'pos_11'],
  '4-3-1-2': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_7', 'pos_6', 'pos_8', 'pos_9', 'pos_10', 'pos_11'],
  '4-3-2-1': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_7', 'pos_6', 'pos_8', 'pos_9', 'pos_10', 'pos_11']
};

const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const updatedTeams = INITIAL_TEAMS.map(team => {
  const code = (team.shortName || team.id || '').toUpperCase();
  const sos = SOS_TEAMS_DATA[code] || SOS_TEAMS_DATA[team.name] || {};
  const officialModule = sos.module || sos.defaultFormation || team.defaultFormation || '4-3-3';
  const starters = sos.starters || [];

  const allPlayers = [
    ...Object.values(team.lineup || {}),
    ...(team.bench || [])
  ].filter(Boolean);

  const slotOrder = FORMATION_SLOT_MAP[officialModule] || ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_6', 'pos_7', 'pos_8', 'pos_9', 'pos_10', 'pos_11'];

  const newLineup = {};
  const usedPlayerIds = new Set();

  starters.forEach((st, idx) => {
    if (idx >= 11) return;
    const slotId = slotOrder[idx];
    const sId = st.playerId || '';
    const sCsv = st.csvId ? st.csvId.toString() : '';
    const sNorm = normalize(st.name);

    let match = allPlayers.find(p => !usedPlayerIds.has(p.id) && (
      (sId && p.id === sId) ||
      (sCsv && p.csvId && p.csvId.toString() === sCsv) ||
      (sNorm && (normalize(p.name) === sNorm || normalize(p.displayName) === sNorm))
    ));

    if (!match && sNorm.length > 3) {
      match = allPlayers.find(p => !usedPlayerIds.has(p.id) && (
        normalize(p.name).includes(sNorm) || normalize(p.displayName).includes(sNorm) ||
        sNorm.includes(normalize(p.name)) || sNorm.includes(normalize(p.displayName))
      ));
    }

    if (match) {
      usedPlayerIds.add(match.id);
      newLineup[slotId] = {
        ...match,
        slotId: slotId
      };
    }
  });

  // Fill remaining slots if any starter was unmatched
  slotOrder.forEach(slotId => {
    if (!newLineup[slotId]) {
      const fallback = allPlayers.find(p => !usedPlayerIds.has(p.id));
      if (fallback) {
        usedPlayerIds.add(fallback.id);
        newLineup[slotId] = {
          ...fallback,
          slotId: slotId
        };
      }
    }
  });

  const newBench = allPlayers.filter(p => !usedPlayerIds.has(p.id)).map(p => {
    const copy = { ...p };
    delete copy.slotId;
    return copy;
  });

  return {
    ...team,
    defaultFormation: officialModule,
    module: officialModule,
    coach: sos.coach || team.coach,
    attackRating: sos.attackRating || team.attackRating || 3,
    defenseRating: sos.defenseRating || team.defenseRating || 3,
    keyPoints: sos.keyPoints || team.keyPoints || [],
    ballottaggi: sos.ballottaggi || team.ballottaggi || [],
    rig: sos.rig || team.rig || [],
    pun: sos.pun || team.pun || [],
    corner: sos.corner || team.corner || [],
    lineup: newLineup,
    bench: newBench
  };
});

console.log('Successfully aligned all 20 teams!');
// Write updated INITIAL_TEAMS back to initialData.js
const initialDataPath = 'js/data/initialData.js';
let content = fs.readFileSync(initialDataPath, 'utf-8');

const prefixMatch = content.match(/^([\s\S]*?export const INITIAL_TEAMS = )/);
if (prefixMatch) {
  const newContent = prefixMatch[1] + JSON.stringify(updatedTeams, null, 2) + ';\n';
  fs.writeFileSync(initialDataPath, newContent, 'utf-8');
  console.log('initialData.js updated successfully with official starters in tactical slots!');
} else {
  console.error('Could not match INITIAL_TEAMS export in initialData.js');
}
