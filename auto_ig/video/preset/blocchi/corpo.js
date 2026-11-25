// PRESET blocchi — l'avatar a blocchi componibile "come i Lego".
//   const av = creaAvatar(THREE, ricetta)   (ricetta: vedi RICETTA_BASE; i pezzi da capelli.js, vestiti.js, scarpe.js, accessori.js)
//   av.root                    -> da aggiungere alla scena (piedi a y=0, guarda verso +z)
//   av.posa('parla', t, {energia})   (pose.js)        av.faccia({espr, bocca, palpebra, sguardo})
//   av.testaMondo(v)           -> posizione della testa nel mondo (per la camera)
// Gerarchia: root → anca (y=2) → busto → collo → testa ; busto → braccioS/braccioD (spalle) ; anca → gambaS/gambaD
import { boxTondo, testaTonda, plastica, tono } from './geometria.js';
import { disegnaFaccia } from './facce.js';
import { materialiVestiti, pezziVestiti } from './vestiti.js';
import { creaCapelli, creaCappello } from './capelli.js';
import { creaScarpa } from './scarpe.js';
import { aggiungiAccessorio } from './accessori.js';
import { applicaPosa } from './pose.js';

export const PELLI = ['#ffdcc0', '#f6c7a0', '#e3aa7c', '#c98d5e', '#9c6743', '#6e4429'];
export const M = { gamba: { w: 0.96, h: 2, d: 1 }, busto: { w: 2, h: 2, d: 1 }, braccio: { w: 0.96, h: 2, d: 1 }, testa: { r: 0.6, h: 1.2 } };

export const RICETTA_BASE = {
  pelle: 1, occhi: 'tondi', sopracciglia: 'normali', guance: true, lentiggini: false, colOcchi: '#5b3a24',
  capelli: 'corti', colCapelli: '#3a2618', cappello: null, colCappello: '#d33a3a', colCappello2: null,
  sopra: { tipo: 'tshirt', colore: '#e9463c', colore2: '#ffffff', stampa: null },
  sotto: { tipo: 'jeans', colore: '#3e5f95', colore2: '#ffffff' },
  scarpe: { tipo: 'sneaker', colore: '#f4f4f4', colore2: '#e9463c' },
  accessori: [],
};

export function normalizza(r = {}) {
  const b = RICETTA_BASE;
  const out = { ...b, ...r, sopra: { ...b.sopra, ...(r.sopra || {}) }, sotto: { ...b.sotto, ...(r.sotto || {}) }, scarpe: { ...b.scarpe, ...(r.scarpe || {}) } };
  out.pelleHex = typeof out.pelle === 'number' ? PELLI[out.pelle] : out.pelle;
  return out;
}

export function creaAvatar(THREE, ricetta = {}) {
  const r = normalizza(ricetta);
  const root = new THREE.Group(); root.name = 'avatar';
  const anca = new THREE.Group(); anca.position.y = 2; root.add(anca);
  const busto = new THREE.Group(); anca.add(busto);
  const vest = materialiVestiti(THREE, r, M);
  const ombra = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  const mBusto = ombra(new THREE.Mesh(boxTondo(THREE, M.busto.w, M.busto.h, M.busto.d, 0.1), vest.busto)); mBusto.position.y = 1; busto.add(mBusto);
  // collo + testa
  const collo = new THREE.Group(); collo.position.y = 2.02; busto.add(collo);
  const testa = new THREE.Group(); testa.position.y = 0.6; collo.add(testa);
  const pelle = plastica(THREE, r.pelleHex, { roughness: 0.55 });
  testa.add(ombra(new THREE.Mesh(testaTonda(THREE, M.testa.r, M.testa.h, 0.2), pelle)));
  // faccia: un canvas solo, ridisegnato quando cambia lo stato
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 376;
  const ctx = cv.getContext('2d'), texF = new THREE.CanvasTexture(cv); texF.colorSpace = THREE.SRGBColorSpace; texF.anisotropy = 4;
  const mFaccia = new THREE.MeshStandardMaterial({ map: texF, transparent: true, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 });
  const faccia = new THREE.Mesh(new THREE.CylinderGeometry(0.6025, 0.6025, 0.84, 40, 1, true, -1.2, 2.4), mFaccia);
  testa.add(faccia);
  if (r.capelli) testa.add(creaCapelli(THREE, r.capelli, r.colCapelli, { sottoCappello: !!r.cappello }));
  if (r.cappello) testa.add(creaCappello(THREE, r.cappello, r.colCappello, r.colCappello2));

  // braccia
  const braccio = (lato) => {
    const g = new THREE.Group(); g.position.set(lato * 1.5, 1.85, 0); busto.add(g);
    const m = ombra(new THREE.Mesh(boxTondo(THREE, M.braccio.w, M.braccio.h, M.braccio.d, 0.1), lato < 0 ? vest.braccio.s : vest.braccio.d));
    m.position.y = -0.85; g.add(m); return g;
  };
  const braccioS = braccio(-1), braccioD = braccio(1);
  // gambe + scarpe
  const gamba = (lato) => {
    const g = new THREE.Group(); g.position.set(lato * 0.5, 0, 0); anca.add(g);
    const m = ombra(new THREE.Mesh(boxTondo(THREE, M.gamba.w, M.gamba.h, M.gamba.d, 0.08), lato < 0 ? vest.gamba.s : vest.gamba.d));
    m.position.y = -1; g.add(m);
    g.add(creaScarpa(THREE, r.scarpe.tipo, r.scarpe.colore, r.scarpe.colore2)); return g;
  };
  const gambaS = gamba(-1), gambaD = gamba(1);

  const av = { r, root, anca, busto, collo, testa, faccia, braccioS, braccioD, gambaS, gambaD, base: { x: 0, y: 0, z: 0, ry: 0 } };
  pezziVestiti(THREE, r, av);
  for (const a of r.accessori || []) {
    const o = typeof a === 'string' ? { nome: a } : a;
    aggiungiAccessorio(THREE, av, o.nome, o);
  }

  let chiave = '';
  av.faccia = (s = {}) => {
    const f = { occhi: r.occhi, sopracciglia: r.sopracciglia, guance: r.guance, lentiggini: r.lentiggini, colOcchi: r.colOcchi, pelle: r.pelleHex,
      espr: s.espr || 'neutra', bocca: s.bocca || null, palpebra: Math.round((s.palpebra || 0) * 4) / 4,
      sguardo: (s.sguardo || [0, 0]).map((v) => Math.round(v * 4) / 4) };
    const k = [f.espr, f.bocca, f.palpebra, f.sguardo].join('|');
    if (k === chiave) return; chiave = k;
    disegnaFaccia(ctx, cv.width, cv.height, f); texF.needsUpdate = true;
  };
  av.faccia({});
  av.mettiA = (x, z, ry = 0) => { av.base = { x, y: 0, z, ry }; root.position.set(x, 0, z); root.rotation.y = ry; return av; };
  av.posa = (nome, t, o) => applicaPosa(av, nome, t, o);
  av.testaMondo = (v = new THREE.Vector3()) => { root.updateMatrixWorld(true); return testa.getWorldPosition(v); };
  av.posa('fermo', 0);
  return av;
}
