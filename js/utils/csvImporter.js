/**
 * FantaOliva - Modulo Importazione File CSV Statistiche Fantacalcio
 * Permette di caricare qualsiasi CSV ufficiale e sincronizzare rose, statistiche e titolari.
 */

import { store } from '../store.js';
import { notify } from './notifications.js';

export class CsvImporter {
  constructor() {
    this.parsedData = null;
    this.modal = null;
    this.dropzone = null;
    this.fileInput = null;
    this.previewContainer = null;
    this.applyBtn = null;
  }

  init() {
    this.modal = document.querySelector('#import-csv-modal');
    this.dropzone = document.querySelector('#csv-dropzone');
    this.fileInput = document.querySelector('#csv-file-input');
    this.previewContainer = document.querySelector('#csv-preview-container');
    this.applyBtn = document.querySelector('#apply-csv-btn');

    this.bindEvents();
  }

  bindEvents() {
    const openBtn = document.querySelector('#open-import-csv-btn');
    const closeBtn = document.querySelector('#close-import-csv-btn');
    const cancelBtn = document.querySelector('#cancel-import-csv-btn');

    openBtn?.addEventListener('click', () => this.openModal());
    closeBtn?.addEventListener('click', () => this.closeModal());
    cancelBtn?.addEventListener('click', () => this.closeModal());

    // File Input change
    this.fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // Drag & Drop
    if (this.dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.add('is-dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.remove('is-dragover');
        });
      });

      this.dropzone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
          this.handleFile(file);
        } else {
          notify.error('Carica un file valido con estensione .csv');
        }
      });
    }

    // Applica modifiche
    this.applyBtn?.addEventListener('click', () => {
      if (this.parsedData) {
        this.applyDataToStore(this.parsedData);
      }
    });
  }

  openModal() {
    if (!this.modal) return;
    this.resetState();
    this.modal.classList.remove('hidden');
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
    this.resetState();
  }

  resetState() {
    this.parsedData = null;
    if (this.fileInput) this.fileInput.value = '';
    if (this.previewContainer) this.previewContainer.classList.add('hidden');
    if (this.applyBtn) this.applyBtn.classList.add('hidden');
    if (this.dropzone) this.dropzone.classList.remove('is-dragover');
  }

  handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        const result = this.parseCsv(csvContent);
        this.showPreview(file, result);
      } catch (err) {
        console.error('CSV parse error:', err);
        notify.error('Errore durante la lettura del file CSV: ' + err.message);
      }
    };
    reader.onerror = () => {
      notify.error('Impossibile leggere il file selezionato');
    };
    reader.readAsText(file, 'UTF-8');
  }

  parseCsv(text) {
    const lines = text.split(/\r?\n/);
    const rows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row = [];
      let insideQuote = false;
      let entry = '';

      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') {
          insideQuote = !insideQuote;
        } else if (c === ';' && !insideQuote) {
          row.push(entry.trim());
          entry = '';
        } else {
          entry += c;
        }
      }
      row.push(entry.trim());
      rows.push(row);
    }

    if (rows.length < 3) {
      throw new Error('Il file CSV non contiene righe sufficienti.');
    }

    // Identifica la riga di header (cerca colonne Id, R, Nome, Squadra)
    let headerIndex = 1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (rows[i].includes('Id') && rows[i].includes('Nome') && rows[i].includes('Squadra')) {
        headerIndex = i;
        break;
      }
    }

    const headers = rows[headerIndex];
    const colId = headers.indexOf('Id');
    const colR = headers.indexOf('R');
    const colRm = headers.findIndex(h => h === 'Rm' || h === 'RM');
    const colNome = headers.indexOf('Nome');
    const colSquadra = headers.indexOf('Squadra');
    const colQtA = headers.findIndex(h => h.startsWith('Qt.A') && !h.includes('M'));
    const colQtI = headers.findIndex(h => h.startsWith('Qt.I') && !h.includes('M'));
    const colFvm = headers.findIndex(h => h.startsWith('FVM') && !h.includes('M'));
    const colQtAM = headers.findIndex(h => h.includes('Qt.A M') || h.includes('Qt.AM'));
    const colQtIM = headers.findIndex(h => h.includes('Qt.I M') || h.includes('Qt.IM'));
    const colFvmM = headers.findIndex(h => h.includes('FVM M') || h.includes('FVMM'));
    const colPv = headers.indexOf('Pv');
    const colMv = headers.indexOf('Mv');
    const colFm = headers.indexOf('Fm');
    const colGf = headers.indexOf('Gf');
    const colGs = headers.indexOf('Gs');
    const colRp = headers.indexOf('Rp');
    const colRc = headers.indexOf('Rc');
    const colRplus = headers.indexOf('R+');
    const colRminus = headers.indexOf('R-');
    const colAss = headers.indexOf('Ass');
    const colAmm = headers.indexOf('Amm');
    const colEsp = headers.indexOf('Esp');

    const playersByTeam = {};
    let totalPlayers = 0;

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length <= Math.max(colNome, colSquadra)) continue;

      const teamName = r[colSquadra] ? r[colSquadra].trim() : '';
      const playerName = r[colNome] ? r[colNome].trim() : '';
      if (!teamName || !playerName) continue;

      const csvId = colId !== -1 ? r[colId] : `${i}`;
      const roleClassic = colR !== -1 ? r[colR] : 'C';
      const roleMantra = colRm !== -1 ? r[colRm] : '';

      const qtA = colQtA !== -1 ? parseInt(r[colQtA]) || 1 : null;
      const qtI = colQtI !== -1 ? parseInt(r[colQtI]) || 1 : null;
      const fvm = colFvm !== -1 ? parseInt(r[colFvm]) || 1 : null;
      const qtAM = colQtAM !== -1 ? parseInt(r[colQtAM]) || qtA : null;
      const qtIM = colQtIM !== -1 ? parseInt(r[colQtIM]) || qtI : null;
      const fvmM = colFvmM !== -1 ? parseInt(r[colFvmM]) || fvm : null;

      const pv = colPv !== -1 ? parseInt(r[colPv]) || 0 : 0;
      const mv = colMv !== -1 ? parseFloat((r[colMv] || '0').replace(',', '.')) || 0 : 0;
      const fm = colFm !== -1 ? parseFloat((r[colFm] || '0').replace(',', '.')) || 0 : 0;
      const gf = colGf !== -1 ? parseInt(r[colGf]) || 0 : 0;
      const gs = colGs !== -1 ? parseInt(r[colGs]) || 0 : 0;
      const rp = colRp !== -1 ? parseInt(r[colRp]) || 0 : 0;
      const rc = colRc !== -1 ? parseInt(r[colRc]) || 0 : 0;
      const rPlus = colRplus !== -1 ? parseInt(r[colRplus]) || 0 : 0;
      const rMinus = colRminus !== -1 ? parseInt(r[colRminus]) || 0 : 0;
      const ass = colAss !== -1 ? parseInt(r[colAss]) || 0 : 0;
      const amm = colAmm !== -1 ? parseInt(r[colAmm]) || 0 : 0;
      const esp = colEsp !== -1 ? parseInt(r[colEsp]) || 0 : 0;

      if (!playersByTeam[teamName]) {
        playersByTeam[teamName] = [];
      }

      playersByTeam[teamName].push({
        csvId,
        name: playerName,
        classicRole: roleClassic,
        mantraRole: roleMantra,
        quotazioni: qtA !== null ? {
          qtA: qtA || 1,
          qtI: qtI || 1,
          diff: (qtA && qtI) ? qtA - qtI : 0,
          qtAM: qtAM || qtA || 1,
          qtIM: qtIM || qtI || 1,
          diffM: (qtAM && qtIM) ? qtAM - qtIM : 0,
          fvm: fvm || 1,
          fvmM: fvmM || fvm || 1
        } : null,
        pv, mv, fm, gf, gs, rp, rc, rPlus, rMinus, ass, amm, esp
      });
      totalPlayers++;
    }

    return {
      playersByTeam,
      totalTeams: Object.keys(playersByTeam).length,
      totalPlayers
    };
  }

  showPreview(file, result) {
    this.parsedData = result;

    const nameEl = document.querySelector('#csv-file-name');
    const sizeEl = document.querySelector('#csv-file-size');
    const teamsEl = document.querySelector('#csv-teams-count');
    const playersEl = document.querySelector('#csv-players-count');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = `${Math.round(file.size / 1024)} KB`;
    if (teamsEl) teamsEl.textContent = result.totalTeams;
    if (playersEl) playersEl.textContent = result.totalPlayers;

    this.previewContainer?.classList.remove('hidden');
    this.applyBtn?.classList.remove('hidden');

    notify.info(`File CSV valido! Rilevate ${result.totalTeams} squadre e ${result.totalPlayers} giocatori.`);
  }

  mapMantraToTacticalRole(roleClassic, roleMantra) {
    const m = (roleMantra || '').trim();
    const c = (roleClassic || '').trim().toUpperCase();

    if (c === 'P' || m === 'Por') return 'POR';
    if (m.includes('Dc')) return 'DC';
    if (m.includes('Dd')) return 'TD';
    if (m.includes('Ds')) return 'TS';
    if (m.includes('E')) return 'E';
    if (m.includes('M')) return 'M';
    if (m.includes('C')) return 'C';
    if (m.includes('T')) return 'T';
    if (m.includes('W')) return 'W';
    if (m.includes('A')) return 'A';
    if (m.includes('Pc')) return 'PC';

    if (c === 'D') return 'DC';
    if (c === 'C') return 'C';
    if (c === 'A') return 'PC';
    return 'C';
  }

  applyDataToStore(result) {
    try {
      const teams = store.getAllTeams();
      let updatedPlayersCount = 0;

      for (const team of teams) {
        // Cerca la squadra per nome corrispondente
        const matchingTeamKey = Object.keys(result.playersByTeam).find(key => {
          return key.toLowerCase() === team.name.toLowerCase() ||
                 key.toLowerCase() === team.id.toLowerCase() ||
                 team.name.toLowerCase().includes(key.toLowerCase()) ||
                 key.toLowerCase().includes(team.name.toLowerCase());
        });

        if (!matchingTeamKey) continue;

        const csvPlayers = result.playersByTeam[matchingTeamKey];

        // 1. Aggiorna i giocatori già presenti nella lineup
        for (const slotId of Object.keys(team.lineup || {})) {
          const player = team.lineup[slotId];
          if (!player) continue;

          const match = csvPlayers.find(p => {
            return p.name.toLowerCase() === player.name.toLowerCase() ||
                   player.name.toLowerCase().includes(p.name.toLowerCase()) ||
                   p.name.toLowerCase().includes(player.name.toLowerCase());
          });

          if (match) {
            if (match.quotazioni) {
              player.quotazioni = match.quotazioni;
            }
            if (match.classicRole) player.classicRole = match.classicRole;
            if (match.mantraRole) player.mantraRole = match.mantraRole;

            player.stats = {
              fantamedia: match.fm,
              mediaVoto: match.mv,
              presenze: match.pv,
              gol: match.gf,
              assist: match.ass,
              ammonizioni: match.amm,
              espulsioni: match.esp,
              golSubiti: match.gs,
              rigoriParati: match.rp,
              rigoriCalciati: match.rc,
              rigoriSegnati: match.rPlus,
              rigoriSbagliati: match.rMinus,
              titolarita: Math.min(100, Math.round((match.pv / 38) * 100))
            };
            player.isPenaltyTaker = match.rc > 0 || match.rPlus > 0;
            updatedPlayersCount++;
          }
        }

        // 2. Aggiorna i giocatori in panchina o aggiungi quelli nuovi
        team.bench = team.bench || [];
        for (const csvP of csvPlayers) {
          const existingInLineup = Object.values(team.lineup || {}).find(p => p && p.name.toLowerCase() === csvP.name.toLowerCase());
          if (existingInLineup) continue;

          const existingInBench = team.bench.find(p => p && p.name.toLowerCase() === csvP.name.toLowerCase());
          if (existingInBench) {
            if (csvP.quotazioni) {
              existingInBench.quotazioni = csvP.quotazioni;
            }
            if (csvP.classicRole) existingInBench.classicRole = csvP.classicRole;
            if (csvP.mantraRole) existingInBench.mantraRole = csvP.mantraRole;

            existingInBench.stats = {
              fantamedia: csvP.fm,
              mediaVoto: csvP.mv,
              presenze: csvP.pv,
              gol: csvP.gf,
              assist: csvP.ass,
              ammonizioni: csvP.amm,
              espulsioni: csvP.esp,
              golSubiti: csvP.gs,
              rigoriParati: csvP.rp,
              rigoriCalciati: csvP.rc,
              rigoriSegnati: csvP.rPlus,
              rigoriSbagliati: csvP.rMinus,
              titolarita: Math.min(100, Math.round((csvP.pv / 38) * 100))
            };
            existingInBench.isPenaltyTaker = csvP.rc > 0 || csvP.rPlus > 0;
            updatedPlayersCount++;
          } else {
            // Nuovo giocatore da aggiungere alla rosa
            const tacticalRole = this.mapMantraToTacticalRole(csvP.classicRole, csvP.mantraRole);
            const slug = csvP.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const newP = {
              id: `${team.id}_${slug}_${csvP.csvId}`,
              csvId: csvP.csvId,
              name: csvP.name,
              number: Math.floor(Math.random() * 98) + 1,
              role: tacticalRole,
              classicRole: csvP.classicRole,
              mantraRole: csvP.mantraRole,
              fantaRole: csvP.classicRole,
              status: csvP.pv >= 20 ? 'probabile' : (csvP.pv >= 10 ? 'ballottaggio' : 'riserva'),
              isPenaltyTaker: csvP.rc > 0 || csvP.rPlus > 0,
              isFreeKickTaker: (csvP.classicRole === 'C' || csvP.classicRole === 'A') && (csvP.gf >= 2 || csvP.ass >= 2),
              isCornerTaker: (csvP.classicRole === 'C' || csvP.classicRole === 'D') && csvP.ass >= 2,
              quotazioni: csvP.quotazioni || {
                qtA: 1,
                qtI: 1,
                diff: 0,
                qtAM: 1,
                qtIM: 1,
                diffM: 0,
                fvm: 1,
                fvmM: 1
              },
              stats: {
                fantamedia: csvP.fm,
                mediaVoto: csvP.mv,
                presenze: csvP.pv,
                gol: csvP.gf,
                assist: csvP.ass,
                ammonizioni: csvP.amm,
                espulsioni: csvP.esp,
                golSubiti: csvP.gs,
                rigoriParati: csvP.rp,
                rigoriCalciati: csvP.rc,
                rigoriSegnati: csvP.rPlus,
                rigoriSbagliati: csvP.rMinus,
                titolarita: Math.min(100, Math.round((csvP.pv / 38) * 100))
              },
              substitutes: [],
              positionNotes: '',
              fantaComment: ''
            };
            team.bench.push(newP);
            updatedPlayersCount++;
          }
        }
      }

      // Salva lo stato aggiornato
      store.saveToStorage();
      store.emit('team:changed', store.getCurrentTeam());
      store.emit('formation:changed', store.getCurrentFormation());

      this.closeModal();
      notify.success(`Statistiche applicate con successo a ${updatedPlayersCount} giocatori di Serie A!`);
    } catch (err) {
      console.error('Error applying CSV data:', err);
      notify.error('Errore durante l\'aggiornamento delle statistiche: ' + err.message);
    }
  }
}
