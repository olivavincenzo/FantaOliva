/**
 * Componente Gestione Storico e Versioni Formazione (History Manager)
 * Permette di:
 * - Creare snapshot della formazione attuale (data, modulo, titolari, ballottaggi)
 * - Visualizzare la cronologia delle versioni salvate nel corso della stagione
 * - Ripristinare all'istante una versione precedente
 * - Eliminare versioni obsolete
 */

import { store } from '../store.js';
import { formatDate, sanitizeHtml } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export function initHistoryModal() {
  const modal = document.querySelector('#history-modal');
  const closeBtn = document.querySelector('#close-history-btn');
  const createSnapshotBtn = document.querySelector('#create-snapshot-btn');
  const snapshotNameInput = document.querySelector('#snapshot-name-input');
  const historyListContainer = document.querySelector('#history-list-container');
  const triggerBtn = document.querySelector('#open-history-btn');

  function renderHistoryList() {
    const snapshots = store.getSnapshotsForCurrentTeam();
    const team = store.getCurrentTeam();

    if (!historyListContainer) return;

    if (snapshots.length === 0) {
      historyListContainer.innerHTML = `
        <div class="empty-history-state">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <h4>Nessuna Versione Salvata</h4>
          <p>Crea uno snapshot per salvare questa specifica disposizione della formazione (es. "1ª Giornata vs Milan" o "Turnover Champions") e confrontarla nel tempo.</p>
        </div>
      `;
      return;
    }

    historyListContainer.innerHTML = snapshots.map((snap, idx) => {
      return `
        <div class="history-item-card" data-snapshot-id="${snap.id}">
          <div class="history-item-meta">
            <div class="history-item-top">
              <span class="history-version-tag">Versione #${snapshots.length - idx}</span>
              <span class="history-date"><i class="fa-regular fa-clock"></i> ${formatDate(snap.timestamp)}</span>
            </div>
            <h4 class="history-name">${sanitizeHtml(snap.name)}</h4>
            <div class="history-details-row">
              <span class="history-formation-pill"><i class="fa-solid fa-table-cells-large"></i> Modulo ${snap.formationId}</span>
              <span class="history-team-name">${sanitizeHtml(snap.teamName)}</span>
            </div>
          </div>
          <div class="history-item-actions">
            <button class="fanta-btn primary-btn btn-sm restore-snap-btn" data-snapshot-id="${snap.id}">
              <i class="fa-solid fa-arrow-rotate-left"></i> Ripristina
            </button>
            <button class="fanta-btn danger-btn btn-sm delete-snap-btn" data-snapshot-id="${snap.id}" title="Elimina versione">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind Restore
    historyListContainer.querySelectorAll('.restore-snap-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const snapId = btn.dataset.snapshotId;
        if (confirm('Vuoi ripristinare questa versione della formazione? La disposizione attuale verrà sostituita.')) {
          store.restoreSnapshot(snapId);
          notify.success('Formazione ripristinata con successo!');
          closeModal();
        }
      });
    });

    // Bind Delete
    historyListContainer.querySelectorAll('.delete-snap-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const snapId = btn.dataset.snapshotId;
        store.deleteSnapshot(snapId);
        notify.info('Versione eliminata');
        renderHistoryList();
      });
    });
  }

  function openModal() {
    renderHistoryList();
    if (snapshotNameInput) {
      const currentTeam = store.getCurrentTeam();
      const currentSnapshots = store.getSnapshotsForCurrentTeam();
      snapshotNameInput.value = `${currentTeam?.name || 'Squadra'} - Assetto #${currentSnapshots.length + 1}`;
    }
    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  createSnapshotBtn?.addEventListener('click', () => {
    const name = snapshotNameInput?.value.trim() || 'Nuova Versione';
    const snapshot = store.createSnapshot(name);
    if (snapshot) {
      notify.success(`Snapshot "${snapshot.name}" creato con successo!`);
      renderHistoryList();
      if (snapshotNameInput) {
        const currentTeam = store.getCurrentTeam();
        const currentSnapshots = store.getSnapshotsForCurrentTeam();
        snapshotNameInput.value = `${currentTeam?.name || 'Squadra'} - Assetto #${currentSnapshots.length + 1}`;
      }
    }
  });

  triggerBtn?.addEventListener('click', openModal);
}
