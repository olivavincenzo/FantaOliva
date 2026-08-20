/**
 * FantaOliva - Modulo Importazione File CSV (Quotazioni & Statistiche Fantacalcio)
 * Supporta:
 * 1. File Quotazioni (Listone 2026/27 con ruoli Classic/Mantra, Qt.A, Qt.I, FVM)
 * 2. File Statistiche (Voti, Fantamedia, Gol, Assist, Rigori)
 * 3. File Completi / Misti
 * Aggiorna le rose delle squadre e il Catalogo Globale persistito in localStorage.
 */

import { store } from '../store.js';
import { notify } from './notifications.js';

export class CsvImporter {
  constructor() {
    this.parsedData = null;
    this.activeSource = 'modal'; // 'modal' | 'catalog-tab'
  }

  init() {
    this.bindModalEvents();
    this.bindCatalogTabEvents();
  }

  bindModalEvents() {
    const modal = document.querySelector('#import-csv-modal');
    const openBtn = document.querySelector('#open-import-csv-btn');
    const closeBtn = document.querySelector('#close-import-csv-btn');
    const cancelBtn = document.querySelector('#cancel-import-csv-btn');
    const dropzone = document.querySelector('#csv-dropzone');
    const fileInput = document.querySelector('#csv-file-input');
    const applyBtn = document.querySelector('#apply-csv-btn');

    openBtn?.addEventListener('click', () => {
      this.activeSource = 'modal';
      this.resetModalState();
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      this.resetModalState();
    });

    cancelBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      this.resetModalState();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.activeSource = 'modal';
        this.handleFile(file, 'modal');
      }
    });

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('is-dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('is-dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
          this.activeSource = 'modal';
          this.handleFile(file, 'modal');
        } else {
          notify.error('Carica un file valido con estensione .csv');
        }
      });
    }

    applyBtn?.addEventListener('click', () => {
      if (this.parsedData) {
        this.applyDataToStore(this.parsedData);
        modal?.classList.add('hidden');
      }
    });
  }

  bindCatalogTabEvents() {
    const dropzone = document.querySelector('#catalog-csv-dropzone');
    const fileInput = document.querySelector('#catalog-csv-file-input');
    const applyBtn = document.querySelector('#catalog-apply-csv-btn');

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.activeSource = 'catalog-tab';
        this.handleFile(file, 'catalog-tab');
      }
    });

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('is-dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('is-dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
          this.activeSource = 'catalog-tab';
          this.handleFile(file, 'catalog-tab');
        } else {
          notify.error('Carica un file valido con estensione .csv');
        }
      });
    }

    applyBtn?.addEventListener('click', () => {
      if (this.parsedData) {
        this.applyDataToStore(this.parsedData);
      }
    });
  }

  resetModalState() {
    this.parsedData = null;
    const fileInput = document.querySelector('#csv-file-input');
    const previewContainer = document.querySelector('#csv-preview-container');
    const applyBtn = document.querySelector('#apply-csv-btn');
    const dropzone = document.querySelector('#csv-dropzone');

    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (applyBtn) applyBtn.classList.add('hidden');
    if (dropzone) dropzone.classList.remove('is-dragover');
  }

  resetCatalogTabState() {
    this.parsedData = null;
    const fileInput = document.querySelector('#catalog-csv-file-input');
    const previewContainer = document.querySelector('#catalog-csv-preview-container');
    const dropzone = document.querySelector('#catalog-csv-dropzone');

    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (dropzone) dropzone.classList.remove('is-dragover');
  }

  handleFile(file, source = 'modal') {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        const result = this.parseCsv(csvContent);
        this.showPreview(file, result, source);
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

    // Identifica la riga di header (cerca colonne Id, Nome, Squadra)
    let headerIndex = 1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const rowStr = rows[i].join(';');
      if (rowStr.includes('Id') && rowStr.includes('Nome') && (rowStr.includes('Squadra') || rowStr.includes('R'))) {
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

    // Colonne Quotazioni
    const colQtA = headers.findIndex(h => h.trim() === 'Qt.A' || (h.startsWith('Qt.A') && !h.includes(' M') && !h.endsWith('M')));
    const colQtI = headers.findIndex(h => h.trim() === 'Qt.I' || (h.startsWith('Qt.I') && !h.includes(' M') && !h.endsWith('M')));
    const colFvm = headers.findIndex(h => h.trim() === 'FVM' || (h.startsWith('FVM') && !h.includes(' M') && !h.endsWith(' M') && h !== 'FVM M'));
    const colQtAM = headers.findIndex(h => h.includes('Qt.A M') || h.includes('Qt.AM') || h.includes('Qt.A (M)'));
    const colQtIM = headers.findIndex(h => h.includes('Qt.I M') || h.includes('Qt.IM') || h.includes('Qt.I (M)'));
    const colFvmM = headers.findIndex(h => h.includes('FVM M') || h.includes('FVMM') || h.includes('FVM (M)'));

    // Colonne Statistiche
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

    const hasQuotazioni = colQtA !== -1 || colFvm !== -1 || colQtI !== -1;
    const hasStats = colPv !== -1 || colFm !== -1 || colMv !== -1;

    let csvType = 'completo';
    if (hasQuotazioni && !hasStats) csvType = 'quotazioni';
    else if (!hasQuotazioni && hasStats) csvType = 'statistiche';

    const playersByTeam = {};
    const allParsedPlayers = [];
    let totalPlayers = 0;

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length <= Math.max(colNome, colSquadra !== -1 ? colSquadra : 0)) continue;

      const teamName = colSquadra !== -1 && r[colSquadra] ? r[colSquadra].trim() : 'Serie A';
      const playerName = colNome !== -1 && r[colNome] ? r[colNome].trim() : '';
      if (!playerName) continue;

      const csvId = colId !== -1 ? r[colId] : `${i}`;
      const roleClassic = colR !== -1 ? r[colR] : 'C';
      const roleMantra = colRm !== -1 ? r[colRm] : '';

      const qtA = colQtA !== -1 ? parseInt(r[colQtA]) || 1 : null;
      const qtI = colQtI !== -1 ? parseInt(r[colQtI]) || 1 : null;
      const fvm = colFvm !== -1 ? parseInt(r[colFvm]) || 1 : null;
      const qtAM = colQtAM !== -1 ? parseInt(r[colQtAM]) || qtA : null;
      const qtIM = colQtIM !== -1 ? parseInt(r[colQtIM]) || qtI : null;
      const fvmM = colFvmM !== -1 ? parseInt(r[colFvmM]) || fvm : null;

      const pv = colPv !== -1 ? parseInt(r[colPv]) || 0 : null;
      const mv = colMv !== -1 ? parseFloat((r[colMv] || '0').replace(',', '.')) || 0 : null;
      const fm = colFm !== -1 ? parseFloat((r[colFm] || '0').replace(',', '.')) || 0 : null;
      const gf = colGf !== -1 ? parseInt(r[colGf]) || 0 : null;
      const gs = colGs !== -1 ? parseInt(r[colGs]) || 0 : null;
      const rp = colRp !== -1 ? parseInt(r[colRp]) || 0 : null;
      const rc = colRc !== -1 ? parseInt(r[colRc]) || 0 : null;
      const rPlus = colRplus !== -1 ? parseInt(r[colRplus]) || 0 : null;
      const rMinus = colRminus !== -1 ? parseInt(r[colRminus]) || 0 : null;
      const ass = colAss !== -1 ? parseInt(r[colAss]) || 0 : null;
      const amm = colAmm !== -1 ? parseInt(r[colAmm]) || 0 : null;
      const esp = colEsp !== -1 ? parseInt(r[colEsp]) || 0 : null;

      if (!playersByTeam[teamName]) {
        playersByTeam[teamName] = [];
      }

      const playerData = {
        csvId,
        name: playerName,
        teamName,
        classicRole: roleClassic,
        mantraRole: roleMantra,
        quotazioni: hasQuotazioni ? {
          qtA: qtA || 1,
          qtI: qtI || 1,
          diff: (qtA && qtI) ? qtA - qtI : 0,
          qtAM: qtAM || qtA || 1,
          qtIM: qtIM || qtI || 1,
          diffM: (qtAM && qtIM) ? qtAM - qtIM : 0,
          fvm: fvm || 1,
          fvmM: fvmM || fvm || 1
        } : null,
        stats: hasStats ? {
          fantamedia: fm || 0,
          mediaVoto: mv || 0,
          presenze: pv || 0,
          gol: gf || 0,
          assist: ass || 0,
          ammonizioni: amm || 0,
          espulsioni: esp || 0,
          golSubiti: gs || 0,
          rigoriParati: rp || 0,
          rigoriCalciati: rc || 0,
          rigoriSegnati: rPlus || 0,
          rigoriSbagliati: rMinus || 0,
          titolarita: pv !== null ? Math.min(100, Math.round((pv / 38) * 100)) : 50
        } : null,
        isPenaltyTaker: rc > 0 || rPlus > 0
      };

      playersByTeam[teamName].push(playerData);
      allParsedPlayers.push(playerData);
      totalPlayers++;
    }

    return {
      playersByTeam,
      allParsedPlayers,
      totalTeams: Object.keys(playersByTeam).length,
      totalPlayers,
      hasQuotazioni,
      hasStats,
      csvType
    };
  }

  showPreview(file, result, source = 'modal') {
    this.parsedData = result;

    const prefix = source === 'catalog-tab' ? 'catalog-' : '';
    const nameEl = document.querySelector(`#${prefix}csv-file-name`);
    const sizeEl = document.querySelector(`#${prefix}csv-file-size`);
    const teamsEl = document.querySelector(`#${prefix}csv-teams-count`);
    const playersEl = document.querySelector(`#${prefix}csv-players-count`);
    const typeBadge = document.querySelector(`#${prefix}csv-type-badge`);
    const previewContainer = document.querySelector(`#${prefix}csv-preview-container`);
    const applyBtn = document.querySelector(source === 'catalog-tab' ? '#catalog-apply-csv-btn' : '#apply-csv-btn');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = `${Math.round(file.size / 1024)} KB`;
    if (teamsEl) teamsEl.textContent = result.totalTeams;
    if (playersEl) playersEl.textContent = result.totalPlayers;

    if (typeBadge) {
      if (result.csvType === 'quotazioni') {
        typeBadge.innerHTML = '<i class="fa-solid fa-tags"></i> Listone Quotazioni 2026/27';
      } else if (result.csvType === 'statistiche') {
        typeBadge.innerHTML = '<i class="fa-solid fa-chart-line"></i> Statistiche & Voti';
      } else {
        typeBadge.innerHTML = '<i class="fa-solid fa-check-double"></i> Quotazioni + Statistiche';
      }
    }

    previewContainer?.classList.remove('hidden');
    applyBtn?.classList.remove('hidden');

    const typeDesc = result.csvType === 'quotazioni' ? 'Quotazioni Fantacalcio' : (result.csvType === 'statistiche' ? 'Statistiche' : 'Quotazioni & Statistiche');
    notify.info(`File valido! Rilevate ${typeDesc}: ${result.totalTeams} squadre e ${result.totalPlayers} calciatori.`);
  }

  mapMantraToTacticalRole(roleClassic, roleMantra) {
    const m = (roleMantra || '').trim();
    const c = (roleClassic || '').trim().toUpperCase();

    if (c === 'P' || m.includes('Por')) return 'POR';
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
      let updatedCount = 0;

      // 1. Aggiorna i giocatori nelle squadre (lineup e bench)
      for (const team of teams) {
        const matchingTeamKey = Object.keys(result.playersByTeam).find(key => {
          return key.toLowerCase() === team.name.toLowerCase() ||
                 key.toLowerCase() === team.id.toLowerCase() ||
                 team.name.toLowerCase().includes(key.toLowerCase()) ||
                 key.toLowerCase().includes(team.name.toLowerCase());
        });

        if (!matchingTeamKey) continue;
        const csvPlayers = result.playersByTeam[matchingTeamKey];

        // Lineup
        for (const slotId of Object.keys(team.lineup || {})) {
          const player = team.lineup[slotId];
          if (!player) continue;

          const match = csvPlayers.find(p => {
            return (player.csvId && p.csvId && player.csvId === p.csvId) ||
                   p.name.toLowerCase() === player.name.toLowerCase() ||
                   player.name.toLowerCase().includes(p.name.toLowerCase()) ||
                   p.name.toLowerCase().includes(player.name.toLowerCase());
          });

          if (match) {
            if (result.hasQuotazioni && match.quotazioni) {
              player.quotazioni = match.quotazioni;
              if (match.classicRole) player.classicRole = match.classicRole;
              if (match.mantraRole) player.mantraRole = match.mantraRole;
            }
            if (result.hasStats && match.stats) {
              player.stats = { ...(player.stats || {}), ...match.stats };
              player.isPenaltyTaker = match.isPenaltyTaker;
            }
            updatedCount++;
          }
        }

        // Bench
        team.bench = team.bench || [];
        for (const csvP of csvPlayers) {
          const existingInLineup = Object.values(team.lineup || {}).find(p => p && (
            (p.csvId && csvP.csvId && p.csvId === csvP.csvId) ||
            p.name.toLowerCase() === csvP.name.toLowerCase()
          ));
          if (existingInLineup) continue;

          const existingInBench = team.bench.find(p => p && (
            (p.csvId && csvP.csvId && p.csvId === csvP.csvId) ||
            p.name.toLowerCase() === csvP.name.toLowerCase()
          ));

          if (existingInBench) {
            if (result.hasQuotazioni && csvP.quotazioni) {
              existingInBench.quotazioni = csvP.quotazioni;
              if (csvP.classicRole) existingInBench.classicRole = csvP.classicRole;
              if (csvP.mantraRole) existingInBench.mantraRole = csvP.mantraRole;
            }
            if (result.hasStats && csvP.stats) {
              existingInBench.stats = { ...(existingInBench.stats || {}), ...csvP.stats };
              existingInBench.isPenaltyTaker = csvP.isPenaltyTaker;
            }
            updatedCount++;
          } else if (result.hasQuotazioni) {
            // Nuovo giocatore da aggiungere alla rosa
            const tacticalRole = this.mapMantraToTacticalRole(csvP.classicRole, csvP.mantraRole);
            const slug = csvP.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const newP = {
              id: `${team.id}_${slug}_${csvP.csvId}`,
              csvId: csvP.csvId,
              name: csvP.name,
              displayName: csvP.name,
              teamName: team.name,
              teamId: team.id,
              number: Math.floor(Math.random() * 98) + 1,
              role: tacticalRole,
              classicRole: csvP.classicRole,
              mantraRole: csvP.mantraRole,
              fantaRole: csvP.classicRole,
              status: 'riserva',
              isAvailable: true,
              isPenaltyTaker: csvP.isPenaltyTaker,
              isFreeKickTaker: false,
              isCornerTaker: false,
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
              stats: csvP.stats || {
                fantamedia: 6.0,
                mediaVoto: 6.0,
                presenze: 0,
                gol: 0,
                assist: 0,
                ammonizioni: 0,
                espulsioni: 0,
                golSubiti: 0,
                rigoriParati: 0,
                rigoriCalciati: 0,
                rigoriSegnati: 0,
                rigoriSbagliati: 0,
                titolarita: 50
              },
              positionNotes: '',
              fantaComment: ''
            };
            team.bench.push(newP);
            updatedCount++;
          }
        }
      }

      // 2. Aggiorna il Catalogo Globale (store.playerCatalog)
      const currentCatalog = Array.isArray(store.playerCatalog) && store.playerCatalog.length > 0
        ? store.playerCatalog
        : [];
      
      const catalogMap = new Map();
      currentCatalog.forEach(p => {
        if (p.csvId) catalogMap.set(p.csvId, p);
        if (p.id) catalogMap.set(p.id, p);
        catalogMap.set(`${p.name}_${p.teamName}`.toLowerCase(), p);
      });

      result.allParsedPlayers.forEach(p => {
        const key = p.csvId || `${p.name}_${p.teamName}`.toLowerCase();
        let catPlayer = catalogMap.get(key) || catalogMap.get(`${p.name}_${p.teamName}`.toLowerCase());

        if (catPlayer) {
          if (result.hasQuotazioni && p.quotazioni) {
            catPlayer.quotazioni = p.quotazioni;
            if (p.classicRole) catPlayer.classicRole = p.classicRole;
            if (p.mantraRole) catPlayer.mantraRole = p.mantraRole;
          }
          if (result.hasStats && p.stats) {
            catPlayer.stats = { ...(catPlayer.stats || {}), ...p.stats };
            catPlayer.isPenaltyTaker = p.isPenaltyTaker;
          }
        } else {
          const tacticalRole = this.mapMantraToTacticalRole(p.classicRole, p.mantraRole);
          const slug = p.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const teamId = p.teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const newCatPlayer = {
            id: `${teamId}_${slug}_${p.csvId}`,
            csvId: p.csvId,
            name: p.name,
            displayName: p.name,
            teamName: p.teamName,
            teamId: teamId,
            role: tacticalRole,
            classicRole: p.classicRole,
            mantraRole: p.mantraRole,
            fantaRole: p.classicRole,
            appetibilita: p.quotazioni?.fvm ? Math.min(100, Math.round(p.quotazioni.fvm * 1.2)) : 50,
            status: 'riserva',
            isAvailable: true,
            isPenaltyTaker: p.isPenaltyTaker,
            isFreeKickTaker: false,
            isCornerTaker: false,
            quotazioni: p.quotazioni || {
              qtA: 1,
              qtI: 1,
              diff: 0,
              qtAM: 1,
              qtIM: 1,
              diffM: 0,
              fvm: 1,
              fvmM: 1
            },
            stats: p.stats || {
              fantamedia: 6.0,
              mediaVoto: 6.0,
              presenze: 0,
              gol: 0,
              assist: 0,
              ammonizioni: 0,
              espulsioni: 0,
              golSubiti: 0,
              rigoriParati: 0,
              rigoriCalciati: 0,
              rigoriSegnati: 0,
              rigoriSbagliati: 0,
              titolarita: 50
            }
          };
          currentCatalog.push(newCatPlayer);
          catalogMap.set(key, newCatPlayer);
        }
      });

      // Salva lo stato aggiornato e il catalogo
      store.saveCatalog(currentCatalog);
      store.saveToStorage();

      store.emit('catalog:updated', currentCatalog);
      store.emit('team:changed', store.getCurrentTeam());
      store.emit('formation:changed', store.getCurrentFormation());

      this.resetModalState();
      this.resetCatalogTabState();

      const typeDesc = result.csvType === 'quotazioni' ? 'Quotazioni e Ruoli' : (result.csvType === 'statistiche' ? 'Statistiche e Voti' : 'Dati completi');
      notify.success(`${typeDesc} sincronizzati con successo per ${result.totalPlayers} calciatori!`);
    } catch (err) {
      console.error('Error applying CSV data:', err);
      notify.error('Errore durante l\'aggiornamento: ' + err.message);
    }
  }
}

