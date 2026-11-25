// PRESET blocchi — vestiti dipinti sulle facce dei blocchi (busto, braccia, gambe) + pezzi 3D (cappuccio, gonna).
//   materialiVestiti(THREE, ricetta) -> { busto:[6], braccio:{s:[6], d:[6]}, gamba:{s:[6], d:[6]} }
//   SOPRA: tshirt, canotta, felpa, camicia, giacca, tuta, maglione        stampa: logo, cuore, stella, righe, smile, numero, fulmine
//   SOTTO: jeans, pantaloni, tuta, pantaloncini, gonna, cargo
import { FACCE, tela, tono, plastica } from './geometria.js';

export const SOPRA = ['tshirt', 'canotta', 'felpa', 'camicia', 'giacca', 'tuta', 'maglione'];
export const SOTTO = ['jeans', 'pantaloni', 'tuta', 'pantaloncini', 'gonna', 'cargo'];
export const STAMPE = ['logo', 'cuore', 'stella', 'righe', 'smile', 'numero', 'fulmine'];
const PX = 128;   // pixel per unità

function rumore(ctx, w, h, colore, alfa = 0.06, n = 0.5) {   // trama del tessuto (deterministica)
  ctx.fillStyle = colore; let s = 7;
  for (let i = 0; i < w * h * n / 20; i++) {
    s = (s * 16807) % 2147483647; const x = s % w; s = (s * 16807) % 2147483647; const y = s % h;
    ctx.globalAlpha = alfa; ctx.fillRect(x, y, 2, 1);
  }
  ctx.globalAlpha = 1;
}
function cucitura(ctx, x1, y1, x2, y2, col) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function tondoRett(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function stampa(ctx, cx, cy, s, tipo, col, col2) {
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineJoin = 'round';
  switch (tipo) {
    case 'logo':
      ctx.font = `900 ${s * 0.46}px system-ui, "DejaVu Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CNTR', 0, 0); ctx.fillRect(-s * 0.55, s * 0.32, s * 1.1, s * 0.07); break;
    case 'cuore':
      ctx.beginPath(); ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s * 0.7, -s * 0.1, -s * 0.35, -s * 0.6, 0, -s * 0.22);
      ctx.bezierCurveTo(s * 0.35, -s * 0.6, s * 0.7, -s * 0.1, 0, s * 0.35); ctx.fill(); break;
    case 'stella':
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.2 : s * 0.48, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); break;
    case 'smile':
      ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col2; ctx.beginPath(); ctx.ellipse(-s * 0.14, -s * 0.1, s * 0.05, s * 0.09, 0, 0, 7); ctx.ellipse(s * 0.14, -s * 0.1, s * 0.05, s * 0.09, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = col2; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, s * 0.24, 0.3, Math.PI - 0.3); ctx.stroke(); break;
    case 'numero':
      ctx.font = `900 ${s * 0.75}px system-ui, "DejaVu Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = s * 0.06; ctx.strokeStyle = col2; ctx.strokeText('23', 0, 0); ctx.fillText('23', 0, 0); break;
    case 'fulmine':
      ctx.beginPath(); [[0.1, -0.5], [-0.3, 0.05], [-0.02, 0.05], [-0.12, 0.5], [0.3, -0.08], [0.02, -0.08]].forEach(([x, y]) => ctx.lineTo(x * s, y * s));
      ctx.closePath(); ctx.fill(); break;
  }
  ctx.restore();
}

// ---------- busto ----------
function busto(ctx, w, h, faccia, r) {
  const so = r.sopra, c = so.colore, c2 = so.colore2 || tono(c, -0.35), scuro = tono(c, -0.28), pelle = r.pelleHex;
  const sotto = r.sotto, cp = sotto.colore;
  ctx.fillStyle = c; ctx.fillRect(0, 0, w, h);
  if (so.tipo === 'maglione') {                       // trama a trecce
    ctx.strokeStyle = tono(c, -0.12); ctx.lineWidth = 3;
    for (let x = 10; x < w; x += 22) for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x + 6, y); ctx.stroke(); }
  }
  if (so.stampa === 'righe' && faccia !== 'sopra' && faccia !== 'sotto') {
    ctx.fillStyle = c2; for (let y = 18; y < h; y += 44) ctx.fillRect(0, y, w, 18);
  }
  rumore(ctx, w, h, '#000', 0.05);
  const front = faccia === 'davanti', back = faccia === 'dietro';
  if (faccia === 'sopra') {                             // spalle: scollo visto dall'alto
    if (so.tipo !== 'felpa') { ctx.fillStyle = pelle; tondoRett(ctx, w * 0.36, h * 0.18, w * 0.28, h * 0.64, 18); ctx.fill(); }
    if (so.tipo === 'canotta') { ctx.fillStyle = pelle; ctx.fillRect(0, 0, w * 0.2, h); ctx.fillRect(w * 0.8, 0, w * 0.2, h); }
    return;
  }
  if (faccia === 'sotto') { ctx.fillStyle = cp; ctx.fillRect(0, 0, w, h); return; }
  // vita: i pantaloni salgono sul busto (12%), con la cintura per jeans/pantaloni/cargo
  const vita = h * 0.86;
  if (sotto.tipo !== 'gonna' || true) {
    ctx.fillStyle = sotto.tipo === 'gonna' ? sotto.colore : cp; ctx.fillRect(0, vita, w, h - vita);
    if (['jeans', 'pantaloni', 'cargo'].includes(sotto.tipo)) {
      ctx.fillStyle = '#2a1d17'; ctx.fillRect(0, vita, w, h * 0.045);
      if (front) { ctx.fillStyle = '#d9b25a'; tondoRett(ctx, w / 2 - 14, vita - 2, 28, h * 0.06, 3); ctx.fill(); ctx.fillStyle = '#2a1d17'; ctx.fillRect(w / 2 - 7, vita + 3, 14, h * 0.025); }
    } else if (sotto.tipo === 'tuta' || sotto.tipo === 'pantaloncini') {
      ctx.fillStyle = tono(cp, -0.18); ctx.fillRect(0, vita, w, h * 0.04);
      if (front) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w / 2 - 8, vita + 4); ctx.lineTo(w / 2 - 12, vita + 22); ctx.moveTo(w / 2 + 8, vita + 4); ctx.lineTo(w / 2 + 12, vita + 22); ctx.stroke(); }
    }
  }
  // orlo della maglia
  ctx.fillStyle = scuro; ctx.fillRect(0, vita - 8, w, 8);
  if (so.tipo === 'felpa' || so.tipo === 'maglione') { ctx.fillStyle = tono(c, -0.12); ctx.fillRect(0, vita - 26, w, 18); ctx.strokeStyle = tono(c, -0.22); ctx.lineWidth = 2; for (let x = 4; x < w; x += 8) { ctx.beginPath(); ctx.moveTo(x, vita - 26); ctx.lineTo(x, vita - 8); ctx.stroke(); } }
  if (!front && !back) return;
  // scollo
  if (front) {
    ctx.fillStyle = pelle;
    if (so.tipo === 'tshirt' || so.tipo === 'maglione') { ctx.beginPath(); ctx.ellipse(w / 2, 0, w * 0.17, h * 0.1, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = scuro; ctx.lineWidth = 7; ctx.stroke(); }
    if (so.tipo === 'canotta') { ctx.beginPath(); ctx.ellipse(w / 2, 0, w * 0.24, h * 0.2, 0, 0, Math.PI); ctx.fill(); ctx.fillRect(0, 0, w * 0.12, h * 0.4); ctx.fillRect(w * 0.88, 0, w * 0.12, h * 0.4); }
  }
  if (so.tipo === 'felpa') {
    if (front) {
      ctx.fillStyle = pelle; ctx.beginPath(); ctx.ellipse(w / 2, 0, w * 0.16, h * 0.08, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = scuro; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(w / 2, 0, w * 0.2, h * 0.11, 0, 0, Math.PI); ctx.stroke();
      // cordini
      ctx.strokeStyle = '#f4f1ea'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w / 2 + s * 18, h * 0.1); ctx.lineTo(w / 2 + s * 22, h * 0.34); ctx.stroke(); }
      // tasca a marsupio
      ctx.fillStyle = tono(c, -0.08); ctx.beginPath();
      ctx.moveTo(w * 0.22, vita - 26); ctx.lineTo(w * 0.3, h * 0.56); ctx.lineTo(w * 0.7, h * 0.56); ctx.lineTo(w * 0.78, vita - 26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = scuro; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  if (so.tipo === 'camicia' && front) {
    ctx.fillStyle = pelle; ctx.beginPath(); ctx.moveTo(w * 0.4, 0); ctx.lineTo(w / 2, h * 0.16); ctx.lineTo(w * 0.6, 0); ctx.fill();
    ctx.fillStyle = c2; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w / 2, h * 0.16); ctx.lineTo(w / 2 + s * w * 0.12, 0); ctx.lineTo(w / 2 + s * w * 0.26, 0); ctx.lineTo(w / 2 + s * w * 0.2, h * 0.12); ctx.closePath(); ctx.fill(); ctx.strokeStyle = scuro; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.strokeStyle = scuro; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.16); ctx.lineTo(w / 2, vita - 8); ctx.stroke();
    ctx.fillStyle = '#f7f3ea'; for (let y = h * 0.26; y < vita - 20; y += h * 0.15) { ctx.beginPath(); ctx.arc(w / 2 + 6, y, 4.5, 0, 7); ctx.fill(); }
    ctx.strokeStyle = scuro; ctx.strokeRect(w * 0.62, h * 0.3, w * 0.16, h * 0.14);
  }
  if (so.tipo === 'giacca' && front) {
    const sotto2 = so.colore2 || '#f4f1ea';
    ctx.fillStyle = sotto2; ctx.beginPath(); ctx.moveTo(w * 0.36, 0); ctx.lineTo(w * 0.64, 0); ctx.lineTo(w * 0.56, vita - 8); ctx.lineTo(w * 0.44, vita - 8); ctx.fill();
    ctx.fillStyle = scuro; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w / 2 + s * w * 0.14, 0); ctx.lineTo(w / 2 + s * w * 0.3, 0); ctx.lineTo(w / 2 + s * w * 0.08, h * 0.45); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(w * 0.6, h * 0.62, 5, 0, 7); ctx.fill();
    if (so.stampa) stampa(ctx, w / 2, h * 0.3, w * 0.14, so.stampa === 'righe' ? 'logo' : so.stampa, c, sotto2);
    return;
  }
  if (so.tipo === 'tuta' && front) {
    ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, vita - 8); ctx.stroke();
    ctx.fillStyle = c2; ctx.fillRect(w * 0.34, 0, w * 0.32, h * 0.07);
    ctx.fillStyle = '#e8e8e8'; tondoRett(ctx, w / 2 - 5, h * 0.08, 10, 22, 3); ctx.fill();
  }
  if (so.stampa && so.stampa !== 'righe' && front && so.tipo !== 'camicia') {
    stampa(ctx, w / 2, so.tipo === 'felpa' ? h * 0.33 : h * 0.42, w * 0.34, so.stampa, so.colore2 || '#ffffff', c);
  }
  if (back && so.stampa === 'numero') stampa(ctx, w / 2, h * 0.42, w * 0.5, 'numero', so.colore2 || '#fff', c);
}

