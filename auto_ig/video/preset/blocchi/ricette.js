// PRESET blocchi — personaggi pronti (ricette) e comparse casuali. Si costruiscono con creaAvatar(THREE, RICETTE.tu).
// Ogni ricetta è solo una scelta di pezzi: per un personaggio nuovo si copia e si cambia un pezzo.
import { CAPELLI } from './capelli.js';
import { SOPRA, SOTTO, STAMPE } from './vestiti.js';
import { rnd } from './geometria.js';

export const RICETTE = {
  // il protagonista "tu": quello che sbaglia
  tu: { pelle: 1, capelli: 'ciuffo', colCapelli: '#4a2c1a', occhi: 'tondi',
    sopra: { tipo: 'felpa', colore: '#9aa3ad', colore2: '#ffffff', stampa: 'logo' }, sotto: { tipo: 'jeans', colore: '#41679e' },
    scarpe: { tipo: 'sneaker', colore: '#f7f7f7', colore2: '#e9463c' } },
  // l'amica che ti sgama
  amica: { pelle: 3, capelli: 'ricci', colCapelli: '#2b1a10', occhi: 'ciglia', lentiggini: true,
    sopra: { tipo: 'tshirt', colore: '#f6d36b', colore2: '#e9463c', stampa: 'cuore' }, sotto: { tipo: 'cargo', colore: '#6b7a4f' },
    scarpe: { tipo: 'alte', colore: '#1d1d1f', colore2: '#ffffff' }, accessori: ['orecchini'] },
  amico: { pelle: 4, capelli: 'rasati', colCapelli: '#1a1210', occhi: 'furbi', cappello: 'cappellinoRovescio', colCappello: '#1d1d1f', colCappello2: '#e9463c',
    sopra: { tipo: 'tuta', colore: '#2f8f6b', colore2: '#ffffff' }, sotto: { tipo: 'tuta', colore: '#2f8f6b', colore2: '#ffffff' },
    scarpe: { tipo: 'sneaker', colore: '#ffffff', colore2: '#2f8f6b' }, accessori: ['catenina'] },
  prof: { pelle: 0, capelli: 'chignon', colCapelli: '#8a8a8a', occhi: 'assonnati', sopracciglia: 'sottili',
    sopra: { tipo: 'camicia', colore: '#9cc6ea', colore2: '#ffffff' }, sotto: { tipo: 'gonna', colore: '#3b3d55' },
    scarpe: { tipo: 'tacchi', colore: '#5a2430' }, accessori: ['occhiali'] },
  commesso: { pelle: 2, capelli: 'corti', colCapelli: '#2a1a10', occhi: 'tondi',
    sopra: { tipo: 'giacca', colore: '#1f2f5a', colore2: '#ffffff', stampa: null }, sotto: { tipo: 'pantaloni', colore: '#1f2f5a' },
    scarpe: { tipo: 'stivali', colore: '#2a1b14' } },
  boss: { pelle: 1, capelli: 'cresta', colCapelli: '#e7c25a', occhi: 'sottili', sopracciglia: 'folte',
    sopra: { tipo: 'giacca', colore: '#141414', colore2: '#d8262f' }, sotto: { tipo: 'pantaloni', colore: '#141414' },
    scarpe: { tipo: 'anfibi', colore: '#141414' }, accessori: ['occhialiSole', 'catenina'] },
  rapper: { pelle: 5, capelli: 'afro', colCapelli: '#160e0a', occhi: 'grandi', colOcchi: '#3b2416',
    sopra: { tipo: 'felpa', colore: '#d8262f', colore2: '#ffffff', stampa: 'numero' }, sotto: { tipo: 'pantaloni', colore: '#1d1d1f' },
    scarpe: { tipo: 'anfibi', colore: '#1d1d1f' }, accessori: ['cuffie'] },
  sorella: { pelle: 2, capelli: 'coda', colCapelli: '#7a3b1e', occhi: 'grandi', colOcchi: '#2f6b3a',
    sopra: { tipo: 'maglione', colore: '#c7a6f0', colore2: '#ffffff' }, sotto: { tipo: 'pantaloncini', colore: '#3e5f95' },
    scarpe: { tipo: 'crocs', colore: '#8fd6b4' }, accessori: ['telefono'] },
  conduttore: { pelle: 2, capelli: 'corti', colCapelli: '#1f140c', occhi: 'tondi', sopracciglia: 'folte',
    sopra: { tipo: 'giacca', colore: '#2b3a67', colore2: '#ffffff' }, sotto: { tipo: 'pantaloni', colore: '#2b3a67' },
    scarpe: { tipo: 'stivali', colore: '#1d1d1f' } },
};

const COLORI = ['#e9463c', '#2f6fd1', '#f6d36b', '#2f8f6b', '#c7a6f0', '#f29ab8', '#1d1d1f', '#ffffff', '#9aa3ad', '#f5a66b'];
const COL_CAPELLI = ['#1a1210', '#3a2618', '#6b3f22', '#a8642c', '#e7c25a', '#8a8a8a', '#d8506a'];

// Comparse: un personaggio diverso per ogni seed, sempre con pezzi della libreria
export function casuale(seed = 1) {
  const r = rnd(seed * 7919 + 13), pick = (a) => a[Math.floor(r() * a.length)];
  const sotto = pick(SOTTO);
  return {
    pelle: Math.floor(r() * 6), capelli: pick(CAPELLI.filter((c) => c !== 'pelato')), colCapelli: pick(COL_CAPELLI),
    occhi: pick(['tondi', 'ciglia', 'sottili', 'assonnati', 'furbi', 'grandi']),
    cappello: r() < 0.2 ? pick(['cappellino', 'cappellinoRovescio', 'berretto']) : null, colCappello: pick(COLORI),
    sopra: { tipo: pick(SOPRA), colore: pick(COLORI), colore2: pick(COLORI), stampa: r() < 0.5 ? pick(STAMPE) : null },
    sotto: { tipo: sotto, colore: sotto === 'jeans' ? pick(['#3e5f95', '#2b3f66', '#6f8fbf']) : pick(COLORI), colore2: '#ffffff' },
    scarpe: { tipo: pick(['sneaker', 'alte', 'anfibi', 'crocs', 'stivali']), colore: pick(COLORI), colore2: pick(COLORI) },
    accessori: r() < 0.3 ? [pick(['occhiali', 'occhialiSole', 'cuffie', 'catenina', 'zaino'])] : [],
  };
}
