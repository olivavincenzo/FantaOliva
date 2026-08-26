/**
 * Applicazione Principale FantaOliva - Tactical Board Serie A
 * Orchestratore di tutti i componenti e gestione eventi globali.
 */

import { store } from './store.js';
import { FORMATION_LIST } from './data/formations.js';
import { TeamSelectorComponent } from './components/teamSelector.js';
import { PitchComponent } from './components/pitch.js';
import { PlayerInspectorComponent } from './components/playerInspector.js';
import { PlayersListoneComponent } from './components/playersListone.js';
import { StrategyManagerComponent } from './components/strategyManager.js';
import { MyTeamComponent } from './components/myTeam.js';
import { initHistoryModal } from './components/historyManager.js';
import { initExportModal } from './components/exporter.js';
import { initSyncModal } from './components/syncManager.js';
import { initSidebarResizer } from './utils/resizer.js';
import { notify } from './utils/notifications.js';

class App {
  constructor() {
    this.teamSelector = null;
    this.pitch = null;
    this.inspector = null;
    this.listone = null;
    this.myTeam = null;
    this.strategyManager = null;
  }

  init() {
    window.app = this;

    // 1. Inizializzazione State Store
    store.init();

    // 2. Montaggio Componenti Principali
    this.teamSelector = new TeamSelectorComponent(document.querySelector('#sidebar-teams'));
    this.pitch = new PitchComponent(document.querySelector('#pitch-container'));
    this.inspector = new PlayerInspectorComponent(document.querySelector('#sidebar-inspector'));
    this.listone = new PlayersListoneComponent('listone-view-wrapper');
    this.listone.init();
    this.myTeam = new MyTeamComponent('my-team-view-wrapper');
    this.myTeam.init();
    this.strategyManager = new StrategyManagerComponent('strategy-modal');
    this.strategyManager.init();

    // 3. Inizializzazione Modali, Resizer e Utility
    initHistoryModal();
    initExportModal();
    initSyncModal();
    initSidebarResizer();
    this.initAddPlayerModal();

    // 4. Bind Controlli Header, Toolbar e Switcher Viste
    this.populateFormationSelect();
    this.bindHeaderControls();
    this.bindViewSwitcher();
    this.bindResponsiveToggles();
    this.subscribeStoreEvents();

    // 5. Aggiornamento UI Header
    this.updateHeader();
  }

  switchView(viewName) {
    store.setView(viewName);
    const tacticalTab = document.querySelector('#view-tab-tactical');
    const myteamTab = document.querySelector('#view-tab-myteam');
    const listoneTab = document.querySelector('#view-tab-listone');

    const tacticalView = document.querySelector('#tactical-view-wrapper');
    const myteamView = document.querySelector('#my-team-view-wrapper');
    const listoneView = document.querySelector('#listone-view-wrapper');
    const pitchContainer = document.querySelector('#pitch-container');
    const tacticalToolbar = document.querySelector('#pitch-tactical-toolbar');
    const activeTeam = document.querySelector('#header-active-team');

    const mobileFieldBtn = document.querySelector('#mobile-field-btn');
    const mobileMyTeamBtn = document.querySelector('#mobile-myteam-btn');
    const mobileListoneBtn = document.querySelector('#mobile-listone-btn');

    // Reset All Active classes
    [tacticalTab, myteamTab, listoneTab].forEach(t => t?.classList.remove('is-active'));
    [mobileFieldBtn, mobileMyTeamBtn, mobileListoneBtn].forEach(b => b?.classList.remove('active'));

    document.body.classList.remove('view-myteam-mode');

    if (viewName === 'tactical') {
      tacticalTab?.classList.add('is-active');
      tacticalView?.classList.remove('hidden');
      pitchContainer?.classList.remove('hidden');
      myteamView?.classList.add('hidden');
      listoneView?.classList.add('hidden');
      tacticalToolbar?.classList.remove('hidden');
      mobileFieldBtn?.classList.add('active');
      activeTeam?.classList.remove('hidden');
    } else if (viewName === 'myteam') {
      myteamTab?.classList.add('is-active');
      tacticalView?.classList.remove('hidden');
      pitchContainer?.classList.add('hidden');
      myteamView?.classList.remove('hidden');
      listoneView?.classList.add('hidden');
      tacticalToolbar?.classList.add('hidden');
      mobileMyTeamBtn?.classList.add('active');
      activeTeam?.classList.add('hidden');
      document.body.classList.add('view-myteam-mode');
      this.myTeam?.render();
    } else if (viewName === 'listone') {
      listoneTab?.classList.add('is-active');
      tacticalView?.classList.add('hidden');
      pitchContainer?.classList.add('hidden');
      myteamView?.classList.add('hidden');
      listoneView?.classList.remove('hidden');
      tacticalToolbar?.classList.add('hidden');
      mobileListoneBtn?.classList.add('active');
      activeTeam?.classList.add('hidden');
      this.listone?.render();
    }
  }

