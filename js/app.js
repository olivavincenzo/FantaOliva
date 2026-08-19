/**
 * Applicazione Principale FantaOliva - Tactical Board Serie A
 * Orchestratore di tutti i componenti e gestione eventi globali.
 */

import { store } from './store.js';
import { FORMATION_LIST } from './data/formations.js';
import { getTeamBadgeSvg } from './data/initialData.js';
import { TeamSelectorComponent } from './components/teamSelector.js';
import { PitchComponent } from './components/pitch.js';
import { PlayerInspectorComponent } from './components/playerInspector.js';
import { AuctionSlotsComponent } from './components/auctionSlots.js';
import { initTeamNotesModal } from './components/teamNotes.js';
import { initHistoryModal } from './components/historyManager.js';
import { initExportModal } from './components/exporter.js';
import { initSidebarResizer } from './utils/resizer.js';
import { CsvImporter } from './utils/csvImporter.js';
import { notify } from './utils/notifications.js';

class App {
  constructor() {
    this.teamSelector = null;
    this.pitch = null;
    this.inspector = null;
    this.auctionSlots = null;
    this.csvImporter = null;
  }

  init() {
    // 1. Inizializzazione State Store
    store.init();

    // 2. Montaggio Componenti Principali
    this.teamSelector = new TeamSelectorComponent(document.querySelector('#sidebar-teams'));
    this.pitch = new PitchComponent(document.querySelector('#pitch-container'));
    this.inspector = new PlayerInspectorComponent(document.querySelector('#sidebar-inspector'));
    this.auctionSlots = new AuctionSlotsComponent('auction-view-wrapper');
    this.auctionSlots.init();

    // 3. Inizializzazione Modali, Resizer e Utility
    initTeamNotesModal();
    initHistoryModal();
    initExportModal();
    initSidebarResizer();
    this.initAddPlayerModal();
    this.csvImporter = new CsvImporter();
    this.csvImporter.init();

    // 4. Bind Controlli Header, Toolbar e Switcher Viste
    this.populateFormationSelect();
    this.bindHeaderControls();
    this.bindViewSwitcher();
    this.bindResponsiveToggles();
    this.subscribeStoreEvents();

    // 5. Aggiornamento UI Header
    this.updateHeader();
  }

  bindViewSwitcher() {
    const tacticalTab = document.querySelector('#view-tab-tactical');
    const auctionTab = document.querySelector('#view-tab-auction');
    const tacticalView = document.querySelector('#tactical-view-wrapper');
    const auctionView = document.querySelector('#auction-view-wrapper');
    const formationGroup = document.querySelector('#header-formation-group');
    const togglesGroup = document.querySelector('#header-toggles-group');
    const mobileFieldBtn = document.querySelector('#mobile-field-btn');
    const mobileAuctionBtn = document.querySelector('#mobile-auction-btn');

    const switchView = (viewName) => {
      store.setView(viewName);
      if (viewName === 'tactical') {
        tacticalTab?.classList.add('is-active');
        auctionTab?.classList.remove('is-active');
        tacticalView?.classList.remove('hidden');
        auctionView?.classList.add('hidden');
        formationGroup?.classList.remove('hidden');
        togglesGroup?.classList.remove('hidden');
        mobileFieldBtn?.classList.add('active');
        mobileAuctionBtn?.classList.remove('active');
      } else if (viewName === 'auction_slots') {
        tacticalTab?.classList.remove('is-active');
        auctionTab?.classList.add('is-active');
        tacticalView?.classList.add('hidden');
        auctionView?.classList.remove('hidden');
        formationGroup?.classList.add('hidden');
        togglesGroup?.classList.add('hidden');
        mobileFieldBtn?.classList.remove('active');
        mobileAuctionBtn?.classList.add('active');
        this.auctionSlots?.render();
      }
    };

    tacticalTab?.addEventListener('click', () => switchView('tactical'));
    auctionTab?.addEventListener('click', () => switchView('auction_slots'));
    mobileFieldBtn?.addEventListener('click', () => switchView('tactical'));
    mobileAuctionBtn?.addEventListener('click', () => switchView('auction_slots'));
  }

