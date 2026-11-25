// PRESET blocchi — ambienti low-poly a colori pieni (città, aula, cameretta, negozio, parco, tg).
//   const set = creaAmbiente(THREE, scene, renderer, 'citta', {insegna:'CNTR'})
//   set.gruppo, set.posti = {centro, sinistra, destra, ...} (dove mettere i personaggi), set.aggiorna(t)
// I personaggi stanno intorno all'origine e guardano verso +z (verso la camera).
import { boxTondo, plastica, tono, tela, rnd } from './geometria.js';

export const AMBIENTI = ['citta', 'aula', 'cameretta', 'negozio', 'parco', 'tg'];

function luci(THREE, scene, renderer, { cielo = '#9fd3ff', terra = '#7cbf5a', sole = 2.6, caldo = false } = {}) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const hemi = new THREE.HemisphereLight(cielo, terra, 1.35);
  const sun = new THREE.DirectionalLight(caldo ? '#ffe6c8' : '#fff6e6', sole);
  sun.position.set(14, 26, 18); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
  const fill = new THREE.DirectionalLight('#dfe9ff', 0.55); fill.position.set(-12, 8, 14);
  scene.add(hemi, sun, sun.target, fill);
  return { hemi, sun, fill };
}

const P = (THREE, c, ex) => plastica(THREE, c, ex);
function cubo(THREE, g, w, h, d, c, x, y, z, { r = 0.06, ex, ombra = true } = {}) {
  const m = new THREE.Mesh(r ? boxTondo(THREE, w, h, d, r, 2) : new THREE.BoxGeometry(w, h, d), Array.isArray(c) ? c : P(THREE, c, ex));
  m.position.set(x, y, z); m.castShadow = ombra; m.receiveShadow = true; g.add(m); return m;
}
function pavimento(THREE, g, w, d, c, y = 0, tex) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), P(THREE, c, tex ? { map: tex } : {}));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; g.add(m); return m;
}
function texParquet(THREE, col) {
  const t = tela(THREE, 512, 512, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h); const r = rnd(9);
    for (let y = 0; y < h; y += 64) for (let x = -((y / 64) % 2) * 120; x < w; x += 240) {
      c.fillStyle = tono(col, (r() - 0.5) * 0.12); c.fillRect(x + 2, y + 2, 236, 60);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}
function texScritta(THREE, testo, { w = 512, h = 160, sfondo = '#d8262f', colore = '#fff', font = 900 } = {}) {
  return tela(THREE, w, h, (c) => {
    c.fillStyle = sfondo; c.fillRect(0, 0, w, h); c.fillStyle = colore; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = h * 0.62; c.font = `${font} ${fs}px system-ui, "DejaVu Sans", sans-serif`;
    while (c.measureText(testo).width > w * 0.9 && fs > 12) { fs -= 4; c.font = `${font} ${fs}px system-ui, "DejaVu Sans", sans-serif`; }
    c.fillText(testo, w / 2, h / 2 + 4);
  });
}
function insegna(THREE, g, testo, x, y, z, w = 6, h = 1.6, colori = {}) {
  const tex = texScritta(THREE, testo, colori);
  const fronte = P(THREE, '#fff', { map: tex }), lato = P(THREE, tono(colori.sfondo || '#d8262f', -0.2));
  return cubo(THREE, g, w, h, 0.3, [lato, lato, lato, lato, fronte, lato], x, y, z, { r: 0.05 });
}

function finestra(THREE, g, x, y, z, w = 1.6, h = 2, { luce = false, ruota = 0 } = {}) {
  const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ruota; g.add(f);
  cubo(THREE, f, w + 0.3, h + 0.3, 0.2, '#f6f1e6', 0, 0, 0, { r: 0.04 });
  const vetro = luce ? P(THREE, '#ffe9a8', { emissive: '#ffcf6a', emissiveIntensity: 0.7 }) : P(THREE, '#1f2a3f', { roughness: 0.15 });
  cubo(THREE, f, w, h, 0.22, vetro, 0, 0, 0.02, { r: 0, ombra: false });
  cubo(THREE, f, 0.08, h, 0.24, '#f6f1e6', 0, 0, 0.03, { r: 0 }); cubo(THREE, f, w, 0.08, 0.24, '#f6f1e6', 0, 0, 0.03, { r: 0 });
  return f;
}

function casa(THREE, g, x, z, { w = 9, h = 9, d = 8, col = '#7fb2e5', tetto = '#c8503c', ry = 0, seed = 1, scritta } = {}) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  cubo(THREE, c, w, h, d, col, 0, h / 2, 0, { r: 0.1 });
  // tetto a capanna (prisma) con un po' di sporgenza
  const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.5, 0); s.lineTo(0, h * 0.38); s.lineTo(w / 2 + 0.5, 0); s.closePath();
  const tg = new THREE.ExtrudeGeometry(s, { depth: d + 1, bevelEnabled: false }); tg.translate(0, 0, -(d + 1) / 2);
  const t = new THREE.Mesh(tg, P(THREE, tetto)); t.position.y = h; t.castShadow = true; c.add(t);
  const r = rnd(seed), piani = Math.max(1, Math.floor(h / 4));
  for (let p = 0; p < piani; p++) for (const fx of [-w * 0.27, w * 0.27]) {
    if (p === 0 && fx > 0) continue;
    finestra(THREE, c, fx, 2.6 + p * 3.6, d / 2 + 0.05, 1.7, 2.0, { luce: r() < 0.35 });
  }
  cubo(THREE, c, 1.8, 3.2, 0.3, tono(col, -0.45), w * 0.27, 1.6, d / 2 + 0.05, { r: 0.05 });         // porta
  cubo(THREE, c, 0.18, 0.18, 0.2, '#e8b84a', w * 0.27 + 0.6, 1.6, d / 2 + 0.25, { r: 0.03 });
  if (scritta) insegna(THREE, c, scritta, 0, h - 1.2, d / 2 + 0.2, Math.min(w - 1, 7), 1.5);
  return c;
}

