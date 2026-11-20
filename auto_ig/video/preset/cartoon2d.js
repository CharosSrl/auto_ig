// PRESET — Cartoon 2D ad alto ritmo per TeamUp Esports: effetti "dopamina" (punch-in, scossa, flash, tendina,
// raggi, esplosioni, timbri, testo che sbatte, adesivi). Tutto su canvas 2D 1080x1920 (vedi grafica2d.js → tela2d),
// deterministico in t.
//
//   camera(ctx, { zoom, fx, fy, sx, sy })  ...disegno...  ctx.restore()
//   raggi, puntini, esplosione, lineeVelocita, tendina, flash, timbro, scritta, adesivo, carteMistero, barra
import { PRIMARIO, ACCENTO, SCURO, CHIARO } from './brand.js';
import { W, H, FONT, SERIF, INCHIOSTRO, clamp, easeOut, pop, rr, icona } from './grafica2d.js';

const LW = 6;                                   // contorno "disegnato"
export const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const backOut = (x) => { x = clamp(x); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;

// --- Camera: punch-in + scossa attorno al punto di interesse --------------------------------------
export function camera(ctx, { zoom = 1, fx = W / 2, fy = 700, sx = 0, sy = 0, ruota = 0 } = {}) {
  ctx.save(); ctx.translate(fx + sx, fy + sy); ctx.rotate(ruota); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
}

// --- Sfondi ad alta energia ----------------------------------------------------------------------
export function sfondoPop(ctx, t, { colore = PRIMARIO, raggi: colRaggi = ACCENTO, cx = W / 2, cy = 640, alfa = 0.1, vel = 0.15 } = {}) {
  ctx.save(); ctx.fillStyle = colore; ctx.fillRect(0, 0, W, H);
  raggi(ctx, cx, cy, t * vel, colRaggi, { alfa, n: 18 });
  const g = ctx.createRadialGradient(cx, cy, 80, cx, cy, H * 0.8);
  g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  puntini(ctx, t, '#ffffff', 0.07);
  ctx.restore();
}
export function raggi(ctx, cx, cy, ang, colore, { alfa = 0.1, n = 18, r = 2400 } = {}) {
  ctx.save(); ctx.globalAlpha *= alfa; ctx.fillStyle = colore; ctx.translate(cx, cy); ctx.rotate(ang);
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, b = a + Math.PI / n; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
export function puntini(ctx, t, colore = '#fff', alfa = 0.07) {   // retino a mezzetinte negli angoli (stile fumetto)
  ctx.save(); ctx.fillStyle = colore;
  for (let y = 0; y < H; y += 46) for (let x = 0; x < W; x += 46) {
    const d = Math.min(Math.hypot(x, y), Math.hypot(W - x, H - y)) / 900, r = clamp(1 - d) * 9;
    if (r > 0.6) { ctx.globalAlpha = alfa; ctx.beginPath(); ctx.arc(x + ((y / 46) % 2) * 23, y, r, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}

// --- Effetti di stacco ---------------------------------------------------------------------------
// Esplosione di stelline/coriandoli: u = secondi dall'esplosione
export function esplosione(ctx, cx, cy, u, { colori = [ACCENTO, '#ffd166', '#ffffff'], n = 22, seme = 1, forza = 900 } = {}) {
  if (u < 0 || u > 1.1) return;
  ctx.save();
  for (let k = 0; k < n; k++) {
    const a = hash(seme * 31 + k) * Math.PI * 2, v = forza * (0.5 + 0.5 * hash(seme * 17 + k));
    const x = cx + Math.cos(a) * v * u * (1 - u * 0.45), y = cy + Math.sin(a) * v * u * (1 - u * 0.45) + 500 * u * u;
    ctx.globalAlpha = clamp(1 - u / 1.1); ctx.fillStyle = colori[k % colori.length];
    ctx.save(); ctx.translate(x, y); ctx.rotate(u * 8 + k);
    const r = 10 + 12 * hash(k + seme);
    if (k % 3 === 0) { ctx.beginPath(); for (let j = 0; j < 10; j++) { const rr2 = j % 2 ? r * 0.45 : r, b = j * Math.PI / 5; ctx.lineTo(Math.cos(b) * rr2, Math.sin(b) * rr2); } ctx.closePath(); ctx.fill(); }
    else ctx.fillRect(-r / 2, -r / 4, r, r / 2);
    ctx.restore();
  }
  ctx.restore();
}
export function lineeVelocita(ctx, cx, cy, k, { colore = '#ffffff', n = 26 } = {}) {   // k 0..1 intensità
  if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = colore; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(i) * 0.2, r0 = 420 + hash(i + 3) * 200, r1 = r0 + 300 + hash(i + 9) * 500;
    ctx.globalAlpha = 0.35 * k; ctx.lineWidth = 4 + 8 * hash(i + 5);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
  }
  ctx.restore();
}
// Tendina diagonale che "scopre" la scena nuova: u = secondi dallo stacco (dura 0.3 s)
export function tendina(ctx, u, { colore = ACCENTO, colore2 = SCURO, dir = 1 } = {}) {
  const k = clamp(u / 0.3); if (k >= 1) return;
  const e = easeOut(k), x0 = -400 + e * (W + 1500) * dir, larg = W + 800;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.3 * dir); ctx.translate(-W / 2, -H / 2);
  ctx.fillStyle = colore2; ctx.fillRect(x0, -700, larg, H + 1400);
  ctx.fillStyle = colore; ctx.fillRect(dir > 0 ? x0 - 90 : x0 + larg, -700, 90, H + 1400);   // bordo colorato in coda
  ctx.restore();
}
export function flash(ctx, alfa, colore = '#ffffff') { if (alfa <= 0.01) return; ctx.save(); ctx.globalAlpha = clamp(alfa); ctx.fillStyle = colore; ctx.fillRect(0, 0, W, H); ctx.restore(); }

// --- Testo "che sbatte" --------------------------------------------------------------------------
// Parole a comparsa una dopo l'altra (passo = secondi tra le parole; 0 = tutte subito), con rimbalzo.
// `evidenzia` = parole su pennarello colorato. Contorno spesso + ombra netta (stile adesivo).
export function scritta(ctx, str, x, y, u, { size = 84, colore = '#ffffff', maxW = 840, evidenzia = '', accento = ACCENTO,
  passo = 0.09, interlinea = 1.1, peso = 900, pennarello = PRIMARIO, bordo = INCHIOSTRO } = {}) {
  ctx.save(); ctx.font = FONT(size, peso); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const words = String(str).split(/\s+/).filter(Boolean);
  const hl = new Set(String(evidenzia).toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')));
  const righe = []; let riga = [];
  for (const w of words) { const p = [...riga, w].join(' '); if (riga.length && ctx.measureText(p).width > maxW) { righe.push(riga); riga = [w]; } else riga.push(w); }
  if (riga.length) righe.push(riga);
  const lh = size * interlinea, y0 = y - ((righe.length - 1) * lh) / 2, sp = ctx.measureText(' ').width;
  let n = 0;
  righe.forEach((r, i) => {
    let cx = x - ctx.measureText(r.join(' ')).width / 2;
    for (const w of r) {
      const ww = ctx.measureText(w).width, k = passo > 0 ? clamp((u - n * passo) / 0.16) : 1, on = hl.has(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
      if (k > 0) {
        ctx.save(); ctx.translate(cx + ww / 2, y0 + i * lh); const sc = passo > 0 ? lerp(1.9, 1, backOut(k)) : 1; ctx.scale(sc, sc);
        ctx.rotate((on ? -0.05 : 0) + (passo > 0 ? (1 - k) * (n % 2 ? 0.2 : -0.2) : 0)); ctx.globalAlpha *= clamp(k * 3);
        if (on) { ctx.fillStyle = accento; ctx.save(); ctx.rotate(-0.02); rr(ctx, -ww / 2 - 16, -size * 0.52, ww + 32, size * 1.04, 14); ctx.fill(); ctx.restore(); }
        ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = bordo;
        ctx.fillStyle = 'rgba(8,4,20,0.55)'; ctx.fillText(w, 5, 8);                                   // ombra netta
        if (!on) ctx.strokeText(w, 0, 0);
        ctx.fillStyle = on ? pennarello : colore; ctx.fillText(w, 0, 0);
        ctx.restore();
      }
      cx += ww + sp; n++;
    }
  });
  ctx.restore();
  return righe.length * lh;
}

// Timbro: etichetta inclinata che "sbatte" sullo schermo (u = secondi dalla comparsa)
export function timbro(ctx, str, cx, cy, u, { size = 64, fondo = '#ffd166', colore = SCURO, ruota = -0.08 } = {}) {
  if (u < 0) return;
  const k = clamp(u / 0.18), sc = lerp(2.6, 1, backOut(k));
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ruota + Math.sin(u * 10) * 0.02 * clamp(1 - u)); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(k * 2);
  ctx.font = FONT(size, 900); const w = ctx.measureText(str).width + size * 0.9, h = size * 1.5;
  ctx.fillStyle = 'rgba(8,4,20,0.5)'; rr(ctx, -w / 2 + 8, -h / 2 + 10, w, h, 18); ctx.fill();
  ctx.fillStyle = fondo; rr(ctx, -w / 2, -h / 2, w, h, 18); ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  ctx.fillStyle = colore; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, size * 0.04);
  ctx.restore();
}

// Adesivo: card con contorno e ombra netta che contiene un'icona (entra cadendo e rimbalza)
export function adesivo(ctx, nome, cx, cy, s, u, { t = 0, ruota = 0, fondo = CHIARO, accento = ACCENTO, dall = 'alto' } = {}) {
  const k = clamp(u / 0.35); if (k <= 0) return;
  const dy = dall === 'alto' ? (1 - backOut(k)) * -500 : 0, sc = dall === 'pop' ? backOut(k) : 1;
  ctx.save(); ctx.translate(cx, cy + dy); ctx.rotate(ruota + Math.sin(t * 2 + cx) * 0.03); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(8,4,20,0.45)'; rr(ctx, -s / 2 + 14, -s / 2 + 18, s, s, s * 0.14); ctx.fill();
  ctx.fillStyle = fondo; rr(ctx, -s / 2, -s / 2, s, s, s * 0.14); ctx.fill(); ctx.lineWidth = LW + 2; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  icona(ctx, nome, 0, 0, s * 0.78, { t, accento });
  ctx.restore();
}

// Carte mistero: fila di carte, quelle già scoperte mostrano l'icona, le altre "?" che tremano (open loop)
export function carteMistero(ctx, icone, scoperte, cx, cy, s, t, { attiva = -1, accento = ACCENTO, gap = 1.18 } = {}) {
  const n = icone.length;
  icone.forEach((nome, k) => {
    const x = cx + (k - (n - 1) / 2) * s * gap, su = k < scoperte, att = k === attiva;
    ctx.save(); ctx.translate(x, cy + (att ? -12 + Math.sin(t * 8) * 6 : 0)); ctx.rotate((su ? 0 : Math.sin(t * 6 + k * 2) * 0.07) + (k - 1) * 0.05);
    const sc = att ? 1.12 : 1; ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(8,4,20,0.45)'; rr(ctx, -s / 2 + 8, -s * 0.62 + 10, s, s * 1.24, 18); ctx.fill();
    ctx.fillStyle = su ? CHIARO : PRIMARIO; rr(ctx, -s / 2, -s * 0.62, s, s * 1.24, 18); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = su ? INCHIOSTRO : accento; ctx.stroke();
    if (su) icona(ctx, nome, 0, 0, s * 0.8, { t, accento });
    else { ctx.fillStyle = accento; ctx.font = SERIF(s * 0.8, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, s * 0.05); }
    ctx.restore();
  });
}

// Barra di avanzamento in alto (k 0..1) e contatore "1/3"
export function barra(ctx, k, { colore = ACCENTO } = {}) {
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, 60, 70, W - 120, 14, 7); ctx.fill();
  ctx.fillStyle = colore; rr(ctx, 60, 70, Math.max(14, (W - 120) * clamp(k)), 14, 7); ctx.fill(); ctx.restore();
}
export function contatore(ctx, n, tot, cx, cy, u, { accento = ACCENTO } = {}) {
  const k = clamp(u / 0.3), sc = lerp(1.8, 1, backOut(k));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.rotate(0.06);
  ctx.fillStyle = 'rgba(8,4,20,0.5)'; rr(ctx, -84 + 6, -46 + 8, 168, 92, 46); ctx.fill();
  ctx.fillStyle = accento; rr(ctx, -84, -46, 168, 92, 46); ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  ctx.fillStyle = PRIMARIO; ctx.font = FONT(56, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${n}/${tot}`, 0, 3);
  ctx.restore();
}

// Fumetto (commenti): rettangolo arrotondato con punta verso (px, py)
export function fumetto(ctx, x, y, w, h, px, py, { fondo = CHIARO } = {}) {
  ctx.save(); ctx.fillStyle = 'rgba(8,4,20,0.45)'; rr(ctx, x + 10, y + 12, w, h, 50); ctx.fill();
  ctx.beginPath(); rr(ctx, x, y, w, h, 50); ctx.moveTo(px - 40, y + h - 2); ctx.lineTo(px, py); ctx.lineTo(px + 40, y + h - 2);
  ctx.fillStyle = fondo; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INCHIOSTRO; ctx.lineJoin = 'round';
  ctx.beginPath(); rr(ctx, x, y, w, h, 50); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px - 40, y + h); ctx.lineTo(px, py); ctx.lineTo(px + 40, y + h); ctx.stroke();
  ctx.fillStyle = fondo; ctx.fillRect(px - 36, y + h - 8, 72, 12);
  ctx.restore();
}