// ---------- braccio ----------
function braccio(ctx, w, h, faccia, r, lato) {
  const so = r.sopra, c = so.colore, c2 = so.colore2 || tono(c, -0.35), pelle = r.pelleHex, scuro = tono(c, -0.28);
  ctx.fillStyle = pelle; ctx.fillRect(0, 0, w, h);
  if (faccia === 'sotto') return;
  const lunga = ['felpa', 'camicia', 'giacca', 'tuta', 'maglione'].includes(so.tipo);
  const fine = so.tipo === 'canotta' ? 0 : lunga ? h * 0.82 : h * 0.36;
  if (faccia === 'sopra') { if (fine) { ctx.fillStyle = c; ctx.fillRect(0, 0, w, h); } return; }
  if (!fine) return;
  ctx.fillStyle = c; ctx.fillRect(0, 0, w, fine);
  if (so.stampa === 'righe') { ctx.fillStyle = c2; for (let y = 18; y < fine; y += 44) ctx.fillRect(0, y, w, 18); }
  rumore(ctx, w, fine, '#000', 0.05);
  ctx.fillStyle = scuro; ctx.fillRect(0, fine - (lunga ? 16 : 8), w, lunga ? 16 : 8);   // polsino / orlo
  if (so.tipo === 'tuta') {                              // doppia riga sul lato esterno
    const esterno = (lato < 0 && faccia === 'sinistra') || (lato > 0 && faccia === 'destra');
    if (esterno) { ctx.fillStyle = c2; ctx.fillRect(w * 0.2, 0, w * 0.18, fine - 16); ctx.fillRect(w * 0.55, 0, w * 0.18, fine - 16); }
  }
  if (so.tipo === 'giacca' || so.tipo === 'camicia') { ctx.fillStyle = tono(c, -0.12); ctx.fillRect(0, fine - 28, w, 12); }
}

