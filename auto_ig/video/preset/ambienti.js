// PRESET — Ambienti pronti. Ognuno si mette a una coordinata x (set lontani tra loro: la camera
// ne vede uno alla volta). Ritornano { gruppo, ..., aggiorna(u) } e un'inquadratura consigliata.
import { BORDEAUX, CIPRIA, SCURO, canvasTex, logo } from './brand.js';
import { textureCard, calice } from './oggetti.js';
import { creaSarto, capoSingolo, capiDi } from './guardaroba.js';

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

// Stender: asta con i capi appesi alle grucce Cintre; le scarpe stanno a terra davanti.
//   const s = stender(THREE, 180, [{ capo: 'camicia', colori: '#fff' }, { capo: 'jeans' }]);  s.aggiorna(t)
export function stender(THREE, x = 180, capi = [], { z = -0.6, larghezza = 2.7, altezza = 3.75 } = {}) {
  const gruppo = new THREE.Group(); gruppo.position.set(x, 0, z);
  const metallo = new THREE.MeshStandardMaterial({ color: '#d0d0d0', roughness: 0.25, metalness: 0.85 });
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, larghezza + 0.3, 16), metallo);
  asta.rotation.z = Math.PI / 2; asta.position.y = altezza; gruppo.add(asta);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, altezza, 12), metallo);
    m.position.set(s * (larghezza / 2 + 0.15), altezza / 2, 0); gruppo.add(m);
    box(THREE, gruppo, 0.05, 0.04, 0.9, metallo, s * (larghezza / 2 + 0.15), 0.02, 0);
  }
  const sarto = creaSarto(THREE);
  const appesi = capi.filter((c) => c.capo).map((c) => capoSingolo(THREE, c.capo, { colori: c.colori || c.colore, sarto }));
  const suAsta = appesi.filter((a) => a.categoria !== 'scarpe'), aTerra = appesi.filter((a) => a.categoria === 'scarpe');
  suAsta.forEach((a, i) => {
    a.g.position.set(-larghezza / 2 + (larghezza * (i + 0.5)) / suAsta.length, altezza + 0.02, 0); gruppo.add(a.g);
  });
  aTerra.forEach((a, i) => {
    a.g.position.set(-larghezza / 2 + (larghezza * (i + 0.5)) / aTerra.length, 0, 0.75); a.g.rotation.y = 0.35; gruppo.add(a.g);
  });
  gruppo.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return {
    gruppo, capi: appesi,
    aggiorna(t) { suAsta.forEach((a, i) => { a.g.rotation.z = Math.sin(t * 1.3 + i * 1.9) * 0.018; a.g.rotation.y = Math.sin(t * 0.8 + i * 1.3) * 0.12; }); },
  };
}

// Vetrina: studio fotografico + pedana girevole con un capo ("manichino invisibile") o un paio di scarpe.
//   const v = vetrinaCapo(THREE, 150, { capo: 'blazer', colori: '#6d1a36' });  v.aggiorna(t)
export function vetrinaCapo(THREE, x = 150, { capo = 'maglione', colori = null, velocita = 0.6, scalaScarpe = 3.2 } = {}) {
  const s = studioFotografico(THREE, x);
  const pedana = new THREE.Group(); s.gruppo.add(pedana);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.3, 64), std(THREE, '#fffaf9', 0.5));
  base.position.y = 0.15; base.receiveShadow = base.castShadow = true; pedana.add(base);
  const bordo = new THREE.Mesh(new THREE.TorusGeometry(0.955, 0.02, 8, 80), std(THREE, BORDEAUX, 0.4));
  bordo.rotation.x = Math.PI / 2; bordo.position.y = 0.3; pedana.add(bordo);
  const c = capoSingolo(THREE, capo, { colori, appeso: false });
  if (c.categoria === 'scarpe') { c.g.scale.setScalar(scalaScarpe); c.g.position.y = 0.3; }
  else {
    c.g.position.y = 0.35;
    const cima = c.categoria === 'sopra' ? 2.0 : 1.76;
    const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, cima + 0.05, 12),
      new THREE.MeshStandardMaterial({ color: '#c8c8c8', roughness: 0.25, metalness: 0.9 }));
    asta.position.y = 0.3 + (cima + 0.05) / 2; pedana.add(asta);
  }
  pedana.add(c.g);
  return { ...s, capo: c, aggiorna(t) { pedana.rotation.y = t * velocita; } };
}