  populateFormationSelect() {
    const select = document.querySelector('#formation-select');
    if (!select) return;

    select.innerHTML = FORMATION_LIST.map(f => {
      return `<option value="${f.id}">${f.name}</option>`;
    }).join('');
  }

  updateHeader() {
    const formation = store.getCurrentFormation();
    const formationSelect = document.querySelector('#formation-select');
    if (formationSelect && formation) {
      formationSelect.value = formation.id;
    }
  }

  bindHeaderControls() {
    // Cambio Modulo
    const formationSelect = document.querySelector('#formation-select');
    formationSelect?.addEventListener('change', (e) => {
      const newFormationId = e.target.value;
      store.setFormation(newFormationId);
      notify.info(`Modulo cambiato in ${newFormationId}`);
    });

    // Pulsante Salva Formazione
    const saveBtn = document.querySelector('#save-formation-btn');
    saveBtn?.addEventListener('click', () => {
      store.saveToStorage();
      notify.success('Formazione salvata con successo!');
    });

    // Pulsante Reset Formazione ai default della squadra
    const resetBtn = document.querySelector('#reset-formation-btn');
    resetBtn?.addEventListener('click', () => {
      if (confirm('Vuoi ripristinare la formazione e i ruoli predefiniti per questa squadra?')) {
        store.resetCurrentTeamDefault();
        this.updateHeader();
        notify.warning('Formazione ripristinata ai valori di fabbrica');
      }
    });

    // Pulsante Reallinea Posizioni
    const resetPositionsBtn = document.querySelector('#reset-positions-btn');
    resetPositionsBtn?.addEventListener('click', () => {
      store.resetCustomPositions();
      notify.info('Posizioni riallineate alle coordinate standard del modulo');
    });

    // Toggle Linee Tattiche
    const toggleLinesBtn = document.querySelector('#toggle-lines-btn');
    toggleLinesBtn?.addEventListener('click', () => {
      const isVisible = store.toggleTacticalLines();
      toggleLinesBtn.classList.toggle('is-active', isVisible);
      notify.info(isVisible ? 'Linee tattiche abilitate' : 'Linee tattiche nascoste');
    });

    // Toggle Modalità Posizionamento Libero
    const toggleFreeDragBtn = document.querySelector('#toggle-free-drag-btn');
    toggleFreeDragBtn?.addEventListener('click', () => {
      const isFree = store.toggleFreeDragMode();
      toggleFreeDragBtn.classList.toggle('is-active', isFree);
      notify.info(isFree ? 'Modalità spostamento libero attiva: trascina ovunque sul campo' : 'Modalità standard: rilascio per scambiare');
    });
  }

  bindResponsiveToggles() {
    // Tasti mobili per aprire drawer squadre e ispettore
    const toggleTeamsBtn = document.querySelector('#mobile-teams-btn');
    const toggleFieldBtn = document.querySelector('#mobile-field-btn');
    const toggleInspectorBtn = document.querySelector('#mobile-inspector-btn');
    const sidebarTeams = document.querySelector('#sidebar-teams');
    const sidebarInspector = document.querySelector('#sidebar-inspector');

    toggleTeamsBtn?.addEventListener('click', () => {
      sidebarTeams.classList.toggle('mobile-open');
      sidebarInspector.classList.remove('mobile-open');
    });

    toggleFieldBtn?.addEventListener('click', () => {
      sidebarTeams.classList.remove('mobile-open');
      sidebarInspector.classList.remove('mobile-open');
    });

    toggleInspectorBtn?.addEventListener('click', () => {
      sidebarInspector.classList.toggle('mobile-open');
      sidebarTeams.classList.remove('mobile-open');
    });

    // Chiudi drawer al click su elementi interni
    document.addEventListener('click', (e) => {
      if (e.target.closest('.team-list-item')) {
        sidebarTeams.classList.remove('mobile-open');
      }
    });
  }

