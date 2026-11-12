// PRESET — Ambienti pronti. Ognuno si mette a una coordinata x (set lontani tra loro: la camera
// ne vede uno alla volta). Ritornano { gruppo, ..., aggiorna(u) } e un'inquadratura consigliata.
import { BORDEAUX, CIPRIA, SCURO, canvasTex, logo } from './brand.js';
import { textureCard } from './oggetti.js';

const std = (THREE, c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function box(THREE, parent, w, h, d, mat, x, y, z) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z);
  b.castShadow = b.receiveShadow = true; parent.add(b); return b;
}

// Stanza base: pavimento + parete di fondo (+ battiscopa)
export function stanza(THREE, x, { muro = '#f3e6e0', pavimento = '#c9b2a6' } = {}) {
  const gruppo = new THREE.Group(); gruppo.position.x = x;
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), std(THREE, pavimento, 0.9));
  pav.rotation.x = -Math.PI / 2; pav.receiveShadow = true; gruppo.add(pav);
  const parete = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), std(THREE, muro, 0.95));
  parete.position.set(0, 5, -3); parete.receiveShadow = true; gruppo.add(parete);
  box(THREE, gruppo, 16, 0.12, 0.04, std(THREE, '#ffffff', 0.6), 0, 0.06, -2.98);
  return { gruppo, parete, pavimento: pav };
}

// Camera da letto con vestiti sparsi sul letto; volo(u) li fa volare via (u = secondi dall'inizio)
export function cameraDaLetto(THREE, x = 0) {
  const s = stanza(THREE, x);
  const g = s.gruppo;
  box(THREE, g, 2.4, 0.5, 1.7, std(THREE, '#8d6e63'), -0.75, 0.25, -1.4);
  box(THREE, g, 2.3, 0.25, 1.6, std(THREE, '#ffffff', 0.95), -0.75, 0.62, -1.4);
  box(THREE, g, 0.8, 0.18, 0.45, std(THREE, '#f8edeb', 0.95), -1.55, 0.83, -1.95);
  box(THREE, g, 2.4, 1.1, 0.12, std(THREE, '#8d6e63'), -0.75, 0.9, -2.25);
  box(THREE, g, 0.5, 0.55, 0.45, std(THREE, '#a1887f'), 1.0, 0.27, -2.3);           // comodino
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.25, 16), std(THREE, CIPRIA, 0.5));
  lamp.position.set(1.0, 0.75, -2.3); g.add(lamp);
  const colori = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#ffb4a2', '#6d6875', '#e9c46a', '#1d3557', '#ffffff', '#bc6c25'];
  const vestiti = [];
  for (let k = 0; k < 18; k++) {
    const pants = k % 3 === 0;
    const m = box(THREE, g, pants ? 0.28 : 0.55, 0.05, pants ? 0.8 : 0.45, std(THREE, colori[k % colori.length], 0.9), 0, 0, 0);
    m.userData = { x: -1.7 + hash(k) * 1.9, z: -2.0 + hash(k + 20) * 1.2, y: 0.78 + (k % 4) * 0.05, ry: hash(k + 40) * 3,
      vx: (hash(k + 60) - 0.35) * 3.2, vy: 3.5 + hash(k + 80) * 2.5, vz: 1.2 + hash(k + 100) * 2.2, d: hash(k + 120) * 0.9 };
    vestiti.push(m);
  }
  const fumo = [];
  for (let k = 0; k < 6; k++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: '#e86a6a', transparent: true, toneMapped: false }));
    m.visible = false; g.add(m); fumo.push(m);
  }
  const muroBase = new THREE.Color('#f3e6e0'), rosso = new THREE.Color('#f2a7a7');
  return {
    gruppo: g, parete: s.parete,
    // u < 0: vestiti fermi sul letto
    volo(u) {
      vestiti.forEach((m) => {
        const d = m.userData, tau = u - d.d;
        if (tau <= 0) { m.position.set(d.x, d.y, d.z); m.rotation.set(0, d.ry, 0); return; }
        const land = (d.vy + Math.sqrt(d.vy * d.vy + 2 * 9.8 * d.y)) / 9.8, ta = Math.min(tau, land);
        m.position.set(d.x + d.vx * ta, Math.max(0.03, d.y + d.vy * ta - 4.9 * ta * ta), d.z + d.vz * ta);
        m.rotation.set(ta * 5 * (hash(d.ry) - 0.5), d.ry + ta * 4, ta * 6 * (hash(d.x) - 0.5));
      });
    },
    rabbia(t, intensita, testa) {        // muro che pulsa di rosso + sbuffi sopra la testa (coord. locali)
      s.parete.material.color.copy(muroBase).lerp(rosso, intensita * (0.5 + 0.5 * Math.sin(t * 6)));
      fumo.forEach((m, k) => {
        const ph = (t * 1.3 + k / 6) % 1;
        m.visible = intensita > 0 && !!testa;
        if (!testa) return;
        m.position.set(testa.x + (k % 2 ? 0.2 : -0.2) + Math.sin(ph * 6 + k) * 0.06, testa.y + 0.25 + ph * 0.9, testa.z);
        m.scale.setScalar(0.5 + ph * 1.3); m.material.opacity = 0.85 * (1 - ph);
      });
    },
  };
}