// Armadio a due ante (mobile). Origine = centro della base, ante verso +z. apri(k): 0 chiuso, 1 aperto;
// dentro una luce calda "magica" (l'armadio infinito).
export function armadio(THREE, { larghezza = 2.4, altezza = 3.9, profondita = 0.8, colore = '#f4ece6' } = {}) {
  const g = new THREE.Group();
  const legno = std(THREE, colore, 0.6), W = larghezza, H = altezza, D = profondita;
  box(THREE, g, W, 0.12, D, legno, 0, 0.06, 0);                       // zoccolo
  box(THREE, g, W + 0.1, 0.1, D + 0.06, legno, 0, H + 0.05, 0);      // cappello
  for (const s of [-1, 1]) box(THREE, g, 0.07, H, D, legno, s * (W / 2 - 0.035), H / 2, 0);
  box(THREE, g, W, H, 0.05, legno, 0, H / 2, -D / 2 + 0.025);
  const luce = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.16, H - 0.2),
    new THREE.MeshBasicMaterial({ color: '#fff4dc', toneMapped: false })); luce.position.set(0, H / 2 + 0.05, -D / 2 + 0.06); g.add(luce);
  const bagliore = new THREE.PointLight(0xffe2b0, 0, 9, 1.5); bagliore.position.set(0, H * 0.55, 0.6); g.add(bagliore);
  const ante = [-1, 1].map((s) => {
    const perno = new THREE.Group(); perno.position.set(s * W / 2, 0, D / 2); g.add(perno);
    box(THREE, perno, W / 2 - 0.02, H - 0.14, 0.05, legno, -s * (W / 4), H / 2 + 0.05, 0.025);
    box(THREE, perno, W / 2 - 0.26, H - 0.62, 0.02, std(THREE, '#ebe0d8', 0.6), -s * (W / 4), H / 2 + 0.05, 0.06);   // pannello
    box(THREE, perno, 0.04, 0.5, 0.05, std(THREE, BORDEAUX, 0.35), -s * (W / 2 - 0.16), H * 0.52, 0.09);            // maniglia
    return { perno, s };
  });
  return {
    g,
    apri(k) {
      const e = Math.max(0, Math.min(1, k));
      ante.forEach(({ perno, s }) => (perno.rotation.y = s * e * 1.9));
      luce.visible = e > 0.01; bagliore.intensity = e * 7;
    },
  };
}