  initAddPlayerModal() {
    const modal = document.querySelector('#add-player-modal');
    const closeBtn = document.querySelector('#close-add-player-btn');
    const closeCatalogBtn = document.querySelector('#close-catalog-btn');
    const cancelBtn = document.querySelector('#cancel-add-player-btn');
    const form = document.querySelector('#add-player-form');

    // Tab buttons
    const tabCsvBtn = document.querySelector('#tab-csv-catalog-btn');
    const tabCustomBtn = document.querySelector('#tab-custom-player-btn');
    const catalogSection = document.querySelector('#catalog-section');
    const catalogFooter = document.querySelector('#catalog-footer');

    // Search and filters
    const searchInput = document.querySelector('#catalog-search-input');
    const clearSearchBtn = document.querySelector('#catalog-clear-btn');
    const roleFilterButtons = document.querySelectorAll('.catalog-role-filters .filter-pill');
    const resultsContainer = document.querySelector('#catalog-results-list');

    let activeRoleFilter = 'ALL';
    let searchQuery = '';

    function switchTab(tab) {
      if (tab === 'csv') {
        tabCsvBtn?.classList.add('is-active');
        tabCustomBtn?.classList.remove('is-active');
        catalogSection?.classList.remove('hidden');
        catalogFooter?.classList.remove('hidden');
        form?.classList.add('hidden');
        renderCatalog();
        setTimeout(() => searchInput?.focus(), 50);
      } else {
        tabCsvBtn?.classList.remove('is-active');
        tabCustomBtn?.classList.add('is-active');
        catalogSection?.classList.add('hidden');
        catalogFooter?.classList.add('hidden');
        form?.classList.remove('hidden');
      }
    }

    tabCsvBtn?.addEventListener('click', () => switchTab('csv'));
    tabCustomBtn?.addEventListener('click', () => switchTab('custom'));

    function renderCatalog() {
      if (!resultsContainer) return;
      const players = store.getPlayerCatalog(searchQuery, activeRoleFilter);

      if (players.length === 0) {
        resultsContainer.innerHTML = `
          <div class="catalog-empty-state">
            <i class="fa-solid fa-user-slash"></i>
            <p>Nessun giocatore trovato nel database per i filtri selezionati.</p>
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = players.slice(0, 50).map(p => {
        const fm = p.stats && typeof p.stats.fantamedia === 'number' ? p.stats.fantamedia.toFixed(2) : '-';
        const mv = p.stats && typeof p.stats.mediaVoto === 'number' ? p.stats.mediaVoto.toFixed(2) : '-';
        const gol = p.stats?.gol || 0;
        const ass = p.stats?.assist || 0;

        return `
          <div class="catalog-player-card">
            <div class="catalog-player-info">
              <div class="catalog-player-avatar">${p.classicRole || 'C'}</div>
              <div class="catalog-player-details">
                <span class="catalog-player-name">${p.name}</span>
                <div class="catalog-player-meta">
                  <span class="catalog-club-tag"><i class="fa-solid fa-shield"></i> ${p.teamName || 'Serie A'}</span>
                  <span class="role-badge" style="padding: 2px 6px; font-size: 0.7rem;">${p.role} (${p.classicRole})</span>
                </div>
              </div>
            </div>
            <div class="catalog-stats-row">
              <span class="catalog-stat-pill" title="Fantamedia">FM ${fm}</span>
              <span class="catalog-stat-pill" title="Media Voto">MV ${mv}</span>
              ${gol > 0 ? `<span class="catalog-stat-pill goals">⚽ ${gol}</span>` : ''}
              ${ass > 0 ? `<span class="catalog-stat-pill">🅰️ ${ass}</span>` : ''}
              <button type="button" class="fanta-btn success-btn btn-sm js-add-catalog-player" data-player-id="${p.id}">
                <i class="fa-solid fa-plus"></i> Inserisci
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Bind add buttons
      resultsContainer.querySelectorAll('.js-add-catalog-player').forEach(btn => {
        btn.addEventListener('click', () => {
          const playerId = btn.dataset.playerId;
          const found = players.find(p => p.id === playerId);
          if (found) {
            const added = store.addNewPlayer(found);
            if (store.selectedSlotId) {
              store.assignPlayerToSlot(store.selectedSlotId, added.id);
              notify.success(`${found.name} schierato titolare nella posizione selezionata!`);
            } else {
              notify.success(`${found.name} aggiunto alla rosa!`);
            }
            closeModal();
          }
        });
      });
    }

    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchQuery) clearSearchBtn?.classList.remove('hidden');
      else clearSearchBtn?.classList.add('hidden');
      renderCatalog();
    });

    clearSearchBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderCatalog();
      searchInput?.focus();
    });

    roleFilterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        roleFilterButtons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        activeRoleFilter = btn.dataset.roleFilter;
        renderCatalog();
      });
    });

    function openModal() {
      if (modal) {
        modal.classList.remove('hidden');
        switchTab('csv');
      }
    }

    function closeModal() {
      if (modal) modal.classList.add('hidden');
      form?.reset();
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearSearchBtn?.classList.add('hidden');
    }

    closeBtn?.addEventListener('click', closeModal);
    closeCatalogBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Delegazione click per aprire la modale da qualsiasi pulsante
    document.addEventListener('click', (e) => {
      if (e.target.closest('#open-add-player-modal-btn') || e.target.closest('#open-add-player-empty-btn') || e.target.closest('.js-open-add-player')) {
        openModal();
      }
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameVal = document.querySelector('#new-player-name')?.value.trim() || 'Nuovo Giocatore';

      const newPlayer = {
        name: nameVal,
        displayName: nameVal,
        appetibilita: Math.min(100, Math.max(0, Number(document.querySelector('#new-player-appetibilita')?.value) || 50)),
        role: document.querySelector('#new-player-role')?.value || 'C',
        classicRole: document.querySelector('#new-player-fantaRole')?.value || 'C',
        fantaRole: document.querySelector('#new-player-fantaRole')?.value || 'C',
        status: document.querySelector('#new-player-status')?.value || 'riserva',
        isPenaltyTaker: Boolean(document.querySelector('#new-player-rigorista')?.checked),
        rigorista: Boolean(document.querySelector('#new-player-rigorista')?.checked),
        isFreeKickTaker: Boolean(document.querySelector('#new-player-punizioni')?.checked),
        punizioni: Boolean(document.querySelector('#new-player-punizioni')?.checked),
        isCornerTaker: Boolean(document.querySelector('#new-player-corner')?.checked),
        corner: Boolean(document.querySelector('#new-player-corner')?.checked),
        positionNotes: document.querySelector('#new-player-comment')?.value.trim() || '',
        comment: document.querySelector('#new-player-comment')?.value.trim() || '',
        stats: {
          titolarita: 50,
          fantamedia: Number(document.querySelector('#new-player-fantamedia')?.value) || 6.0,
          mediaVoto: Number(document.querySelector('#new-player-mediaVoto')?.value) || 6.0,
          gol: 0,
          assist: 0,
          ammonizioni: 0,
          espulsioni: 0
        }
      };

      const added = store.addNewPlayer(newPlayer);
      if (added) {
        if (store.selectedSlotId) {
          store.assignPlayerToSlot(store.selectedSlotId, added.id);
          notify.success(`${added.name} schierato titolare nella posizione selezionata!`);
        } else {
          notify.success(`Giocatore ${added.name} aggiunto alla squadra!`);
        }
        closeModal();
      }
    });
  }

  subscribeStoreEvents() {
    store.subscribe('team:changed', () => this.updateHeader());
    store.subscribe('formation:changed', () => this.updateHeader());
  }
}

// Avvio applicazione al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
