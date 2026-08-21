/**
 * Componente StrategyManager - Gestione Strategie Custom & Gerarchia Ruoli
 * Permette di creare, duplicare, rinominare ed eliminare strategie,
 * e di personalizzare la gerarchia di fasce/label per ciascun ruolo (P, D, C, A).
 */

import { store } from '../store.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export const COLOR_PALETTE = [
  { label: 'Oro / Super-Top', color: '#f59e0b' },
  { label: 'Arancione / Semi-Top', color: '#fb923c' },
  { label: 'Azzurro / Top', color: '#38bdf8' },
  { label: 'Verde / Fascia Alta', color: '#4ade80' },
  { label: 'Viola / Jolly', color: '#c084fc' },
  { label: 'Rosa / Scommessa', color: '#f472b6' },
  { label: 'Grigio / Low Cost', color: '#94a3b8' }
];

export class StrategyManagerComponent {
  constructor(modalId = 'strategy-modal') {
    this.modal = document.getElementById(modalId);
    this.activeRole = 'P'; // 'P' | 'D' | 'C' | 'A'
    this.isRenaming = false;
  }

  init() {
    this.bindGlobalTriggers();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('strategy:changed', () => {
      if (this.isOpen()) this.render();
    });
    store.subscribe('strategy:updated', () => {
      if (this.isOpen()) this.render();
    });
    store.subscribe('strategy:created', () => {
      if (this.isOpen()) this.render();
    });
    store.subscribe('strategy:deleted', () => {
      if (this.isOpen()) this.render();
    });
    store.subscribe('strategy:playerAssigned', () => {
      if (this.isOpen()) this.render();
    });
  }