  bindViewSwitcher() {
    const tacticalTab = document.querySelector('#view-tab-tactical');
    const myteamTab = document.querySelector('#view-tab-myteam');
    const listoneTab = document.querySelector('#view-tab-listone');

    const mobileFieldBtn = document.querySelector('#mobile-field-btn');
    const mobileMyTeamBtn = document.querySelector('#mobile-myteam-btn');
    const mobileListoneBtn = document.querySelector('#mobile-listone-btn');

    tacticalTab?.addEventListener('click', () => this.switchView('tactical'));
    myteamTab?.addEventListener('click', () => this.switchView('myteam'));
    listoneTab?.addEventListener('click', () => this.switchView('listone'));

    mobileFieldBtn?.addEventListener('click', () => this.switchView('tactical'));
    mobileMyTeamBtn?.addEventListener('click', () => this.switchView('myteam'));
    mobileListoneBtn?.addEventListener('click', () => this.switchView('listone'));
  }

  populateFormationSelect() {
    const select = document.querySelector('#formation-select');
    if (!select) return;

    select.innerHTML = FORMATION_LIST.map(f => {
      return `<option value="${f.id}">${f.id}</option>`;
    }).join('');
  }

  updateHeader() {
    const team = store.getCurrentTeam();
    const formation = store.getCurrentFormation();
    const formationSelect = document.querySelector('#formation-select');
    if (formationSelect && formation) {
      formationSelect.value = formation.id;
    }

    const teamNameEl = document.querySelector('#header-active-team-name');
    const teamSubmetaEl = document.querySelector('#header-active-team-submeta');

    if (team) {
      if (teamNameEl) teamNameEl.textContent = team.name;
      if (teamSubmetaEl) teamSubmetaEl.textContent = '';
    } else {
      if (teamNameEl) teamNameEl.textContent = '';
      if (teamSubmetaEl) teamSubmetaEl.textContent = '';
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

    // Menu Dropdown Impostazioni & Strumenti (Desktop Header & Mobile Action Bar)
    const settingsToggleBtn = document.querySelector('#settings-dropdown-toggle');
    const mobileSettingsBtn = document.querySelector('#mobile-settings-btn');
    const settingsMenu = document.querySelector('#header-settings-menu');

    const toggleSettings = (e) => {
      e?.stopPropagation();
      if (!settingsMenu) return;
      const isOpen = settingsMenu.classList.toggle('is-open');
      settingsToggleBtn?.setAttribute('aria-expanded', isOpen);
      settingsToggleBtn?.classList.toggle('is-active', isOpen);
      mobileSettingsBtn?.classList.toggle('active', isOpen);

      const backdrop = document.querySelector('#mobile-drawer-backdrop');
      if (window.innerWidth <= 900) {
        if (isOpen) {
          backdrop?.classList.remove('hidden');
        } else {
          backdrop?.classList.add('hidden');
        }
      }
    };

    const closeSettings = () => {
      if (!settingsMenu) return;
      settingsMenu.classList.remove('is-open');
      settingsToggleBtn?.setAttribute('aria-expanded', 'false');
      settingsToggleBtn?.classList.remove('is-active');
      mobileSettingsBtn?.classList.remove('active');
      const backdrop = document.querySelector('#mobile-drawer-backdrop');
      if (window.innerWidth <= 900) {
        backdrop?.classList.add('hidden');
      }
    };

    settingsToggleBtn?.addEventListener('click', toggleSettings);
    mobileSettingsBtn?.addEventListener('click', toggleSettings);

    // Chiudi dropdown quando si clicca su una voce del menu
    settingsMenu?.querySelectorAll('.dropdown-menu-item').forEach((item) => {
      item.addEventListener('click', closeSettings);
    });

    // Chiudi modale impostazioni al click sulla X
    const closeSettingsBtn = settingsMenu?.querySelector('#close-settings-menu-btn');
    closeSettingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSettings();
    });

