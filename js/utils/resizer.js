/**
 * Gestore per il ridimensionamento interattivo della sidebar destra (Ispettore / Scheda Giocatore)
 * Consente di trascinare il bordo sinistro della sidebar per allargarla o stringerla a piacere.
 */

export function initSidebarResizer() {
  const resizer = document.getElementById('sidebar-inspector-resizer');
  const sidebar = document.getElementById('sidebar-inspector');
  if (!resizer || !sidebar) return;

  const STORAGE_KEY_WIDTH = 'fantaoliva_inspector_width';

  // Ripristina larghezza salvata se valida
  try {
    const savedWidth = localStorage.getItem(STORAGE_KEY_WIDTH);
    if (savedWidth) {
      const numW = Number(savedWidth);
      if (!isNaN(numW) && numW >= 280 && numW <= window.innerWidth * 0.7) {
        applyWidth(numW);
      }
    }
  } catch (e) {
    // Ignora fallback localStorage
  }

  function applyWidth(widthPx) {
    sidebar.style.width = `${widthPx}px`;
    sidebar.style.minWidth = `${widthPx}px`;
    sidebar.style.maxWidth = `${widthPx}px`;
    document.documentElement.style.setProperty('--right-sidebar-width', `${widthPx}px`);
  }

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  const onStart = (clientX) => {
    isDragging = true;
    startX = clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    document.body.classList.add('is-resizing-sidebar');
    resizer.classList.add('is-dragging');
  };

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onStart(e.clientX);
  });

  resizer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      onStart(e.touches[0].clientX);
    }
  }, { passive: true });

  const onMove = (clientX) => {
    if (!isDragging) return;

    // Poiché si trova a destra, trascinare verso sinistra (clientX minore) aumenta la larghezza:
    const deltaX = startX - clientX;
    const minWidth = 280;
    const maxWidth = Math.min(850, window.innerWidth - 320);
    const newWidth = Math.min(Math.max(startWidth + deltaX, minWidth), maxWidth);

    applyWidth(newWidth);
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('is-resizing-sidebar');
    resizer.classList.remove('is-dragging');

    try {
      const finalWidth = Math.round(sidebar.getBoundingClientRect().width);
      localStorage.setItem(STORAGE_KEY_WIDTH, String(finalWidth));
    } catch (e) {
      // ignore
    }
  };

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      onMove(e.clientX);
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
      onMove(e.touches[0].clientX);
    }
  }, { passive: true });

  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}
