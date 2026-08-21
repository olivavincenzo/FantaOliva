/**
 * Store centrale e reattivo dell'applicazione FantaOliva.
 * Gestisce stato delle squadre, formazioni, giocatori, ballottaggi, note, storico snapshot e persistenza.
 */

import { INITIAL_TEAMS, CSV_PLAYER_CATALOG } from './data/initialData.js';
import { FORMATIONS } from './data/formations.js';
import { SOS_STRATEGY_1 } from './data/sosStrategy1.js';
import { SOS_TEAMS_DATA } from './data/sosTeamsData.js';
import { getPlayerIndices, TITOLARITA_LABELS, AFFIDABILITA_LABELS, INTEGRITA_LABELS } from './data/playerIndices.js';
import { deepClone, generateId } from './utils/helpers.js';

const STORAGE_KEY = 'fantaoliva_app_data_v2026_27_master';
const SNAPSHOTS_KEY = 'fantaoliva_snapshots_v2026_27_master';
const CUSTOM_CATALOG_KEY = 'fantaoliva_custom_catalog_v2026_27';
const STRATEGIES_KEY = 'fantaoliva_custom_strategies_v1';
const ACTIVE_STRATEGY_KEY = 'fantaoliva_active_strategy_id_v1';

const DEFAULT_STRATEGIES = [
  SOS_STRATEGY_1
];

class Store {
  constructor() {
    this.teams = [];
    this.playerCatalog = [];
    this.strategies = [];
    this.activeStrategyId = 'strat_1';
    this.currentTeamId = 'inter';
    this.selectedPlayerId = null;
    this.selectedSlotId = null;
    this.showTacticalLines = true;
    this.isFreeDragMode = true;
    this.pitchLayoutMode = (typeof localStorage !== 'undefined' ? localStorage.getItem('fantaoliva_pitch_layout_mode') : null) || 'pitch'; // 'pitch' | 'list'
    this.activeBenchFilter = 'ALL';
    this.snapshots = [];
    this.favoritePlayerIds = new Set();
    this.subscribers = new Map();
  }

  init() {
    // Carica dati da localStorage o inizializza con i dati di default
    try {
      const savedFavs = localStorage.getItem('fantaoliva_favorites');
      if (savedFavs) {
        this.favoritePlayerIds = new Set(JSON.parse(savedFavs));
      }

      const savedCatalog = localStorage.getItem(CUSTOM_CATALOG_KEY);
      if (savedCatalog) {
        try {
          this.playerCatalog = JSON.parse(savedCatalog);
        } catch (e) {
          this.playerCatalog = deepClone(CSV_PLAYER_CATALOG);
        }
      } else {
        this.playerCatalog = deepClone(CSV_PLAYER_CATALOG);
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.teams = JSON.parse(saved);

        // Sincronizza automaticamente eventuali nuovi giocatori di INITIAL_TEAMS nella panchina
        INITIAL_TEAMS.forEach(initTeam => {
          const t = this.teams.find(team => team.id === initTeam.id);
          if (t) {
            t.bench = t.bench || [];
            const existingIds = new Set();
            Object.values(t.lineup || {}).forEach(p => {
              if (p) {
                if (p.id) existingIds.add(p.id);
                if (p.csvId) existingIds.add(p.csvId.toString());
                if (p.name) existingIds.add(p.name.toLowerCase());
              }
            });
            t.bench.forEach(p => {
              if (p) {
                if (p.id) existingIds.add(p.id);
                if (p.csvId) existingIds.add(p.csvId.toString());
                if (p.name) existingIds.add(p.name.toLowerCase());
              }
            });

            const allInitPlayers = [
              ...Object.values(initTeam.lineup || {}),
              ...(initTeam.bench || [])
            ].filter(Boolean);

            let addedCount = 0;
            allInitPlayers.forEach(p => {
              const hasId = p.id && existingIds.has(p.id);
              const hasCsv = p.csvId && existingIds.has(p.csvId.toString());
              const hasName = p.name && existingIds.has(p.name.toLowerCase());

              if (!hasId && !hasCsv && !hasName) {
                t.bench.push(deepClone(p));
                if (p.id) existingIds.add(p.id);
                if (p.csvId) existingIds.add(p.csvId.toString());
                if (p.name) existingIds.add(p.name.toLowerCase());
                addedCount++;
              }
            });
          }
        });
        this.saveToStorage();
      } else {
        this.teams = deepClone(INITIAL_TEAMS);
        this.saveToStorage();
      }

      // Arricchimento dati ufficiali squadre SOS Fanta (Coach, Modulo, Attacco/Difesa, KeyPoints, Specialisti)
      this.teams.forEach(t => {
        const sos = this.getTeamSosData(t);
        if (sos) {
          t.coach = sos.coach || t.coach;
          t.module = sos.module || t.defaultFormation;
          t.defaultFormation = sos.module || t.defaultFormation;
          t.attackRating = sos.attackRating;
          t.defenseRating = sos.defenseRating;
          t.coachImage = sos.coachImage;
          t.keyPoints = sos.keyPoints || [];
          t.keyRoles = sos.keyRoles || [];
          t.rig = sos.rig || [];
          t.pun = sos.pun || [];
          t.corner = sos.corner || [];
          t.comment = sos.sosFantaComment || sos.comment || t.comment;
          t.sosFantaComment = sos.sosFantaComment || '';
        }
      });

      // Sincronizzazione formazioni e titolari ufficiali negli slot tattici corretti
      this.syncOfficialLineups();

      // Reset e sincronizzazione ballottaggi ufficiali su ciascuna scheda giocatore
      this.syncOfficialBallottaggi();

      const savedSnapshots = localStorage.getItem(SNAPSHOTS_KEY);
      if (savedSnapshots) {
        this.snapshots = JSON.parse(savedSnapshots);
      }

      // Caricamento Strategie Custom
      const savedStrategies = localStorage.getItem(STRATEGIES_KEY);
      if (savedStrategies) {
        try {
          this.strategies = JSON.parse(savedStrategies);
          if (!Array.isArray(this.strategies) || this.strategies.length === 0) {
            this.strategies = deepClone(DEFAULT_STRATEGIES);
          } else {
            // Aggiorna/integra la Strategia 1 (Guida all'Asta SOS Fanta) con tutti i 472 giocatori e le 20 fasce
            const strat1Index = this.strategies.findIndex(s => s.id === 'strat_1');
            const defaultStrat1 = DEFAULT_STRATEGIES[0];
            if (defaultStrat1) {
              if (strat1Index !== -1) {
                this.strategies[strat1Index] = deepClone(defaultStrat1);
              } else {
                this.strategies.unshift(deepClone(defaultStrat1));
              }
            }
          }
        } catch (e) {
          this.strategies = deepClone(DEFAULT_STRATEGIES);
        }
      } else {
        this.strategies = deepClone(DEFAULT_STRATEGIES);
        this.saveStrategies();
      }

      // Garanzia che ogni strategia abbia tiersByRole e assignments
      this.strategies.forEach(s => {
        if (!s.tiersByRole) s.tiersByRole = { P: [], D: [], C: [], A: [] };
        if (!s.assignments) s.assignments = {};
        ['P', 'D', 'C', 'A'].forEach(r => {
          if (!Array.isArray(s.tiersByRole[r])) s.tiersByRole[r] = [];
        });
      });
      this.saveStrategies();

      const savedActiveStrat = localStorage.getItem(ACTIVE_STRATEGY_KEY);
      if (savedActiveStrat && this.strategies.some(s => s.id === savedActiveStrat)) {
        this.activeStrategyId = savedActiveStrat;
      } else if (this.strategies.length > 0) {
        this.activeStrategyId = this.strategies[0].id;
      }

      // Seleziona il primo titolare della squadra di partenza
      const currentTeam = this.getCurrentTeam();
      if (currentTeam) {
        const firstSlot = Object.keys(currentTeam.lineup || {}).find(k => currentTeam.lineup[k]);
        if (firstSlot) {
          this.selectedSlotId = firstSlot;
          this.selectedPlayerId = currentTeam.lineup[firstSlot].id;
        }
      }
    } catch (e) {
      console.warn('Errore nel parsing del localStorage, ripristino dati demo:', e);
      this.teams = deepClone(INITIAL_TEAMS);
      this.playerCatalog = deepClone(CSV_PLAYER_CATALOG);
      this.strategies = deepClone(DEFAULT_STRATEGIES);
      this.activeStrategyId = 'strat_1';
      this.saveToStorage();
      this.saveStrategies();
    }
  }

  saveCatalog(catalog = null) {
    try {
      if (catalog) this.playerCatalog = catalog;
      localStorage.setItem(CUSTOM_CATALOG_KEY, JSON.stringify(this.playerCatalog));
    } catch (e) {
      console.error('Errore salvataggio catalogo:', e);
    }
  }

