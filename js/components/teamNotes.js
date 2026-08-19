/**
 * Componente Modale Note di Squadra (Team Notes Modal)
 * Permette di visualizzare e modificare le note generali sulla squadra,
 * gestione turnover, tattiche speciali e calci piazzati.
 */

import { store } from '../store.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export function initTeamNotesModal() {
  const modal = document.querySelector('#team-notes-modal');
  const closeBtn = document.querySelector('#close-team-notes-btn');
  const cancelBtn = document.querySelector('#cancel-team-notes-btn');
  const saveBtn = document.querySelector('#save-team-notes-btn');
  const textarea = document.querySelector('#team-notes-textarea');
  const teamTitle = document.querySelector('#team-notes-title');

  function openModal() {
    const team = store.getCurrentTeam();
    if (!team) return;

    if (teamTitle) teamTitle.textContent = `Note Tattiche - ${team.name}`;
    if (textarea) textarea.value = team.teamNotes || '';

    modal.classList.remove('hidden');
    textarea?.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Close on outside click
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn?.addEventListener('click', () => {
    const notes = textarea.value;
    store.updateTeamNotes(notes);
    notify.success('Note di squadra salvate con successo!');
    closeModal();
  });

  // Open modal trigger button
  const triggerBtn = document.querySelector('#open-team-notes-btn');
  triggerBtn?.addEventListener('click', openModal);
}
