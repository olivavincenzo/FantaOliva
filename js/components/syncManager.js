/**
 * Componente Gestione Sincronizzazione Dati (Fantalab, SOS Fanta, GitHub Actions)
 */

import { notify } from '../utils/notifications.js';

const GITHUB_PAT_KEY = 'fantaoliva_github_pat';
const REPO_OWNER = 'olivavincenzo';
const REPO_NAME = 'FantaOliva';
const WORKFLOW_ID = 'sync_data.yml';

export function initSyncModal() {
  const openBtn = document.querySelector('#open-sync-modal-btn');
  const modal = document.querySelector('#sync-data-modal');
  const closeBtn = document.querySelector('#close-sync-modal-btn');
  const triggerActionBtn = document.querySelector('#trigger-github-sync-btn');
  const patInput = document.querySelector('#github-pat-input');
  const savePatBtn = document.querySelector('#save-github-pat-btn');
  const syncStatusMsg = document.querySelector('#sync-status-message');

  if (!modal) return;

  // Carica PAT salvato
  const savedPat = localStorage.getItem(GITHUB_PAT_KEY) || '';
  if (patInput && savedPat) {
    patInput.value = savedPat;
  }

  const openModal = () => {
    modal.classList.remove('hidden');
    // chiudi dropdown menu
    const dropdown = document.querySelector('#header-settings-menu');
    dropdown?.classList.remove('is-open');
  };

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Salva PAT
  savePatBtn?.addEventListener('click', () => {
    const pat = patInput?.value.trim() || '';
    if (pat) {
      localStorage.setItem(GITHUB_PAT_KEY, pat);
      notify.success('GitHub Token salvato nel browser!');
    } else {
      localStorage.removeItem(GITHUB_PAT_KEY);
      notify.info('GitHub Token rimosso.');
    }
  });

  // Trigger GitHub Actions Workflow
  triggerActionBtn?.addEventListener('click', async () => {
    const pat = patInput?.value.trim() || localStorage.getItem(GITHUB_PAT_KEY) || '';
    
    if (!pat) {
      notify.warning('Inserisci un GitHub Personal Access Token (PAT) per avviare il workflow da qui.');
      patInput?.focus();
      return;
    }

    localStorage.setItem(GITHUB_PAT_KEY, pat);

    triggerActionBtn.disabled = true;
    triggerActionBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Avvio Workflow in corso...';
    if (syncStatusMsg) {
      syncStatusMsg.style.display = 'block';
      syncStatusMsg.className = 'sync-status-box is-loading';
      syncStatusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Invio richiesta di esecuzione a GitHub Actions...';
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${pat}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          ref: 'main'
        })
      });

      if (response.status === 204 || response.ok) {
        notify.success('🚀 Sincronizzazione avviata su GitHub Actions!');
        if (syncStatusMsg) {
          syncStatusMsg.className = 'sync-status-box is-success';
          syncStatusMsg.innerHTML = `
            <div><strong>✅ Workflow avviato con successo su GitHub!</strong></div>
            <div style="margin-top: 6px; font-size: 0.82rem; opacity: 0.9;">
              GitHub Actions sta scaricando i dati da Fantalab ed eseguendo la build. Tra circa 1-2 minuti le modifiche saranno online su GitHub Pages.
            </div>
            <div style="margin-top: 10px;">
              <a href="https://github.com/${REPO_OWNER}/${REPO_NAME}/actions" target="_blank" rel="noopener" class="fanta-btn secondary-btn" style="padding: 4px 10px; font-size: 0.78rem;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Vedi esecuzione su GitHub
              </a>
            </div>
          `;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.message || `Errore HTTP ${response.status}`;
        notify.error(`Errore GitHub: ${errMsg}`);
        if (syncStatusMsg) {
          syncStatusMsg.className = 'sync-status-box is-error';
          syncStatusMsg.innerHTML = `❌ Impossibile avviare il workflow (${errMsg}). Verifica che il Personal Access Token abbia i permessi <code>workflow</code> o <code>repo</code>.`;
        }
      }
    } catch (err) {
      notify.error(`Errore di rete: ${err.message}`);
      if (syncStatusMsg) {
        syncStatusMsg.className = 'sync-status-box is-error';
        syncStatusMsg.innerHTML = `❌ Errore di connessione: ${err.message}`;
      }
    } finally {
      triggerActionBtn.disabled = false;
      triggerActionBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Sincronizza Ora su GitHub Actions';
    }
  });
}