// ---------- gamba ----------
function gamba(ctx, w, h, faccia, r, lato) {
  const so = r.sotto, c = so.colore, c2 = so.colore2 || '#ffffff', pelle = r.pelleHex, scuro = tono(c, -0.3);
  ctx.fillStyle = pelle; ctx.fillRect(0, 0, w, h);
  if (faccia === 'sotto') { ctx.fillStyle = '#333'; ctx.fillRect(0, 0, w, h); return; }
  if (so.tipo === 'gonna') return;                         // le gambe restano pelle (o calze), la gonna è 3D
  const fine = so.tipo === 'pantaloncini' ? h * 0.42 : h;
  if (faccia === 'sopra') { ctx.fillStyle = c; ctx.fillRect(0, 0, w, h); return; }
  ctx.fillStyle = c; ctx.fillRect(0, 0, w, fine);
  if (so.tipo === 'jeans') {
    rumore(ctx, w, fine, '#ffffff', 0.09, 1.2); rumore(ctx, w, fine, '#000', 0.08, 1);
    ctx.strokeStyle = tono(c, 0.25); ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
    for (let y = 0; y < fine; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + 6); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (faccia === 'davanti') {
      cucitura(ctx, lato < 0 ? w * 0.85 : w * 0.15, 0, lato < 0 ? w * 0.6 : w * 0.4, h * 0.16, '#d9a441');
      // sbiaditura sulle cosce e sul ginocchio
      const g = ctx.createRadialGradient(w / 2, h * 0.45, 4, w / 2, h * 0.45, w * 0.6);
      g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    if (faccia === 'destra' || faccia === 'sinistra') cucitura(ctx, w / 2, 0, w / 2, fine, '#d9a441');
    ctx.fillStyle = tono(c, 0.12); ctx.fillRect(0, fine - 22, w, 22); ctx.fillStyle = scuro; ctx.fillRect(0, fine - 22, w, 3);   // risvolto
  } else if (so.tipo === 'pantaloni' || so.tipo === 'cargo') {
    rumore(ctx, w, fine, '#000', 0.05);
    if (faccia === 'davanti') { ctx.strokeStyle = scuro; ctx.lineWidth = 2; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.1); ctx.lineTo(w / 2, fine); ctx.stroke(); ctx.globalAlpha = 1; }
    if (so.tipo === 'cargo' && ((lato < 0 && faccia === 'sinistra') || (lato > 0 && faccia === 'destra'))) {
      ctx.fillStyle = tono(c, -0.1); tondoRett(ctx, w * 0.12, h * 0.38, w * 0.76, h * 0.22, 6); ctx.fill();
      ctx.strokeStyle = scuro; ctx.lineWidth = 3; ctx.stroke(); ctx.fillRect(w * 0.12, h * 0.38, w * 0.76, h * 0.05);
    }
  } else if (so.tipo === 'tuta' || so.tipo === 'pantaloncini') {
    rumore(ctx, w, fine, '#000', 0.04);
    const esterno = (lato < 0 && faccia === 'sinistra') || (lato > 0 && faccia === 'destra');
    if (esterno) { ctx.fillStyle = c2; ctx.fillRect(w * 0.18, 0, w * 0.16, fine); ctx.fillRect(w * 0.5, 0, w * 0.16, fine); }
    if (so.tipo === 'tuta') { ctx.fillStyle = scuro; ctx.fillRect(0, fine - 18, w, 18); }
    else { ctx.fillStyle = scuro; ctx.fillRect(0, fine - 8, w, 8); }
  }
}

