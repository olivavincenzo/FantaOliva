/**
 * Motore Drag & Drop unificato per Mouse e Touch per la lavagna tattica.
 * Gestisce:
 * 1. Scambio tra due slot sul campo (Swap)
 * 2. Spostamento libero coordinate (Free Dragging)
 * 3. Sostituzione da panchina a campo
 * 4. Panchinamento da campo a panchina
 */

import { store } from '../store.js';
import { notify } from './notifications.js';
import { clamp } from './helpers.js';

class DragDropManager {
  constructor() {
    this.activeDrag = null; // { type: 'pitch'|'bench', playerId, slotId, sourceEl, startX, startY, ghostEl }
    this.pitchEl = null;
    this.isDragging = false;
  }

  init(pitchElement) {
    this.pitchEl = pitchElement;
    this.bindGlobalEvents();
  }

  bindGlobalEvents() {
    // Gestione unificata PointerEvents per touch & mouse fluido
    document.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    document.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    document.addEventListener('pointercancel', (e) => this.handlePointerCancel(e));
  }

  // Chiamato da playerCard o bench item quando si preme per iniziare il trascinamento
  startDrag(e, dragInfo) {
    // Non avviare drag se il click è su un bottone interattivo
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return;
    }

    // Se è touch o mouse primario
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    this.activeDrag = {
      ...dragInfo,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      hasMoved: false
    };

    // Prevenzione scroll solo quando si inizia a trascinare
    window.addEventListener('touchmove', this.preventTouchScroll, { passive: false });
  }

  preventTouchScroll(e) {
    if (this?.isDragging) {
      e.preventDefault();
    }
  }

  handlePointerMove(e) {
    if (!this.activeDrag) return;

    const dx = e.clientX - this.activeDrag.startX;
    const dy = e.clientY - this.activeDrag.startY;
    const distance = Math.hypot(dx, dy);

    // Threshold di movimento per distinguere click da drag
    if (!this.isDragging && distance > 6) {
      this.isDragging = true;
      this.activeDrag.hasMoved = true;
      this.createGhostElement(e);
      if (this.activeDrag.sourceEl) {
        this.activeDrag.sourceEl.classList.add('is-being-dragged');
      }
    }

    if (this.isDragging && this.activeDrag.ghostEl) {
      this.updateGhostPosition(e.clientX, e.clientY);
      this.highlightDropTargets(e.clientX, e.clientY);
    }
  }

  createGhostElement(e) {
    const ghost = document.createElement('div');
    ghost.className = 'tactical-drag-ghost';
    
    const player = store.getPlayer(this.activeDrag.playerId);
    const displayName = player ? (player.name || player.displayName) : 'Giocatore';
    const role = player ? player.role : 'C';

    ghost.innerHTML = `
      <div class="ghost-badge">${role}</div>
      <div class="ghost-info">
        <span class="ghost-name">${displayName}</span>
        <span class="ghost-role">${player?.classicRole || player?.fantaRole || ''}</span>
      </div>
    `;

    document.body.appendChild(ghost);
    this.activeDrag.ghostEl = ghost;
    this.updateGhostPosition(e.clientX, e.clientY);
  }

  updateGhostPosition(x, y) {
    if (!this.activeDrag?.ghostEl) return;
    this.activeDrag.ghostEl.style.left = `${x}px`;
    this.activeDrag.ghostEl.style.top = `${y}px`;
  }

  highlightDropTargets(x, y) {
    // Rimuovi precedenti highlight
    document.querySelectorAll('.drop-target-hover').forEach(el => el.classList.remove('drop-target-hover'));

    const elementUnderCursor = document.elementFromPoint(x, y);
    if (!elementUnderCursor) return;

    const slotCard = elementUnderCursor.closest('.pitch-slot-card');
    if (slotCard && slotCard !== this.activeDrag.sourceEl) {
      slotCard.classList.add('drop-target-hover');
      return;
    }

    const benchDrawer = elementUnderCursor.closest('.bench-container') || elementUnderCursor.closest('#bench-panel');
    if (benchDrawer && this.activeDrag.type === 'pitch') {
      benchDrawer.classList.add('drop-target-hover');
    }
  }

  handlePointerUp(e) {
    if (!this.activeDrag) return;

    window.removeEventListener('touchmove', this.preventTouchScroll);

    if (this.isDragging) {
      this.processDrop(e.clientX, e.clientY);
    } else {
      // Se non si è mosso, è un click -> seleziona il giocatore
      store.selectPlayer(this.activeDrag.playerId, this.activeDrag.slotId);
    }

    this.cleanup();
  }

  handlePointerCancel() {
    this.cleanup();
  }

  processDrop(x, y) {
    const elementUnderCursor = document.elementFromPoint(x, y);
    if (!elementUnderCursor) return;

    const targetSlotEl = elementUnderCursor.closest('.pitch-slot-card');
    const benchContainer = elementUnderCursor.closest('.bench-container') || elementUnderCursor.closest('#bench-panel');
    const pitchArea = elementUnderCursor.closest('.soccer-pitch');

    const source = this.activeDrag;

    // CASO 1: Rilascio su un altro slot del campo
    if (targetSlotEl) {
      const targetSlotId = targetSlotEl.dataset.slotId;
      const targetPlayerId = targetSlotEl.dataset.playerId;

      if (source.type === 'pitch' && source.slotId) {
        if (source.slotId !== targetSlotId) {
          // Scambio tra due titolari
          store.swapSlots(source.slotId, targetSlotId);
          notify.info(`Scambiata posizione tra giocatori`);
        }
      } else if (source.type === 'bench') {
        // Sostituzione da panchina a campo
        store.assignPlayerToSlot(targetSlotId, source.playerId);
        notify.success(`Inserito titolare dalla panchina`);
      }
      return;
    }

    // CASO 2: Rilascio sul campo da gioco in modalità Posizionamento Libero (o trascinamento coordinate)
    if (pitchArea && source.type === 'pitch' && source.slotId) {
      const pitchRect = pitchArea.getBoundingClientRect();
      const relativeX = ((x - pitchRect.left) / pitchRect.width) * 100;
      const relativeY = ((y - pitchRect.top) / pitchRect.height) * 100;

      const clampedX = clamp(relativeX, 8, 92);
      const clampedY = clamp(relativeY, 8, 92);

      store.updateCustomPosition(source.slotId, clampedX, clampedY);
      notify.info(`Posizione tattica personalizzata`);
      return;
    }

    // CASO 3: Rilascio da campo a panchina
    if (benchContainer && source.type === 'pitch' && source.slotId) {
      const benchPlayers = store.getBenchPlayers();
      if (benchPlayers.length > 0) {
        // Sostituisci col primo panchinaro disponibile o svuota lo slot
        store.assignPlayerToSlot(source.slotId, benchPlayers[0].id);
        notify.warning(`Giocatore spostato in panchina`);
      }
      return;
    }
  }

  cleanup() {
    if (this.activeDrag?.ghostEl && this.activeDrag.ghostEl.parentNode) {
      this.activeDrag.ghostEl.parentNode.removeChild(this.activeDrag.ghostEl);
    }

    if (this.activeDrag?.sourceEl) {
      this.activeDrag.sourceEl.classList.remove('is-being-dragged');
    }

    document.querySelectorAll('.drop-target-hover').forEach(el => el.classList.remove('drop-target-hover'));

    this.activeDrag = null;
    this.isDragging = false;
  }
}

export const dragDrop = new DragDropManager();