function albero(THREE, g, x, z, s = 1, seed = 1) {
  const a = new THREE.Group(); a.position.set(x, 0, z); a.scale.setScalar(s); g.add(a);
  cubo(THREE, a, 0.8, 3.4, 0.8, '#8a5a3a', 0, 1.7, 0, { r: 0.1 });
  const r = rnd(seed), verdi = ['#4fa34a', '#5cb85a', '#3f8f45'];
  for (let i = 0; i < 4; i++) cubo(THREE, a, 3.2 - i * 0.5, 1.6, 3.2 - i * 0.5, verdi[i % 3], (r() - 0.5) * 0.5, 4 + i * 1.2, (r() - 0.5) * 0.5, { r: 0.3 });
  return a;
}
function lampione(THREE, g, x, z) {
  const l = new THREE.Group(); l.position.set(x, 0, z); g.add(l);
  cubo(THREE, l, 0.3, 7, 0.3, '#2d2f36', 0, 3.5, 0, { r: 0.05 });
  cubo(THREE, l, 0.8, 1.0, 0.8, P(THREE, '#fff4cf', { emissive: '#ffe08a', emissiveIntensity: 0.6 }), 0, 7.3, 0, { r: 0.1 });
  cubo(THREE, l, 1.0, 0.2, 1.0, '#2d2f36', 0, 7.9, 0, { r: 0.05 });
  return l;
}
function panchina(THREE, g, x, z, ry = 0) {
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b);
  cubo(THREE, b, 5, 0.3, 1.4, '#a8693f', 0, 1.6, 0); cubo(THREE, b, 5, 1.2, 0.25, '#a8693f', 0, 2.5, -0.6);
  for (const s of [-2, 2]) cubo(THREE, b, 0.25, 1.6, 1.2, '#3b3d44', s, 0.8, 0);
  return b;
}
function stender(THREE, g, x, z, colori, ry = 0) {                 // appendiabiti con magliette
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s);
  for (const k of [-3, 3]) cubo(THREE, s, 0.15, 6, 0.15, '#c9ccd3', k, 3, 0, { r: 0.04, ex: { metalness: 0.7, roughness: 0.3 } });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.4, 10), P(THREE, '#c9ccd3', { metalness: 0.7, roughness: 0.3 }));
  bar.rotation.z = Math.PI / 2; bar.position.y = 5.9; s.add(bar);
  colori.forEach((c, i) => {
    const x2 = -2.5 + i * (5 / Math.max(1, colori.length - 1));
    cubo(THREE, s, 0.5, 3.2, 2.2, c, x2, 4.1, 0, { r: 0.12 });
  });
  return s;
}

