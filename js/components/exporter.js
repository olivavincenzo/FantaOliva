/**
 * Componente Esportazione Formazione (Image & JSON Exporter)
 * Permette di:
 * - Esportare la formazione come immagine ad alta risoluzione (PNG) generata tramite HTML5 Canvas
 * - Esportare / Importare il database in formato JSON per backup e condivisione
 */

import { store } from '../store.js';
import { ROLES, PLAYER_STATUSES } from '../data/roles.js';
import { notify } from '../utils/notifications.js';

export function exportFormationAsImage() {
  const team = store.getCurrentTeam();
  const formation = store.getCurrentFormation();
  const lineup = store.getLineupPlayers();

  if (!team || !formation) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Dimensioni canvas ad alta risoluzione (2x per Retina)
  const width = 1200;
  const height = 1600;
  canvas.width = width;
  canvas.height = height;

  // Sfondo scuro EA FC
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(0, 0, width, height);

  // Header Squadra & Modulo
  ctx.fillStyle = '#121b2a';
  ctx.fillRect(40, 40, width - 80, 110);
  ctx.strokeStyle = team.primaryColor || '#00ff87';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, width - 80, 110);

  // Titolo Squadra
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Outfit", sans-serif';
  ctx.fillText(team.name.toUpperCase(), 70, 110);

  // Modulo & Allenatore
  ctx.fillStyle = '#00ff87';
  ctx.font = 'bold 28px "Outfit", sans-serif';
  ctx.fillText(`MODULO: ${formation.name || team.defaultFormation}`, width - 360, 110);

  // --- DISEGNO DEL CAMPO DA CALCIO ---
  const pitchX = 60;
  const pitchY = 180;
  const pitchW = width - 120;
  const pitchH = height - 240;

  // Manto erboso
  const grad = ctx.createLinearGradient(0, pitchY, 0, pitchY + pitchH);
  grad.addColorStop(0, '#103923');
  grad.addColorStop(0.5, '#0c2d1b');
  grad.addColorStop(1, '#082315');
  ctx.fillStyle = grad;
  ctx.fillRect(pitchX, pitchY, pitchW, pitchH);

  // Strisce erba
  const stripes = 10;
  const stripeH = pitchH / stripes;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < stripes; i += 2) {
    ctx.fillRect(pitchX, pitchY + (i * stripeH), pitchW, stripeH);
  }

  // Linee di campo bianche
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 3.5;

  // Perimetro
  ctx.strokeRect(pitchX + 15, pitchY + 15, pitchW - 30, pitchH - 30);

  // Linea di metà campo
  const midY = pitchY + (pitchH / 2);
  ctx.beginPath();
  ctx.moveTo(pitchX + 15, midY);
  ctx.lineTo(pitchX + pitchW - 15, midY);
  ctx.stroke();

  // Cerchio di centrocampo
  ctx.beginPath();
  ctx.arc(pitchX + (pitchW / 2), midY, 90, 0, Math.PI * 2);
  ctx.stroke();

  // Dischetto centrale
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.arc(pitchX + (pitchW / 2), midY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Area rigore superiore
  ctx.strokeRect(pitchX + (pitchW / 2) - 200, pitchY + 15, 400, 190);
  ctx.strokeRect(pitchX + (pitchW / 2) - 90, pitchY + 15, 180, 70);

  // Area rigore inferiore
  ctx.strokeRect(pitchX + (pitchW / 2) - 200, pitchY + pitchH - 205, 400, 190);
  ctx.strokeRect(pitchX + (pitchW / 2) - 90, pitchY + pitchH - 85, 180, 70);

  // --- DISEGNO GIOCATORI ---
  lineup.forEach(item => {
    const player = item.player;
    if (!player) return;

    const px = pitchX + (item.x / 100) * pitchW;
    const py = pitchY + (item.y / 100) * pitchH;

    const roleInfo = ROLES[player.role] || ROLES.C;
    const statusInfo = PLAYER_STATUSES[player.status] || PLAYER_STATUSES.tit_sicuro;

    const cardW = 100;
    const cardH = 90;
    const cardX = px - (cardW / 2);
    const cardY = py - (cardH / 2);

    // Sfondo card con gradiente
    ctx.fillStyle = '#121b2a';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 10);
    ctx.fill();

    // Bordo card con colore del ruolo
    ctx.strokeStyle = roleInfo.color || '#00ff87';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Barra superiore con numero e ruolo
    ctx.fillStyle = roleInfo.color || '#00ff87';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.fillText(`${player.number || ''}`, cardX + 8, cardY + 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.fillText(`${player.role}`, cardX + cardW - 38, cardY + 20);

    // Status dot
    ctx.fillStyle = statusInfo.color || '#00ff87';
    ctx.beginPath();
    ctx.arc(cardX + (cardW / 2), cardY + 16, 5, 0, Math.PI * 2);
    ctx.fill();

    // Nome Giocatore
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player.displayName || player.surname, px, cardY + 52);

    // Fantamedia / Fanta-Role
    ctx.fillStyle = '#00d2ff';
    ctx.font = '13px "Outfit", sans-serif';
    ctx.fillText(`${player.fantaRole} | FM ${player.fantamedia ? Number(player.fantamedia).toFixed(1) : '-'}`, px, cardY + 74);
    ctx.textAlign = 'left';
  });

  // Footer Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '16px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FantaOliva - Tactical Board Serie A', width / 2, height - 20);

  // Download Trigger
  const imageUri = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `Formazione_${team.shortName}_${formation.id}_FantaOliva.png`;
  link.href = imageUri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  notify.success('Immagine formazione scaricata con successo!');
}

export function initExportModal() {
  const exportImgBtn = document.querySelector('#export-image-btn');
  const exportJsonBtn = document.querySelector('#export-json-btn');
  const importJsonBtn = document.querySelector('#import-json-btn');
  const importFileInput = document.querySelector('#import-file-input');

  exportImgBtn?.addEventListener('click', () => {
    exportFormationAsImage();
  });

  exportJsonBtn?.addEventListener('click', () => {
    const jsonStr = store.exportStateJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `FantaOliva_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify.success('Backup JSON scaricato con successo!');
  });

  importJsonBtn?.addEventListener('click', () => {
    importFileInput?.click();
  });

  importFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const success = store.importStateJson(content);
        if (success) {
          notify.success('Dati importati con successo!');
        } else {
          notify.error('File JSON non valido o corrotto.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}