// Corridoio-armadio infinito: due file di capi appesi che si perdono nella nebbia, scarpe a terra, luci a soffitto.
// La scena imposta scene.fog = c.nebbia mentre la camera è qui. volo(u, [x,y,z]) = capi che volano intorno a un punto.
export function corridoioArmadio(THREE, x = 200, { lunghezza = 26, passo = 0.72, larghezza = 2.7, contornoFinoA = -7 } = {}) {
  const gruppo = new THREE.Group(); gruppo.position.x = x;
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(larghezza + 2, lunghezza + 10), std(THREE, '#dcc6b4', 0.7));
  pav.rotation.x = -Math.PI / 2; pav.position.z = -lunghezza / 2 + 3; pav.receiveShadow = true; gruppo.add(pav);
  const tappeto = new THREE.Mesh(new THREE.PlaneGeometry(1.1, lunghezza + 10), std(THREE, BORDEAUX, 0.9));
  tappeto.rotation.x = -Math.PI / 2; tappeto.position.set(0, 0.005, -lunghezza / 2 + 3); tappeto.receiveShadow = true; gruppo.add(tappeto);
  for (const s of [-1, 1]) {
    const parete = new THREE.Mesh(new THREE.PlaneGeometry(lunghezza + 10, 7), std(THREE, '#f3e6dc', 0.95));
    parete.rotation.y = -s * Math.PI / 2; parete.position.set(s * (larghezza / 2 + 0.75), 3.5, -lunghezza / 2 + 3); gruppo.add(parete);
    const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, lunghezza + 6, 10),
      new THREE.MeshStandardMaterial({ color: '#d4af37', roughness: 0.3, metalness: 0.8 }));
    asta.rotation.x = Math.PI / 2; asta.position.set(s * larghezza / 2, 3.75, -lunghezza / 2 + 1); gruppo.add(asta);
    box(THREE, gruppo, 0.7, 0.06, lunghezza + 6, std(THREE, '#efe2d6', 0.6), s * (larghezza / 2 + 0.3), 0.45, -lunghezza / 2 + 1); // ripiano scarpe
  }
  const soffitto = new THREE.Mesh(new THREE.PlaneGeometry(larghezza + 2, lunghezza + 10), std(THREE, '#f7eee8', 0.95));
  soffitto.rotation.x = Math.PI / 2; soffitto.position.set(0, 5.6, -lunghezza / 2 + 3); gruppo.add(soffitto);
  for (let z = 1; z > -lunghezza; z -= 3) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.4), new THREE.MeshBasicMaterial({ color: '#fff6e6', toneMapped: false }));
    l.rotation.x = Math.PI / 2; l.position.set(0, 5.58, z); gruppo.add(l);
  }
  // capi: prototipi colorati, poi cloni (geometrie e materiali condivisi = leggero)
  const sarto = creaSarto(THREE);
  const palette = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#ffb4a2', '#6d6875', '#e9c46a', '#1d3557', '#ffffff', '#bc6c25',
    BORDEAUX, CIPRIA, '#151515', '#a8dadc', '#c19a6b'];
  const tipi = [...capiDi('sopra'), 'gonnaPieghe', 'jeans', 'pantaloni', 'minigonna'];
  const proto = [];
  for (let i = 0; i < 18; i++) proto.push(capoSingolo(THREE, tipi[i % tipi.length], { colori: palette[(i * 7) % palette.length], sarto }).g);
  const scarpe = capiDi('scarpe').map((id, i) => capoSingolo(THREE, id, { colori: palette[(i * 5 + 2) % palette.length], sarto }).g);
  const senzaContorno = (g) => {
    const via = []; g.traverse((m) => { if (m.isMesh && m.material.side === THREE.BackSide) via.push(m); });
    via.forEach((m) => m.parent.remove(m));
  };
  let n = 0;
  for (const s of [-1, 1]) {
    for (let z = 0.4, k = 0; z > -lunghezza; z -= passo, k++) {
      const c = proto[(k * 5 + (s > 0 ? 3 : 0)) % proto.length].clone();
      c.position.set(s * larghezza / 2, 3.77, z); c.rotation.y = -s * Math.PI / 2 * 0.62; gruppo.add(c); n++;
      if (z < contornoFinoA) senzaContorno(c);           // lontano (nella nebbia) il contorno non si vede: metà draw call
      if (k % 3 === 0) {
        const p = scarpe[(k / 3 + (s > 0 ? 2 : 0)) % scarpe.length].clone();
        if (z < contornoFinoA) senzaContorno(p);
        p.position.set(s * (larghezza / 2 + 0.25), 0.48, z); p.rotation.y = -s * Math.PI / 2; p.scale.setScalar(1.1); gruppo.add(p);
      }
    }
  }
  // capi che volano (per la rabbia): cloni sparsi intorno al centro
  const volanti = [];
  for (let i = 0; i < 12; i++) { const c = proto[(i * 3) % proto.length].clone(); c.visible = false; c.scale.setScalar(0.8); gruppo.add(c); volanti.push(c); }
  gruppo.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  return {
    gruppo, capi: n,
    nebbia: new THREE.Fog('#f6ece4', 7, 24),
    volo(u, centro = [0, 2.5, -2]) {
      volanti.forEach((c, i) => {
        const vis = u >= 0; c.visible = vis; if (!vis) return;
        const tau = u - hash(i) * 0.4, a = hash(i + 3) * 6.28 + tau * (1.6 + hash(i + 5));
        const r = 0.9 + hash(i + 7) * 1.0 + Math.max(0, tau) * 0.25, h = (hash(i + 11) - 0.3) * 2.2 + Math.sin(tau * 2 + i) * 0.4;
        // vortice dietro e intorno alla testa (mai tra lei e la camera)
        c.position.set(centro[0] + Math.cos(a) * r * 1.3, centro[1] + 1.2 + Math.sin(a) * r * 0.7 + h * 0.4, centro[2] - 0.7 - hash(i + 13) * 1.4);
        c.rotation.set(tau * 2.1 + i, tau * 3 + i * 0.5, Math.sin(tau * 3 + i) * 0.8);
      });
    },
  };
}

