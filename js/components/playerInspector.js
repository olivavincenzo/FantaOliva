/**
 * Componente Ispettore Giocatore & Scheda Tattica / Fantacalcio (Right Sidebar)
 * Gestisce:
 * - Navigazione a 3 Tab (1. Scheda & Fantacalcio, 2. Sostituti & Ballottaggi, 3. Panchina & Rosa)
 * - Modifica dati anagrafici, ruolo, stato, statistiche fantacalcio
 * - Gestione della gerarchia dei sostituti (1ª, 2ª, 3ª scelta)
 * - Commenti tattici per la posizione e note di squadra
 */

import { store } from '../store.js';
import { ROLES, PLAYER_STATUSES } from '../data/roles.js';
import { renderBallottaggioSection } from './ballottaggioManager.js';
import { renderBenchPanel } from './benchManager.js';
import { sanitizeHtml, getTitolaritaClass } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export class PlayerInspectorComponent {
  constructor(container) {
    this.container = container;
    this.activeTab = 'tab-details'; // 'tab-details' | 'tab-subs' | 'tab-bench'

    this.init();
  }

  init() {
    this.render();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('player:selected', () => this.render());
    store.subscribe('player:updated', () => this.render());
    store.subscribe('player:added', () => this.render());
    store.subscribe('team:changed', () => this.render());
    store.subscribe('formation:changed', () => this.render());
    store.subscribe('auction:availabilityChanged', () => this.render());
  }

  setTab(tabId) {
    this.activeTab = tabId;
    this.render();
  }

  render() {
    const player = store.getSelectedPlayer();
    const currentTeam = store.getCurrentTeam();
    const selectedSlotId = store.selectedSlotId;
    const benchCount = store.getBenchPlayers().length;

    if (!player) {
      this.container.innerHTML = `
        <div class="inspector-header">
          <div class="inspector-player-summary">
            <h2 class="inspector-name">${sanitizeHtml(currentTeam?.name || 'Squadra')}</h2>
            <div class="inspector-tags-row">
              <span class="team-tag">${sanitizeHtml(currentTeam?.shortName || '')}</span>
              <span class="team-tag">${benchCount} in Panchina</span>
              <button class="mobile-drawer-close-btn" title="Chiudi scheda" aria-label="Chiudi">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div class="inspector-tabs-nav">
            <button class="inspector-tab-btn ${this.activeTab === 'tab-details' ? 'is-active' : ''}" data-tab="tab-details">
              <i class="fa-solid fa-clipboard-user"></i> Scheda & Fanta
            </button>
            <button class="inspector-tab-btn ${this.activeTab === 'tab-subs' ? 'is-active' : ''}" data-tab="tab-subs">
              <i class="fa-solid fa-arrows-split-up-and-left"></i> Ballottaggi
            </button>
            <button class="inspector-tab-btn ${this.activeTab === 'tab-bench' ? 'is-active' : ''}" data-tab="tab-bench">
              <i class="fa-solid fa-users-viewfinder"></i> Panchina (${benchCount})
            </button>
          </div>
        </div>

        <div class="inspector-body">
          <div class="tab-content" id="inspector-tab-container"></div>
        </div>
      `;

      this.container.querySelectorAll('.inspector-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.setTab(btn.dataset.tab);
        });
      });

      const tabContainer = this.container.querySelector('#inspector-tab-container');

      if (this.activeTab === 'tab-bench') {
        renderBenchPanel(tabContainer);
      } else if (this.activeTab === 'tab-subs') {
        renderBallottaggioSection(tabContainer, null);
      } else {
        tabContainer.innerHTML = `
          <div class="inspector-empty-state">
            <div class="empty-icon-circle">
              <i class="fa-solid fa-person-running"></i>
            </div>
            <h3>Nessun Giocatore Selezionato</h3>
            <p>Clicca su una card sul campo o in panchina per visualizzare e modificare la scheda tattica e i dati fantacalcio.</p>
            <button id="open-add-player-empty-btn" class="fanta-btn primary-btn" style="margin-top: 14px;">
              <i class="fa-solid fa-user-plus"></i> Aggiungi Nuovo Giocatore
            </button>
          </div>
        `;
        tabContainer.querySelector('#open-add-player-empty-btn')?.addEventListener('click', () => {
          const modal = document.querySelector('#add-player-modal');
          if (modal) modal.classList.remove('hidden');
        });
      }
      return;
    }

    const roleInfo = ROLES[player.role] || ROLES.C;
    const fullName = player.name + (player.surname ? ' ' + player.surname : '');
    const titolaritaHeader = player.stats?.titolarita ?? player.titolaritaPerc ?? 50;
    const headerTitClass = getTitolaritaClass(titolaritaHeader);

    const qtA = player.quotazioni?.qtA ?? '-';
    const fvm = player.quotazioni?.fvm ?? '-';
    const mantraRole = player.mantraRole || '';

    const isAvailable = player.isAvailable !== false;
    const isFavorite = store.isPlayerFavorite(player.id);

    this.container.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-player-summary">
          <h2 class="inspector-name" title="${sanitizeHtml(fullName)}">${sanitizeHtml(fullName)}</h2>
          <div class="inspector-tags-row">
            <span class="role-badge" style="background: ${roleInfo.bgColor}; color: ${roleInfo.color}; border: 1px solid ${roleInfo.borderColor}">
              ${player.role} (${player.classicRole || player.fantaRole || 'C'}${mantraRole ? ` · ${mantraRole}` : ''})
            </span>
            <button id="toggle-player-favorite-btn" class="inspector-favorite-toggle ${isFavorite ? 'is-fav' : ''}" title="${isFavorite ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}">
              <i class="fa-${isFavorite ? 'solid' : 'regular'} fa-star"></i>
            </button>
            <button id="toggle-player-auction-btn" class="inspector-auction-toggle ${isAvailable ? 'is-available' : 'is-taken'}" title="Clicca per cambiare lo stato per l'asta">
              <i class="fa-solid ${isAvailable ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
              <span>${isAvailable ? 'Disponibile' : 'Preso'}</span>
            </button>
            <button class="mobile-drawer-close-btn" title="Chiudi scheda" aria-label="Chiudi">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="inspector-tabs-nav">
          <button class="inspector-tab-btn ${this.activeTab === 'tab-details' ? 'is-active' : ''}" data-tab="tab-details">
            <i class="fa-solid fa-clipboard-user"></i> Scheda & Fanta
          </button>
          <button class="inspector-tab-btn ${this.activeTab === 'tab-subs' ? 'is-active' : ''}" data-tab="tab-subs">
            <i class="fa-solid fa-arrows-split-up-and-left"></i> Sostituti & Ballottaggi
          </button>
          <button class="inspector-tab-btn ${this.activeTab === 'tab-bench' ? 'is-active' : ''}" data-tab="tab-bench">
            <i class="fa-solid fa-users-viewfinder"></i> Panchina (${benchCount})
          </button>
        </div>
      </div>

      <div class="inspector-body">
        <div class="tab-content" id="inspector-tab-container"></div>
      </div>
    `;

    // Bind toggle preferiti
    const favToggleBtn = this.container.querySelector('#toggle-player-favorite-btn');
    favToggleBtn?.addEventListener('click', () => {
      const newFav = store.togglePlayerFavorite(player.id);
      notify.success(newFav ? `⭐ ${fullName} aggiunto ai Preferiti!` : `⭐ ${fullName} rimosso dai Preferiti`);
    });

    // Bind toggle disponibilità asta
    const auctionToggleBtn = this.container.querySelector('#toggle-player-auction-btn');
    auctionToggleBtn?.addEventListener('click', () => {
      const newState = store.togglePlayerAvailability(player.id);
      notify.info(newState ? `${fullName} segnato come DISPONIBILE all'asta` : `${fullName} segnato come PRESO / NON DISPONIBILE`);
    });

    // Bind tab clicks
    this.container.querySelectorAll('.inspector-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTab(btn.dataset.tab);
      });
    });

    const tabContainer = this.container.querySelector('#inspector-tab-container');

    if (this.activeTab === 'tab-details') {
      this.renderDetailsTab(tabContainer, player);
    } else if (this.activeTab === 'tab-subs') {
      this.renderSubstitutesTab(tabContainer, player, selectedSlotId);
    } else if (this.activeTab === 'tab-bench') {
      renderBenchPanel(tabContainer);
    }
  }

  renderDetailsTab(container, player) {
    const displayName = player.displayName || player.name || '';
    const classicRole = player.classicRole || player.fantaRole || 'C';
    const mantraRole = player.mantraRole || '';
    const role = player.role || 'C';
    const appetibilitaVal = player.appetibilita !== undefined ? Number(player.appetibilita) : (player.stats?.titolarita ?? 50);

    const isRigorista = player.isPenaltyTaker ?? player.rigorista ?? false;
    const isPunizioni = player.isFreeKickTaker ?? player.punizioni ?? false;
    const isCorner = player.isCornerTaker ?? player.corner ?? false;

    // Quotazioni 2026/27
    const qtA = player.quotazioni?.qtA ?? '-';
    const qtI = player.quotazioni?.qtI ?? '-';
    const fvm = player.quotazioni?.fvm ?? '-';
    const qtAM = player.quotazioni?.qtAM ?? '-';
    const qtIM = player.quotazioni?.qtIM ?? '-';
    const fvmM = player.quotazioni?.fvmM ?? '-';

    const titolarita = player.stats?.titolarita ?? player.titolaritaPerc ?? 50;
    const fm = player.stats?.fantamedia ?? player.fantamedia;
    const mv = player.stats?.mediaVoto ?? player.mediaVoto;
    const pv = player.stats?.pv ?? player.pv ?? 0;
    const gol = player.stats?.gol ?? player.stats?.gf ?? player.gol ?? 0;
    const gs = player.stats?.gs ?? player.gs ?? 0;
    const assist = player.stats?.assist ?? player.stats?.ass ?? player.assist ?? 0;
    const amm = player.stats?.ammonizioni ?? player.stats?.amm ?? player.ammonizioni ?? 0;
    const esp = player.stats?.espulsioni ?? player.stats?.esp ?? player.espulsioni ?? 0;
    const rPlus = player.stats?.rPlus ?? player.stats?.rigoriSegnati ?? 0;
    const rMinus = player.stats?.rMinus ?? player.stats?.rigoriSbagliati ?? 0;

    const comment = player.positionNotes || player.comment || '';
    const fantaComment = player.fantaComment || '';

    container.innerHTML = `
      <form id="player-edit-form" class="inspector-form">
        
        <!-- SEZIONE 1: VALUTAZIONE ASTA & TITOLARITÀ (MODIFICABILE) -->
        <div class="form-section-card">
   

          <div class="form-grid-2">
            <div class="form-group">
              <label title="Indice da 0 a 100 per la valutazione all'asta del fantacalcio">
                <i class="fa-solid fa-fire" style="color: #ff4d4d;"></i> Appetibilità (0-100):
              </label>
              <div class="input-with-suffix">
                <input type="number" id="edit-appetibilita" class="fanta-input" min="0" max="100" value="${appetibilitaVal}" />
                <span>/100</span>
              </div>
            </div>

            <div class="form-group">
              <label title="Probabilità di titolarità nelle formazioni di Serie A">
                <i class="fa-solid fa-chart-pie" style="color: var(--accent-neon-cyan);"></i> % Titolarità:
              </label>
              <div class="input-with-suffix">
                <input type="number" id="edit-titolaritaPerc" class="fanta-input" min="0" max="100" value="${titolarita}" />
                <span>%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SEZIONE 2: SPECIALISTI CALCI PIAZZATI (MODIFICABILE) -->
        <div class="form-section-card">
         

          <div class="specialists-checkbox-row">
            <label class="checkbox-chip ${isRigorista ? 'is-checked' : ''}">
              <input type="checkbox" id="edit-rigorista" ${isRigorista ? 'checked' : ''} />
              <span class="chip-icon">🎯</span> 1º Rigorista
            </label>
            <label class="checkbox-chip ${isPunizioni ? 'is-checked' : ''}">
              <input type="checkbox" id="edit-punizioni" ${isPunizioni ? 'checked' : ''} />
              <span class="chip-icon">📐</span> Tiratore Punizioni
            </label>
            <label class="checkbox-chip ${isCorner ? 'is-checked' : ''}">
              <input type="checkbox" id="edit-corner" ${isCorner ? 'checked' : ''} />
              <span class="chip-icon">🚩</span> Tiratore Corner
            </label>
          </div>
        </div>

        <!-- SEZIONE 3: QUOTAZIONI & VALUTAZIONI UFFICIALI 2026/27 (SOLA LETTURA DA CSV) -->
        <div class="form-section-card read-only-section">
          <div class="form-section-title" style="justify-content: space-between;">
            <span><i class="fa-solid fa-coins" style="color: var(--accent-gold);"></i> Quotazioni & FVM (2026/27)</span>
            <span class="csv-badge-official"><i class="fa-solid fa-lock"></i> Ufficiale 2026/27</span>
          </div>

          <div class="stats-display-grid">
            <div class="stat-display-card highlight-fm">
              <span class="stat-d-label">Qt.A (Classic)</span>
              <span class="stat-d-value">${qtA}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Qt.I (Classic)</span>
              <span class="stat-d-value">${qtI}</span>
            </div>

            <div class="stat-display-card highlight-fm">
              <span class="stat-d-label">FVM Classic</span>
              <span class="stat-d-value">${fvm}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Ruolo Mantra</span>
              <span class="stat-d-value" style="font-size: 0.95rem; color: var(--accent-neon-cyan);">${sanitizeHtml(mantraRole || '-')}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Qt.A (Mantra)</span>
              <span class="stat-d-value">${qtAM}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Qt.I (Mantra)</span>
              <span class="stat-d-value">${qtIM}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">FVM Mantra</span>
              <span class="stat-d-value">${fvmM}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Club 2026/27</span>
              <span class="stat-d-value" style="font-size: 0.88rem;">${sanitizeHtml(player.teamName || 'Serie A')}</span>
            </div>
          </div>
        </div>

        <!-- SEZIONE 4: STATISTICHE SERIE A DA CSV (SOLA LETTURA) -->
        <div class="form-section-card read-only-section">
          <div class="form-section-title" style="justify-content: space-between;">
            <span><i class="fa-solid fa-chart-simple" style="color: var(--accent-neon-cyan);"></i> Statistiche Serie A (da CSV)</span>
            <span class="csv-badge-official"><i class="fa-solid fa-lock"></i> Ufficiale</span>
          </div>

          <div class="stats-display-grid">
            <div class="stat-display-card highlight-fm">
              <span class="stat-d-label">Fantamedia</span>
              <span class="stat-d-value">${fm ? Number(fm).toFixed(2) : '-'}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Media Voto</span>
              <span class="stat-d-value">${mv ? Number(mv).toFixed(2) : '-'}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Partite (PV)</span>
              <span class="stat-d-value">${pv}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">${classicRole === 'P' ? 'Gol Subiti' : 'Gol Fatti'}</span>
              <span class="stat-d-value ${classicRole === 'P' ? 'stat-negative' : 'stat-positive'}">
                ${classicRole === 'P' ? gs : gol}
              </span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Assist</span>
              <span class="stat-d-value ${assist > 0 ? 'stat-positive' : ''}">${assist}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Rigori (+/-)</span>
              <span class="stat-d-value">${rPlus}/${rMinus}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Ammonizioni</span>
              <span class="stat-d-value">${amm}</span>
            </div>

            <div class="stat-display-card">
              <span class="stat-d-label">Espulsioni</span>
              <span class="stat-d-value ${esp > 0 ? 'stat-negative' : ''}">${esp}</span>
            </div>
          </div>
        </div>

        <!-- SEZIONE 5: NOTE TATTICHE E FANTACONSIGLI (MODIFICABILE) -->
        <div class="form-section-card">
          <div class="form-section-title">
            <i class="fa-solid fa-comment-dots" style="color: #ffb703;"></i> Commenti Tattici & Consigli Asta
          </div>

          <div class="form-group">
            <label>Commento sulla Posizione / Ruolo:</label>
            <textarea id="edit-comment" class="fanta-textarea" rows="3" placeholder="Es. Prima scelta offensiva. Se disponibile è praticamente sempre titolare.">${sanitizeHtml(comment)}</textarea>
          </div>

          <div class="form-group">
            <label>Consiglio Fantacalcio / Note Asta:</label>
            <textarea id="edit-fantaComment" class="fanta-textarea" rows="2" placeholder="Es. 1º slot centrocampo irrinunciabile con rigorista.">${sanitizeHtml(fantaComment)}</textarea>
          </div>
        </div>

        <!-- Pulsante di Salvataggio -->
        <div class="inspector-actions">
          <button type="submit" id="save-player-btn" class="fanta-btn success-btn btn-full">
            <i class="fa-solid fa-floppy-disk"></i> Salva Modifiche Giocatore
          </button>
        </div>

      </form>
    `;

    // Helper unificato per estrarre e salvare tutti i dati del form
    const saveCurrentForm = (notifyUser = false) => {
      const isRigoristaVal = Boolean(container.querySelector('#edit-rigorista')?.checked);
      const isPunizioniVal = Boolean(container.querySelector('#edit-punizioni')?.checked);
      const isCornerVal = Boolean(container.querySelector('#edit-corner')?.checked);

      const updatedData = {
        name: player.name,
        displayName: player.displayName || player.name,
        role: player.role || 'C',
        classicRole: player.classicRole || player.fantaRole || 'C',
        mantraRole: player.mantraRole || '',
        fantaRole: player.fantaRole || player.classicRole || 'C',
        appetibilita: Math.min(100, Math.max(0, Number(container.querySelector('#edit-appetibilita')?.value) || 0)),
        status: player.status || 'tit_sicuro',
        isPenaltyTaker: isRigoristaVal,
        rigorista: isRigoristaVal,
        isFreeKickTaker: isPunizioniVal,
        punizioni: isPunizioniVal,
        isCornerTaker: isCornerVal,
        corner: isCornerVal,
        positionNotes: container.querySelector('#edit-comment')?.value.trim() ?? '',
        comment: container.querySelector('#edit-comment')?.value.trim() ?? '',
        fantaComment: container.querySelector('#edit-fantaComment')?.value.trim() ?? '',
        quotazioni: player.quotazioni || {},
        stats: {
          ...(player.stats || {}),
          titolarita: Number(container.querySelector('#edit-titolaritaPerc')?.value) ?? (player.stats?.titolarita ?? 50)
        }
      };

      store.updatePlayer(player.id, updatedData);
      if (notifyUser) {
        notify.success(`Dati di ${player.displayName || player.name} salvati!`);
      }
    };

    // Live Auto-Save su Checkbox Specialisti (Rigorista, Punizioni, Corner)
    container.querySelectorAll('.checkbox-chip input').forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.checkbox-chip').classList.toggle('is-checked', input.checked);
        saveCurrentForm(false);
      });
    });

    // Live Auto-Save su Selettori (Ruolo, Status, ecc.)
    container.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', () => saveCurrentForm(false));
    });

    // Live Auto-Save su Modifica Input e Textarea al cambio / blur
    container.querySelectorAll('input, textarea').forEach(el => {
      if (el.type !== 'checkbox') {
        el.addEventListener('change', () => saveCurrentForm(false));
        el.addEventListener('blur', () => saveCurrentForm(false));
      }
    });

    // Form submit esplicito col pulsante "Salva"
    const form = container.querySelector('#player-edit-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCurrentForm(true);
    });
  }

  renderSubstitutesTab(container, player, selectedSlotId) {
    const allPlayers = store.getAllPlayers();
    const substitutesList = player.substitutes || [];
    const availableBench = allPlayers.filter(p => p.id !== player.id && !substitutesList.includes(p.id));

    container.innerHTML = `
      <div class="subs-and-ballottaggi-container">
        
        <!-- SEZIONE SOSTITUTI GERARCHICI -->
        <div class="form-section-card">
          <div class="form-section-title">
            <i class="fa-solid fa-arrows-up-down"></i> Gerarchia Sostituti per questa Posizione
          </div>
          <p class="section-desc">Definisci l'ordine di subentro per questa posizione (1ª scelta, 2ª scelta, ecc.).</p>

          <div class="substitutes-list-box" id="substitutes-list-box">
            ${substitutesList.length === 0 ? `
              <div class="empty-subs-notice">
                <i class="fa-solid fa-circle-question"></i>
                <p>Nessun sostituto assegnato per questa posizione.</p>
              </div>
            ` : ''}
          </div>

          <!-- Aggiungi Sostituto -->
          <div class="add-sub-box">
            <select id="add-sub-select" class="fanta-select">
              <option value="">-- Aggiungi un sostituto dalla rosa --</option>
              ${availableBench.map(p => `
                <option value="${p.id}">${sanitizeHtml(p.name || p.displayName)} (${p.role} - ${p.classicRole || p.fantaRole || 'C'})</option>
              `).join('')}
            </select>
            <button id="add-sub-btn" class="fanta-btn primary-btn btn-sm">
              <i class="fa-solid fa-plus"></i> Aggiungi
            </button>
          </div>
        </div>

        <!-- SEZIONE BALLOTTAGGIO -->
        <div class="form-section-card" id="ballottaggio-section-container">
          <!-- Rendered by ballottaggioManager -->
        </div>

      </div>
    `;

    // Render list of substitutes with reorder and delete actions
    const subListBox = container.querySelector('#substitutes-list-box');
    substitutesList.forEach((subId, idx) => {
      const subPlayer = store.getPlayer(subId);
      if (!subPlayer) return;

      const subRow = document.createElement('div');
      subRow.className = 'substitute-item-row';
      const fm = subPlayer.stats?.fantamedia ?? subPlayer.fantamedia ?? '-';
      subRow.innerHTML = `
        <div class="sub-priority-badge">${idx + 1}ª Scelta</div>
        <div class="sub-player-info">
          <span class="sub-name">${sanitizeHtml(subPlayer.name || subPlayer.displayName)}</span>
          <span class="sub-meta">${subPlayer.role} | FM: ${fm}</span>
        </div>
        <div class="sub-actions">
          ${idx > 0 ? `<button class="sub-action-btn move-up-btn" data-index="${idx}" title="Sposta su"><i class="fa-solid fa-arrow-up"></i></button>` : ''}
          ${idx < substitutesList.length - 1 ? `<button class="sub-action-btn move-down-btn" data-index="${idx}" title="Sposta giù"><i class="fa-solid fa-arrow-down"></i></button>` : ''}
          <button class="sub-action-btn remove-sub-btn" data-player-id="${subPlayer.id}" title="Rimuovi sostituto"><i class="fa-solid fa-xmark"></i></button>
        </div>
      `;

      subListBox.appendChild(subRow);
    });

    // Bind Add Sub
    const addSubBtn = container.querySelector('#add-sub-btn');
    const addSubSelect = container.querySelector('#add-sub-select');
    addSubBtn?.addEventListener('click', () => {
      const subId = addSubSelect.value;
      if (!subId) {
        notify.warning('Seleziona un giocatore da aggiungere come sostituto');
        return;
      }
      store.addSubstitute(player.id, subId);
      notify.success('Sostituto aggiunto!');
      this.renderSubstitutesTab(container, player, selectedSlotId);
    });

    // Bind Move & Remove
    container.querySelectorAll('.remove-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        store.removeSubstitute(player.id, btn.dataset.playerId);
        notify.info('Sostituto rimosso');
        this.renderSubstitutesTab(container, player, selectedSlotId);
      });
    });

    container.querySelectorAll('.move-up-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const newList = [...substitutesList];
        [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
        store.reorderSubstitutes(player.id, newList);
        this.renderSubstitutesTab(container, player, selectedSlotId);
      });
    });

    container.querySelectorAll('.move-down-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const newList = [...substitutesList];
        [newList[idx + 1], newList[idx]] = [newList[idx], newList[idx + 1]];
        store.reorderSubstitutes(player.id, newList);
        this.renderSubstitutesTab(container, player, selectedSlotId);
      });
    });

    // Render Ballottaggio Section
    const ballContainer = container.querySelector('#ballottaggio-section-container');
    if (ballContainer) {
      renderBallottaggioSection(ballContainer, player, selectedSlotId);
    }
  }
}
