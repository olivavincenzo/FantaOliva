/**
 * Moduli tattici e coordinate percentuali (x: 0-100%, y: 0-100%) sul campo da calcio.
 * Il portiere è posizionato in basso (y ~88%) e l'attacco verso l'alto (y ~15%).
 */

export const FORMATIONS = {
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3 Classico',
    category: '4 Difensori',
    description: 'Tridente offensivo largo con regia centrale e mezzali d\'inserimento.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'TD',  label: 'TD',  x: 86, y: 73, defaultRole: 'TD' },
      { id: 'pos_3',  role: 'DC',  label: 'DCD', x: 62, y: 75, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'DCS', x: 38, y: 75, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'TS',  label: 'TS',  x: 14, y: 73, defaultRole: 'TS' },
      { id: 'pos_6',  role: 'M',   label: 'MED', x: 50, y: 56, defaultRole: 'M' },
      { id: 'pos_7',  role: 'C',   label: 'MZD', x: 74, y: 46, defaultRole: 'C' },
      { id: 'pos_8',  role: 'C',   label: 'MZS', x: 26, y: 46, defaultRole: 'C' },
      { id: 'pos_9',  role: 'W',   label: 'AD',  x: 82, y: 24, defaultRole: 'W' },
      { id: 'pos_10', role: 'PC',  label: 'PC',  x: 50, y: 13, defaultRole: 'PC' },
      { id: 'pos_11', role: 'W',   label: 'AS',  x: 18, y: 24, defaultRole: 'W' }
    ],
    connections: [
      ['pos_1', 'pos_3'], ['pos_1', 'pos_4'],
      ['pos_5', 'pos_4'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_4', 'pos_6'], ['pos_3', 'pos_6'],
      ['pos_5', 'pos_8'], ['pos_2', 'pos_7'],
      ['pos_8', 'pos_6'], ['pos_6', 'pos_7'],
      ['pos_8', 'pos_11'], ['pos_7', 'pos_9'],
      ['pos_6', 'pos_10'], ['pos_11', 'pos_10'], ['pos_10', 'pos_9']
    ]
  },

  '4-4-2': {
    id: '4-4-2',
    name: '4-4-2 Lineare',
    category: '4 Difensori',
    description: 'Assetto bilanciato e compatto con due linee da 4 e tandem offensivo.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'TD',  label: 'TD',  x: 86, y: 73, defaultRole: 'TD' },
      { id: 'pos_3',  role: 'DC',  label: 'DCD', x: 62, y: 75, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'DCS', x: 38, y: 75, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'TS',  label: 'TS',  x: 14, y: 73, defaultRole: 'TS' },
      { id: 'pos_6',  role: 'E',   label: 'ED',  x: 86, y: 46, defaultRole: 'E' },
      { id: 'pos_7',  role: 'C',   label: 'CCD', x: 62, y: 52, defaultRole: 'C' },
      { id: 'pos_8',  role: 'C',   label: 'CCS', x: 38, y: 52, defaultRole: 'C' },
      { id: 'pos_9',  role: 'E',   label: 'ES',  x: 14, y: 46, defaultRole: 'E' },
      { id: 'pos_10', role: 'PC',  label: 'PCD', x: 62, y: 15, defaultRole: 'PC' },
      { id: 'pos_11', role: 'A',   label: 'PCS', x: 38, y: 15, defaultRole: 'A' }
    ],
    connections: [
      ['pos_1', 'pos_3'], ['pos_1', 'pos_4'],
      ['pos_5', 'pos_4'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_5', 'pos_9'], ['pos_4', 'pos_8'], ['pos_3', 'pos_7'], ['pos_2', 'pos_6'],
      ['pos_9', 'pos_8'], ['pos_8', 'pos_7'], ['pos_7', 'pos_6'],
      ['pos_9', 'pos_11'], ['pos_6', 'pos_10'], ['pos_8', 'pos_11'], ['pos_7', 'pos_10'],
      ['pos_11', 'pos_10']
    ]
  },

  '4-2-3-1': {
    id: '4-2-3-1',
    name: '4-2-3-1 Offensivo',
    category: '4 Difensori',
    description: 'Doppio perno di centrocampo e tre trequartisti dietro l\'unica punta.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'TD',  label: 'TD',  x: 86, y: 73, defaultRole: 'TD' },
      { id: 'pos_3',  role: 'DC',  label: 'DCD', x: 62, y: 75, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'DCS', x: 38, y: 75, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'TS',  label: 'TS',  x: 14, y: 73, defaultRole: 'TS' },
      { id: 'pos_6',  role: 'M',   label: 'MED-D', x: 64, y: 56, defaultRole: 'M' },
      { id: 'pos_7',  role: 'M',   label: 'MED-S', x: 36, y: 56, defaultRole: 'M' },
      { id: 'pos_8',  role: 'W',   label: 'TRQ-D', x: 80, y: 34, defaultRole: 'W' },
      { id: 'pos_9',  role: 'T',   label: 'TRQ-C', x: 50, y: 32, defaultRole: 'T' },
      { id: 'pos_10', role: 'W',   label: 'TRQ-S', x: 20, y: 34, defaultRole: 'W' },
      { id: 'pos_11', role: 'PC',  label: 'PC',    x: 50, y: 13, defaultRole: 'PC' }
    ],
    connections: [
      ['pos_1', 'pos_3'], ['pos_1', 'pos_4'],
      ['pos_5', 'pos_4'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_4', 'pos_7'], ['pos_3', 'pos_6'], ['pos_7', 'pos_6'],
      ['pos_5', 'pos_10'], ['pos_2', 'pos_8'],
      ['pos_7', 'pos_10'], ['pos_7', 'pos_9'], ['pos_6', 'pos_9'], ['pos_6', 'pos_8'],
      ['pos_10', 'pos_9'], ['pos_9', 'pos_8'],
      ['pos_10', 'pos_11'], ['pos_9', 'pos_11'], ['pos_8', 'pos_11']
    ]
  },

  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2 Dominio Fasce',
    category: '3 Difensori',
    description: 'Difesa a 3 con esterni a tutta fascia, 3 centrocampisti centrali e due punte.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'DC',  label: 'BR-D', x: 74, y: 74, defaultRole: 'DC' },
      { id: 'pos_3',  role: 'DC',  label: 'LIB',  x: 50, y: 76, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'BR-S', x: 26, y: 74, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'E',   label: 'ED',   x: 88, y: 46, defaultRole: 'E' },
      { id: 'pos_6',  role: 'C',   label: 'MZD',  x: 68, y: 50, defaultRole: 'C' },
      { id: 'pos_7',  role: 'M',   label: 'REG',  x: 50, y: 56, defaultRole: 'M' },
      { id: 'pos_8',  role: 'C',   label: 'MZS',  x: 32, y: 50, defaultRole: 'C' },
      { id: 'pos_9',  role: 'E',   label: 'ES',   x: 12, y: 46, defaultRole: 'E' },
      { id: 'pos_10', role: 'PC',  label: 'PCD',  x: 62, y: 15, defaultRole: 'PC' },
      { id: 'pos_11', role: 'A',   label: 'PCS',  x: 38, y: 15, defaultRole: 'A' }
    ],
    connections: [
      ['pos_1', 'pos_3'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_4', 'pos_9'], ['pos_4', 'pos_8'], ['pos_3', 'pos_7'], ['pos_2', 'pos_6'], ['pos_2', 'pos_5'],
      ['pos_9', 'pos_8'], ['pos_8', 'pos_7'], ['pos_7', 'pos_6'], ['pos_6', 'pos_5'],
      ['pos_9', 'pos_11'], ['pos_8', 'pos_11'], ['pos_6', 'pos_10'], ['pos_5', 'pos_10'],
      ['pos_11', 'pos_10']
    ]
  },

  '3-4-2-1': {
    id: '3-4-2-1',
    name: '3-4-2-1 Trequarti Dinamica',
    category: '3 Difensori',
    description: 'Difesa a 3, mediana a 2 con esterni alti e due sottopunta dietro l\'attaccante.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'DC',  label: 'BR-D', x: 74, y: 74, defaultRole: 'DC' },
      { id: 'pos_3',  role: 'DC',  label: 'LIB',  x: 50, y: 76, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'BR-S', x: 26, y: 74, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'E',   label: 'ED',   x: 88, y: 48, defaultRole: 'E' },
      { id: 'pos_6',  role: 'C',   label: 'CCD',  x: 64, y: 56, defaultRole: 'C' },
      { id: 'pos_7',  role: 'C',   label: 'CCS',  x: 36, y: 56, defaultRole: 'C' },
      { id: 'pos_8',  role: 'E',   label: 'ES',   x: 12, y: 48, defaultRole: 'E' },
      { id: 'pos_9',  role: 'T',   label: 'TRQ-D', x: 66, y: 30, defaultRole: 'T' },
      { id: 'pos_10', role: 'T',   label: 'TRQ-S', x: 34, y: 30, defaultRole: 'T' },
      { id: 'pos_11', role: 'PC',  label: 'PC',    x: 50, y: 13, defaultRole: 'PC' }
    ],
    connections: [
      ['pos_1', 'pos_3'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_4', 'pos_8'], ['pos_4', 'pos_7'], ['pos_2', 'pos_6'], ['pos_2', 'pos_5'],
      ['pos_8', 'pos_7'], ['pos_7', 'pos_6'], ['pos_6', 'pos_5'],
      ['pos_7', 'pos_10'], ['pos_6', 'pos_9'], ['pos_8', 'pos_10'], ['pos_5', 'pos_9'],
      ['pos_10', 'pos_9'], ['pos_10', 'pos_11'], ['pos_9', 'pos_11']
    ]
  },

  '3-4-3': {
    id: '3-4-3',
    name: '3-4-3 Aggressivo',
    category: '3 Difensori',
    description: 'Modulo ad alta intensità con 3 difensori, 4 centrocampisti e tridente largo.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'DC',  label: 'BR-D', x: 74, y: 74, defaultRole: 'DC' },
      { id: 'pos_3',  role: 'DC',  label: 'LIB',  x: 50, y: 76, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'BR-S', x: 26, y: 74, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'E',   label: 'ED',   x: 88, y: 50, defaultRole: 'E' },
      { id: 'pos_6',  role: 'C',   label: 'CCD',  x: 64, y: 56, defaultRole: 'C' },
      { id: 'pos_7',  role: 'C',   label: 'CCS',  x: 36, y: 56, defaultRole: 'C' },
      { id: 'pos_8',  role: 'E',   label: 'ES',   x: 12, y: 50, defaultRole: 'E' },
      { id: 'pos_9',  role: 'W',   label: 'AD',   x: 82, y: 24, defaultRole: 'W' },
      { id: 'pos_10', role: 'PC',  label: 'PC',   x: 50, y: 13, defaultRole: 'PC' },
      { id: 'pos_11', role: 'W',   label: 'AS',   x: 18, y: 24, defaultRole: 'W' }
    ],
    connections: [
      ['pos_1', 'pos_3'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_4', 'pos_8'], ['pos_4', 'pos_7'], ['pos_2', 'pos_6'], ['pos_2', 'pos_5'],
      ['pos_8', 'pos_7'], ['pos_7', 'pos_6'], ['pos_6', 'pos_5'],
      ['pos_8', 'pos_11'], ['pos_5', 'pos_9'], ['pos_7', 'pos_10'], ['pos_6', 'pos_10'],
      ['pos_11', 'pos_10'], ['pos_10', 'pos_9']
    ]
  },

  '4-3-1-2': {
    id: '4-3-1-2',
    name: '4-3-1-2 Rombo',
    category: '4 Difensori',
    description: 'Centrocampo a rombo con vertice basso, due mezzali, trequartista e due attaccanti.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'TD',  label: 'TD',  x: 86, y: 73, defaultRole: 'TD' },
      { id: 'pos_3',  role: 'DC',  label: 'DCD', x: 62, y: 75, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'DCS', x: 38, y: 75, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'TS',  label: 'TS',  x: 14, y: 73, defaultRole: 'TS' },
      { id: 'pos_6',  role: 'M',   label: 'REG', x: 50, y: 60, defaultRole: 'M' },
      { id: 'pos_7',  role: 'C',   label: 'MZD', x: 74, y: 48, defaultRole: 'C' },
      { id: 'pos_8',  role: 'C',   label: 'MZS', x: 26, y: 48, defaultRole: 'C' },
      { id: 'pos_9',  role: 'T',   label: 'TRQ', x: 50, y: 32, defaultRole: 'T' },
      { id: 'pos_10', role: 'PC',  label: 'PCD', x: 62, y: 15, defaultRole: 'PC' },
      { id: 'pos_11', role: 'A',   label: 'PCS', x: 38, y: 15, defaultRole: 'A' }
    ],
    connections: [
      ['pos_1', 'pos_3'], ['pos_1', 'pos_4'],
      ['pos_5', 'pos_4'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_4', 'pos_6'], ['pos_3', 'pos_6'], ['pos_5', 'pos_8'], ['pos_2', 'pos_7'],
      ['pos_8', 'pos_6'], ['pos_6', 'pos_7'], ['pos_8', 'pos_9'], ['pos_7', 'pos_9'], ['pos_6', 'pos_9'],
      ['pos_9', 'pos_11'], ['pos_9', 'pos_10'], ['pos_11', 'pos_10']
    ]
  },

  '4-4-1-1': {
    id: '4-4-1-1',
    name: '4-4-1-1 Sottopunta',
    category: '4 Difensori',
    description: 'Quattro difensori, quattro centrocampisti, una seconda punta/trequartista e una punta.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'TD',  label: 'TD',  x: 86, y: 73, defaultRole: 'TD' },
      { id: 'pos_3',  role: 'DC',  label: 'DCD', x: 62, y: 75, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'DCS', x: 38, y: 75, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'TS',  label: 'TS',  x: 14, y: 73, defaultRole: 'TS' },
      { id: 'pos_6',  role: 'E',   label: 'ED',  x: 86, y: 48, defaultRole: 'E' },
      { id: 'pos_7',  role: 'C',   label: 'CCD', x: 62, y: 54, defaultRole: 'C' },
      { id: 'pos_8',  role: 'C',   label: 'CCS', x: 38, y: 54, defaultRole: 'C' },
      { id: 'pos_9',  role: 'E',   label: 'ES',  x: 14, y: 48, defaultRole: 'E' },
      { id: 'pos_10', role: 'T',   label: 'SP',  x: 50, y: 30, defaultRole: 'T' },
      { id: 'pos_11', role: 'PC',  label: 'PC',  x: 50, y: 13, defaultRole: 'PC' }
    ],
    connections: [
      ['pos_1', 'pos_3'], ['pos_1', 'pos_4'],
      ['pos_5', 'pos_4'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_5', 'pos_9'], ['pos_4', 'pos_8'], ['pos_3', 'pos_7'], ['pos_2', 'pos_6'],
      ['pos_9', 'pos_8'], ['pos_8', 'pos_7'], ['pos_7', 'pos_6'],
      ['pos_8', 'pos_10'], ['pos_7', 'pos_10'], ['pos_9', 'pos_10'], ['pos_6', 'pos_10'],
      ['pos_10', 'pos_11']
    ]
  },

  '5-3-2': {
    id: '5-3-2',
    name: '5-3-2 Difensivo / Contropiede',
    category: '5 Difensori',
    description: 'Catenaccio moderno con linea a 5, 3 interni di centrocampo e due contropiedisti.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'TD',  label: 'TD',  x: 88, y: 70, defaultRole: 'TD' },
      { id: 'pos_3',  role: 'DC',  label: 'DCD', x: 68, y: 76, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'LIB', x: 50, y: 78, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'DC',  label: 'DCS', x: 32, y: 76, defaultRole: 'DC' },
      { id: 'pos_6',  role: 'TS',  label: 'TS',  x: 12, y: 70, defaultRole: 'TS' },
      { id: 'pos_7',  role: 'C',   label: 'CCD', x: 70, y: 48, defaultRole: 'C' },
      { id: 'pos_8',  role: 'M',   label: 'REG', x: 50, y: 54, defaultRole: 'M' },
      { id: 'pos_9',  role: 'C',   label: 'CCS', x: 30, y: 48, defaultRole: 'C' },
      { id: 'pos_10', role: 'PC',  label: 'PCD', x: 62, y: 15, defaultRole: 'PC' },
      { id: 'pos_11', role: 'A',   label: 'PCS', x: 38, y: 15, defaultRole: 'A' }
    ],
    connections: [
      ['pos_1', 'pos_4'], ['pos_6', 'pos_5'], ['pos_5', 'pos_4'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_6', 'pos_9'], ['pos_5', 'pos_9'], ['pos_4', 'pos_8'], ['pos_3', 'pos_7'], ['pos_2', 'pos_7'],
      ['pos_9', 'pos_8'], ['pos_8', 'pos_7'],
      ['pos_9', 'pos_11'], ['pos_7', 'pos_10'], ['pos_8', 'pos_10'], ['pos_8', 'pos_11'],
      ['pos_11', 'pos_10']
    ]
  },

  '5-4-1': {
    id: '5-4-1',
    name: '5-4-1 Blocco Basso',
    category: '5 Difensori',
    description: 'Assetto ermetico con linea a 5, mediana a 4 e unica punta solitaria.',
    slots: [
      { id: 'pos_1',  role: 'POR', label: 'POR', x: 50, y: 91, defaultRole: 'POR' },
      { id: 'pos_2',  role: 'TD',  label: 'TD',  x: 88, y: 70, defaultRole: 'TD' },
      { id: 'pos_3',  role: 'DC',  label: 'DCD', x: 68, y: 76, defaultRole: 'DC' },
      { id: 'pos_4',  role: 'DC',  label: 'LIB', x: 50, y: 78, defaultRole: 'DC' },
      { id: 'pos_5',  role: 'DC',  label: 'DCS', x: 32, y: 76, defaultRole: 'DC' },
      { id: 'pos_6',  role: 'TS',  label: 'TS',  x: 12, y: 70, defaultRole: 'TS' },
      { id: 'pos_7',  role: 'E',   label: 'ED',  x: 86, y: 46, defaultRole: 'E' },
      { id: 'pos_8',  role: 'C',   label: 'CCD', x: 62, y: 52, defaultRole: 'C' },
      { id: 'pos_9',  role: 'C',   label: 'CCS', x: 38, y: 52, defaultRole: 'C' },
      { id: 'pos_10', role: 'E',   label: 'ES',  x: 14, y: 46, defaultRole: 'E' },
      { id: 'pos_11', role: 'PC',  label: 'PC',  x: 50, y: 13, defaultRole: 'PC' }
    ],
    connections: [
      ['pos_1', 'pos_4'], ['pos_6', 'pos_5'], ['pos_5', 'pos_4'], ['pos_4', 'pos_3'], ['pos_3', 'pos_2'],
      ['pos_6', 'pos_10'], ['pos_5', 'pos_9'], ['pos_4', 'pos_9'], ['pos_4', 'pos_8'], ['pos_3', 'pos_8'], ['pos_2', 'pos_7'],
      ['pos_10', 'pos_9'], ['pos_9', 'pos_8'], ['pos_8', 'pos_7'],
      ['pos_10', 'pos_11'], ['pos_9', 'pos_11'], ['pos_8', 'pos_11'], ['pos_7', 'pos_11']
    ]
  }
};

export const FORMATION_LIST = Object.keys(FORMATIONS).map(key => ({
  id: key,
  name: FORMATIONS[key].name,
  category: FORMATIONS[key].category,
  description: FORMATIONS[key].description
}));