// Ristorante elegante di sera: tavolo apparecchiato con tovaglia, candele, calici, lampade a sospensione,
// vetrata sulla città di notte. posti = dove sedere le modelle (dietro il tavolo, guardano verso +z).
export function ristorante(THREE, x = 240, { commensali = 3 } = {}) {
  const gruppo = new THREE.Group(); gruppo.position.x = x;
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), std(THREE, '#5a3b2c', 0.55));
  pav.rotation.x = -Math.PI / 2; pav.receiveShadow = true; gruppo.add(pav);
  const parete = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), std(THREE, '#4a1f29', 0.9)); parete.position.set(0, 5, -3.2); gruppo.add(parete);
  box(THREE, gruppo, 16, 1.6, 0.06, std(THREE, '#3a1820', 0.7), 0, 0.8, -3.15);                 // boiserie
  // vetrata con città di notte (luci sfocate)
  const ct = canvasTex(THREE, 1024, 512), c = ct.ctx;
  const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#2a1a3a');
  c.fillStyle = gr; c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 140; i++) {
    const px = hash(i) * 1024, py = 200 + hash(i + 50) * 300, r = 6 + hash(i + 90) * 22;
    const col = ['255,200,120', '255,170,90', '255,240,210', '232,196,192'][i % 4];
    const rg = c.createRadialGradient(px, py, 0, px, py, r); rg.addColorStop(0, `rgba(${col},0.9)`); rg.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = rg; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill();
  }
  ct.tex.needsUpdate = true;
  const vetro = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), new THREE.MeshBasicMaterial({ map: ct.tex, toneMapped: false }));
  vetro.position.set(0, 4.0, -3.12); gruppo.add(vetro);
  for (const dx of [-3.5, -1.17, 1.17, 3.5]) box(THREE, gruppo, 0.08, 3.5, 0.08, std(THREE, '#1c0c10', 0.5), dx, 4.0, -3.08);
  // tavolo + tovaglia
  const tavolo = new THREE.Group(); tavolo.position.set(0, 0, 0); gruppo.add(tavolo);
  const bianco = std(THREE, '#fbf8f3', 0.85);
  box(THREE, tavolo, 3.6, 0.06, 1.5, bianco, 0, 1.55, 0);
  box(THREE, tavolo, 3.6, 1.52, 0.02, bianco, 0, 0.8, 0.75);                    // tovaglia lunga fino a terra
  for (const s of [-1, 1]) box(THREE, tavolo, 0.02, 1.52, 1.5, bianco, s * 1.8, 0.8, 0);
  const posti = [];
  const oro = new THREE.MeshStandardMaterial({ color: '#d4af37', roughness: 0.3, metalness: 0.8 });
  for (let i = 0; i < commensali; i++) {
    const px = (i - (commensali - 1) / 2) * 1.15;
    posti.push({ x: x + px, y: 0, z: -1.2, ry: -px * 0.12 });
    const piatto = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.025, 32), std(THREE, '#ffffff', 0.3));
    piatto.position.set(px, 1.595, -0.25); tavolo.add(piatto);
    const sotto = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.01, 32), oro); sotto.position.set(px, 1.585, -0.25); tavolo.add(sotto);
    const cal = calice(THREE, { scala: 1.15 }); cal.g.position.set(px + 0.33, 1.58, -0.45); tavolo.add(cal.g);
    for (const s of [-1, 1]) box(THREE, tavolo, 0.03, 0.01, 0.32, oro, px + s * 0.34, 1.59, -0.22);   // posate
    // sedia
    const sedia = std(THREE, '#2b1418', 0.6);
    box(THREE, gruppo, 0.62, 0.08, 0.6, std(THREE, BORDEAUX, 0.8), px, 0.95, -1.2);
    box(THREE, gruppo, 0.62, 1.3, 0.08, sedia, px, 1.6, -1.55);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(THREE, gruppo, 0.05, 0.92, 0.05, sedia, px + sx * 0.26, 0.46, -1.2 + sz * 0.26);
  }
  // candele + lampade
  const fiamme = [];
  for (const dx of [-0.6, 0.6]) {
    const cand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 12), std(THREE, '#fff4e0', 0.6)); cand.position.set(dx, 1.74, 0.15); tavolo.add(cand);
    const fi = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffcf70', toneMapped: false }));
    fi.scale.set(0.8, 1.6, 0.8); fi.position.set(dx, 1.94, 0.15); tavolo.add(fi);
    const pl = new THREE.PointLight(0xffb060, 1.6, 4, 1.6); pl.position.set(dx, 2.05, 0.2); tavolo.add(pl);
    fiamme.push({ fi, pl });
  }
  for (const dx of [-1.2, 0, 1.2]) {
    const filo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.6, 6), oro); filo.position.set(dx, 5.6, -0.5); gruppo.add(filo);
    const paralume = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.36, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#d4af37', roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide }));
    paralume.position.set(dx, 4.65, -0.5); gruppo.add(paralume);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({ color: '#fff0c8', toneMapped: false }));
    lamp.position.set(dx, 4.5, -0.5); gruppo.add(lamp);
    const pl = new THREE.PointLight(0xffc880, 2.2, 7, 1.4); pl.position.set(dx, 4.3, -0.5); gruppo.add(pl);
  }
  return {
    gruppo, posti,
    aggiorna(t) { fiamme.forEach(({ fi, pl }, i) => { const f = 0.85 + 0.15 * Math.sin(t * 13 + i * 2) * Math.sin(t * 7.3 + i); fi.scale.y = 1.6 * f; pl.intensity = 1.6 * f; }); },
  };
}

export { BORDEAUX, CIPRIA, SCURO };