  bindGlobalTriggers() {
    // Pulsanti per aprire il modale
    document.querySelectorAll('[data-action="open-strategy-modal"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });

    const openBtn = document.getElementById('open-strategy-modal-btn');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal || e.target.closest('.close-strategy-modal-btn')) {
          this.close();
        }
      });
    }
  }

  isOpen() {
    return this.modal && !this.modal.classList.contains('hidden');
  }

  open(initialRole = null) {
    if (initialRole) {
      this.activeRole = store.getRoleCategory(initialRole);
    }
    if (this.modal) {
      this.modal.classList.remove('hidden');
      this.render();
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
  }

  render() {
    if (!this.modal) return;

    const strategies = store.getStrategies();
    const activeStrategy = store.getActiveStrategy();
    if (!activeStrategy) return;

    const tiers = store.getTiersForRole(this.activeRole);
    const playerCounts = store.getPlayersCountByTier(this.activeRole);

    const rolesMeta = [
      { key: 'P', label: 'Portieri', short: 'P' },
      { key: 'D', label: 'Difensori', short: 'D' },
      { key: 'C', label: 'Centrocampisti', short: 'C' },
      { key: 'A', label: 'Attaccanti', short: 'A' }
    ];

    this.modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog strategy-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="strategy-modal-title">
          
          <!-- Header Modale -->
          <div class="modal-header">
            <div class="modal-title-group">
              <i class="fa-solid fa-chess-knight" style="color: var(--ink); font-size: 1.1rem;"></i>
              <h2 id="strategy-modal-title" class="modal-title" style="margin-left: 8px;">Strategie Custom & Fasce Asta</h2>
            </div>
            <button class="modal-close close-strategy-modal-btn" aria-label="Chiudi modale">&times;</button>
          </div>

          <!-- Toolbar Selezione & Azioni Strategia -->
          <div class="strategy-toolbar-top">
            <div class="strategy-select-group">
              <label for="active-strategy-select"><i class="fa-solid fa-layer-group"></i> Strategia:</label>
              <select id="active-strategy-select" class="strategy-dropdown-select">
                ${strategies.map(s => `
                  <option value="${s.id}" ${s.id === activeStrategy.id ? 'selected' : ''}>
                    ${sanitizeHtml(s.name)}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="strategy-actions-group">
              <button id="btn-rename-strategy" class="strategy-btn-icon" title="Rinomina questa strategia">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button id="btn-duplicate-strategy" class="strategy-btn-icon" title="Duplica strategia">
                <i class="fa-solid fa-copy"></i>
              </button>
              <button id="btn-create-strategy" class="strategy-btn-icon" title="Crea nuova strategia">
                <i class="fa-solid fa-plus"></i>
              </button>
              ${strategies.length > 1 ? `
                <button id="btn-delete-strategy" class="strategy-btn-icon btn-danger" title="Elimina strategia">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Navigazione Ruoli (P, D, C, A) -->
          <nav class="strategy-roles-nav" role="tablist">
            ${rolesMeta.map(r => `
              <button class="strategy-role-tab ${this.activeRole === r.key ? 'is-active' : ''}" 
                data-role="${r.key}" role="tab" aria-selected="${this.activeRole === r.key}">
                <span class="role-badge-pill pill-${r.key}">${r.short}</span>
                <span>${r.label}</span>
              </button>
            `).join('')}
          </nav>

          <!-- Corpo con Gerarchia Fasce del Ruolo Attivo -->
          <div class="strategy-hierarchy-container">
            <div class="hierarchy-header-info">
              <span><i class="fa-solid fa-arrow-down-short-wide"></i> Gerarchia Fasce (${tiers.length} definite)</span>
              <span>1º in alto = Massima Priorità</span>
            </div>

            <div class="strategy-tiers-list">
              ${tiers.length === 0 ? `
                <div style="text-align: center; padding: 24px 10px; color: var(--muted); font-size: 0.85rem;">
                  Nessuna fascia definita per questo ruolo. Aggiungine una sotto per iniziare.
                </div>
              ` : tiers.map((tier, idx) => {
                const count = playerCounts[tier.id] || 0;
                return `
                  <div class="tier-item-row" data-tier-id="${tier.id}">
                    <div class="tier-order-rank" title="Priorità ${idx + 1}">${idx + 1}</div>
                    <div class="tier-color-indicator" style="background: ${tier.color};" title="Colore Fascia"></div>
                    
                    <input 
                      type="text" 
                      class="tier-name-input" 
                      value="${sanitizeHtml(tier.name)}" 
                      data-tier-id="${tier.id}" 
                      placeholder="Nome Fascia"
                      title="Clicca per modificare il nome"
                    />

                    <span class="tier-count-pill" title="Giocatori attualmente assegnati a questa fascia">
                      <i class="fa-solid fa-user"></i> ${count}
                    </span>

                    <div class="tier-reorder-btns">
                      <button class="tier-order-btn btn-move-up" data-tier-id="${tier.id}" title="Sposta in alto (aumenta priorità)" ${idx === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-chevron-up"></i>
                      </button>
                      <button class="tier-order-btn btn-move-down" data-tier-id="${tier.id}" title="Sposta in basso (riduce priorità)" ${idx === tiers.length - 1 ? 'disabled' : ''}>
                        <i class="fa-solid fa-chevron-down"></i>
                      </button>
                    </div>

                    <button class="tier-delete-btn" data-tier-id="${tier.id}" title="Elimina questa fascia">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Form Aggiungi Nuova Fascia -->
            <form id="add-tier-form" class="add-tier-form-box">
              <input 
                type="text" 
                id="new-tier-name-input" 
                class="add-tier-input" 
                placeholder="Aggiungi nuova fascia per ${rolesMeta.find(r => r.key === this.activeRole)?.label} (es. Super-Top)" 
                required 
                autocomplete="off"
              />

              <select id="new-tier-color-select" class="tier-color-picker-select">
                ${COLOR_PALETTE.map(c => `
                  <option value="${c.color}">${c.label}</option>
                `).join('')}
              </select>

              <button type="submit" class="add-tier-submit-btn">
                <i class="fa-solid fa-plus"></i> Aggiungi
              </button>
            </form>
          </div>

          <!-- Footer Modale -->
          <div class="modal-footer" style="padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; background: var(--soft);">
            <span style="font-size: 0.76rem; color: var(--muted);">
              <i class="fa-solid fa-circle-info"></i> Le fasce create saranno subito selezionabili nella scheda di ogni giocatore.
            </span>
            <button class="fanta-btn primary-btn close-strategy-modal-btn" type="button">
              Fatto
            </button>
          </div>

        </div>
      </div>
    `;

    this.bindModalEvents();
  }

  bindModalEvents() {
    // Cambio Strategia Attiva
    const strategySelect = this.modal.querySelector('#active-strategy-select');
    if (strategySelect) {
      strategySelect.addEventListener('change', (e) => {
        store.setActiveStrategy(e.target.value);
        notify.show(`Strategia attiva: ${store.getActiveStrategy().name}`, 'info');
      });
    }

    // Nuova Strategia
    this.modal.querySelector('#btn-create-strategy')?.addEventListener('click', () => {
      const name = prompt('Nome per la nuova strategia:', `Strategia Asta ${store.getStrategies().length + 1}`);
      if (name && name.trim()) {
        const strat = store.createStrategy(name.trim());
        notify.show(`Creata "${strat.name}"`, 'success');
        this.render();
      }
    });

    // Duplica Strategia
    this.modal.querySelector('#btn-duplicate-strategy')?.addEventListener('click', () => {
      const active = store.getActiveStrategy();
      if (!active) return;
      const dup = store.duplicateStrategy(active.id);
      if (dup) {
        notify.show(`Duplicata in "${dup.name}"`, 'success');
        this.render();
      }
    });

    // Rinomina Strategia
    this.modal.querySelector('#btn-rename-strategy')?.addEventListener('click', () => {
      const active = store.getActiveStrategy();
      if (!active) return;
      const newName = prompt('Rinomina strategia:', active.name);
      if (newName && newName.trim() && newName.trim() !== active.name) {
        store.renameStrategy(active.id, newName.trim());
        notify.show('Strategia rinominata con successo', 'success');
        this.render();
      }
    });

    // Elimina Strategia
    this.modal.querySelector('#btn-delete-strategy')?.addEventListener('click', () => {
      const active = store.getActiveStrategy();
      if (!active) return;
      if (confirm(`Sei sicuro di voler eliminare la strategia "${active.name}"?`)) {
        store.deleteStrategy(active.id);
        notify.show('Strategia eliminata', 'info');
        this.render();
      }
    });

    // Switch Ruolo Tab
    this.modal.querySelectorAll('.strategy-role-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeRole = tab.dataset.role;
        this.render();
      });
    });

    // Modifica nome fascia inline
    this.modal.querySelectorAll('.tier-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const tierId = e.target.dataset.tierId;
        const val = e.target.value.trim();
        if (val) {
          store.updateTier(this.activeRole, tierId, val);
          notify.show('Fascia aggiornata', 'success');
        }
      });
    });

    // Sposta in alto
    this.modal.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', () => {
        store.moveTier(this.activeRole, btn.dataset.tierId, 'up');
        this.render();
      });
    });

    // Sposta in basso
    this.modal.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', () => {
        store.moveTier(this.activeRole, btn.dataset.tierId, 'down');
        this.render();
      });
    });

    // Elimina fascia
    this.modal.querySelectorAll('.tier-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tierId = btn.dataset.tierId;
        const tier = store.getTiersForRole(this.activeRole).find(t => t.id === tierId);
        if (confirm(`Eliminare la fascia "${tier?.name || ''}"? I giocatori assegnati torneranno senza fascia.`)) {
          store.removeTier(this.activeRole, tierId);
          notify.show('Fascia rimossa', 'info');
          this.render();
        }
      });
    });

    // Submit aggiungi nuova fascia
    const addForm = this.modal.querySelector('#add-tier-form');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = this.modal.querySelector('#new-tier-name-input');
        const colorSelect = this.modal.querySelector('#new-tier-color-select');
        const name = input?.value?.trim();
        const color = colorSelect?.value || '#38bdf8';

        if (name) {
          store.addTier(this.activeRole, name, color);
          notify.show(`Aggiunta fascia "${name}"`, 'success');
          this.render();
        }
      });
    }

    // Pulsanti di chiusura
    this.modal.querySelectorAll('.close-strategy-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });
  }
}
