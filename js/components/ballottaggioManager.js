/**
 * Componente Gestione Ballottaggi (Head-to-Head Run-offs)
 * Permette di:
 * - Visualizzare lo scontro testa a testa tra due giocatori
 * - Modificare le percentuali di titolarità in tempo reale con slider
 * - Inserire commenti tattici per entrambi i contendenti
 * - Eliminare o creare nuovi ballottaggi per lo slot/giocatore
 */

import { store } from '../store.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export function renderBallottaggioSection(container, player, currentSlotId) {
  const team = store.getCurrentTeam();
  if (!team || !player) {
    container.innerHTML = '<p class="empty-hint">Nessun giocatore selezionato</p>';
    return;
  }

  const existingBallottaggio = store.getBallottaggioForPlayer(player.id) || (currentSlotId ? store.getBallottaggioForSlot(currentSlotId) : null);
  const squad = store.getAllPlayers().filter(p => p && p.id !== player.id);

  if (!existingBallottaggio) {
    container.innerHTML = `
      <div class="ballottaggio-empty-state">
        <div class="empty-icon-box">
          <i class="fa-solid fa-scale-balanced"></i>
        </div>
        <h4>Nessun Ballottaggio Attivo</h4>
        <p>Configura un duello per la maglia da titolare tra <strong>${sanitizeHtml(player.displayName || player.name)}</strong> e un compagno di reparto.</p>
        
        <div class="create-ballottaggio-form">
          <label for="opponent-select">Seleziona contendente:</label>
          <select id="opponent-select" class="fanta-select">
            <option value="">-- Seleziona giocatore --</option>
            ${squad.map(p => `
              <option value="${p.id}">${sanitizeHtml(p.displayName || p.name)} (${p.classicRole || p.role || ''})</option>
            `).join('')}
          </select>
          <button id="create-ballottaggio-btn" class="fanta-btn primary-btn btn-full">
            <i class="fa-solid fa-plus"></i> Crea Ballottaggio
          </button>
        </div>
      </div>
    `;

    const createBtn = container.querySelector('#create-ballottaggio-btn');
    const selectEl = container.querySelector('#opponent-select');

    createBtn?.addEventListener('click', () => {
      const oppId = selectEl.value;
      if (!oppId) {
        notify.warning('Seleziona un giocatore per il ballottaggio');
        return;
      }

      const opp = store.getPlayer(oppId);
      store.saveBallottaggio({
        slotId: currentSlotId || 'pos_1',
        playerAId: player.id,
        percA: 55,
        playerBId: oppId,
        percB: 45,
        commentA: 'Leggermente favorito per partire dall\'inizio.',
        commentB: 'Possibile alternativa o cambio programmato.'
      });

      notify.success(`Ballottaggio creato tra ${player.displayName} e ${opp.displayName}`);
      renderBallottaggioSection(container, player, currentSlotId);
    });

    return;
  }

  // Se esiste un ballottaggio attivo
  const isPlayerA = existingBallottaggio.playerAId === player.id;
  const playerA = store.getPlayer(existingBallottaggio.playerAId) || player;
  const playerB = store.getPlayer(existingBallottaggio.playerBId) || { displayName: existingBallottaggio.opponentName || 'Avversario' };
  const percA = existingBallottaggio.percA ?? existingBallottaggio.percentageA ?? 50;
  const percB = existingBallottaggio.percB ?? existingBallottaggio.percentageB ?? (100 - percA);
  const substitutes = existingBallottaggio.substitutes || [];

  container.innerHTML = `
    <div class="ballottaggio-card-view">
      <div class="ballottaggio-header-row">
        <span class="section-title"><i class="fa-solid fa-scale-balanced"></i> Duello Titolarità</span>
        <button id="delete-ballottaggio-btn" class="fanta-btn danger-btn btn-sm" title="Elimina questo ballottaggio">
          <i class="fa-solid fa-trash-can"></i> Rimuovi
        </button>
      </div>

      <!-- Duel Comparison Graphic -->
      <div class="duel-graphic-container">
        <div class="duel-player player-a ${isPlayerA ? 'is-current' : ''}">
          <span class="duel-name">${sanitizeHtml(playerA?.displayName || playerA?.name || 'Giocatore 1')}</span>
          <span class="duel-perc perc-a">${percA}%</span>
        </div>

        <div class="duel-vs-circle">VS</div>

        <div class="duel-player player-b ${!isPlayerA ? 'is-current' : ''}">
          <span class="duel-name">${sanitizeHtml(playerB?.displayName || playerB?.name || 'Giocatore 2')}</span>
          <span class="duel-perc perc-b">${percB}%</span>
        </div>
      </div>

      <!-- Duel Percentage Bar Slider -->
      <div class="duel-bar-wrapper">
        <div class="duel-bar">
          <div class="duel-bar-fill-a" style="width: ${percA}%"></div>
          <div class="duel-bar-fill-b" style="width: ${percB}%"></div>
        </div>
        <input 
          type="range" 
          id="duel-slider" 
          class="duel-range-slider" 
          min="5" 
          max="95" 
          step="5" 
          value="${percA}"
        />
      </div>

      <!-- Motivazioni & Note Tattiche -->
      <div class="duel-comments-box">
        <div class="duel-comment-item">
          <label class="comment-label">
            <span class="dot-a"></span> Note per ${sanitizeHtml(playerA?.displayName)}:
          </label>
          <textarea id="comment-a-input" class="fanta-textarea-sm" rows="2">${sanitizeHtml(existingBallottaggio.commentA || '')}</textarea>
        </div>

        <div class="duel-comment-item">
          <label class="comment-label">
            <span class="dot-b"></span> Note per ${sanitizeHtml(playerB?.displayName)}:
          </label>
          <textarea id="comment-b-input" class="fanta-textarea-sm" rows="2">${sanitizeHtml(existingBallottaggio.commentB || '')}</textarea>
        </div>
      </div>

      <button id="save-ballottaggio-btn" class="fanta-btn primary-btn btn-full">
        <i class="fa-solid fa-floppy-disk"></i> Salva Ballottaggio
      </button>
    </div>
  `;

  // Bind Slider and Inputs
  const slider = container.querySelector('#duel-slider');
  const percADisplay = container.querySelector('.perc-a');
  const percBDisplay = container.querySelector('.perc-b');
  const barA = container.querySelector('.duel-bar-fill-a');
  const barB = container.querySelector('.duel-bar-fill-b');
  const commentAInput = container.querySelector('#comment-a-input');
  const commentBInput = container.querySelector('#comment-b-input');
  const saveBtn = container.querySelector('#save-ballottaggio-btn');
  const deleteBtn = container.querySelector('#delete-ballottaggio-btn');

  slider?.addEventListener('input', (e) => {
    const valA = parseInt(e.target.value, 10);
    const valB = 100 - valA;
    percADisplay.textContent = `${valA}%`;
    percBDisplay.textContent = `${valB}%`;
    barA.style.width = `${valA}%`;
    barB.style.width = `${valB}%`;
  });

  saveBtn?.addEventListener('click', () => {
    const valA = parseInt(slider.value, 10);
    const valB = 100 - valA;

    store.saveBallottaggio({
      id: existingBallottaggio.id,
      slotId: existingBallottaggio.slotId,
      playerAId: existingBallottaggio.playerAId,
      percA: valA,
      playerBId: existingBallottaggio.playerBId,
      percB: valB,
      commentA: commentAInput.value.trim(),
      commentB: commentBInput.value.trim()
    });

    notify.success('Ballottaggio aggiornato con successo');
  });

  deleteBtn?.addEventListener('click', () => {
    store.deleteBallottaggio(existingBallottaggio.id);
    notify.info('Ballottaggio rimosso');
    renderBallottaggioSection(container, player, currentSlotId);
  });
}
