/**
 * Definizione dei ruoli tattici, ruoli fantacalcio e stati dei giocatori.
 */

export const ROLES = {
  POR: { code: 'POR', name: 'Portiere', category: 'POR', fantaRole: 'P', color: '#ffb703', bgColor: 'rgba(255, 183, 3, 0.15)', borderColor: '#ffb703' },
  DC:  { code: 'DC',  name: 'Difensore Centrale', category: 'DIF', fantaRole: 'D', color: '#3a86ff', bgColor: 'rgba(58, 134, 255, 0.15)', borderColor: '#3a86ff' },
  TD:  { code: 'TD',  name: 'Terzino Destro', category: 'DIF', fantaRole: 'D', color: '#00b4d8', bgColor: 'rgba(0, 180, 216, 0.15)', borderColor: '#00b4d8' },
  TS:  { code: 'TS',  name: 'Terzino Sinistro', category: 'DIF', fantaRole: 'D', color: '#00b4d8', bgColor: 'rgba(0, 180, 216, 0.15)', borderColor: '#00b4d8' },
  E:   { code: 'E',   name: 'Esterno a Tutta Fascia', category: 'DIF/CEN', fantaRole: 'C', color: '#06d6a0', bgColor: 'rgba(6, 214, 160, 0.15)', borderColor: '#06d6a0' },
  M:   { code: 'M',   name: 'Mediano / Rilanciatore', category: 'CEN', fantaRole: 'C', color: '#118ab2', bgColor: 'rgba(17, 138, 178, 0.15)', borderColor: '#118ab2' },
  C:   { code: 'C',   name: 'Centrocampista / Mezzala', category: 'CEN', fantaRole: 'C', color: '#2ec4b6', bgColor: 'rgba(46, 196, 182, 0.15)', borderColor: '#2ec4b6' },
  T:   { code: 'T',   name: 'Trequartista', category: 'CEN/ATT', fantaRole: 'C', color: '#8338ec', bgColor: 'rgba(131, 56, 236, 0.15)', borderColor: '#8338ec' },
  W:   { code: 'W',   name: 'Ala / Esterno Offensivo', category: 'ATT', fantaRole: 'A', color: '#ff006e', bgColor: 'rgba(255, 0, 110, 0.15)', borderColor: '#ff006e' },
  A:   { code: 'A',   name: 'Seconda Punta / Attaccante', category: 'ATT', fantaRole: 'A', color: '#fb5607', bgColor: 'rgba(251, 86, 7, 0.15)', borderColor: '#fb5607' },
  PC:  { code: 'PC',  name: 'Punta Centrale / Centravanti', category: 'ATT', fantaRole: 'A', color: '#e63946', bgColor: 'rgba(230, 57, 70, 0.15)', borderColor: '#e63946' }
};

export const ROLE_CATEGORIES = [
  { id: 'ALL', name: 'Tutti i ruoli' },
  { id: 'POR', name: 'Portieri (P)' },
  { id: 'DIF', name: 'Difensori (D)' },
  { id: 'CEN', name: 'Centrocampisti (C)' },
  { id: 'ATT', name: 'Attaccanti (A)' }
];

export const PLAYER_STATUSES = {
  tit_sicuro: {
    id: 'tit_sicuro',
    label: 'Titolare sicuro',
    badge: '🟢',
    shortLabel: 'Titolare',
    color: '#00ff87',
    bgColor: 'rgba(0, 255, 135, 0.18)',
    borderColor: '#00ff87',
    icon: 'fa-solid fa-circle-check',
    description: 'Punto fermo indiscutibile della formazione titolare.'
  },
  probabile: {
    id: 'probabile',
    label: 'Probabile titolare',
    badge: '🟢',
    shortLabel: 'Probabile',
    color: '#70e000',
    bgColor: 'rgba(112, 224, 0, 0.18)',
    borderColor: '#70e000',
    icon: 'fa-solid fa-circle-dot',
    description: 'Favorito per partire dall\'inizio nella prossima gara.'
  },
  ballottaggio: {
    id: 'ballottaggio',
    label: 'In ballottaggio',
    badge: '🟡',
    shortLabel: 'Ballottaggio',
    color: '#ffd166',
    bgColor: 'rgba(255, 209, 102, 0.22)',
    borderColor: '#ffd166',
    icon: 'fa-solid fa-scale-balanced',
    description: 'In forte dubbio con un compagno per una maglia da titolare.'
  },
  turnover: {
    id: 'turnover',
    label: 'Possibile turnover',
    badge: '🟠',
    shortLabel: 'Turnover',
    color: '#f77f00',
    bgColor: 'rgba(247, 127, 0, 0.2)',
    borderColor: '#f77f00',
    icon: 'fa-solid fa-arrows-rotate',
    description: 'Rischio riposo per impegni infrasettimanali o gestione energie.'
  },
  infortunato: {
    id: 'infortunato',
    label: 'Infortunato',
    badge: '🔴',
    shortLabel: 'Infortunato',
    color: '#ef233c',
    bgColor: 'rgba(239, 35, 60, 0.25)',
    borderColor: '#ef233c',
    icon: 'fa-solid fa-house-medical',
    description: 'Indisponibile per infortunio fisico.'
  },
  squalificato: {
    id: 'squalificato',
    label: 'Squalificato',
    badge: '🔴',
    shortLabel: 'Squalificato',
    color: '#d90429',
    bgColor: 'rgba(217, 4, 41, 0.25)',
    borderColor: '#d90429',
    icon: 'fa-solid fa-ban',
    description: 'Indisponibile per provvedimento disciplinare o somma di ammonizioni.'
  },
  riserva: {
    id: 'riserva',
    label: 'Riserva',
    badge: '⚪',
    shortLabel: 'Riserva',
    color: '#8d99ae',
    bgColor: 'rgba(141, 153, 174, 0.15)',
    borderColor: '#8d99ae',
    icon: 'fa-solid fa-user-clock',
    description: 'Parte dalla panchina, pronto a subentrare a gara in corso.'
  }
};