// Scrivania con monitor (il monitor è un oggetto separato: monitorRicerca)
export function scrivania(THREE, x = 30) {
  const s = stanza(THREE, x, { muro: '#ece6f2', pavimento: '#b8aec6' });
  const g = s.gruppo;
  box(THREE, g, 2.2, 0.08, 0.9, std(THREE, '#ffffff', 0.5), 0.7, 1.95, -0.6);
  for (const dx of [-1, 1]) box(THREE, g, 0.08, 1.95, 0.8, std(THREE, '#bbbbbb', 0.4), 0.7 + dx * 1.0, 0.97, -0.6);
  box(THREE, g, 0.9, 0.04, 0.3, std(THREE, '#333333', 0.4), 0.4, 2.01, -0.4);
  const pianta = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), std(THREE, '#6a994e')); pianta.position.set(-1.9, 1.3, -2.4); g.add(pianta);
  box(THREE, g, 0.35, 0.9, 0.35, std(THREE, '#ffffff', 0.6), -1.9, 0.45, -2.4);
  return { gruppo: g, parete: s.parete, monitor: { x: x + 1.1, y: 2.95, z: -0.85, ry: -0.35 } };
}

// Studio rosa (fondale per primi piani di oggetti, es. il telefono)
export function studio(THREE, x = 60, { muro = '#f7e9e7', pavimento = '#e0c9c6' } = {}) {
  return stanza(THREE, x, { muro, pavimento });
}

// Parete di card outfit: escono dal centro e si dispongono a griglia dietro la modella
export function pareteOutfit(THREE, x = 60, { z = -2.75, colonne = 6, righe = 3 } = {}) {
  const gruppo = new THREE.Group(); gruppo.position.x = x;
  const tex = textureCard(THREE), card = [];
  for (let k = 0; k < colonne * righe; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.98),
      new THREE.MeshBasicMaterial({ map: tex[k % tex.length], transparent: true, toneMapped: false }));
    m.visible = false; gruppo.add(m); card.push(m);
  }
  return {
    gruppo,
    aggiorna(u, { origine = [0, 2.3, -1.5] } = {}) {
      card.forEach((m, k) => {
        const col = k % colonne, row = Math.floor(k / colonne);
        const a = Math.max(0, Math.min(1, (u - k * 0.06) / 0.55)), e = 1 - Math.pow(1 - a, 3);
        const tx = (col - (colonne - 1) / 2) * 0.95, ty = 1.0 + row * 1.12;
        m.visible = e > 0;
        m.position.set(origine[0] + (tx - origine[0]) * e, origine[1] + (ty - origine[1]) * e, origine[2] + (z - origine[2]) * e);
        m.rotation.set(0, Math.sin(u * 2 + k) * 0.15, (1 - e) * 3 + Math.sin(u * 3 + k) * 0.04);
        m.scale.setScalar(0.2 + 0.8 * e);
      });
    },
    nascondi() { card.forEach((m) => (m.visible = false)); },
  };
}

