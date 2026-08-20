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
import { sanitizeHtml, getTitolaritaClass, getPlayerInitials } from '../utils/helpers.js';
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
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <h2 class="inspector-name">${sanitizeHtml(currentTeam?.name || 'Squadra')}</h2>
              <button class="sidebar-close-btn" id="close-inspector-btn" title="Chiudi scheda" aria-label="Chiudi">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="inspector-tags-row">
              <span class="team-tag">${sanitizeHtml(currentTeam?.shortName || '')}</span>
              <span class="team-tag">${benchCount} in Panchina</span>
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

      this.bindCloseButton();

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
    const displayName = player.displayName || player.name || '';
    const initials = getPlayerInitials(player.name || displayName);
    const classicRole = player.classicRole || player.fantaRole || 'C';
    const mantraRole = player.mantraRole || '';
    const roleLabel = roleInfo.name || player.role || 'Calciatore';

    const teamName = player.teamName || currentTeam?.name || 'Serie A';

    const isAvailable = player.isAvailable !== false;
    const isFavorite = store.isPlayerFavorite(player.id);

    this.container.innerHTML = `
      <div class="detail-top">
        <span class="detail-title">Scheda giocatore</span>
        <button class="detail-close sidebar-close-btn" id="close-inspector-btn" aria-label="Chiudi dettaglio">×</button>
      </div>

      <!-- Scheda Profilo Giocatore -->
      <section class="profile">
        <div class="profile-head">
          <div class="large-avatar">${initials}</div>
          <div style="flex: 1; min-width: 0;">
            <h2 class="profile-name" title="${sanitizeHtml(fullName)}">${sanitizeHtml(fullName)}</h2>
            <p class="profile-meta">${sanitizeHtml(teamName)} · ${sanitizeHtml(roleLabel)} · ${classicRole}${mantraRole ? ` · ${mantraRole}` : ''}</p>
          </div>
          <button id="toggle-player-favorite-btn" class="inspector-favorite-toggle ${isFavorite ? 'is-fav' : ''}" title="${isFavorite ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}">
            <i class="fa-${isFavorite ? 'solid' : 'regular'} fa-star"></i>
          </button>
        </div>
        <div class="status-line ${isAvailable ? 'available' : 'taken'}" id="toggle-player-auction-btn" style="cursor: pointer;" title="Clicca per cambiare disponibilità all'asta">
          <div><span class="status-dot"></span>${isAvailable ? "Disponibile all'asta" : "Già preso / Non disponibile"}</div>
          <span style="font-size: 9px; opacity: 0.6; margin-left: auto;">Cambia ⇄</span>
        </div>
      </section>

      <!-- Navigazione Tab -->
      <div class="inspector-tabs-nav">
        <button class="inspector-tab-btn ${this.activeTab === 'tab-details' ? 'is-active' : ''}" data-tab="tab-details">
          <i class="fa-solid fa-clipboard-user"></i> Scheda & Dati
        </button>
        <button class="inspector-tab-btn ${this.activeTab === 'tab-subs' ? 'is-active' : ''}" data-tab="tab-subs">
          <i class="fa-solid fa-arrows-split-up-and-left"></i> Ballottaggi
        </button>
        <button class="inspector-tab-btn ${this.activeTab === 'tab-bench' ? 'is-active' : ''}" data-tab="tab-bench">
          <i class="fa-solid fa-users-viewfinder"></i> Panchina (${benchCount})
        </button>
      </div>

      <div class="inspector-body">
        <div class="tab-content" id="inspector-tab-container"></div>
      </div>
    `;

    this.bindCloseButton();

    // Bind toggle preferiti
    const favToggleBtn = this.container.querySelector('#toggle-player-favorite-btn');
    favToggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const newFav = store.togglePlayerFavorite(player.id);
      notify.success(newFav ? `⭐ ${fullName} aggiunto ai Preferiti!` : `⭐ ${fullName} rimosso dai Preferiti`);
    });

    // Bind toggle disponibilità asta
    const auctionToggleBtn = this.container.querySelector('#toggle-player-auction-btn');
    auctionToggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
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
    const appetibilitaVal = player.appetibilita !== undefined ? Number(player.appetibilita) : (player.stats?.titolarita ?? 50);
    const isElite = appetibilitaVal >= 75;

    const isRigorista = Boolean(player.isPenaltyTaker ?? player.rigorista ?? false);
    const isPunizioni = Boolean(player.isFreeKickTaker ?? player.punizioni ?? false);
    const isCorner = Boolean(player.isCornerTaker ?? player.corner ?? false);

    const list = [];
    if (isRigorista) list.push('Rig.');
    if (isPunizioni) list.push('Pun.');
    if (isCorner) list.push('Cor.');
    const piazzatiText = list.length > 0 ? list.join(' · ') : '—';

    // Ballottaggio info
    const ballottaggio = store.getBallottaggioForPlayer(player.id);
    let ballottaggioText = '';
    if (ballottaggio) {
      const isPlayerA = ballottaggio.playerAId === player.id;
      const perc = isPlayerA ? (ballottaggio.percentageA || ballottaggio.percA || 50) : (ballottaggio.percentageB || ballottaggio.percB || 50);
      const opponentId = isPlayerA ? ballottaggio.playerBId : ballottaggio.playerAId;
      const opponent = store.getPlayer(opponentId);
      const oppName = opponent ? (opponent.displayName || opponent.name) : 'Altro';
      ballottaggioText = `${perc}% vs ${sanitizeHtml(oppName)}`;
    }

    // Quotazioni & Rendimento
    const qtA = player.quotazioni?.qtA ?? '-';
    const fvm = player.quotazioni?.fvm ?? '-';
    const titolarita = player.stats?.titolarita ?? player.titolaritaPerc ?? 50;
    const fm = player.stats?.fantamedia ?? player.fantamedia;
    const mv = player.stats?.mediaVoto ?? player.mediaVoto;
    const presenze = player.stats?.presenze ?? player.stats?.pv ?? 0;
    const gol = player.stats?.gol ?? player.stats?.gf ?? player.gol ?? 0;
    const assist = player.stats?.assist ?? player.stats?.ass ?? player.assist ?? 0;

    const notes = player.comment || player.positionNotes || player.notes || '';

    container.innerHTML = `
      <!-- SEZIONE INDICATORI (MODIFICABILI APPETIBILITÀ E TITOLARITÀ) -->
      <section class="detail-section">
        <h2>Indicatori</h2>
        <div class="mini-grid">
          <div class="mini-stat">
            <span>Appetibilità</span>
            <div class="mini-stat-edit-wrap">
              <input type="number" id="edit-appetibilita" class="mini-stat-input ${isElite ? 'green' : ''}" min="0" max="100" value="${appetibilitaVal}" title="Modifica Appetibilità (0-100)" />
              <span class="mini-stat-suffix">/100</span>
            </div>
          </div>
          <div class="mini-stat">
            <span>Titolarità</span>
            <div class="mini-stat-edit-wrap">
              <input type="number" id="edit-titolaritaPerc" class="mini-stat-input" min="0" max="100" value="${titolarita}" title="Modifica % Titolarità (0-100)" />
              <span class="mini-stat-suffix">%</span>
            </div>
          </div>
          <div class="mini-stat">
            <span>QtA Classic</span>
            <strong>${qtA}</strong>
          </div>
          <div class="mini-stat">
            <span>FVM · base 1000</span>
            <strong>${fvm}</strong>
          </div>
        </div>
      </section>

      <!-- SEZIONE RENDIMENTO STAGIONE -->
      <section class="detail-section">
        <h2>Rendimento stagione</h2>
        <div class="info-card">
          <div class="info-row"><span>Fantamedia</span><strong>${fm ? Number(fm).toFixed(2) : '-'}</strong></div>
          <div class="info-row"><span>Media voto</span><strong>${mv ? Number(mv).toFixed(2) : '-'}</strong></div>
          <div class="info-row"><span>Presenze</span><strong>${presenze}</strong></div>
          <div class="info-row"><span>Gol / Assist</span><strong>${gol} / ${assist}</strong></div>
          <div class="info-row"><span>Calci piazzati</span><strong>${piazzatiText}</strong></div>
          ${ballottaggioText ? `<div class="info-row"><span>Ballottaggio</span><strong>${ballottaggioText}</strong></div>` : ''}
        </div>
      </section>

      <!-- SEZIONE SPECIALISTI CALCI PIAZZATI -->
      <section class="detail-section">
        <h2>Specialisti calci piazzati</h2>
        <div class="specialists-checkbox-row">
          <label class="checkbox-chip ${isRigorista ? 'is-checked' : ''}">
            <input type="checkbox" id="edit-rigorista" ${isRigorista ? 'checked' : ''} />
            <span class="chip-icon">🎯</span> 1º Rig.
          </label>
          <label class="checkbox-chip ${isPunizioni ? 'is-checked' : ''}">
            <input type="checkbox" id="edit-punizioni" ${isPunizioni ? 'checked' : ''} />
            <span class="chip-icon">📐</span> Pun.
          </label>
          <label class="checkbox-chip ${isCorner ? 'is-checked' : ''}">
            <input type="checkbox" id="edit-corner" ${isCorner ? 'checked' : ''} />
            <span class="chip-icon">🚩</span> Cor.
          </label>
        </div>
      </section>

      <!-- SEZIONE NOTA PERSONALE -->
      <section class="detail-section">
        <h2>Nota personale</h2>
        <div class="note-card">
          <textarea id="player-notes-textarea" placeholder="Scrivi una nota su ${sanitizeHtml(player.name)}…">${sanitizeHtml(notes)}</textarea>
          <div class="note-footer">
            <span class="note-hint">Visibile solo a te</span>
            <button type="button" id="save-player-note-btn" class="save-note">Salva nota</button>
          </div>
        </div>
      </section>
    `;

    // Helper unificato per estrarre e salvare tutti i dati del form
    const saveCurrentForm = (notifyUser = false) => {
      const isRigoristaVal = Boolean(container.querySelector('#edit-rigorista')?.checked);
      const isPunizioniVal = Boolean(container.querySelector('#edit-punizioni')?.checked);
      const isCornerVal = Boolean(container.querySelector('#edit-corner')?.checked);
      const noteVal = container.querySelector('#player-notes-textarea')?.value.trim() ?? '';

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
        notes: noteVal,
        comment: noteVal,
        positionNotes: noteVal,
        quotazioni: player.quotazioni || {},
        stats: {
          ...(player.stats || {}),
          titolarita: Number(container.querySelector('#edit-titolaritaPerc')?.value) ?? (player.stats?.titolarita ?? 50)
        }
      };

      store.updatePlayer(player.id, updatedData);
      if (notifyUser) {
        notify.success(`Dati e note di ${player.displayName || player.name} salvati!`);
      }
    };

    // Live Auto-Save su Checkbox Specialisti (Rigorista, Punizioni, Corner)
    container.querySelectorAll('.checkbox-chip input').forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.checkbox-chip').classList.toggle('is-checked', input.checked);
        saveCurrentForm(false);
      });
    });

    // Live Auto-Save su Modifica Input al cambio / blur
    container.querySelectorAll('input').forEach(el => {
      if (el.type !== 'checkbox') {
        el.addEventListener('change', () => saveCurrentForm(false));
      }
    });

    // Pulsante Salva Nota
    container.querySelector('#save-player-note-btn')?.addEventListener('click', () => {
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

  bindCloseButton() {
    const closeBtn = this.container.querySelector('#close-inspector-btn') || this.container.querySelector('.sidebar-close-btn');
    closeBtn?.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        const sidebarInspector = document.querySelector('#sidebar-inspector');
        const backdrop = document.querySelector('#mobile-drawer-backdrop');
        sidebarInspector?.classList.remove('mobile-open');
        backdrop?.classList.add('hidden');
      } else {
        document.body.classList.toggle('right-sidebar-collapsed');
      }
    });
  }
}
