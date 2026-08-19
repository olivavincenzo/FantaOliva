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
import { sanitizeHtml } from '../utils/helpers.js';
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
            <div class="inspector-avatar" style="border-color: var(--accent-neon-green)">
              <i class="fa-solid fa-users"></i>
            </div>
            <div class="inspector-main-info">
              <h2 class="inspector-name">${sanitizeHtml(currentTeam?.name || 'Squadra')}</h2>
              <div class="inspector-tags-row">
                <span class="team-tag">${sanitizeHtml(currentTeam?.shortName || '')}</span>
                <span class="team-tag">${benchCount} in Panchina</span>
              </div>
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
    const statusInfo = PLAYER_STATUSES[player.status] || PLAYER_STATUSES.tit_sicuro;
    const fullName = player.name + (player.surname ? ' ' + player.surname : '');

    const isAvailable = player.isAvailable !== false;

    this.container.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-player-summary">
          <div class="inspector-avatar" style="border-color: ${roleInfo.color}; box-shadow: 0 0 12px ${roleInfo.color}40">
            <span class="inspector-initial" style="font-weight: 800; font-size: 1.4rem; color: ${roleInfo.color};">${(fullName || 'G').charAt(0).toUpperCase()}</span>
          </div>
          <div class="inspector-main-info">
            <h2 class="inspector-name">${sanitizeHtml(fullName)}</h2>
            <div class="inspector-tags-row">
              <span class="role-badge" style="background: ${roleInfo.bgColor}; color: ${roleInfo.color}; border: 1px solid ${roleInfo.borderColor}">
                ${player.role} (${player.classicRole || player.fantaRole || 'C'})
              </span>
              <span class="status-pill" style="background: ${statusInfo.bgColor}; color: ${statusInfo.color}; border: 1px solid ${statusInfo.borderColor}">
                ${statusInfo.badge} ${statusInfo.shortLabel}
              </span>
              <button id="toggle-player-auction-btn" class="inspector-auction-toggle ${isAvailable ? 'is-available' : 'is-taken'}" title="Clicca per cambiare lo stato per l'asta">
                <i class="fa-solid ${isAvailable ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                <span>${isAvailable ? 'Disponibile' : 'Preso'}</span>
              </button>
            </div>
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
    const role = player.role || 'C';
    const status = player.status || 'tit_sicuro';
    const appetibilitaVal = player.appetibilita !== undefined ? Number(player.appetibilita) : (player.stats?.titolarita ?? 50);

    const isRigorista = player.isPenaltyTaker ?? player.rigorista ?? false;
    const isPunizioni = player.isFreeKickTaker ?? player.punizioni ?? false;
    const isCorner = player.isCornerTaker ?? player.corner ?? false;

    const titolarita = player.stats?.titolarita ?? player.titolaritaPerc ?? 50;
    const fm = player.stats?.fantamedia ?? player.fantamedia ?? 6.0;
    const mv = player.stats?.mediaVoto ?? player.mediaVoto ?? 6.0;
    const gol = player.stats?.gol ?? player.gol ?? 0;
    const assist = player.stats?.assist ?? player.assist ?? 0;
    const amm = player.stats?.ammonizioni ?? player.ammonizioni ?? 0;
    const esp = player.stats?.espulsioni ?? player.espulsioni ?? 0;
    const comment = player.positionNotes || player.comment || '';
    const fantaComment = player.fantaComment || '';

    const roleOptions = Object.keys(ROLES).map(code => {
      const r = ROLES[code];
      return `<option value="${code}" ${role === code ? 'selected' : ''}>${r.code} - ${r.name} (${r.fantaRole})</option>`;
    }).join('');

    const statusOptions = Object.keys(PLAYER_STATUSES).map(key => {
      const s = PLAYER_STATUSES[key];
      return `<option value="${s.id}" ${status === s.id ? 'selected' : ''}>${s.badge} ${s.label}</option>`;
    }).join('');

    container.innerHTML = `
      <form id="player-edit-form" class="inspector-form">
        
        <!-- SEZIONE 1: IDENTITÀ E RUOLO TATTICO -->
        <div class="form-section-card">
          <div class="form-section-title">
            <i class="fa-solid fa-id-card"></i> Dati Tattici & Ruolo
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label>Nome Giocatore:</label>
              <input type="text" id="edit-displayName" class="fanta-input" value="${sanitizeHtml(displayName)}" required />
            </div>
            <div class="form-group">
              <label title="Indice da 0 a 100 per la valutazione all'asta del fantacalcio">
                <i class="fa-solid fa-fire" style="color: #ff4d4d;"></i> Appetibilità (0-100):
              </label>
              <div class="input-with-suffix">
                <input type="number" id="edit-appetibilita" class="fanta-input" min="0" max="100" value="${appetibilitaVal}" />
                <span>/100</span>
              </div>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label>Ruolo Tattico Primario:</label>
              <select id="edit-role" class="fanta-select">
                ${roleOptions}
              </select>
            </div>
            <div class="form-group">
              <label>Ruolo Classico Fantacalcio:</label>
              <select id="edit-fantaRole" class="fanta-select">
                <option value="P" ${classicRole === 'P' ? 'selected' : ''}>P - Portiere</option>
                <option value="D" ${classicRole === 'D' ? 'selected' : ''}>D - Difensore</option>
                <option value="C" ${classicRole === 'C' ? 'selected' : ''}>C - Centrocampista</option>
                <option value="A" ${classicRole === 'A' ? 'selected' : ''}>A - Attaccante</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Stato Giocatore:</label>
            <select id="edit-status" class="fanta-select status-select">
              ${statusOptions}
            </select>
          </div>
        </div>

        <!-- SEZIONE 2: FANTACALCIO & SPECIALISTI PIAZZATI -->
        <div class="form-section-card">
          <div class="form-section-title">
            <i class="fa-solid fa-chart-line"></i> Parametri & Statistiche Fantacalcio
          </div>

          <div class="specialists-checkbox-row">
            <label class="checkbox-chip ${isRigorista ? 'is-checked' : ''}">
              <input type="checkbox" id="edit-rigorista" ${isRigorista ? 'checked' : ''} />
              <span class="chip-icon">🎯</span> Rigorista
            </label>
            <label class="checkbox-chip ${isPunizioni ? 'is-checked' : ''}">
              <input type="checkbox" id="edit-punizioni" ${isPunizioni ? 'checked' : ''} />
              <span class="chip-icon">📐</span> Punizioni
            </label>
            <label class="checkbox-chip ${isCorner ? 'is-checked' : ''}">
              <input type="checkbox" id="edit-corner" ${isCorner ? 'checked' : ''} />
              <span class="chip-icon">🚩</span> Corner
            </label>
          </div>

          <div class="stats-mini-grid">
            <div class="stat-input-box">
              <label title="Probabilità di titolarità">% Titolarità</label>
              <div class="input-with-suffix">
                <input type="number" id="edit-titolaritaPerc" min="0" max="100" value="${titolarita}" />
                <span>%</span>
              </div>
            </div>

            <div class="stat-input-box">
              <label title="Fantamedia stagionale">Fantamedia</label>
              <input type="number" id="edit-fantamedia" step="0.01" min="0" max="15" value="${fm}" />
            </div>

            <div class="stat-input-box">
              <label title="Media voto pura">Media Voto</label>
              <input type="number" id="edit-mediaVoto" step="0.01" min="0" max="10" value="${mv}" />
            </div>

            <div class="stat-input-box">
              <label title="Gol segnati">Gol</label>
              <input type="number" id="edit-gol" min="0" value="${gol}" />
            </div>

            <div class="stat-input-box">
              <label title="Assist forniti">Assist</label>
              <input type="number" id="edit-assist" min="0" value="${assist}" />
            </div>

            <div class="stat-input-box">
              <label title="Cartellini gialli">Amm.</label>
              <input type="number" id="edit-ammonizioni" min="0" value="${amm}" />
            </div>

            <div class="stat-input-box">
              <label title="Cartellini rossi">Esp.</label>
              <input type="number" id="edit-espulsioni" min="0" value="${esp}" />
            </div>
          </div>
        </div>

        <!-- SEZIONE 3: NOTE TATTICHE E FANTACONSIGLI -->
        <div class="form-section-card">
          <div class="form-section-title">
            <i class="fa-solid fa-comment-dots"></i> Commenti Tattici & Posizione
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
      const newDisplayName = container.querySelector('#edit-displayName')?.value.trim() || player.name || player.displayName;
      const isRigoristaVal = Boolean(container.querySelector('#edit-rigorista')?.checked);
      const isPunizioniVal = Boolean(container.querySelector('#edit-punizioni')?.checked);
      const isCornerVal = Boolean(container.querySelector('#edit-corner')?.checked);

      const updatedData = {
        name: newDisplayName,
        displayName: newDisplayName,
        appetibilita: Math.min(100, Math.max(0, Number(container.querySelector('#edit-appetibilita')?.value) || 0)),
        role: container.querySelector('#edit-role')?.value || player.role || 'C',
        classicRole: container.querySelector('#edit-fantaRole')?.value || player.classicRole || 'C',
        fantaRole: container.querySelector('#edit-fantaRole')?.value || player.classicRole || 'C',
        status: container.querySelector('#edit-status')?.value || player.status || 'tit_sicuro',
        isPenaltyTaker: isRigoristaVal,
        rigorista: isRigoristaVal,
        isFreeKickTaker: isPunizioniVal,
        punizioni: isPunizioniVal,
        isCornerTaker: isCornerVal,
        corner: isCornerVal,
        positionNotes: container.querySelector('#edit-comment')?.value.trim() ?? '',
        comment: container.querySelector('#edit-comment')?.value.trim() ?? '',
        fantaComment: container.querySelector('#edit-fantaComment')?.value.trim() ?? '',
        stats: {
          ...(player.stats || {}),
          titolarita: Number(container.querySelector('#edit-titolaritaPerc')?.value) ?? 50,
          fantamedia: Number(container.querySelector('#edit-fantamedia')?.value) ?? 6.0,
          mediaVoto: Number(container.querySelector('#edit-mediaVoto')?.value) ?? 6.0,
          gol: Number(container.querySelector('#edit-gol')?.value) ?? 0,
          assist: Number(container.querySelector('#edit-assist')?.value) ?? 0,
          ammonizioni: Number(container.querySelector('#edit-ammonizioni')?.value) ?? 0,
          espulsioni: Number(container.querySelector('#edit-espulsioni')?.value) ?? 0
        }
      };

      store.updatePlayer(player.id, updatedData);
      if (notifyUser) {
        notify.success(`Dati di ${newDisplayName} salvati!`);
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