// Passerella con luci ai lati e fotografi con i flash (flash(u) ritorna 0..1 per una luce globale)
export function passerella(THREE, x = 90) {
  const gruppo = new THREE.Group(); gruppo.position.x = x;
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(20, 50), std(THREE, '#140509', 0.9));
  pav.rotation.x = -Math.PI / 2; pav.position.set(0, -0.01, -15); pav.receiveShadow = true; gruppo.add(pav);
  const pedana = box(THREE, gruppo, 2.2, 0.16, 34, new THREE.MeshStandardMaterial({ color: '#f3e6e0', roughness: 0.25, metalness: 0.05 }), 0, 0.08, -14);
  pedana.receiveShadow = true;
  for (const s of [-1, 1]) box(THREE, gruppo, 0.06, 0.05, 34, new THREE.MeshBasicMaterial({ color: '#fff2c4' }), s * 1.12, 0.18, -14);
  const flash = [];
  for (let k = 0; k < 16; k++) {
    const side = k % 2 ? 1 : -1, z = -22 + Math.floor(k / 2) * 2.8;
    const f = new THREE.Group(); f.position.set(side * (2.3 + hash(k) * 0.6), 0, z); f.rotation.y = side * -Math.PI / 2 * 0.8; gruppo.add(f);
    const scuro = std(THREE, '#2a1a22');
    const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), scuro); corpo.position.y = 1.0; f.add(corpo);
    const testa = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), scuro); testa.position.y = 2.0; f.add(testa);
    box(THREE, f, 0.32, 0.22, 0.26, std(THREE, '#111111', 0.3), 0, 1.85, 0.32);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true,
      opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    fl.position.set(0, 1.85, 0.5); f.add(fl); flash.push({ fl, k });
  }
  const lampo = new THREE.PointLight(0xffffff, 0, 12); gruppo.add(lampo);
  return {
    gruppo,
    flash(u, zSoggetto = 0) {
      let on = 0;
      flash.forEach(({ fl, k }) => { const acceso = ((u * 2.3 + hash(k + 7)) % 1) < 0.09; fl.material.opacity = acceso ? 1 : 0; if (acceso) on = 1; });
      lampo.position.set(0, 3, zSoggetto + 1.5); lampo.intensity = on * 6;
      return on;
    },
    spegni() { lampo.intensity = 0; },
  };
}

// Cartello finale: fondo bordeaux, logo Cintre + slogan, coriandoli
export function cartelloFinale(THREE, x = 120, { slogan = "L'app che ti aiuta a vestirti" } = {}) {
  const gruppo = new THREE.Group(); gruppo.position.x = x;
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(20, 30), new THREE.MeshBasicMaterial({ color: BORDEAUX, toneMapped: false }));
  fondo.position.set(0, 2.5, -2); gruppo.add(fondo);
  const ct = canvasTex(THREE, 1000, 760); logo(ct.ctx, 1000, 760, { slogan }); ct.tex.needsUpdate = true;
  const l = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.43), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, toneMapped: false }));
  l.position.set(0, 3.6, 0); gruppo.add(l);
  const cor = [];
  for (let k = 0; k < 40; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.14), new THREE.MeshBasicMaterial({ color: k % 3 ? CIPRIA : '#ffffff', side: THREE.DoubleSide, toneMapped: false }));
    gruppo.add(m); cor.push(m);
  }
  return {
    gruppo,
    aggiorna(u) {
      const k = 1 - Math.pow(1 - Math.min(1, u / 0.8), 3);
      l.scale.setScalar(0.85 + 0.15 * k); l.material.opacity = k;
      cor.forEach((m, n) => {
        const fall = (u * (0.5 + hash(n) * 0.5) + hash(n + 3)) % 1;
        m.position.set(-1.8 + hash(n + 9) * 3.6, 6.0 - fall * 6.5, -0.5 + hash(n + 11));
        m.rotation.set(u * 3 + n, u * 2 + n * 0.5, u * 4);
      });
    },
  };
}

// Studio fotografico: fondale + softbox, per video "modella in posa"
export function studioFotografico(THREE, x = 150, { colore = '#efe4e1' } = {}) {
  const gruppo = new THREE.Group(); gruppo.position.x = x;
  const curva = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), std(THREE, colore, 0.95));
  curva.position.set(0, 6, -4); gruppo.add(curva);
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), std(THREE, colore, 0.95));
  pav.rotation.x = -Math.PI / 2; pav.receiveShadow = true; gruppo.add(pav);
  for (const s of [-1, 1]) {
    const sb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.1), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
    sb.position.set(s * 3.2, 3.2, 0.5); sb.rotation.y = s * -0.6; gruppo.add(sb);
    box(THREE, gruppo, 0.05, 2.4, 0.05, std(THREE, '#222222', 0.3), s * 3.2, 1.2, 0.5);
  }
  return { gruppo };
}

export { BORDEAUX, CIPRIA, SCURO };
