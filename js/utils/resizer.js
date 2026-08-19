/**
 * Gestore per il ridimensionamento interattivo di entrambe le sidebar:
 * - Sidebar Sinistra (Club Serie A) tramite #sidebar-teams-resizer
 * - Sidebar Destra (Ispettore / Scheda Giocatore) tramite #sidebar-inspector-resizer
 */

export function initSidebarResizer() {
  initResizablePanel({
    resizerId: 'sidebar-teams-resizer',
    panelId: 'sidebar-teams',
    storageKey: 'fantaoliva_teams_sidebar_width',
    cssVarName: '--left-sidebar-width',
    minWidth: 160,
    maxWidthLimit: (winW) => Math.min(480, winW * 0.4),
    side: 'left'
  });

  initResizablePanel({
    resizerId: 'sidebar-inspector-resizer',
    panelId: 'sidebar-inspector',
    storageKey: 'fantaoliva_inspector_width',
    cssVarName: '--right-sidebar-width',
    minWidth: 280,
    maxWidthLimit: (winW) => Math.min(850, winW - 320),
    side: 'right'
  });
}

function initResizablePanel({
  resizerId,
  panelId,
  storageKey,
  cssVarName,
  minWidth,
  maxWidthLimit,
  side
}) {
  const resizer = document.getElementById(resizerId);
  const panel = document.getElementById(panelId);
  if (!resizer || !panel) return;

  function applyWidth(widthPx) {
    panel.style.width = `${widthPx}px`;
    panel.style.minWidth = `${widthPx}px`;
    panel.style.maxWidth = `${widthPx}px`;
    document.documentElement.style.setProperty(cssVarName, `${widthPx}px`);
  }

  // Ripristina larghezza salvata se valida
  try {
    const savedWidth = localStorage.getItem(storageKey);
    if (savedWidth) {
      const numW = Number(savedWidth);
      const maxW = maxWidthLimit(window.innerWidth);
      if (!isNaN(numW) && numW >= minWidth && numW <= maxW) {
        applyWidth(numW);
      }
    }
  } catch (e) {
    // Ignora fallback localStorage
  }

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  const onStart = (clientX) => {
    isDragging = true;
    startX = clientX;
    startWidth = panel.getBoundingClientRect().width;
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

    let newWidth = startWidth;
    if (side === 'left') {
      // Per il pannello sinistro, trascinare verso destra (clientX maggiore) aumenta la larghezza
      const deltaX = clientX - startX;
      const maxW = maxWidthLimit(window.innerWidth);
      newWidth = Math.min(Math.max(startWidth + deltaX, minWidth), maxW);
    } else {
      // Per il pannello destro, trascinare verso sinistra (clientX minore) aumenta la larghezza
      const deltaX = startX - clientX;
      const maxW = maxWidthLimit(window.innerWidth);
      newWidth = Math.min(Math.max(startWidth + deltaX, minWidth), maxW);
    }

    applyWidth(newWidth);
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('is-resizing-sidebar');
    resizer.classList.remove('is-dragging');

    try {
      const finalWidth = Math.round(panel.getBoundingClientRect().width);
      localStorage.setItem(storageKey, String(finalWidth));
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