function seiFacce(THREE, wu, hu, du, fn) {
  const dim = { destra: [du, hu], sinistra: [du, hu], sopra: [wu, du], sotto: [wu, du], davanti: [wu, hu], dietro: [wu, hu] };
  return FACCE.map((f) => {
    const [a, b] = dim[f];
    return plastica(THREE, '#ffffff', { map: tela(THREE, Math.round(a * PX), Math.round(b * PX), (ctx, w, h) => fn(ctx, w, h, f)) });
  });
}

export function materialiVestiti(THREE, r, M) {
  return {
    busto: seiFacce(THREE, M.busto.w, M.busto.h, M.busto.d, (c, w, h, f) => busto(c, w, h, f, r)),
    braccio: { s: seiFacce(THREE, M.braccio.w, M.braccio.h, M.braccio.d, (c, w, h, f) => braccio(c, w, h, f, r, -1)),
               d: seiFacce(THREE, M.braccio.w, M.braccio.h, M.braccio.d, (c, w, h, f) => braccio(c, w, h, f, r, 1)) },
    gamba: { s: seiFacce(THREE, M.gamba.w, M.gamba.h, M.gamba.d, (c, w, h, f) => gamba(c, w, h, f, r, -1)),
             d: seiFacce(THREE, M.gamba.w, M.gamba.h, M.gamba.d, (c, w, h, f) => gamba(c, w, h, f, r, 1)) },
  };
}

