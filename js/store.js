/**
 * Store centrale e reattivo dell'applicazione FantaOliva.
 * Gestisce stato delle squadre, formazioni, giocatori, ballottaggi, note, storico snapshot e persistenza.
 */

import { INITIAL_TEAMS, CSV_PLAYER_CATALOG } from './data/initialData.js';
import { FORMATIONS } from './data/formations.js';
import { deepClone, generateId } from './utils/helpers.js';

const STORAGE_KEY = 'fantaoliva_app_data_v2026_27_master';
const SNAPSHOTS_KEY = 'fantaoliva_snapshots_v2026_27_master';

class Store {
  constructor() {
    this.teams = [];
    this.currentTeamId = 'inter';
    this.selectedPlayerId = null;
    this.selectedSlotId = null;
    this.showTacticalLines = true;
    this.isFreeDragMode = true;
    this.activeBenchFilter = 'ALL';
    this.snapshots = [];
    this.subscribers = new Map();
  }

  init() {
    // Carica dati da localStorage o inizializza con i dati di default
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.teams = JSON.parse(saved);
      } else {
        this.teams = deepClone(INITIAL_TEAMS);
        this.saveToStorage();
      }

      const savedSnapshots = localStorage.getItem(SNAPSHOTS_KEY);
      if (savedSnapshots) {
        this.snapshots = JSON.parse(savedSnapshots);
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
      this.saveToStorage();
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.teams));
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(this.snapshots));
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

  getTeam(teamId) {
    return this.teams.find(t => t.id === teamId) || null;
  }

  getCurrentTeam() {
    return this.getTeam(this.currentTeamId) || this.teams[0] || null;
  }

  setTeam(teamId) {
    if (this.currentTeamId === teamId) return;
    const team = this.getTeam(teamId);
    if (!team) return;

    this.currentTeamId = teamId;
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

  // --- CATALOGO GENERALE CSV ---
  getPlayerCatalog(query = '', roleFilter = '') {
    const q = query.trim().toLowerCase();
    const currentSquadIds = new Set(this.getAllPlayers().map(p => (p.csvId || p.name).toLowerCase()));

    return CSV_PLAYER_CATALOG.filter(p => {
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
    const currentTeam = this.getCurrentTeam();

    // 1. Cerca prima nella squadra attiva (lineup o panchina)
    if (currentTeam) {
      if (currentTeam.lineup) {
        for (const slotId of Object.keys(currentTeam.lineup)) {
          if (currentTeam.lineup[slotId] && currentTeam.lineup[slotId].id === playerId) {
            return currentTeam.lineup[slotId];
          }
        }
      }
      if (currentTeam.bench) {
        const found = currentTeam.bench.find(p => p && p.id === playerId);
        if (found) return found;
      }
      if (currentTeam.players) {
        const found = currentTeam.players.find(p => p && p.id === playerId);
        if (found) return found;
      }
    }

    // 2. Fallback di ricerca su tutte le squadre
    for (const team of this.teams) {
      if (team.lineup) {
        for (const slotId of Object.keys(team.lineup)) {
          if (team.lineup[slotId] && team.lineup[slotId].id === playerId) {
            return team.lineup[slotId];
          }
        }
      }
      if (team.bench) {
        const found = team.bench.find(p => p && p.id === playerId);
        if (found) return found;
      }
      if (team.players) {
        const found = team.players.find(p => p && p.id === playerId);
        if (found) return found;
      }
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
    const team = this.getCurrentTeam();
    if (!team) return;

    const player = this.getPlayer(playerId);
    if (!player) return;

    Object.assign(player, updateData);

    // Sincronizza specialisti piazzati nella scheda squadra
    if (team.setPieces) {
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
    this.emit('formation:changed', this.getCurrentFormation());
    this.emit('team:changed', team);
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
      appetibilita: newPlayerData.appetibilita !== undefined ? Math.min(100, Math.max(0, Number(newPlayerData.appetibilita))) : (stats.titolarita ?? 50),
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
    if (!team || !team.ballottaggi) return null;
    return team.ballottaggi.find(b => b.slotId === slotId) || null;
  }

  getBallottaggioForPlayer(playerId) {
    const team = this.getCurrentTeam();
    if (!team || !team.ballottaggi) return null;
    return team.ballottaggi.find(b => b.playerAId === playerId || b.playerBId === playerId) || null;
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

  // --- NOTE SQUADRA ---
  updateTeamNotes(notes) {
    const team = this.getCurrentTeam();
    if (!team) return;

    team.teamNotes = notes;
    this.saveToStorage();
    this.emit('team:notesUpdated', notes);
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
      ballottaggi: deepClone(team.ballottaggi || []),
      teamNotes: team.teamNotes || ''
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
    team.teamNotes = snapshot.teamNotes;

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

  // --- GUIDA ASTA PER SLOT (4 SLOT DA 10 GIOCATORI PER RUOLO) ---
  getAuctionSlotsData(roleFilter = 'ALL', searchQuery = '', onlyAvailable = false) {
    // Mappa giocatori modificati in memoria per conservare modifiche su appetibilità e disponibilità
    const modifiedMap = new Map();
    for (const team of this.teams) {
      if (team.lineup) {
        for (const p of Object.values(team.lineup)) {
          if (p) modifiedMap.set(p.id, p);
        }
      }
      if (team.bench) {
        for (const p of team.bench) {
          if (p) modifiedMap.set(p.id, p);
        }
      }
    }

    const allPlayers = CSV_PLAYER_CATALOG.map(catPlayer => {
      const mod = modifiedMap.get(catPlayer.id);
      const p = mod ? { ...catPlayer, ...mod } : { ...catPlayer };

      if (p.isAvailable === undefined) {
        p.isAvailable = true;
      }

      // Se non ancora impostata manualmente, calcola appetibilità coerente basata su fantamedia e titolarità
      if (p.appetibilita === undefined) {
        const fm = p.stats?.fantamedia || 6.0;
        const tit = p.stats?.titolarita || 50;
        const gol = p.stats?.gol || 0;
        const ass = p.stats?.assist || 0;
        let baseApp = Math.round((tit * 0.45) + ((fm - 5.5) * 14) + (gol * 1.8) + (ass * 0.8));
        p.appetibilita = Math.min(100, Math.max(10, baseApp));
      }
      return p;
    });

    const roles = ['P', 'D', 'C', 'A'];
    const result = {};

    roles.forEach(roleKey => {
      let list = allPlayers.filter(p => (p.classicRole || p.fantaRole || 'C').toUpperCase() === roleKey);

      if (onlyAvailable) {
        list = list.filter(p => p.isAvailable !== false);
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(p => 
          p.name.toLowerCase().includes(q) || 
          (p.teamName && p.teamName.toLowerCase().includes(q)) ||
          (p.role && p.role.toLowerCase().includes(q))
        );
      }

      // Ordinamento decrescente per Appetibilità, poi Fantamedia, poi Presenze
      list.sort((a, b) => {
        const appA = a.appetibilita !== undefined ? Number(a.appetibilita) : 50;
        const appB = b.appetibilita !== undefined ? Number(b.appetibilita) : 50;
        if (appB !== appA) return appB - appA;
        const fmA = a.stats?.fantamedia || 6.0;
        const fmB = b.stats?.fantamedia || 6.0;
        if (fmB !== fmA) return fmB - fmA;
        return (b.stats?.presenze || 0) - (a.stats?.presenze || 0);
      });

      result[roleKey] = {
        slot1: list.slice(0, 10),
        slot2: list.slice(10, 20),
        slot3: list.slice(20, 30),
        slot4: list.slice(30, 40),
        totalAvailable: list.filter(p => p.isAvailable !== false).length,
        totalCount: list.length
      };
    });

    return result;
  }
}

export const store = new Store();