    // Pulsante rapido Aggiungi Giocatore (+) dalla barra mobile
    const quickAddBtn = document.querySelector('#mobile-quick-add-btn');
    quickAddBtn?.addEventListener('click', () => {
      const addModal = document.querySelector('#add-player-modal');
      addModal?.classList.remove('hidden');
    });

    settingsMenu?.querySelectorAll('.mobile-drawer-close-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSettings();
      });
    });

    // Chiudi al click all'esterno o sul backdrop
    document.addEventListener('click', (e) => {
      if (settingsMenu?.classList.contains('is-open')) {
        if (e.target.closest('#close-settings-menu-btn') || e.target.closest('#mobile-drawer-backdrop')) {
          closeSettings();
          return;
        }
        if (!settingsMenu.contains(e.target) && !e.target.closest('#mobile-settings-btn') && !e.target.closest('#settings-dropdown-toggle')) {
          closeSettings();
        }
      }
    });

    // Chiudi con il tasto ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsMenu?.classList.contains('is-open')) {
        closeSettings();
      }
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

  }

  bindResponsiveToggles() {
    // Tasti navigazione mobile inferiore
    const toggleFieldBtn = document.querySelector('#mobile-field-btn');
    const toggleListoneBtn = document.querySelector('#mobile-listone-btn');
    const sidebarTeams = document.querySelector('#sidebar-teams');
    const sidebarInspector = document.querySelector('#sidebar-inspector');
    const backdrop = document.querySelector('#mobile-drawer-backdrop');
    const mobileOpenTeamsBtn = document.querySelector('#mobile-open-teams-btn');
    const headerActiveTeam = document.querySelector('#header-active-team');

    const updateMobileNav = (activeId) => {
      [toggleFieldBtn, toggleListoneBtn].forEach(btn => {
        if (btn) {
          btn.classList.toggle('active', btn.id === activeId);
        }
      });
    };

    const closeDrawers = () => {
      sidebarTeams?.classList.remove('mobile-open');
      sidebarInspector?.classList.remove('mobile-open');
      backdrop?.classList.add('hidden');
      if (store.activeView === 'listone') {
        updateMobileNav('mobile-listone-btn');
      } else {
        updateMobileNav('mobile-field-btn');
      }
    };

    const openLeftDrawer = () => {
      sidebarTeams?.classList.add('mobile-open');
      sidebarInspector?.classList.remove('mobile-open');
      backdrop?.classList.remove('hidden');
    };

    const openRightDrawer = () => {
      sidebarInspector?.classList.add('mobile-open');
      sidebarTeams?.classList.remove('mobile-open');
      backdrop?.classList.remove('hidden');
    };

    // Apertura Drawer Squadre da pulsanti dedicati (Event Delegation)
    document.addEventListener('click', (e) => {
      const teamsBtn = e.target.closest('#pitch-hud-teams-btn') || e.target.closest('#list-teams-btn') || e.target.closest('#mobile-open-teams-btn');
      if (teamsBtn) {
        e.stopPropagation();
        if (sidebarTeams?.classList.contains('mobile-open')) {
          closeDrawers();
        } else {
          openLeftDrawer();
        }
        return;
      }

      if (e.target.closest('#header-active-team') && window.innerWidth <= 900) {
        e.stopPropagation();
        if (sidebarTeams?.classList.contains('mobile-open')) {
          closeDrawers();
        } else {
          openLeftDrawer();
        }
        return;
      }

      // Quando si seleziona una squadra dal drawer su mobile, passa alla vista Campo e chiudi il drawer
      if (e.target.closest('.team') || e.target.closest('.team-list-item')) {
        if (window.innerWidth <= 900) {
          this.switchView('tactical');
          closeDrawers();
          return;
        }
      }

      if (e.target.closest('.mobile-drawer-close-btn') || e.target.closest('#close-teams-sidebar-btn')) {
        closeDrawers();
        return;
      }

      // Click all'esterno per chiudere i drawer su mobile
      if (window.innerWidth <= 900) {
        const isLeftOpen = sidebarTeams?.classList.contains('mobile-open');
        const isRightOpen = sidebarInspector?.classList.contains('mobile-open');

        if (isLeftOpen && !sidebarTeams.contains(e.target) && !e.target.closest('#pitch-hud-teams-btn') && !e.target.closest('.circle-button') && !e.target.closest('.pitch-hud-btn') && !e.target.closest('.mobile-action-bar')) {
          closeDrawers();
        } else if (isRightOpen && !sidebarInspector.contains(e.target) && !e.target.closest('.player-card') && !e.target.closest('.slot-player-card') && !e.target.closest('.listone-player-row') && !e.target.closest('.mobile-action-bar')) {
          closeDrawers();
        }
      }
    });

    toggleFieldBtn?.addEventListener('click', () => {
      closeDrawers();
      this.switchView('tactical');
    });

    toggleListoneBtn?.addEventListener('click', () => {
      closeDrawers();
      this.switchView('listone');
    });

    backdrop?.addEventListener('click', closeDrawers);



    // Sidebar sinistra chiudibile (desktop) / drawer (mobile)
    const COLLAPSE_KEY = 'fantaoliva_left_sidebar_collapsed';

    const setLeftSidebarCollapsed = (collapsed) => {
      document.body.classList.toggle('left-sidebar-collapsed', collapsed);
      if (collapsed) {
        sidebarTeams?.classList.remove('mobile-open');
      }
      try {
        localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
      } catch (err) {
        /* ignorato */
      }
    };

    // Sidebar destra chiudibile (desktop) / drawer (mobile)
    const COLLAPSE_RIGHT_KEY = 'fantaoliva_right_sidebar_collapsed';

    const setRightSidebarCollapsed = (collapsed) => {
      document.body.classList.toggle('right-sidebar-collapsed', collapsed);
      if (collapsed) {
        sidebarInspector?.classList.remove('mobile-open');
      }
      try {
        localStorage.setItem(COLLAPSE_RIGHT_KEY, collapsed ? '1' : '0');
      } catch (err) {
        /* ignorato */
      }
    };

    document.addEventListener('click', (e) => {
      if (e.target.closest('#reopen-left-sidebar-btn')) {
        setLeftSidebarCollapsed(false);
        return;
      }

      if (e.target.closest('#reopen-right-sidebar-btn')) {
        setRightSidebarCollapsed(false);
      }
    });

    // Doppio click sulla maniglia di resize per chiudere completamente la sidebar
    // (l'apertura avviene dalla linguetta laterale ai bordi del campo)
    document.querySelector('#sidebar-teams-resizer')?.addEventListener('dblclick', (e) => {
      e.preventDefault();
      setLeftSidebarCollapsed(true);
    });

    document.querySelector('#sidebar-inspector-resizer')?.addEventListener('dblclick', (e) => {
      e.preventDefault();
      setRightSidebarCollapsed(true);
    });

    // Ripristina lo stato salvato
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') {
        setLeftSidebarCollapsed(true);
      }
      if (localStorage.getItem(COLLAPSE_RIGHT_KEY) === '1') {
        setRightSidebarCollapsed(true);
      }
    } catch (err) {
      /* ignorato */
    }
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
      tabCsvBtn?.classList.remove('is-active');
      tabCustomBtn?.classList.remove('is-active');
      catalogSection?.classList.add('hidden');
      catalogFooter?.classList.add('hidden');
      form?.classList.add('hidden');

      if (tab === 'csv') {
        tabCsvBtn?.classList.add('is-active');
        catalogSection?.classList.remove('hidden');
        catalogFooter?.classList.remove('hidden');
        renderCatalog();
        setTimeout(() => searchInput?.focus(), 50);
      } else if (tab === 'custom') {
        tabCustomBtn?.classList.add('is-active');
        form?.classList.remove('hidden');
      }
    }

    tabCsvBtn?.addEventListener('click', () => switchTab('csv'));
    tabCustomBtn?.addEventListener('click', () => switchTab('custom'));

    store.subscribe('catalog:updated', () => {
      renderCatalog();
    });

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
        const qtA = p.quotazioni?.qtA ?? '-';
        const fvm = p.quotazioni?.fvm ?? '-';
        const mantra = p.mantraRole || '';

        return `
          <div class="catalog-player-card">
            <div class="catalog-player-info">
              <div class="catalog-player-avatar">${p.classicRole || 'C'}</div>
              <div class="catalog-player-details">
                <span class="catalog-player-name">${p.name}</span>
                <div class="catalog-player-meta">
                  <span class="catalog-club-tag"><i class="fa-solid fa-shield"></i> ${p.teamName || 'Serie A'}</span>
                  <span class="role-badge" style="padding: 2px 6px; font-size: 0.7rem;">${p.role} (${p.classicRole}${mantra ? ` · ${mantra}` : ''})</span>
                </div>
              </div>
            </div>
            <div class="catalog-stats-row">
              ${qtA !== '-' ? `<span class="catalog-stat-pill" title="Quotazione Attuale 2026/27"><i class="fa-solid fa-coins"></i> Qt ${qtA}</span>` : ''}
              ${fvm !== '-' ? `<span class="catalog-stat-pill" title="FantaValore di Mercato"><i class="fa-solid fa-scale-balanced"></i> FVM ${fvm}</span>` : ''}
              ${fm !== '-' && Number(fm) > 0 ? `<span class="catalog-stat-pill" title="Fantamedia">FM ${fm}</span>` : ''}
              ${mv !== '-' && Number(mv) > 0 ? `<span class="catalog-stat-pill" title="Media Voto">MV ${mv}</span>` : ''}
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
            // Feedback visivo immediato sul pulsante
            const origHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Inserito';
            btn.style.backgroundColor = '#15803d';
            setTimeout(() => {
              btn.innerHTML = origHtml;
              btn.style.backgroundColor = '';
            }, 1200);

            if (store.activeView === 'myteam') {
              const isStarter = Boolean(store.selectedSlotId);
              const slotId = store.selectedSlotId || null;
              const pricePaid = found.quotazioni?.fvm || 1;
              store.addPlayerToMyTeam(found, {
                isStarter,
                slotId,
                purchasePrice: pricePaid
              });
              store.selectedSlotId = null;
              notify.success(`⭐ ${found.displayName || found.name} aggiunto a "La Mia Rosa" (${isStarter ? 'Titolare' : 'Panchina'})!`);
              return;
            }

            const added = store.addNewPlayer(found);
            if (store.selectedSlotId) {
              store.assignPlayerToSlot(store.selectedSlotId, added.id);
              notify.success(`${found.name} schierato titolare nella posizione selezionata!`);
            } else {
              notify.success(`${found.name} aggiunto alla rosa!`);
            }
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

      if (store.activeView === 'myteam') {
        const isStarter = Boolean(store.selectedSlotId);
        const slotId = store.selectedSlotId || null;
        store.addPlayerToMyTeam(newPlayer, {
          isStarter,
          slotId,
          purchasePrice: 1
        });
        store.selectedSlotId = null;
        notify.success(`⭐ ${newPlayer.displayName || newPlayer.name} aggiunto a "La Mia Rosa"!`);
        form?.reset();
        return;
      }

      const added = store.addNewPlayer(newPlayer);
      if (added) {
        if (store.selectedSlotId) {
          store.assignPlayerToSlot(store.selectedSlotId, added.id);
          notify.success(`${added.name} schierato titolare nella posizione selezionata!`);
        } else {
          notify.success(`Giocatore ${added.name} aggiunto alla squadra!`);
        }
        form?.reset();
      }
    });
  }

  subscribeStoreEvents() {
    store.subscribe('team:changed', () => this.updateHeader());
    store.subscribe('formation:changed', () => this.updateHeader());
    store.subscribe('view:changed', (viewName) => {
      this.switchView(viewName);
    });
  }
}

// Avvio applicazione al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