// Pezzi 3D dei vestiti: cappuccio della felpa (dietro il collo), gonna a campana sui fianchi, zaino
export function pezziVestiti(THREE, r, av) {
  const out = [];
  if (r.sopra.tipo === 'felpa') {
    const col = tono(r.sopra.colore, -0.06);
    const g = new THREE.TorusGeometry(0.5, 0.2, 12, 24, Math.PI);
    const m = new THREE.Mesh(g, plastica(THREE, col));
    m.rotation.set(-Math.PI / 2 + 0.25, 0, Math.PI); m.position.set(0, 2.05, -0.28); m.scale.set(1.25, 1, 0.9);
    av.busto.add(m); out.push(m);
  }
  if (r.sotto.tipo === 'gonna') {
    const g = new THREE.CylinderGeometry(1.08, 1.4, 1.0, 32, 1, false);
    const m = new THREE.Mesh(g, plastica(THREE, r.sotto.colore));
    m.scale.z = 0.62; m.position.set(0, -0.35, 0); av.anca.add(m); out.push(m);
    const orlo = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.04, 6, 40), plastica(THREE, tono(r.sotto.colore, -0.3)));
    orlo.rotation.x = Math.PI / 2; orlo.scale.y = 0.62; orlo.position.y = -0.85; av.anca.add(orlo); out.push(orlo);
  }
  return out;
}