  saveStrategies() {
    try {
      localStorage.setItem(STRATEGIES_KEY, JSON.stringify(this.strategies));
      localStorage.setItem(ACTIVE_STRATEGY_KEY, this.activeStrategyId);
    } catch (e) {
      console.error('Errore salvataggio strategie:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.teams));
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(this.snapshots));
      this.saveStrategies();
    } catch (e) {
      console.error('Errore salvataggio localStorage:', e);
    }
  }

  // --- PUB / SUB EVENT SYSTEM ---
  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event).push(callback);

    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        this.subscribers.set(event, callbacks.filter(cb => cb !== callback));
      }
    };
  }

  emit(event, data) {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Errore nel subscriber per evento "${event}":`, err);
        }
      });
    }
  }

  getState() {
    return {
      currentTeam: this.getCurrentTeam(),
      formation: this.getCurrentFormation(),
      selectedPlayer: this.getSelectedPlayer(),
      selectedSlotId: this.selectedSlotId,
      showTacticalLines: this.showTacticalLines,
      isFreeDragMode: this.isFreeDragMode,
      activeBenchFilter: this.activeBenchFilter,
      snapshots: this.getSnapshotsForCurrentTeam()
    };
  }

  // --- SQUADRE ---
  getAllTeams() {
    return this.teams;
  }

  getTeams() {
    return this.teams;
  }

  getTeam(teamId) {
    return this.teams.find(t => t.id === teamId) || null;
  }

  getTeamForPlayer(playerId) {
    if (!playerId) return null;
    for (const team of this.teams) {
      if (team.lineup) {
        for (const slotId of Object.keys(team.lineup)) {
          if (team.lineup[slotId] && team.lineup[slotId].id === playerId) {
            return team;
          }
        }
      }
      if (team.bench && team.bench.some(p => p && p.id === playerId)) {
        return team;
      }
      if (team.players && team.players.some(p => p && p.id === playerId)) {
        return team;
      }
    }
    return this.getCurrentTeam();
  }

  getCurrentTeam() {
    return this.getTeam(this.currentTeamId) || this.teams[0] || null;
  }

  getTeamSosData(teamOrCode) {
    if (!teamOrCode) return null;
    const code = typeof teamOrCode === 'string' ? teamOrCode.toUpperCase() : (teamOrCode.shortName || teamOrCode.code || teamOrCode.id || '').toUpperCase();
    const name = typeof teamOrCode === 'string' ? teamOrCode.toLowerCase() : (teamOrCode.name || '').toLowerCase();
    const id = typeof teamOrCode === 'object' ? (teamOrCode.id || '').toLowerCase() : '';
    return SOS_TEAMS_DATA[code] || SOS_TEAMS_DATA[name] || (id && SOS_TEAMS_DATA[id]) || null;
  }

  setTeam(teamId, selectedPlayerId = null, selectedSlotId = null) {
    if (this.currentTeamId === teamId && !selectedPlayerId) return;
    const team = this.getTeam(teamId);
    if (!team) return;

    this.currentTeamId = teamId;

    if (selectedPlayerId) {
      this.selectedPlayerId = selectedPlayerId;
      this.selectedSlotId = selectedSlotId;
    } else {
      this.selectedPlayerId = null;
      this.selectedSlotId = null;

      if (team.lineup) {
        const firstSlot = Object.keys(team.lineup).find(k => team.lineup[k]);
        if (firstSlot) {
          this.selectedSlotId = firstSlot;
          this.selectedPlayerId = team.lineup[firstSlot].id;
        }
      }
      if (!this.selectedPlayerId && team.bench && team.bench.length > 0) {
        this.selectedPlayerId = team.bench[0].id;
      }
    }

    this.emit('team:changed', this.getCurrentTeam());
    this.emit('formation:changed', this.getCurrentFormation());
    this.emit('player:selected', {
      player: this.getSelectedPlayer(),
      slotId: this.selectedSlotId
    });
  }

  resetCurrentTeamDefault() {
    const original = INITIAL_TEAMS.find(t => t.id === this.currentTeamId);
    if (!original) return;

    const index = this.teams.findIndex(t => t.id === this.currentTeamId);
    if (index !== -1) {
      this.teams[index] = deepClone(original);
      this.syncOfficialBallottaggi();
      this.saveToStorage();
      this.emit('team:reset', this.getCurrentTeam());
      this.emit('team:changed', this.getCurrentTeam());
      this.emit('formation:changed', this.getCurrentFormation());

      const team = this.getCurrentTeam();
      const firstSlot = Object.keys(team.lineup || {}).find(k => team.lineup[k]);
      if (firstSlot) {
        this.selectPlayer(team.lineup[firstSlot].id, firstSlot);
      }
    }
  }

  setTeamPersonalNotes(teamId, notes) {
    const team = this.getTeam(teamId);
    if (!team) return;
    team.personalNotes = notes || '';
    team.notes = notes || '';
    this.saveToStorage();
    this.emit('team:notesUpdated', { teamId, notes: team.personalNotes });
  }

  getTeamPersonalNotes(teamId) {
    const team = this.getTeam(teamId);
    if (!team) return '';
    return team.personalNotes ?? team.notes ?? '';
  }

  // --- CATALOGO GENERALE CSV ---
  getPlayerCatalog(query = '', roleFilter = '') {
    const q = query.trim().toLowerCase();
    const currentSquadIds = new Set(this.getAllPlayers().map(p => (p.csvId || p.name).toLowerCase()));
    const catalog = (this.playerCatalog && this.playerCatalog.length > 0) ? this.playerCatalog : CSV_PLAYER_CATALOG;

    return catalog.filter(p => {
      // Escludi giocatori già presenti nella squadra attiva
      if (currentSquadIds.has((p.csvId || p.name).toLowerCase())) return false;

      if (roleFilter && roleFilter !== 'ALL') {
        if (roleFilter === 'P' && p.classicRole !== 'P') return false;
        if (roleFilter === 'D' && p.classicRole !== 'D') return false;
        if (roleFilter === 'C' && p.classicRole !== 'C') return false;
        if (roleFilter === 'A' && p.classicRole !== 'A') return false;
      }

      if (!q) return true;
      return p.name.toLowerCase().includes(q) ||
             (p.teamName && p.teamName.toLowerCase().includes(q)) ||
             (p.mantraRole && p.mantraRole.toLowerCase().includes(q)) ||
             p.role.toLowerCase().includes(q);
    });
  }

  // --- MODULO / FORMAZIONE ---
  getCurrentFormation() {
    const team = this.getCurrentTeam();
    if (!team) return null;
    const formationKey = team.defaultFormation || '4-3-3';
    return FORMATIONS[formationKey] || FORMATIONS['4-3-3'];
  }

  setFormation(formationId) {
    const team = this.getCurrentTeam();
    if (!team || !FORMATIONS[formationId]) return;

    team.defaultFormation = formationId;
    team.customPositions = {}; // reset custom drag coordinates when formation changes

    this.saveToStorage();
    this.emit('formation:changed', this.getCurrentFormation());
  }

  // --- GIOCATORI ---
  getPlayer(playerId) {
    if (!playerId) return null;
    const strId = String(playerId).trim();
    const strLower = strId.toLowerCase();

    const matchPlayer = (p) => {
      if (!p) return false;
      if (p.id && String(p.id).trim() === strId) return true;
      if (p.csvId && String(p.csvId).trim() === strId) return true;
      if (p.id && String(p.id).toLowerCase() === strLower) return true;
      if (p.name && p.name.toLowerCase().trim() === strLower) return true;
      if (p.displayName && p.displayName.toLowerCase().trim() === strLower) return true;
      return false;
    };

    const currentTeam = this.getCurrentTeam();

    // 1. Cerca prima nella squadra attiva (lineup o panchina)
    if (currentTeam) {
      if (currentTeam.lineup) {
        for (const slotId of Object.keys(currentTeam.lineup)) {
          if (matchPlayer(currentTeam.lineup[slotId])) {
            return currentTeam.lineup[slotId];
          }
        }
      }
      if (currentTeam.bench) {
        const found = currentTeam.bench.find(p => matchPlayer(p));
        if (found) return found;
      }
      if (currentTeam.players) {
        const found = currentTeam.players.find(p => matchPlayer(p));
        if (found) return found;
      }
    }

    // 2. Fallback di ricerca su tutte le squadre
    for (const team of this.teams) {
      if (team.lineup) {
        for (const slotId of Object.keys(team.lineup)) {
          if (matchPlayer(team.lineup[slotId])) {
            return team.lineup[slotId];
          }
        }
      }
      if (team.bench) {
        const found = team.bench.find(p => matchPlayer(p));
        if (found) return found;
      }
      if (team.players) {
        const found = team.players.find(p => matchPlayer(p));
        if (found) return found;
      }
    }

    // 3. Fallback sul catalogo completo CSV
    const catalog = (this.playerCatalog && this.playerCatalog.length > 0) ? this.playerCatalog : CSV_PLAYER_CATALOG;
    if (typeof catalog !== 'undefined' && Array.isArray(catalog)) {
      const cat = catalog.find(p => matchPlayer(p));
      if (cat) return cat;
    }

    return null;
  }

  getPlayerIndices(player) {
    if (!player) return getPlayerIndices(null);
    // Se il player ha già indici salvati su di sé
    if (player.titIndex !== undefined || player.affIndex !== undefined || player.infIndex !== undefined) {
      const tit = player.titIndex ?? 3;
      const aff = player.affIndex ?? 3;
      const inf = player.infIndex ?? 3;
      return {
        titIndex: tit,
        titDesc: TITOLARITA_LABELS[tit] || 'Nelle rotazioni',
        affIndex: aff,
        affDesc: AFFIDABILITA_LABELS[aff] || 'Alterna buone prestazioni',
        infIndex: inf,
        infDesc: INTEGRITA_LABELS[inf] || 'Pochissimi infortuni',
        xfmv: player.xfmv
      };
    }
    return getPlayerIndices(player);
  }

  getPlayerSuggestedPrice(player) {
    if (!player) return null;
    if (player.suggestedPrice !== undefined && player.suggestedPrice !== null) {
      return Number(player.suggestedPrice);
    }
    const strat = this.getActiveStrategy();
    const id = player.id || '';
    const csvId = player.csvId ? player.csvId.toString() : '';
    const normName = (player.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const normDisp = (player.displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    if (strat?.playerPrices) {
      const price = strat.playerPrices[id] ?? 
                    (csvId && strat.playerPrices[csvId]) ?? 
                    strat.playerPrices[normName] ?? 
                    strat.playerPrices[normDisp];
      if (price !== undefined && price !== null) return Number(price);
    }

    if (player.price !== undefined && player.price !== null) return Number(player.price);
    if (player.quotazioni?.fvm !== undefined && player.quotazioni.fvm !== null && player.quotazioni.fvm !== '-') {
      return Number(player.quotazioni.fvm);
    }
    return null;
  }

  getAllPlayers() {
    const team = this.getCurrentTeam();
    if (!team) return [];
    const list = [];
    if (team.lineup) {
      for (const p of Object.values(team.lineup)) {
        if (p) list.push(p);
      }
    }
    if (team.bench) {
      for (const p of team.bench) {
        if (p) list.push(p);
      }
    }
    return list.length > 0 ? list : (team.players || []);
  }

  getAllPlayersFlat() {
    // 1. Mappa giocatori con modifiche/presenza nelle squadre per conservare disponibilità, appetibilità, note, ecc.
    const modifiedMap = new Map();
    const playerTeamMap = new Map();

    for (const team of this.teams) {
      if (team.lineup) {
        for (const p of Object.values(team.lineup)) {
          if (p && p.id) {
            modifiedMap.set(p.id, p);
            playerTeamMap.set(p.id, { teamId: team.id, teamName: team.name, isStarter: true });
          }
        }
      }
      if (team.bench) {
        for (const p of team.bench) {
          if (p && p.id) {
            modifiedMap.set(p.id, p);
            playerTeamMap.set(p.id, { teamId: team.id, teamName: team.name, isStarter: false });
          }
        }
      }
      if (team.players) {
        for (const p of team.players) {
          if (p && p.id) {
            modifiedMap.set(p.id, p);
            if (!playerTeamMap.has(p.id)) {
              playerTeamMap.set(p.id, { teamId: team.id, teamName: team.name, isStarter: false });
            }
          }
        }
      }
    }

    // 2. Se playerCatalog è presente, usa il catalogo completo come base
    const catalog = (this.playerCatalog && this.playerCatalog.length > 0) ? this.playerCatalog : CSV_PLAYER_CATALOG;
    const baseList = (typeof catalog !== 'undefined' && Array.isArray(catalog) && catalog.length > 0)
      ? catalog
      : [];

    const all = [];
    const seenIds = new Set();

    // 3. Processa i calciatori del catalogo completo
    baseList.forEach(catPlayer => {
      if (!catPlayer || !catPlayer.id) return;
      seenIds.add(catPlayer.id);

      const mod = modifiedMap.get(catPlayer.id);
      const teamInfo = playerTeamMap.get(catPlayer.id);

      const p = mod ? { ...catPlayer, ...mod } : { ...catPlayer };

      p.teamId = p.teamId || teamInfo?.teamId || '';
      p.teamName = p.teamName || teamInfo?.teamName || p.club || 'Serie A';
      p.isFavorite = this.favoritePlayerIds.has(p.id);
      if (p.isAvailable === undefined) {
        p.isAvailable = true;
      }

      all.push(p);
    });

    // 4. Aggiungi eventuali altri giocatori presenti nelle squadre ma non nel catalogo
    modifiedMap.forEach((modPlayer, id) => {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const teamInfo = playerTeamMap.get(id);
        all.push({
          ...modPlayer,
          teamId: modPlayer.teamId || teamInfo?.teamId || '',
          teamName: modPlayer.teamName || teamInfo?.teamName || 'Serie A',
          isAvailable: modPlayer.isAvailable !== false,
          isFavorite: this.favoritePlayerIds.has(id)
        });
      }
    });

    return all;
  }

  getSelectedPlayer() {
    if (!this.selectedPlayerId) return null;
    return this.getPlayer(this.selectedPlayerId);
  }

  selectPlayer(playerId, slotId = null) {
    this.selectedPlayerId = playerId;
    this.selectedSlotId = slotId;

    if (!slotId && playerId) {
      const team = this.getCurrentTeam();
      if (team && team.lineup) {
        for (const [sId, p] of Object.entries(team.lineup)) {
          if (p && p.id === playerId) {
            this.selectedSlotId = sId;
            break;
          }
        }
      }
    }

    this.emit('player:selected', {
      player: this.getSelectedPlayer(),
      slotId: this.selectedSlotId
    });
  }

  updatePlayer(playerId, updateData) {
    const player = this.getPlayer(playerId);
    if (!player) return;

    Object.assign(player, updateData);

    // Se il giocatore è presente anche nel catalogo custom, aggiorna e salva il catalogo
    if (this.playerCatalog && Array.isArray(this.playerCatalog)) {
      const catPlayer = this.playerCatalog.find(p => p && (p.id === playerId || (p.name && player.name && p.name.toLowerCase() === player.name.toLowerCase())));
      if (catPlayer) {
        Object.assign(catPlayer, updateData);
        this.saveCatalog();
      }
    }

    const team = this.getCurrentTeam();
    if (team && team.setPieces) {
      if (updateData.isPenaltyTaker || updateData.rigorista) {
        if (!team.setPieces.rigoristi.includes(player.name)) {
          team.setPieces.rigoristi.unshift(player.name);
        }
      } else if (updateData.isPenaltyTaker === false || updateData.rigorista === false) {
        team.setPieces.rigoristi = team.setPieces.rigoristi.filter(n => n !== player.name);
      }

      if (updateData.isFreeKickTaker || updateData.punizioni) {
        if (!team.setPieces.punizioni.includes(player.name)) {
          team.setPieces.punizioni.unshift(player.name);
        }
      } else if (updateData.isFreeKickTaker === false || updateData.punizioni === false) {
        team.setPieces.punizioni = team.setPieces.punizioni.filter(n => n !== player.name);
      }

      if (updateData.isCornerTaker || updateData.corner) {
        if (!team.setPieces.corner.includes(player.name)) {
          team.setPieces.corner.unshift(player.name);
        }
      } else if (updateData.isCornerTaker === false || updateData.corner === false) {
        team.setPieces.corner = team.setPieces.corner.filter(n => n !== player.name);
      }
    }

    this.saveToStorage();
    this.emit('player:updated', player);
    if (team) {
      this.emit('formation:changed', this.getCurrentFormation());
      this.emit('team:changed', team);
    }
  }

  addNewPlayer(newPlayerData) {
    const team = this.getCurrentTeam();
    if (!team) return null;

    const id = generateId(`ply_${team.shortName.toLowerCase()}`);
    const name = newPlayerData.name || newPlayerData.displayName || 'Nuovo Giocatore';

    // Preserva integralmente le statistiche reali se presenti dal catalogo CSV
    const stats = newPlayerData.stats ? {
      fantamedia: Number(newPlayerData.stats.fantamedia) || 6.0,
      mediaVoto: Number(newPlayerData.stats.mediaVoto) || 6.0,
      presenze: Number(newPlayerData.stats.presenze) || 0,
      gol: Number(newPlayerData.stats.gol) || 0,
      assist: Number(newPlayerData.stats.assist) || 0,
      ammonizioni: Number(newPlayerData.stats.ammonizioni) || 0,
      espulsioni: Number(newPlayerData.stats.espulsioni) || 0,
      golSubiti: Number(newPlayerData.stats.golSubiti) || 0,
      rigoriParati: Number(newPlayerData.stats.rigoriParati) || 0,
      rigoriCalciati: Number(newPlayerData.stats.rigoriCalciati) || 0,
      rigoriSegnati: Number(newPlayerData.stats.rigoriSegnati) || 0,
      rigoriSbagliati: Number(newPlayerData.stats.rigoriSbagliati) || 0,
      titolarita: Number(newPlayerData.stats.titolarita) || 50
    } : {
      fantamedia: Number(newPlayerData.fantamedia) || 6.0,
      mediaVoto: Number(newPlayerData.mediaVoto) || 6.0,
      presenze: 0,
      gol: Number(newPlayerData.gol) || 0,
      assist: Number(newPlayerData.assist) || 0,
      ammonizioni: Number(newPlayerData.ammonizioni) || 0,
      espulsioni: Number(newPlayerData.espulsioni) || 0,
      golSubiti: 0,
      rigoriParati: 0,
      rigoriCalciati: 0,
      rigoriSegnati: 0,
      rigoriSbagliati: 0,
      titolarita: Number(newPlayerData.titolaritaPerc) || 50
    };

    const isPenalty = newPlayerData.isPenaltyTaker ?? Boolean(newPlayerData.rigorista);
    const isFreeKick = newPlayerData.isFreeKickTaker ?? Boolean(newPlayerData.punizioni);
    const isCorner = newPlayerData.isCornerTaker ?? Boolean(newPlayerData.corner);

    const player = {
      id,
      csvId: newPlayerData.csvId || '',
      name,
      displayName: name,
      teamName: team.name,
      teamId: team.id,
      role: newPlayerData.role || 'C',
      classicRole: newPlayerData.classicRole || newPlayerData.fantaRole || 'C',
      mantraRole: newPlayerData.mantraRole || newPlayerData.role || 'C',
      fantaRole: newPlayerData.classicRole || newPlayerData.fantaRole || 'C',
      status: newPlayerData.status || 'riserva',
      isPenaltyTaker: isPenalty,
      isFreeKickTaker: isFreeKick,
      isCornerTaker: isCorner,
      rigorista: isPenalty,
      punizioni: isFreeKick,
      corner: isCorner,
      quotazioni: newPlayerData.quotazioni || {
        qtA: Number(newPlayerData.qtA) || 1,
        qtI: Number(newPlayerData.qtI) || 1,
        diff: Number(newPlayerData.diff) || 0,
        qtAM: Number(newPlayerData.qtAM) || 1,
        qtIM: Number(newPlayerData.qtIM) || 1,
        diffM: Number(newPlayerData.diffM) || 0,
        fvm: Number(newPlayerData.fvm) || 1,
        fvmM: Number(newPlayerData.fvmM) || 1
      },
      stats,
      substitutes: newPlayerData.substitutes || [],
      positionNotes: newPlayerData.positionNotes || newPlayerData.comment || '',
      fantaComment: newPlayerData.fantaComment || ''
    };

    team.bench = team.bench || [];
    team.bench.unshift(player); // Aggiungi in cima alla panchina
    this.saveToStorage();
    this.emit('player:added', player);
    this.emit('team:changed', team);
    this.selectPlayer(player.id);
    return player;
  }

  // --- GESTIONE CAMPO / SLOTS ---
  getLineupPlayers() {
    const team = this.getCurrentTeam();
    const formation = this.getCurrentFormation();
    if (!team || !formation) return [];

    if (!team.lineup) team.lineup = {};

    return formation.slots.map(slot => {
      let player = team.lineup[slot.id] || null;
      if (!player && team.formationSlots && team.formationSlots[slot.id]) {
        player = this.getPlayer(team.formationSlots[slot.id]);
      }
      const customPos = team.customPositions?.[slot.id];

      return {
        slot,
        player,
        x: customPos ? customPos.x : slot.x,
        y: customPos ? customPos.y : slot.y,
        isCustom: Boolean(customPos)
      };
    });
  }

  getBenchPlayers() {
    const team = this.getCurrentTeam();
    if (!team) return [];
    return team.bench || [];
  }

  assignPlayerToSlot(slotId, playerId) {
    const team = this.getCurrentTeam();
    if (!team) return;

    if (!team.lineup) team.lineup = {};
    team.bench = team.bench || [];

    const targetPlayer = this.getPlayer(playerId);
    if (!targetPlayer) return;

    const prevPlayerInSlot = team.lineup[slotId];
    const oldSlotId = Object.keys(team.lineup).find(k => team.lineup[k] && team.lineup[k].id === playerId);

    if (oldSlotId && oldSlotId !== slotId) {
      team.lineup[oldSlotId] = prevPlayerInSlot || null;
      team.lineup[slotId] = targetPlayer;
    } else {
      team.bench = team.bench.filter(p => p.id !== playerId);
      if (prevPlayerInSlot) {
        team.bench.push(prevPlayerInSlot);
      }
      team.lineup[slotId] = targetPlayer;
    }

    this.saveToStorage();
    this.emit('formation:changed', this.getCurrentFormation());
    this.emit('team:changed', team);
    this.selectPlayer(playerId, slotId);
  }

  swapSlots(slotIdA, slotIdB) {
    const team = this.getCurrentTeam();
    if (!team || !team.lineup) return;

    const playerA = team.lineup[slotIdA];
    const playerB = team.lineup[slotIdB];

    team.lineup[slotIdA] = playerB;
    team.lineup[slotIdB] = playerA;

    this.saveToStorage();
    this.emit('formation:changed', this.getCurrentFormation());
  }

  updateCustomPosition(slotId, x, y) {
    const team = this.getCurrentTeam();
    if (!team) return;

    if (!team.customPositions) team.customPositions = {};
    team.customPositions[slotId] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };

    this.saveToStorage();
    this.emit('position:customized', { slotId, x, y });
  }

  resetCustomPositions() {
    const team = this.getCurrentTeam();
    if (!team) return;

    team.customPositions = {};
    this.saveToStorage();
    this.emit('formation:changed', this.getCurrentFormation());
  }

  toggleTacticalLines() {
    this.showTacticalLines = !this.showTacticalLines;
    this.emit('ui:linesToggled', this.showTacticalLines);
    return this.showTacticalLines;
  }

  toggleFreeDragMode() {
    this.isFreeDragMode = !this.isFreeDragMode;
    this.emit('ui:freeDragToggled', this.isFreeDragMode);
    return this.isFreeDragMode;
  }

  setBenchFilter(filter) {
    this.activeBenchFilter = filter;
    this.emit('bench:filterChanged', filter);
  }

  // --- GESTIONE SOSTITUTI ---
  addSubstitute(playerId, subPlayerId) {
    const player = this.getPlayer(playerId);
    if (!player) return;

    if (!player.substitutes) player.substitutes = [];
    if (!player.substitutes.includes(subPlayerId) && subPlayerId !== playerId) {
      player.substitutes.push(subPlayerId);
      this.saveToStorage();
      this.emit('player:updated', player);
      this.emit('formation:changed', this.getCurrentFormation());
    }
  }

  removeSubstitute(playerId, subPlayerId) {
    const player = this.getPlayer(playerId);
    if (!player || !player.substitutes) return;

    player.substitutes = player.substitutes.filter(id => id !== subPlayerId);
    this.saveToStorage();
    this.emit('player:updated', player);
    this.emit('formation:changed', this.getCurrentFormation());
  }

  reorderSubstitutes(playerId, newOrderArray) {
    const player = this.getPlayer(playerId);
    if (!player) return;

    player.substitutes = newOrderArray;
    this.saveToStorage();
    this.emit('player:updated', player);
    this.emit('formation:changed', this.getCurrentFormation());
  }

  // --- GESTIONE BALLOTTAGGI ---
  getBallottaggiForCurrentTeam() {
    const team = this.getCurrentTeam();
    return team?.ballottaggi || [];
  }

  getBallottaggioForSlot(slotId) {
    const team = this.getCurrentTeam();
    if (!team) return null;
    if (team.ballottaggi && team.ballottaggi.length > 0) {
      const found = team.ballottaggi.find(b => b.slotId === slotId);
      if (found) return found;
    }
    if (team.lineup && team.lineup[slotId]) {
      return this.getBallottaggioForPlayer(team.lineup[slotId].id);
    }
    return null;
  }

  getBallottaggioForPlayer(playerId) {
    if (!playerId) return null;
    const team = this.getCurrentTeam();
    if (!team) return null;

    const player = this.getPlayer(playerId) || (team.lineup && Object.values(team.lineup).find(p => p && (p.id === playerId || p.csvId === playerId))) || null;
    const normName = (player?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normDisp = (player?.displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const csvIdStr = player?.csvId ? player.csvId.toString() : '';

    // 1. Cerca nei ballottaggi espliciti salvati della squadra
    if (team.ballottaggi && Array.isArray(team.ballottaggi) && team.ballottaggi.length > 0) {
      const found = team.ballottaggi.find(b => {
        if (b.playerAId === playerId || b.playerBId === playerId) return true;
        if (player && (b.playerAId === player.id || b.playerBId === player.id)) return true;
        if (Array.isArray(b.duel) && b.duel.some(d => {
          const dPid = d.playerId || '';
          const dCsv = d.csvId ? d.csvId.toString() : '';
          const dNorm = (d.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return dPid === playerId || (player && dPid === player.id) ||
                 (csvIdStr && dCsv === csvIdStr) ||
                 (dNorm && (dNorm === normName || dNorm === normDisp || (normName.length > 3 && dNorm.includes(normName)) || (dNorm.length > 3 && normName.includes(dNorm))));
        })) return true;
        return false;
      });

      if (found) {
        if (Array.isArray(found.duel) && found.duel.length > 0) {
          const myIdx = found.duel.findIndex(d => {
            const dPid = d.playerId || '';
            const dCsv = d.csvId ? d.csvId.toString() : '';
            const dNorm = (d.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return dPid === playerId || (player && dPid === player.id) ||
                   (csvIdStr && dCsv === csvIdStr) ||
                   (dNorm && (dNorm === normName || dNorm === normDisp || (normName.length > 3 && dNorm.includes(normName)) || (dNorm.length > 3 && normName.includes(dNorm))));
          });
          const myEntry = myIdx !== -1 ? found.duel[myIdx] : found.duel[0];
          const opponents = myIdx !== -1 ? found.duel.filter((_, idx) => idx !== myIdx) : found.duel.slice(1);
          const primaryOpp = opponents[0] || {};
          const substitutes = opponents.map(op => {
            const rawName = op.name || op.displayName || '';
            const nameClean = rawName.includes('(') ? rawName : `${rawName}${op.perc ? ` (${op.perc}%)` : ''}`;
            return {
              displayName: nameClean,
              name: nameClean,
              perc: op.perc,
              playerId: op.playerId
            };
          });

          return {
            id: found.id,
            playerAId: player?.id || playerId,
            percentageA: myEntry?.perc ?? found.percA ?? 50,
            percA: myEntry?.perc ?? found.percA ?? 50,
            playerBId: primaryOpp.playerId || found.playerBId,
            opponentName: primaryOpp.name ? (primaryOpp.name.includes('(') ? primaryOpp.name : `${primaryOpp.name} (${primaryOpp.perc}%)`) : (found.playerAId === playerId ? `${found.playerBName} (${found.percB}%)` : `${found.playerAName} (${found.percA}%)`),
            percentageB: primaryOpp.perc ?? found.percB ?? 50,
            percB: primaryOpp.perc ?? found.percB ?? 50,
            substitutes,
            duel: found.duel
          };
        }

        const isPlayerA = found.playerAId === playerId || (player && found.playerAId === player.id);
        const oppName = isPlayerA ? found.playerBName : found.playerAName;
        const oppPerc = isPlayerA ? (found.percB ?? 50) : (found.percA ?? 50);
        const myPerc = isPlayerA ? (found.percA ?? 50) : (found.percB ?? 50);
        const oppFormatted = oppName.includes('(') ? oppName : `${oppName} (${oppPerc}%)`;

        return {
          id: found.id,
          playerAId: playerId,
          percentageA: myPerc,
          percA: myPerc,
          playerBId: isPlayerA ? found.playerBId : found.playerAId,
          opponentName: oppFormatted,
          percentageB: oppPerc,
          percB: oppPerc,
          substitutes: [{
            name: oppFormatted,
            displayName: oppFormatted,
            perc: oppPerc,
            playerId: isPlayerA ? found.playerBId : found.playerAId
          }],
          duel: found.duel || []
        };
      }
    }

    // 2. Controllo nei ballottaggi ufficiali SOS Fanta della squadra
    const sosData = this.getTeamSosData(team);
    const officialBallottaggi = sosData?.ballottaggi || [];
    if (Array.isArray(officialBallottaggi) && officialBallottaggi.length > 0) {
      for (const duel of officialBallottaggi) {
        if (Array.isArray(duel)) {
          const myIdx = duel.findIndex(d => {
            const dPid = d.playerId || '';
            const dCsv = d.csvId ? d.csvId.toString() : '';
            const dNorm = (d.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return dPid === playerId || (player && dPid === player.id) ||
                   (csvIdStr && dCsv === csvIdStr) ||
                   (dNorm && (dNorm === normName || dNorm === normDisp || (normName.length > 3 && dNorm.includes(normName)) || (dNorm.length > 3 && normName.includes(dNorm))));
          });

          if (myIdx !== -1) {
            const myEntry = duel[myIdx];
            const opponents = duel.filter((_, idx) => idx !== myIdx);
            const primaryOpp = opponents[0] || {};
            const substitutes = opponents.map(op => {
              const rawName = op.name || op.displayName || '';
              const nameClean = rawName.includes('(') ? rawName : `${rawName}${op.perc ? ` (${op.perc}%)` : ''}`;
              return {
                displayName: nameClean,
                name: nameClean,
                perc: op.perc,
                playerId: op.playerId
              };
            });

            const oppFormatted = primaryOpp.name ? (primaryOpp.name.includes('(') ? primaryOpp.name : `${primaryOpp.name} (${primaryOpp.perc}%)`) : 'Compagno';

            return {
              playerAId: player?.id || playerId,
              percentageA: myEntry.perc ?? 50,
              percA: myEntry.perc ?? 50,
              playerBId: primaryOpp ? primaryOpp.playerId : null,
              opponentName: oppFormatted,
              percentageB: primaryOpp.perc ?? 50,
              percB: primaryOpp.perc ?? 50,
              substitutes,
              duel
            };
          }
        }
      }
    }

    if (player?.ballottaggio && typeof player.ballottaggio === 'object') {
      const pA = player.ballottaggio.perc || player.ballottaggio.percentage || 60;
      const vsName = player.ballottaggio.vs || player.ballottaggio.opponent || 'Compagno';
      const pB = player.ballottaggio.opponentPerc || (100 - pA);
      const vsFormatted = vsName.includes('(') ? vsName : `${vsName} (${pB}%)`;
      const subs = Array.isArray(player.substitutes) && player.substitutes.length > 0
        ? player.substitutes.map(s => {
            const raw = s.displayName || s.name || '';
            return {
              ...s,
              name: raw.includes('(') ? raw : `${raw}${s.perc ? ` (${s.perc}%)` : ''}`,
              displayName: raw.includes('(') ? raw : `${raw}${s.perc ? ` (${s.perc}%)` : ''}`
            };
          })
        : [{
            name: vsFormatted,
            displayName: vsFormatted,
            perc: pB
          }];

      return {
        playerAId: player.id,
        playerBId: player.ballottaggio.opponentId || null,
        opponentName: vsFormatted,
        percentageA: pA,
        percA: pA,
        percentageB: pB,
        percB: pB,
        substitutes: subs,
        duel: player.ballottaggio.duel || []
      };
    }

    // 3. Risoluzione intelligente per status 'ballottaggio' o sostituti diretti (1ª, 2ª, 3ª scelta)
    if (player.status === 'ballottaggio' || (Array.isArray(player.substitutes) && player.substitutes.length > 0)) {
      const subs = Array.isArray(player.substitutes) ? player.substitutes : [];
      const subPlayers = subs.map(id => this.getPlayer(id) || this.getAllPlayers().find(p => p.id === id)).filter(Boolean);

      if (subPlayers.length > 0) {
        const sub1 = subPlayers[0];
        const parts = subPlayers.map((s, idx) => `${idx + 1}ª scelta ${s.displayName || s.name}`);
        const duelLabel = parts.join(' · ');

        return {
          playerAId: player.id,
          playerBId: sub1.id,
          opponentName: sub1.displayName || sub1.name,
          substitutes: subPlayers,
          duelLabel,
          percentageA: 60,
          percA: 60,
          percentageB: 40,
          percB: 40
        };
      }
    }

    return null;
  }

  saveBallottaggio(ballottaggioData) {
    const team = this.getCurrentTeam();
    if (!team) return;

    if (!team.ballottaggi) team.ballottaggi = [];

    const existingIndex = team.ballottaggi.findIndex(b => b.id === ballottaggioData.id || b.slotId === ballottaggioData.slotId);

    if (existingIndex !== -1) {
      team.ballottaggi[existingIndex] = { ...team.ballottaggi[existingIndex], ...ballottaggioData };
    } else {
      team.ballottaggi.push({
        id: ballottaggioData.id || generateId('ball'),
        ...ballottaggioData
      });
    }

    this.saveToStorage();
    this.emit('ballottaggio:updated', team.ballottaggi);
  }

  deleteBallottaggio(ballottaggioId) {
    const team = this.getCurrentTeam();
    if (!team || !team.ballottaggi) return;

    team.ballottaggi = team.ballottaggi.filter(b => b.id !== ballottaggioId);
    this.saveToStorage();
    this.emit('ballottaggio:updated', team.ballottaggi);
  }

  syncOfficialLineups() {
    if (!this.teams || !Array.isArray(this.teams)) return;
    
    this.teams.forEach(team => {
      const initialTeam = INITIAL_TEAMS.find(t => t.id === team.id || (t.shortName && t.shortName.toUpperCase() === (team.shortName || team.id || '').toUpperCase()));
      if (initialTeam && initialTeam.lineup) {
        team.defaultFormation = initialTeam.defaultFormation;
        team.module = initialTeam.module || initialTeam.defaultFormation;
        team.lineup = deepClone(initialTeam.lineup);
        team.bench = deepClone(initialTeam.bench || []);
      }
    });
  }

  syncOfficialBallottaggi() {
    if (!this.teams || !Array.isArray(this.teams)) return;

    const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    this.teams.forEach(team => {
      const sosData = this.getTeamSosData(team);
      const allPlayers = [
        ...Object.values(team.lineup || {}),
        ...(team.bench || [])
      ].filter(Boolean);

      // 1. Reset ballottaggio data for all players in this team
      allPlayers.forEach(p => {
        p.ballottaggio = null;
        p.ballottaggioWith = null;
        p.substitutes = [];
        if (p.status === 'ballottaggio') {
          p.status = 'disponibile';
        }
      });

      team.ballottaggi = [];

      if (!sosData || !Array.isArray(sosData.ballottaggi)) return;

      // Helper per trovare il giocatore della rosa
      const findSquadPlayer = (entry) => {
        if (!entry) return null;
        const eId = entry.playerId || '';
        const eCsv = entry.csvId ? entry.csvId.toString() : '';
        const eNorm = normalize(entry.name);

        return allPlayers.find(p => {
          if (eId && p.id === eId) return true;
          if (eCsv && p.csvId && p.csvId.toString() === eCsv) return true;
          const pNorm = normalize(p.name);
          const dNorm = normalize(p.displayName);
          if (eNorm && (pNorm === eNorm || dNorm === eNorm)) return true;
          if (eNorm.length > 3 && (pNorm.includes(eNorm) || dNorm.includes(eNorm) || eNorm.includes(pNorm))) return true;
          return false;
        }) || null;
      };

      // 2. Assegna i ballottaggi ufficiali ai giocatori trovati
      sosData.ballottaggi.forEach((duel, duelIdx) => {
        if (!Array.isArray(duel) || duel.length < 2) return;

        const matchedItems = duel.map(entry => ({
          entry,
          player: findSquadPlayer(entry)
        }));

        const firstEntry = duel[0];
        const secondEntry = duel[1];
        const playerA = matchedItems[0].player;
        const playerB = matchedItems[1].player;

        const duelRecord = {
          id: `ball_${team.id || team.shortName}_${duelIdx + 1}`,
          playerAId: playerA ? playerA.id : firstEntry.playerId,
          playerAName: firstEntry.name,
          percA: firstEntry.perc,
          playerBId: playerB ? playerB.id : secondEntry.playerId,
          playerBName: secondEntry.name,
          percB: secondEntry.perc,
          duel: duel
        };
        team.ballottaggi.push(duelRecord);

        // Aggiorna ciascun oggetto giocatore nella scheda
        matchedItems.forEach((m, idx) => {
          if (!m.player) return;
          const opponents = duel.filter((_, oIdx) => oIdx !== idx);
          const primaryOpp = opponents[0];

          m.player.status = 'ballottaggio';
          m.player.ballottaggio = {
            vs: primaryOpp ? primaryOpp.name : 'Compagno',
            perc: m.entry.perc,
            opponentPerc: primaryOpp ? primaryOpp.perc : 50,
            duel: duel
          };
          m.player.substitutes = opponents.map(op => ({
            id: op.playerId,
            name: op.name,
            displayName: op.name,
            perc: op.perc
          }));
        });
      });
    });
  }

  // --- STORICO & SNAPSHOTS ---
  getSnapshotsForCurrentTeam() {
    return this.snapshots.filter(s => s.teamId === this.currentTeamId);
  }

  createSnapshot(name) {
    const team = this.getCurrentTeam();
    if (!team) return null;

    const snapshot = {
      id: generateId('snap'),
      teamId: team.id,
      teamName: team.name,
      formationId: team.defaultFormation,
      name: name || `Versione ${this.getSnapshotsForCurrentTeam().length + 1}`,
      timestamp: new Date().toISOString(),
      formationSlots: deepClone(team.formationSlots),
      customPositions: deepClone(team.customPositions || {}),
      players: deepClone(team.players),
      ballottaggi: deepClone(team.ballottaggi || [])
    };

    this.snapshots.unshift(snapshot);
    this.saveToStorage();
    this.emit('snapshot:created', snapshot);
    return snapshot;
  }

  restoreSnapshot(snapshotId) {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return false;

    const team = this.getTeam(snapshot.teamId);
    if (!team) return false;

    team.defaultFormation = snapshot.formationId;
    team.formationSlots = deepClone(snapshot.formationSlots);
    team.customPositions = deepClone(snapshot.customPositions || {});
    team.players = deepClone(snapshot.players);
    team.ballottaggi = deepClone(snapshot.ballottaggi || []);

    this.currentTeamId = team.id;
    this.saveToStorage();

    this.emit('team:changed', team);
    this.emit('formation:changed', this.getCurrentFormation());
    this.emit('snapshot:restored', snapshot);
    return true;
  }

  deleteSnapshot(snapshotId) {
    this.snapshots = this.snapshots.filter(s => s.id !== snapshotId);
    this.saveToStorage();
    this.emit('snapshot:deleted', snapshotId);
  }

  setView(view) {
    if (this.activeView === view) return;
    this.activeView = view;
    this.emit('view:changed', view);
  }

  setPitchLayoutMode(mode) {
    if (this.pitchLayoutMode === mode) return;
    this.pitchLayoutMode = mode;
    try {
      localStorage.setItem('fantaoliva_pitch_layout_mode', mode);
    } catch (e) { /* ignored */ }
    this.emit('pitch:layoutChanged', mode);
  }

  togglePitchLayoutMode() {
    const nextMode = this.pitchLayoutMode === 'pitch' ? 'list' : 'pitch';
    this.setPitchLayoutMode(nextMode);
    return nextMode;
  }

  // --- GUIDA ASTA PER SLOT (4 SLOT DA 10 GIOCATORI PER RUOLO) ---
  // --- GESTIONE DISPONIBILITÀ ASTA FANTACALCIO (PRESO / DISPONIBILE) ---
  togglePlayerAvailability(playerId, forceState = null) {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    const current = player.isAvailable !== false;
    const newState = forceState !== null ? Boolean(forceState) : !current;
    player.isAvailable = newState;

    this.saveToStorage();
    this.emit('player:updated', player);
    this.emit('formation:changed', this.getCurrentFormation());
    this.emit('auction:availabilityChanged', { playerId, isAvailable: newState });
    return newState;
  }

  resetAllAuctionAvailability() {
    for (const team of this.teams) {
      if (team.lineup) {
        for (const p of Object.values(team.lineup)) {
          if (p) p.isAvailable = true;
        }
      }
      if (team.bench) {
        for (const p of team.bench) {
          if (p) p.isAvailable = true;
        }
      }
    }
    this.saveToStorage();
    this.emit('player:updated', null);
    this.emit('formation:changed', this.getCurrentFormation());
    this.emit('team:changed', this.getCurrentTeam());
  }

  // --- PREFERITI CALCIATORI ---
  isPlayerFavorite(playerId) {
    if (!playerId) return false;
    if (this.favoritePlayerIds.has(playerId)) return true;
    const str = String(playerId).trim();
    if (this.favoritePlayerIds.has(str)) return true;
    const player = this.getPlayer(playerId);
    if (player) {
      if (player.id && this.favoritePlayerIds.has(player.id)) return true;
      if (player.csvId && this.favoritePlayerIds.has(player.csvId.toString())) return true;
    }
    return false;
  }

  togglePlayerFavorite(playerId) {
    if (!playerId) return false;
    const strId = String(playerId).trim();
    const player = this.getPlayer(playerId);
    const isFav = this.isPlayerFavorite(playerId);

    const idsToToggle = new Set([playerId, strId]);
    if (player) {
      if (player.id) idsToToggle.add(player.id);
      if (player.csvId) idsToToggle.add(player.csvId.toString());
    }

    idsToToggle.forEach(id => {
      if (isFav) {
        this.favoritePlayerIds.delete(id);
      } else {
        this.favoritePlayerIds.add(id);
      }
    });

    try {
      localStorage.setItem('fantaoliva_favorites', JSON.stringify(Array.from(this.favoritePlayerIds)));
    } catch (e) {
      console.warn('Errore salvataggio preferiti:', e);
    }

    const matchesThisPlayer = (p) => {
      if (!p) return false;
      if (idsToToggle.has(p.id)) return true;
      if (p.csvId && idsToToggle.has(p.csvId.toString())) return true;
      if (player && p.name && player.name && p.name.toLowerCase() === player.name.toLowerCase()) return true;
      return false;
    };

    // Aggiorna stato in memoria in tutte le squadre
    for (const team of this.teams) {
      if (team.lineup) {
        for (const p of Object.values(team.lineup)) {
          if (matchesThisPlayer(p)) p.isFavorite = !isFav;
          if (p && p.substitutes) {
            for (const s of p.substitutes) {
              if (matchesThisPlayer(s)) s.isFavorite = !isFav;
            }
          }
        }
      }
      if (team.bench) {
        for (const p of team.bench) {
          if (matchesThisPlayer(p)) p.isFavorite = !isFav;
        }
      }
    }

    if (this.playerCatalog && Array.isArray(this.playerCatalog)) {
      const catP = this.playerCatalog.find(p => matchesThisPlayer(p));
      if (catP) catP.isFavorite = !isFav;
    }

    this.saveToStorage();
    this.emit('player:updated', player);
    this.emit('favorite:toggled', { playerId, isFavorite: !isFav });
    return !isFav;
  }

  // --- GESTIONE STRATEGIE CUSTOM ---

  getRoleCategory(roleOrPlayer) {
    if (!roleOrPlayer) return 'C';
    if (typeof roleOrPlayer === 'object') {
      const f = (roleOrPlayer.classicRole || roleOrPlayer.fantaRole || '').toUpperCase();
      if (['P', 'D', 'C', 'A'].includes(f)) return f;

      const r = (roleOrPlayer.role || '').toUpperCase();
      if (['P', 'POR'].includes(r)) return 'P';
      if (['D', 'DC', 'DD', 'DS', 'TD', 'TS'].includes(r)) return 'D';
      if (['C', 'M', 'CC', 'T', 'E'].includes(r)) return 'C';
      if (['A', 'PC', 'W'].includes(r)) return 'A';
      return 'C';
    }
    const str = String(roleOrPlayer).toUpperCase();
    if (['P', 'D', 'C', 'A'].includes(str)) return str;
    if (['POR'].includes(str)) return 'P';
    if (['DC', 'DD', 'DS', 'TD', 'TS'].includes(str)) return 'D';
    if (['M', 'CC', 'T', 'E'].includes(str)) return 'C';
    if (['PC', 'W'].includes(str)) return 'A';
    return 'C';
  }

  getStrategies() {
    return this.strategies || [];
  }

  getActiveStrategyId() {
    return this.activeStrategyId || (this.strategies[0]?.id ?? 'strat_1');
  }

  getActiveStrategy() {
    const activeId = this.getActiveStrategyId();
    let strat = this.strategies.find(s => s.id === activeId);
    if (!strat && this.strategies.length > 0) {
      strat = this.strategies[0];
      this.activeStrategyId = strat.id;
    }
    return strat || null;
  }

  setActiveStrategy(strategyId) {
    if (this.activeStrategyId === strategyId) return;
    const strat = this.strategies.find(s => s.id === strategyId);
    if (!strat) return;
    this.activeStrategyId = strategyId;
    this.saveStrategies();
    this.emit('strategy:changed', strat);
  }

  createStrategy(name) {
    const cleanName = (name || '').trim() || `Nuova Strategia ${this.strategies.length + 1}`;
    const newStrat = {
      id: `strat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      createdAt: Date.now(),
      tiersByRole: {
        P: [
          { id: `tier_p_${Date.now()}_1`, name: 'Super-Top', color: '#f59e0b' },
          { id: `tier_p_${Date.now()}_2`, name: 'Top', color: '#38bdf8' },
          { id: `tier_p_${Date.now()}_3`, name: 'Fascia Alta', color: '#4ade80' }
        ],
        D: [
          { id: `tier_d_${Date.now()}_1`, name: 'Super-Top', color: '#f59e0b' },
          { id: `tier_d_${Date.now()}_2`, name: 'Sotto i Super', color: '#fb923c' },
          { id: `tier_d_${Date.now()}_3`, name: 'Top', color: '#38bdf8' },
          { id: `tier_d_${Date.now()}_4`, name: 'Fascia Alta', color: '#4ade80' }
        ],
        C: [
          { id: `tier_c_${Date.now()}_1`, name: 'Super-Top', color: '#f59e0b' },
          { id: `tier_c_${Date.now()}_2`, name: 'Top / Rigoristi', color: '#fb923c' },
          { id: `tier_c_${Date.now()}_3`, name: 'Semi-Top', color: '#38bdf8' },
          { id: `tier_c_${Date.now()}_4`, name: 'Titolari Costanti', color: '#4ade80' }
        ],
        A: [
          { id: `tier_a_${Date.now()}_1`, name: 'Super-Top', color: '#f59e0b' },
          { id: `tier_a_${Date.now()}_2`, name: 'Top', color: '#fb923c' },
          { id: `tier_a_${Date.now()}_3`, name: 'Semi-Top', color: '#38bdf8' },
          { id: `tier_a_${Date.now()}_4`, name: 'Titolari', color: '#4ade80' }
        ]
      },
      assignments: {}
    };

    this.strategies.push(newStrat);
    this.activeStrategyId = newStrat.id;
    this.saveStrategies();
    this.emit('strategy:created', newStrat);
    this.emit('strategy:changed', newStrat);
    return newStrat;
  }

  duplicateStrategy(strategyId) {
    const src = this.strategies.find(s => s.id === strategyId) || this.getActiveStrategy();
    if (!src) return null;

    const copy = deepClone(src);
    copy.id = `strat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    copy.name = `${src.name} (Copia)`;
    copy.createdAt = Date.now();

    this.strategies.push(copy);
    this.activeStrategyId = copy.id;
    this.saveStrategies();
    this.emit('strategy:created', copy);
    this.emit('strategy:changed', copy);
    return copy;
  }

  renameStrategy(strategyId, newName) {
    const strat = this.strategies.find(s => s.id === strategyId);
    if (!strat) return false;
    strat.name = (newName || '').trim() || strat.name;
    this.saveStrategies();
    this.emit('strategy:updated', strat);
    return true;
  }

  deleteStrategy(strategyId) {
    if (this.strategies.length <= 1) {
      console.warn('Impossibile eliminare l\'unica strategia rimasta.');
      return false;
    }
    const idx = this.strategies.findIndex(s => s.id === strategyId);
    if (idx === -1) return false;

    this.strategies.splice(idx, 1);
    if (this.activeStrategyId === strategyId) {
      this.activeStrategyId = this.strategies[0].id;
    }
    this.saveStrategies();
    this.emit('strategy:deleted', strategyId);
    this.emit('strategy:changed', this.getActiveStrategy());
    return true;
  }

  getTiersForRole(roleKey, strategyId = null) {
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    if (!strat || !strat.tiersByRole) return [];
    const r = this.getRoleCategory(roleKey);
    return strat.tiersByRole[r] || [];
  }

  addTier(roleKey, name, color = '#38bdf8', strategyId = null) {
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    if (!strat) return null;
    const r = this.getRoleCategory(roleKey);
    if (!strat.tiersByRole[r]) strat.tiersByRole[r] = [];

    const cleanName = (name || '').trim() || `Nuova Fascia ${strat.tiersByRole[r].length + 1}`;
    const newTier = {
      id: `tier_${r.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 3)}`,
      name: cleanName,
      color: color || '#38bdf8'
    };

    strat.tiersByRole[r].push(newTier);
    this.saveStrategies();
    this.emit('strategy:updated', strat);
    return newTier;
  }

  updateTier(roleKey, tierId, name, color, strategyId = null) {
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    if (!strat) return false;
    const r = this.getRoleCategory(roleKey);
    const list = strat.tiersByRole[r] || [];
    const tier = list.find(t => t.id === tierId);
    if (!tier) return false;

    if (name !== undefined) tier.name = (name || '').trim() || tier.name;
    if (color !== undefined) tier.color = color;

    this.saveStrategies();
    this.emit('strategy:updated', strat);
    return true;
  }

  removeTier(roleKey, tierId, strategyId = null) {
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    if (!strat) return false;
    const r = this.getRoleCategory(roleKey);
    const list = strat.tiersByRole[r] || [];
    const idx = list.findIndex(t => t.id === tierId);
    if (idx === -1) return false;

    list.splice(idx, 1);

    // Rimuovi assegnazioni per i giocatori assegnati a questo tier
    if (strat.assignments) {
      Object.keys(strat.assignments).forEach(playerId => {
        if (strat.assignments[playerId] === tierId) {
          delete strat.assignments[playerId];
        }
      });
    }

    this.saveStrategies();
    this.emit('strategy:updated', strat);
    return true;
  }

  moveTier(roleKey, tierId, direction, strategyId = null) {
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    if (!strat) return false;
    const r = this.getRoleCategory(roleKey);
    const list = strat.tiersByRole[r] || [];
    const idx = list.findIndex(t => t.id === tierId);
    if (idx === -1) return false;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return false;

    const [item] = list.splice(idx, 1);
    list.splice(targetIdx, 0, item);

    this.saveStrategies();
    this.emit('strategy:updated', strat);
    return true;
  }

  reorderTiers(roleKey, orderedTierIds, strategyId = null) {
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    if (!strat) return false;
    const r = this.getRoleCategory(roleKey);
    const list = strat.tiersByRole[r] || [];
    
    const reordered = [];
    orderedTierIds.forEach(id => {
      const found = list.find(t => t.id === id);
      if (found) reordered.push(found);
    });

    list.forEach(t => {
      if (!reordered.some(x => x.id === t.id)) {
        reordered.push(t);
      }
    });

    strat.tiersByRole[r] = reordered;
    this.saveStrategies();
    this.emit('strategy:updated', strat);
    return true;
  }

  assignPlayerTier(playerOrId, tierId, strategyId = null) {
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    if (!strat) return false;
    if (!strat.assignments) strat.assignments = {};

    const p = typeof playerOrId === 'object' ? playerOrId : this.getPlayer(playerOrId);
    const playerId = typeof playerOrId === 'object' ? playerOrId.id : playerOrId;

    if (!tierId || tierId === 'none') {
      if (playerId) delete strat.assignments[playerId];
      if (p?.id) delete strat.assignments[p.id];
      if (p?.csvId) delete strat.assignments[p.csvId.toString()];
      if (p?.name) delete strat.assignments[p.name.toLowerCase().trim()];
      if (p) p.strategyTierId = null;
    } else {
      if (playerId) strat.assignments[playerId] = tierId;
      if (p?.id) strat.assignments[p.id] = tierId;
      if (p?.csvId) strat.assignments[p.csvId.toString()] = tierId;
      if (p?.name) strat.assignments[p.name.toLowerCase().trim()] = tierId;
      if (p) p.strategyTierId = tierId;
    }

    if (p && (p.id || playerId)) {
      this.updatePlayer(p.id || playerId, { strategyTierId: (!tierId || tierId === 'none') ? null : tierId });
    } else {
      this.saveStrategies();
      this.saveToStorage();
    }

    this.emit('strategy:playerAssigned', { playerId: p?.id || playerId, tierId, strategyId: strat.id });
    this.emit('player:updated', { id: p?.id || playerId });
    return true;
  }

  getPlayerTierId(playerOrId, strategyId = null) {
    if (!playerOrId) return null;
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();

    const p = typeof playerOrId === 'object' ? playerOrId : this.getPlayer(playerOrId);
    const pId = typeof playerOrId === 'object' ? playerOrId.id : String(playerOrId).trim();

    if (strat && strat.assignments) {
      if (pId && strat.assignments[pId]) return strat.assignments[pId];
      if (pId && strat.assignments[pId.toLowerCase()]) return strat.assignments[pId.toLowerCase()];
      if (p?.id && strat.assignments[p.id]) return strat.assignments[p.id];
      if (p?.csvId && strat.assignments[p.csvId.toString()]) return strat.assignments[p.csvId.toString()];
      if (p?.name && strat.assignments[p.name.toLowerCase().trim()]) return strat.assignments[p.name.toLowerCase().trim()];
      if (p?.displayName && strat.assignments[p.displayName.toLowerCase().trim()]) return strat.assignments[p.displayName.toLowerCase().trim()];
    }

    if (p && p.strategyTierId) {
      return p.strategyTierId;
    }

    return null;
  }

  getPlayerTier(playerOrId, strategyId = null) {
    if (!playerOrId) return null;
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    if (!strat || !strat.tiersByRole || !strat.assignments) return null;

    const tierId = this.getPlayerTierId(playerOrId, strategyId);
    if (!tierId) return null;

    const role = this.getRoleCategory(playerOrId);
    const tiers = strat.tiersByRole[role] || [];
    const idx = tiers.findIndex(t => t.id === tierId);
    if (idx !== -1) {
      return {
        ...tiers[idx],
        order: idx + 1,
        totalInRole: tiers.length
      };
    }

    // Ricerca globale su tutti i ruoli della strategia se non trovato nel ruolo atteso
    for (const rKey of ['P', 'D', 'C', 'A']) {
      const tList = strat.tiersByRole[rKey] || [];
      const fIdx = tList.findIndex(t => t.id === tierId);
      if (fIdx !== -1) {
        return {
          ...tList[fIdx],
          order: fIdx + 1,
          totalInRole: tList.length
        };
      }
    }
    return null;
  }

  getPlayersCountByTier(roleKey, strategyId = null) {
    const strat = strategyId ? this.strategies.find(s => s.id === strategyId) : this.getActiveStrategy();
    const counts = {};
    if (!strat) return counts;

    const r = this.getRoleCategory(roleKey);
    const tiers = strat.tiersByRole[r] || [];
    tiers.forEach(t => { counts[t.id] = 0; });
    counts['none'] = 0;

    const allPlayers = this.getAllPlayersFlat();
    const rolePlayers = allPlayers.filter(p => this.getRoleCategory(p) === r);

    rolePlayers.forEach(p => {
      const tId = strat.assignments ? strat.assignments[p.id] : null;
      if (tId && counts[tId] !== undefined) {
        counts[tId]++;
      } else {
        counts['none']++;
      }
    });

    return counts;
  }

  // --- EXPORT / IMPORT JSON COMPLETO (tutte le squadre) ---

  exportStateJson() {
    const exportData = {
      version: 'fantaoliva_v2026_27',
      exportDate: new Date().toISOString(),
      teams: this.teams,
      snapshots: this.snapshots,
      strategies: this.strategies,
      activeStrategyId: this.activeStrategyId,
      currentTeamId: this.currentTeamId,
      currentFormationId: this.currentFormationId
    };
    return JSON.stringify(exportData, null, 2);
  }

  importStateJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Verifica validità base
      if (!data.teams || typeof data.teams !== 'object') {
        console.error('JSON non valido: manca il campo "teams".');
        return false;
      }

      // Importa tutte le squadre
      this.teams = data.teams;

      // Importa snapshot se presenti
      if (Array.isArray(data.snapshots)) {
        this.snapshots = data.snapshots;
      }

      // Importa strategie se presenti
      if (Array.isArray(data.strategies) && data.strategies.length > 0) {
        this.strategies = data.strategies;
        if (data.activeStrategyId && this.strategies.some(s => s.id === data.activeStrategyId)) {
          this.activeStrategyId = data.activeStrategyId;
        } else {
          this.activeStrategyId = this.strategies[0].id;
        }
      }

      // Ripristina squadra e modulo se presenti
      if (data.currentTeamId && this.teams[data.currentTeamId]) {
        this.currentTeamId = data.currentTeamId;
      }
      if (data.currentFormationId) {
        this.currentFormationId = data.currentFormationId;
      }

      this.saveToStorage();
      this.emit('team:changed', this.currentTeamId);
      this.emit('formation:changed', this.currentFormationId);
      this.emit('strategy:changed', this.getActiveStrategy());
      return true;
    } catch (e) {
      console.error('Errore importazione JSON:', e);
      return false;
    }
  }
}

export const store = new Store();