const COSTRUTTORI = {
  citta(THREE, g, o) {
    pavimento(THREE, g, 400, 400, '#6dbb4c');
    cubo(THREE, g, 400, 0.2, 8, '#d9d6cf', 0, 0.1, 0, { r: 0, ombra: false });               // marciapiede
    cubo(THREE, g, 400, 0.12, 12, '#4a4d57', 0, 0.06, -10, { r: 0, ombra: false });           // strada
    for (let x = -100; x < 100; x += 6) cubo(THREE, g, 3, 0.14, 0.35, '#f2c230', x, 0.08, -10, { r: 0, ombra: false });
    cubo(THREE, g, 400, 0.2, 8, '#d9d6cf', 0, 0.1, -20, { r: 0, ombra: false });
    const col = ['#7fb2e5', '#f29ab8', '#f6d36b', '#8fd6b4', '#c7a6f0', '#f5a66b'];
    for (let i = -4; i <= 4; i++) casa(THREE, g, i * 11, -30, { col: col[(i + 8) % 6], h: 8 + ((i * 7 + 20) % 3) * 3, seed: i + 9, scritta: i === 0 ? o.insegna || 'CNTR' : null });
    for (let i = -4; i <= 4; i++) casa(THREE, g, i * 11 + 5, 38, { col: col[(i + 11) % 6], h: 9 + ((i * 5 + 20) % 2) * 3, ry: Math.PI, seed: i + 30 });
    for (const x of [-14, 14]) lampione(THREE, g, x, -3.2);
    for (const x of [-24, 26]) albero(THREE, g, x, -2, 1.1, x);
    return { cielo: '#8fd0ff', nebbia: ['#cde9ff', 60, 160] };
  },
  parco(THREE, g) {
    pavimento(THREE, g, 400, 400, '#69b84a');
    const sent = new THREE.Mesh(new THREE.RingGeometry(9, 14, 48), P(THREE, '#e3cf9e')); sent.rotation.x = -Math.PI / 2; sent.position.y = 0.03; sent.receiveShadow = true; g.add(sent);
    const r = rnd(4);
    for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 30; if (Math.sin(a) > 0.5 && d < 32) continue; albero(THREE, g, Math.cos(a) * d, -Math.abs(Math.sin(a) * d) + (r() - 0.5) * 6, 1 + r() * 0.5, i); }
    panchina(THREE, g, -8, -6, 0.3); panchina(THREE, g, 9, -6, -0.3);
    const vasca = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.8, 1.2, 32), P(THREE, '#cfc8bb')); vasca.position.set(0, 0.6, -14); vasca.castShadow = vasca.receiveShadow = true; g.add(vasca);
    const acqua = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.1, 32), P(THREE, '#5ab3e8', { roughness: 0.1 })); acqua.position.set(0, 1.15, -14); g.add(acqua);
    cubo(THREE, g, 0.8, 3, 0.8, '#cfc8bb', 0, 2, -14);
    for (let i = 0; i < 10; i++) cubo(THREE, g, 2.2, 1.4, 2.2, '#4f9e48', -30 + i * 6.5, 0.7, -24, { r: 0.5 });
    return { cielo: '#92d2ff', nebbia: ['#d4ecff', 50, 140] };
  },
  aula(THREE, g, o) {
    pavimento(THREE, g, 34, 34, '#ffffff', 0, texParquet(THREE, '#c9935a'));
    cubo(THREE, g, 34, 16, 0.5, '#f3e6c8', 0, 8, -14, { r: 0 });                               // parete di fondo
    cubo(THREE, g, 0.5, 16, 34, '#efdcb4', -17, 8, 3, { r: 0 }); cubo(THREE, g, 0.5, 16, 34, '#efdcb4', 17, 8, 3, { r: 0 });
    cubo(THREE, g, 34, 1.4, 0.6, '#b98a5a', 0, 0.7, -13.8, { r: 0 });                           // battiscopa
    // lavagna con la scritta
    const lav = tela(THREE, 1024, 512, (c, w, h) => {
      c.fillStyle = '#2f5a45'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.08)'; const rr = rnd(2); for (let i = 0; i < 40; i++) c.fillRect(rr() * w, rr() * h, 120, 2);
      c.fillStyle = '#f4f4ea'; c.font = '700 72px "Comic Sans MS", system-ui, sans-serif'; c.textAlign = 'center';
      c.fillText(o.lavagna || 'Lezione di oggi:', w / 2, h * 0.36); c.font = '700 60px "Comic Sans MS", system-ui, sans-serif'; c.fillText(o.lavagna2 || 'moda e stile', w / 2, h * 0.62);
    });
    cubo(THREE, g, 14, 6, 0.3, [P(THREE, '#8a5a3a'), P(THREE, '#8a5a3a'), P(THREE, '#8a5a3a'), P(THREE, '#8a5a3a'), P(THREE, '#fff', { map: lav, roughness: 0.9 }), P(THREE, '#8a5a3a')], 0, 8, -13.6, { r: 0.05 });
    for (const x of [-12, 12]) finestra(THREE, g, x, 8.5, -13.6, 4, 5);
    // orologio
    const or = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 32), P(THREE, '#ffffff')); or.rotation.x = Math.PI / 2; or.position.set(8.5, 12.8, -13.6); g.add(or);
    // banchi
    for (const x of [-8, 0, 8]) for (const z of [-4, -10]) {
      cubo(THREE, g, 5, 0.3, 3, '#d9a86a', x, 3.2, z); for (const sx of [-2.2, 2.2]) cubo(THREE, g, 0.25, 3.1, 0.25, '#55575f', x + sx, 1.55, z);
    }
    return { cielo: '#f3e6c8' };
  },
  cameretta(THREE, g, o) {
    pavimento(THREE, g, 30, 30, '#ffffff', 0, texParquet(THREE, '#d2a26c'));
    cubo(THREE, g, 30, 16, 0.5, o.parete || '#c9b8f0', 0, 8, -12, { r: 0 });
    cubo(THREE, g, 0.5, 16, 30, tono(o.parete || '#c9b8f0', -0.08), -15, 8, 3, { r: 0 }); cubo(THREE, g, 0.5, 16, 30, tono(o.parete || '#c9b8f0', -0.08), 15, 8, 3, { r: 0 });
    const tap = new THREE.Mesh(new THREE.CircleGeometry(6, 40), P(THREE, '#f29ab8')); tap.rotation.x = -Math.PI / 2; tap.position.set(0, 0.03, -1); tap.receiveShadow = true; g.add(tap);
    // letto
    cubo(THREE, g, 7, 1.6, 11, '#8a5a3a', -10, 0.8, -5); cubo(THREE, g, 6.6, 1, 10.4, '#ffffff', -10, 2.1, -5, { r: 0.3 });
    cubo(THREE, g, 6.7, 0.9, 6.5, '#5aa7e8', -10, 2.4, -3, { r: 0.3 }); cubo(THREE, g, 4, 0.9, 2, '#fff7e8', -10, 3, -9, { r: 0.4 });
    cubo(THREE, g, 7, 4.4, 0.6, '#8a5a3a', -10, 2.2, -10.7);
    // armadio
    cubo(THREE, g, 7, 12, 3.4, '#f6f1e6', 10, 6, -10);
    for (const s of [-1, 1]) { cubo(THREE, g, 3.3, 11.4, 0.2, '#fffaf0', 10 + s * 1.72, 6, -8.2); cubo(THREE, g, 0.18, 1.4, 0.3, '#c9a23c', 10 + s * 0.4, 6, -8.0); }
    // poster e finestra
    const post = tela(THREE, 512, 720, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff6b6b'); gr.addColorStop(1, '#ffd23f'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#1d1418'; c.font = '900 120px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('VIBE', w / 2, h * 0.55); });
    cubo(THREE, g, 3.4, 4.8, 0.1, P(THREE, '#fff', { map: post }), 1.5, 9, -11.7, { r: 0 });
    finestra(THREE, g, -5, 9, -11.7, 4, 4.5);
    return { cielo: '#d8cdf5' };
  },
  negozio(THREE, g, o) {
    pavimento(THREE, g, 40, 40, '#ffffff', 0, texParquet(THREE, '#e8d8c0'));
    cubo(THREE, g, 40, 16, 0.5, '#fbfaf7', 0, 8, -14, { r: 0 });
    cubo(THREE, g, 0.5, 16, 40, '#f1eee8', -18, 8, 4, { r: 0 }); cubo(THREE, g, 0.5, 16, 40, '#f1eee8', 18, 8, 4, { r: 0 });
    insegna(THREE, g, o.insegna || 'SALDI -50%', 0, 12, -13.6, 10, 2.4, { sfondo: '#e2262f' });
    stender(THREE, g, -9, -9, ['#e9463c', '#2f6fd1', '#f6d36b', '#1d1d1f', '#8fd6b4']);
    stender(THREE, g, 9, -9, ['#f29ab8', '#ffffff', '#3e5f95', '#c7a6f0', '#f5a66b']);
    cubo(THREE, g, 8, 3.6, 3, '#1d1d1f', 11, 1.8, -2); cubo(THREE, g, 8.2, 0.25, 3.2, '#d9b25a', 11, 3.7, -2, { ex: { metalness: 0.6, roughness: 0.3 } });
    cubo(THREE, g, 1.6, 1.2, 1.2, '#3b3d44', 12, 4.4, -2);
    const spec = new THREE.Mesh(new THREE.PlaneGeometry(4, 10), P(THREE, '#cfe3f0', { metalness: 0.9, roughness: 0.05 })); spec.position.set(-17.7, 5.5, 2); spec.rotation.y = Math.PI / 2; g.add(spec);
    return { cielo: '#fbfaf7' };
  },
  tg(THREE, g, o) {
    pavimento(THREE, g, 60, 60, '#1b2a4a');
    const fondo = tela(THREE, 1024, 576, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1e5bd8'); gr.addColorStop(1, '#0b1f4a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; for (let x = 0; x < w; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.fillStyle = '#fff'; c.font = '900 110px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(o.titoloTg || 'CNTR NEWS', w / 2, h * 0.56);
    });
    const sch = new THREE.Mesh(new THREE.PlaneGeometry(30, 16.9), new THREE.MeshBasicMaterial({ map: fondo })); sch.position.set(0, 9, -12); g.add(sch);
    cubo(THREE, g, 14, 3.6, 4, '#eef2fa', 0, 1.8, 2.2, { r: 0.3 }); cubo(THREE, g, 14.6, 0.3, 4.6, '#1e5bd8', 0, 3.75, 2.2, { r: 0.1 });
    insegna(THREE, g, o.insegna || 'CNTR', 0, 2.1, 4.25, 5, 1.2, { sfondo: '#1e5bd8' });
    return { cielo: '#0b1f4a', interno: true };
  },
};

export function creaAmbiente(THREE, scene, renderer, nome = 'citta', o = {}) {
  const g = new THREE.Group(); g.name = 'ambiente:' + nome; scene.add(g);
  const info = (COSTRUTTORI[nome] || COSTRUTTORI.citta)(THREE, g, o) || {};
  scene.background = new THREE.Color(info.cielo || '#9fd3ff');
  if (info.nebbia) scene.fog = new THREE.Fog(info.nebbia[0], info.nebbia[1], info.nebbia[2]);
  const L = luci(THREE, scene, renderer, { cielo: nome === 'tg' ? '#9fb8ff' : '#bfe3ff', terra: ['citta', 'parco'].includes(nome) ? '#7cbf5a' : '#c9a37a', sole: info.interno ? 1.8 : 2.6 });
  const posti = { centro: [0, 2], sinistra: [-3.2, 2], destra: [3.2, 2], dietro: [0, -4], lontano: [10, -2] };
  if (nome === 'tg') Object.assign(posti, { centro: [0, -0.6], sinistra: [-3.2, -0.6], destra: [3.2, -0.6] });
  return { gruppo: g, luci: L, posti, nome, aggiorna() {} };
}
