/**
 * Utility helpers per l'applicazione FantaOliva.
 */

export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

export function formatDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

export function getTitolaritaClass(perc) {
  const val = Number(perc);
  if (isNaN(val)) return 'tit-mid';
  if (val >= 70) return 'tit-high';      // Verde (Titolare)
  if (val >= 50) return 'tit-mid-high';  // Ciano (Favorevole)
  if (val >= 35) return 'tit-mid';       // Oro/Ambra (Ballottaggio)
  return 'tit-low';                      // Rosso (Riserva)
}
