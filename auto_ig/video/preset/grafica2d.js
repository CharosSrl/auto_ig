// PRESET — Grafica 2D TeamUp Esports (resa "2d" dei formati): sfondi, card, testi, icone vettoriali gaming/esports,
// animazioni. Si disegna su un canvas 2D nello spazio 1080x1920 (il canvas può essere 2x per la qualità alta).
//
//   const tela = tela2d(THREE, renderer)   -> { ctx, scene, camera, inizia(), fine() }  (piano a schermo intero)
//   sfondo(ctx, t, { colore, accento })     icona(ctx, 'controller', cx, cy, 300, { t })
//   testo(ctx, 'Il primo torneo', 540, 900, { size: 76, colore: SCURO, evidenzia: 'torneo', accento })
//   card(ctx, x, y, w, h)                   pop(u), entra(u, ritardo, durata)
// Icone disponibili: vedi ICONE (nomi elencati anche in auto_ig/formati.yaml → icone_2d).
import { PRIMARIO, ACCENTO, SCURO, CHIARO, simbolo, logo } from './brand.js';

export const W = 1080, H = 1920;
export const ORO = '#d4af37', INCHIOSTRO = '#120d24';
export const FONT = (px, w = 800) => `${w} ${px}px Lato, "DejaVu Sans", sans-serif`;
export const SERIF = (px, stile = 'italic 400') => `${stile} ${px}px P052, "DejaVu Serif", serif`;

// --- Animazione -------------------------------------------------------------------------------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const pop = (x) => { x = clamp(x); const c = 1.9; return x === 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const entra = (u, ritardo = 0, durata = 0.45) => clamp((u - ritardo) / durata);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// --- Tela: canvas 2D mostrato a schermo intero ------------------------------------------------
export function tela2d(THREE, renderer) {
  const r = renderer.getPixelRatio();
  const c = document.createElement('canvas'); c.width = W * r; c.height = H * r;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 2); camera.position.z = 1;
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
  return {
    ctx, scene, camera,
    inizia() { ctx.setTransform(r, 0, 0, r, 0, 0); ctx.clearRect(0, 0, W, H); },
    fine() { tex.needsUpdate = true; },
  };
}

// --- Forme e testo ----------------------------------------------------------------------------
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function card(ctx, x, y, w, h, { r = 48, colore = CHIARO, ombra = true } = {}) {
  ctx.save();
  if (ombra) { ctx.shadowColor = 'rgba(8,4,20,0.38)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22; }
  ctx.fillStyle = colore; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.restore();
}

// Va a capo dentro maxW; `evidenzia` = parole (stringa) colorate con `accento`. Ritorna l'altezza usata.
// Le parole appaiono una alla volta se `parole` (0..1) < 1.
export function testo(ctx, str, x, y, { size = 72, peso = 800, colore = '#fff', maxW = 860, evidenzia = '', accento = ACCENTO,
  allinea = 'center', interlinea = 1.15, font = null, parole = 1, ombra = false } = {}) {
  const f = font || FONT(size, peso);
  ctx.save(); ctx.font = f; ctx.textBaseline = 'middle';
  const words = String(str).split(/\s+/).filter(Boolean);
  const hl = new Set(String(evidenzia).toLowerCase().split(/\s+/).filter(Boolean));
  const righe = []; let riga = [];
  for (const w of words) {
    const prova = [...riga, w].join(' ');
    if (riga.length && ctx.measureText(prova).width > maxW) { righe.push(riga); riga = [w]; } else riga.push(w);
  }
  if (riga.length) righe.push(riga);
  const lh = size * interlinea, y0 = y - ((righe.length - 1) * lh) / 2;
  const sp = ctx.measureText(' ').width;
  let n = 0; const tot = words.length;
  if (ombra) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; }
  righe.forEach((r, i) => {
    const larg = ctx.measureText(r.join(' ')).width;
    let cx = allinea === 'center' ? x - larg / 2 : x;
    for (const w of r) {
      const k = clamp((parole * tot - n) * 1.0);           // comparsa parola per parola
      const ww = ctx.measureText(w).width;
      if (k > 0) {
        ctx.save(); ctx.globalAlpha *= k;
        ctx.translate(cx + ww / 2, y0 + i * lh + (1 - easeOut(k)) * size * 0.35);
        ctx.fillStyle = hl.has(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')) ? accento : colore;
        ctx.textAlign = 'center'; ctx.fillText(w, 0, 0); ctx.restore();
      }
      cx += ww + sp; n++;
    }
  });
  ctx.restore();
  return righe.length * lh;
}

// Pillola con testo (etichette, opzioni, bottoni). Ritorna la larghezza.
export function pillola(ctx, str, cx, cy, { size = 40, fondo = ACCENTO, colore = PRIMARIO, padX = 36, h = null, peso = 800, w = null, font = null } = {}) {
  ctx.save(); ctx.font = font || FONT(size, peso);
  const ww = w || ctx.measureText(str).width + padX * 2, hh = h || size * 1.9;
  ctx.fillStyle = fondo; rr(ctx, cx - ww / 2, cy - hh / 2, ww, hh, hh / 2); ctx.fill();
  ctx.fillStyle = colore; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, cx, cy + size * 0.04);
  ctx.restore(); return ww;
}

// --- Sfondo: tinta del brand con luce morbida, simboli che salgono piano, coriandoli di luce ------
export function sfondo(ctx, t, { colore = PRIMARIO, accento = ACCENTO, chiaro = false } = {}) {
  ctx.save();
  ctx.fillStyle = colore; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.3, 60, W * 0.5, H * 0.35, H * 0.75);
  g.addColorStop(0, chiaro ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // righe diagonali sottilissime (texture "scanline")
  ctx.globalAlpha = 0.05; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  for (let x = -H; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
  // simboli TeamUp che fluttuano
  for (let i = 0; i < 11; i++) {
    const s = 70 + hash(i) * 90, vel = 18 + hash(i + 7) * 22;
    const y = ((hash(i + 3) * (H + 300) - t * vel) % (H + 300) + H + 300) % (H + 300) - 150;
    const x = hash(i + 11) * W + Math.sin(t * 0.5 + i) * 25;
    ctx.globalAlpha = 0.09 + hash(i + 5) * 0.07;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.4 + i * 2) * 0.25);
    simbolo(ctx, 0, 0, s, accento, 5); ctx.restore();
  }
  ctx.restore();
}

// Intestazione in alto: logo piccolo + etichetta del formato, e i pallini di avanzamento.
export function intestazione(ctx, etichetta, { passi = 0, attuale = -1, accento = ACCENTO, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha;
  simbolo(ctx, 112, 196, 62, accento, 5);
  ctx.fillStyle = '#fff'; ctx.font = FONT(46, 900); ctx.textBaseline = 'middle'; ctx.fillText('TeamUp', 160, 196);
  ctx.font = FONT(30, 700); ctx.fillStyle = accento; ctx.fillText(etichetta.toUpperCase(), 350, 199);
  for (let k = 0; k < passi; k++) {
    const x = W - 90 - (passi - 1 - k) * 46, on = k <= attuale;
    ctx.fillStyle = on ? accento : 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(x, 196, k === attuale ? 15 : 11, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// Numero in un cerchio (curiosità n, consiglio n)
export function numero(ctx, n, cx, cy, r, { fondo = PRIMARIO, colore = ACCENTO, k = 1 } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(pop(k), pop(k)); ctx.rotate((1 - easeOut(k)) * -0.6);
  ctx.shadowColor = 'rgba(8,4,20,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  ctx.fillStyle = fondo; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = colore; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, 7); ctx.stroke();
  ctx.fillStyle = colore; ctx.font = SERIF(r * 1.15, 'italic 700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 0, r * 0.06); ctx.restore();
}

// Freccia curva tra due punti (dal capo alla spiegazione); k = quanto è disegnata
export function freccia(ctx, x1, y1, x2, y2, { colore = PRIMARIO, k = 1, lw = 9 } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = colore; ctx.fillStyle = colore; ctx.lineWidth = lw; ctx.lineCap = 'round';
  const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 70;
  const N = 30, pts = [];
  for (let i = 0; i <= N * k; i++) { const s = i / N; pts.push([(1 - s) ** 2 * x1 + 2 * (1 - s) * s * mx + s * s * x2, (1 - s) ** 2 * y1 + 2 * (1 - s) * s * my + s * s * y2]); }
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  if (k > 0.95 && pts.length > 2) {
    const [a, b] = [pts[pts.length - 3], pts[pts.length - 1]], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.translate(b[0], b[1]); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-22, -17); ctx.lineTo(-22, 17); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Mano stilizzata che tocca (CTA); `tocco` 0..1 = pressione
export function mano(ctx, x, y, s, tocco = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100); ctx.rotate(-0.35);
  ctx.translate(0, tocco * 8);
  ctx.fillStyle = '#f2c6a4'; ctx.strokeStyle = INCHIOSTRO; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-10, -12, 0, -12); ctx.quadraticCurveTo(10, -12, 10, 0);   // indice
  ctx.lineTo(10, 45); ctx.quadraticCurveTo(38, 38, 42, 58); ctx.lineTo(42, 95);
  ctx.quadraticCurveTo(40, 125, 10, 128); ctx.lineTo(-18, 128); ctx.quadraticCurveTo(-40, 120, -44, 90);
  ctx.lineTo(-48, 62); ctx.quadraticCurveTo(-48, 52, -38, 52); ctx.quadraticCurveTo(-28, 54, -26, 70); ctx.lineTo(-10, 78);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// --- Icone (disegnate in un riquadro 200x200 centrato in 0,0; s = lato in px) -----------------
const L = 7;   // spessore del contorno
function stileIcona(ctx) { ctx.lineWidth = L; ctx.strokeStyle = INCHIOSTRO; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
function fs(ctx, fill) { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); }
export const ICONE = {
  // Orologio da taschino con catenella
  orologio(ctx, { t = 0 }) {
    ctx.save(); ctx.strokeStyle = '#b8902c'; ctx.lineWidth = 6; ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(0, -78); ctx.bezierCurveTo(40, -120, 90, -90, 92, -30); ctx.stroke(); ctx.restore();
    ctx.beginPath(); rr(ctx, -14, -92, 28, 22, 5); fs(ctx, ORO);
    ctx.beginPath(); ctx.arc(0, -98, 11, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 76, 0, 7); fs(ctx, ORO);
    ctx.beginPath(); ctx.arc(0, 0, 60, 0, 7); fs(ctx, '#fffaf0');
    ctx.save(); ctx.lineWidth = 4;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.sin(a) * 48, -Math.cos(a) * 48); ctx.lineTo(Math.sin(a) * (k % 3 ? 53 : 42), -Math.cos(a) * (k % 3 ? 53 : 42)); ctx.stroke(); }
    const am = t * 1.2, ah = t * 0.1 + 1.0;
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ah) * 28, -Math.cos(ah) * 28); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(am) * 42, -Math.cos(am) * 42); ctx.stroke();
    ctx.fillStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); ctx.restore();
  },
  // Auto d'epoca (anni '20)
  auto(ctx, { t = 0 }) {
    const ruota = (x) => {
      ctx.beginPath(); ctx.arc(x, 52, 34, 0, 7); fs(ctx, '#1d1d1d');
      ctx.beginPath(); ctx.arc(x, 52, 18, 0, 7); fs(ctx, '#d9d2c5');
      ctx.save(); ctx.lineWidth = 3; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + t * 2; ctx.beginPath(); ctx.moveTo(x, 52); ctx.lineTo(x + Math.cos(a) * 18, 52 + Math.sin(a) * 18); ctx.stroke(); } ctx.restore();
    };
    // carrozzeria bassa e lunga, abitacolo con tettuccio, parafanghi curvi sulle ruote
    ctx.beginPath(); ctx.moveTo(-100, 34); ctx.lineTo(-100, 8); ctx.quadraticCurveTo(-98, -6, -80, -8); ctx.lineTo(-48, -8);
    ctx.lineTo(-40, -58); ctx.quadraticCurveTo(-4, -66, 26, -58); ctx.lineTo(34, -8); ctx.lineTo(84, -4);
    ctx.quadraticCurveTo(100, 0, 100, 18); ctx.lineTo(100, 34); ctx.closePath(); fs(ctx, '#1f1a1c');
    ctx.beginPath(); ctx.moveTo(-34, -48); ctx.quadraticCurveTo(-4, -54, 20, -48); ctx.lineTo(24, -16); ctx.lineTo(-38, -16); ctx.closePath(); fs(ctx, '#f3e9df');
    ctx.beginPath(); ctx.moveTo(-6, -50); ctx.lineTo(-6, -16); ctx.stroke();
    for (const x of [-58, 60]) { ctx.beginPath(); ctx.arc(x, 40, 44, Math.PI * 1.08, Math.PI * 1.92); fs(ctx, '#1f1a1c'); }
    ctx.beginPath(); ctx.moveTo(-104, 22); ctx.lineTo(104, 22); ctx.lineWidth = 8; ctx.strokeStyle = '#6b6b6b'; ctx.stroke(); stileIcona(ctx);
    ctx.beginPath(); ctx.arc(94, 2, 9, 0, 7); fs(ctx, '#ffe9a8');
    ruota(-58); ruota(60);
  },
  lampadina(ctx, { t = 0, accento = ACCENTO }) {
    ctx.save(); ctx.strokeStyle = accento; ctx.lineWidth = 7;
    for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (k - 3.5) * 0.36, r1 = 86 + Math.sin(t * 6 + k) * 6;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, -20 + Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * (r1 + 22), -20 + Math.sin(a) * (r1 + 22)); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(0, -20, 62, Math.PI * 0.78, Math.PI * 2.22); ctx.quadraticCurveTo(28, 30, 26, 52); ctx.lineTo(-26, 52); ctx.quadraticCurveTo(-28, 30, -44, 22); ctx.closePath();
    fs(ctx, '#fff3c4'); ctx.restore();
    ctx.lineWidth = L; ctx.beginPath(); ctx.arc(0, -20, 62, Math.PI * 0.78, Math.PI * 2.22); ctx.stroke();
    ctx.beginPath(); rr(ctx, -28, 52, 56, 34, 8); fs(ctx, '#b9c1c9');
    ctx.save(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-28, 64); ctx.lineTo(28, 64); ctx.moveTo(-28, 75); ctx.lineTo(28, 75); ctx.stroke(); ctx.restore();
  },
  domanda(ctx, { accento = ACCENTO }) {
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); fs(ctx, accento);
    ctx.fillStyle = PRIMARIO; ctx.font = SERIF(150, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 8);
  },
  commento(ctx, { t = 0 }) {
    ctx.beginPath(); rr(ctx, -96, -78, 192, 132, 40); ctx.moveTo(-40, 50); ctx.lineTo(-62, 96); ctx.lineTo(-2, 52); fs(ctx, CHIARO);
    for (let k = 0; k < 3; k++) { const s = 1 + 0.3 * Math.max(0, Math.sin(t * 6 - k * 0.8));
      ctx.fillStyle = PRIMARIO; ctx.beginPath(); ctx.arc(-44 + k * 44, -12, 13 * s, 0, 7); ctx.fill(); }
  },
  cuore(ctx, { accento = '#e8435a' }) {
    ctx.beginPath(); ctx.moveTo(0, 86); ctx.bezierCurveTo(-120, 0, -80, -96, 0, -40); ctx.bezierCurveTo(80, -96, 120, 0, 0, 86); fs(ctx, accento);
  },
  stella(ctx, { accento = ORO }) {
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 40 : 92, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); fs(ctx, accento);
  },
  telefono(ctx, { accento = ACCENTO }) {
    ctx.beginPath(); rr(ctx, -62, -100, 124, 200, 24); fs(ctx, '#1b1b1b');
    ctx.beginPath(); rr(ctx, -50, -84, 100, 168, 12); ctx.fillStyle = PRIMARIO; ctx.fill();
    simbolo(ctx, 0, -14, 70, accento, 8);
    ctx.fillStyle = '#fff'; ctx.font = FONT(22, 900); ctx.textAlign = 'center'; ctx.fillText('TeamUp', 0, 50);
  },
  // Elmetto da soldato (Prima guerra mondiale, forma a scodella)
  elmetto(ctx) {
    ctx.beginPath(); ctx.ellipse(0, 30, 100, 24, 0, 0, 7); fs(ctx, '#5f6b4e');
    ctx.beginPath(); ctx.moveTo(-64, 26); ctx.quadraticCurveTo(-60, -70, 0, -72); ctx.quadraticCurveTo(60, -70, 64, 26); ctx.closePath(); fs(ctx, '#6f7d5a');
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(-6, -6, 46, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-40, 40); ctx.quadraticCurveTo(0, 96, 40, 40); ctx.lineWidth = 5; ctx.strokeStyle = '#8b5a2b'; ctx.stroke(); stileIcona(ctx);
  },
  // Medaglia militare con nastro
  medaglia(ctx, { t = 0 }) {
    ctx.beginPath(); ctx.moveTo(-40, -96); ctx.lineTo(40, -96); ctx.lineTo(24, -10); ctx.lineTo(-24, -10); ctx.closePath(); fs(ctx, '#c0392b');
    ctx.beginPath(); ctx.moveTo(-10, -96); ctx.lineTo(10, -96); ctx.lineTo(6, -10); ctx.lineTo(-6, -10); ctx.closePath(); fs(ctx, '#fffaf0');
    ctx.save(); ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 20 + 15 * Math.sin(t * 5);
    ctx.beginPath(); for (let k = 0; k < 16; k++) { const r = k % 2 ? 44 : 60, a = -Math.PI / 2 + k * Math.PI / 8; ctx.lineTo(Math.cos(a) * r, 46 + Math.sin(a) * r); }
    ctx.closePath(); fs(ctx, ORO); ctx.restore(); ctx.lineWidth = L; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 46, 28, 0, 7); fs(ctx, '#e8c25a');
  },
  // Fungo atomico stilizzato (test sull'atollo di Bikini) sopra un'isola con palma
  atomo(ctx, { t = 0 }) {
    const g = 1 + 0.04 * Math.sin(t * 4);
    ctx.beginPath(); ctx.ellipse(0, 88, 96, 14, 0, 0, 7); fs(ctx, '#3b8fc4');
    ctx.beginPath(); ctx.ellipse(-50, 80, 34, 10, 0, Math.PI, 0); fs(ctx, '#f2d38b');
    ctx.save(); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-50, 72); ctx.quadraticCurveTo(-46, 50, -56, 34); ctx.stroke();
    ctx.fillStyle = '#4c9a4a'; for (const a of [-2.6, -1.9, -1.2, -0.5]) { ctx.beginPath(); ctx.ellipse(-56 + Math.cos(a) * 14, 34 + Math.sin(a) * 6, 16, 5, a, 0, 7); ctx.fill(); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); ctx.moveTo(10, 84); ctx.quadraticCurveTo(22, 30, 16, -10); ctx.lineTo(46, -10); ctx.quadraticCurveTo(40, 30, 54, 84); ctx.closePath(); fs(ctx, '#f0a35e');
    ctx.save(); ctx.translate(31, -40); ctx.scale(g, g);
    ctx.beginPath(); ctx.ellipse(0, 0, 70, 40, 0, 0, 7); fs(ctx, '#f7c873');
    ctx.beginPath(); ctx.ellipse(-24, -16, 26, 20, 0, 0, 7); fs(ctx, '#ffe3a3');
    ctx.beginPath(); ctx.ellipse(26, -12, 24, 18, 0, 0, 7); fs(ctx, '#ffe3a3');
    ctx.restore();
  },
  // Due sciabole incrociate (soldati a cavallo)
  sciabole(ctx) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * 0.75);
      ctx.beginPath(); ctx.moveTo(-6, 50); ctx.quadraticCurveTo(-14, -30, 4, -100); ctx.quadraticCurveTo(10, -30, 8, 50); ctx.closePath(); fs(ctx, '#dfe5ea');
      ctx.beginPath(); rr(ctx, -26, 50, 52, 12, 5); fs(ctx, ORO);
      ctx.beginPath(); rr(ctx, -7, 62, 14, 34, 5); fs(ctx, '#5a3d1e');
      ctx.restore();
    }
  },
  // Pugnale (stiletto)
  pugnale(ctx, { t = 0 }) {
    ctx.save(); ctx.rotate(-0.5);
    ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(0, -108); ctx.lineTo(10, 10); ctx.closePath(); fs(ctx, '#e3e9ee');
    ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -80); ctx.stroke(); ctx.restore();
    ctx.beginPath(); rr(ctx, -40, 10, 80, 14, 7); fs(ctx, ORO);
    ctx.beginPath(); rr(ctx, -10, 24, 20, 56, 8); fs(ctx, PRIMARIO);
    ctx.beginPath(); ctx.arc(0, 88, 12, 0, 7); fs(ctx, ORO);
    ctx.restore();
  },
  // Impronte silenziose + "shh"
  silenzio(ctx, { t = 0, accento = ACCENTO }) {
    const passo = (x, y, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 30, 0, 0, 7); fs(ctx, '#fffaf0');
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-10 + k * 7, -38 - (k === 0 ? 2 : 0), 5, 0, 7); fs(ctx, '#fffaf0'); } ctx.restore(); };
    const n = Math.floor(t * 2) % 4;
    [[-60, 70, -0.2], [-20, 20, 0.2], [20, -30, -0.2], [60, -80, 0.2]].forEach(([x, y, a], k) => { if (k <= n) passo(x, y, a); });
    ctx.fillStyle = accento; ctx.font = SERIF(54, 'italic 700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.lineWidth = 8; ctx.strokeText('shh…', -40, -80); ctx.restore(); ctx.fillText('shh…', -40, -80);
  },
  // Corona reale
  corona(ctx, { t = 0 }) {
    ctx.beginPath(); ctx.moveTo(-90, 50); ctx.lineTo(-96, -50); ctx.lineTo(-48, -6); ctx.lineTo(0, -80); ctx.lineTo(48, -6); ctx.lineTo(96, -50); ctx.lineTo(90, 50); ctx.closePath(); fs(ctx, ORO);
    ctx.beginPath(); rr(ctx, -94, 46, 188, 34, 8); fs(ctx, '#c49a2c');
    for (const [x, y, c] of [[-96, -56, '#e8435a'], [0, -88, '#3b8fc4'], [96, -56, '#e8435a']]) { ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); fs(ctx, c); }
    for (const [x, c] of [[-50, '#e8435a'], [0, '#3b8fc4'], [50, '#4c9a4a']]) { ctx.beginPath(); ctx.arc(x, 63, 10, 0, 7); fs(ctx, c); }
    ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(-40, 0); ctx.stroke(); ctx.restore();
  },
  // Aeroplano visto dall'alto, in volo in diagonale
  aereo(ctx, { t = 0 }) {
    ctx.save(); ctx.rotate(-0.6); ctx.translate(0, Math.sin(t * 3) * 5);
    ctx.beginPath(); rr(ctx, -112, -26, 224, 40, 18); fs(ctx, '#f2e6c9');                                  // ala
    ctx.beginPath(); rr(ctx, -46, 70, 92, 24, 10); fs(ctx, '#f2e6c9');                                     // coda
    ctx.beginPath(); ctx.moveTo(0, -100); ctx.quadraticCurveTo(22, -80, 18, -20); ctx.lineTo(8, 96); ctx.lineTo(-8, 96);
    ctx.lineTo(-18, -20); ctx.quadraticCurveTo(-22, -80, 0, -100); fs(ctx, '#c0533f');                    // fusoliera
    ctx.beginPath(); ctx.arc(0, -30, 10, 0, 7); fs(ctx, '#7fc4e8');                                       // abitacolo
    ctx.save(); ctx.translate(0, -104); ctx.rotate(t * 25); ctx.beginPath(); rr(ctx, -44, -5, 88, 10, 5); fs(ctx, '#6b4a2b'); ctx.restore();
    ctx.restore();
  },
  // Orologio da polso con cinturino in pelle e cassa quadrata
  polso(ctx, { t = 0 }) {
    ctx.beginPath(); rr(ctx, -30, -110, 60, 220, 14); fs(ctx, '#7a4a2a');
    ctx.save(); ctx.strokeStyle = '#c9925b'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(-22, -104); ctx.lineTo(-22, 104); ctx.moveTo(22, -104); ctx.lineTo(22, 104); ctx.stroke(); ctx.restore();
    ctx.beginPath(); rr(ctx, -62, -62, 124, 124, 22); fs(ctx, ORO);
    ctx.beginPath(); rr(ctx, -46, -46, 92, 92, 10); fs(ctx, '#fffaf0');
    for (const [x, y] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) { ctx.beginPath(); ctx.arc(x * 1.2, y * 1.2, 4, 0, 7); ctx.fillStyle = INCHIOSTRO; ctx.fill(); }
    ctx.save(); ctx.lineWidth = 6; const am = t * 1.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -14); ctx.stroke();                                // ore: le 10
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(am) * 36, -Math.cos(am) * 36); ctx.stroke();
    ctx.fillStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); ctx.restore();
  },
  // Baule da viaggio con borchie e cinghie
  baule(ctx, { accento = ACCENTO }) {
    ctx.beginPath(); rr(ctx, -110, -66, 220, 146, 12); fs(ctx, '#8a5a2b');
    ctx.save(); ctx.fillStyle = '#6f4520'; for (let x = -100; x < 110; x += 26) ctx.fillRect(x, -60, 12, 136); ctx.restore();
    ctx.beginPath(); rr(ctx, -110, -66, 220, 146, 12); ctx.stroke();
    ctx.beginPath(); rr(ctx, -116, -14, 232, 18, 4); fs(ctx, '#3a2414');
    for (const x of [-60, 60]) { ctx.beginPath(); rr(ctx, x - 9, -66, 18, 146, 3); fs(ctx, '#3a2414'); }
    for (const [x, y] of [[-104, -60], [104, -60], [-104, 74], [104, 74]]) { ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); fs(ctx, ORO); }
    ctx.beginPath(); rr(ctx, -20, -26, 40, 44, 6); fs(ctx, ORO);
    ctx.beginPath(); ctx.arc(0, -6, 6, 0, 7); ctx.fillStyle = INCHIOSTRO; ctx.fill();
  },
  // Lucchetto chiuso (serratura a prova di Houdini)
  lucchetto(ctx, { t = 0 }) {
    ctx.save(); ctx.lineWidth = 22; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(0, -30, 50, Math.PI, 0); ctx.lineTo(50, 0); ctx.moveTo(-50, -30); ctx.lineTo(-50, 0); ctx.stroke();
    ctx.lineWidth = 12; ctx.strokeStyle = '#b9bcc4'; ctx.stroke(); ctx.restore();
    ctx.beginPath(); rr(ctx, -80, -10, 160, 116, 18); fs(ctx, ORO);
    ctx.beginPath(); ctx.arc(0, 34, 16, 0, 7); ctx.moveTo(-7, 40); ctx.lineTo(-10, 74); ctx.lineTo(10, 74); ctx.lineTo(7, 40); ctx.fillStyle = INCHIOSTRO; ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-58, 6); ctx.lineTo(-40, 24); ctx.stroke(); ctx.restore();
  },
  // Lente d'ingrandimento (caccia ai falsi)
  lente(ctx, { t = 0 }) {
    ctx.save(); ctx.rotate(Math.sin(t * 2) * 0.08);
    ctx.save(); ctx.translate(48, 48); ctx.rotate(-Math.PI / 4); ctx.beginPath(); rr(ctx, -15, 0, 30, 84, 12); fs(ctx, '#6b3b2a'); ctx.restore();
    ctx.beginPath(); ctx.arc(-16, -16, 76, 0, 7); fs(ctx, '#c7c9cf');
    ctx.beginPath(); ctx.arc(-16, -16, 58, 0, 7); fs(ctx, '#dff1fb');
    ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(-16, -16, 40, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke(); ctx.restore();
    ctx.restore();
  },
  // --- Esports e gaming (TeamUp, 2026-11-20) ---
  // Controller (gamepad) con croce direzionale e quattro tasti
  controller(ctx, { t = 0, accento = ACCENTO }) {
    ctx.beginPath(); ctx.moveTo(-60, -50); ctx.lineTo(60, -50);
    ctx.bezierCurveTo(105, -50, 112, 10, 100, 58); ctx.bezierCurveTo(92, 92, 60, 90, 44, 58); ctx.lineTo(30, 30); ctx.lineTo(-30, 30); ctx.lineTo(-44, 58);
    ctx.bezierCurveTo(-60, 90, -92, 92, -100, 58); ctx.bezierCurveTo(-112, 10, -105, -50, -60, -50); ctx.closePath(); fs(ctx, '#2b2540');
    ctx.save(); ctx.lineWidth = 4;
    ctx.beginPath(); rr(ctx, -72, -16, 48, 16, 4); rr(ctx, -56, -32, 16, 48, 4); ctx.fillStyle = '#d9d6e6'; ctx.fill();
    const colori = ['#22c55e', '#ef4444', '#3b82f6', '#facc15'];
    [[54, -28], [76, -8], [32, -8], [54, 12]].forEach(([x, y], k) => {
      const on = Math.floor(t * 3) % 4 === k;
      ctx.beginPath(); ctx.arc(x, y, on ? 11 : 9, 0, 7); ctx.fillStyle = colori[k]; ctx.fill(); ctx.stroke(); });
    ctx.beginPath(); ctx.arc(-24, 34, 12, 0, 7); ctx.arc(24, 34, 12, 0, 7); ctx.fillStyle = '#111'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); rr(ctx, -16, -40, 32, 8, 4); ctx.fillStyle = accento; ctx.fill();
  },
  // Cuffie da gaming con microfono
  cuffie(ctx, { t = 0, accento = ACCENTO }) {
    ctx.save(); ctx.lineWidth = 22; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(0, 10, 84, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.lineWidth = 12; ctx.strokeStyle = '#2b2540'; ctx.stroke(); ctx.restore(); stileIcona(ctx);
    for (const sx of [-1, 1]) { ctx.beginPath(); rr(ctx, sx * 84 - 26, -4, 52, 92, 22); fs(ctx, '#2b2540');
      ctx.beginPath(); rr(ctx, sx * 84 - 12, 14, 24, 56, 10); ctx.fillStyle = accento; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-84, 70); ctx.quadraticCurveTo(-70, 110, -20, 104); ctx.stroke();
    ctx.beginPath(); ctx.arc(-14, 104, 10, 0, 7); fs(ctx, '#111');
    ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-14, 104, 4, 0, 7); ctx.fill(); ctx.restore();
  },
  // Trofeo (coppa) con manici
  trofeo(ctx, { t = 0 }) {
    for (const sx of [-1, 1]) { ctx.save(); ctx.lineWidth = 14; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(sx * 62, -42, 30, sx > 0 ? -Math.PI / 2 : Math.PI / 2, sx > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = ORO; ctx.stroke(); ctx.restore(); }
    stileIcona(ctx);
    ctx.beginPath(); ctx.moveTo(-66, -82); ctx.lineTo(66, -82); ctx.quadraticCurveTo(62, 10, 0, 28); ctx.quadraticCurveTo(-62, 10, -66, -82); ctx.closePath(); fs(ctx, ORO);
    ctx.beginPath(); rr(ctx, -12, 26, 24, 34, 4); fs(ctx, '#b8902c');
    ctx.beginPath(); rr(ctx, -50, 58, 100, 30, 6); fs(ctx, '#2b2540');
    ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3); ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-40, -66); ctx.quadraticCurveTo(-40, -20, -20, 0); ctx.stroke(); ctx.restore();
    ctx.fillStyle = INCHIOSTRO; ctx.font = FONT(44, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', 0, -38);
  },
  // Tastiera meccanica RGB
  tastiera(ctx, { t = 0 }) {
    ctx.beginPath(); rr(ctx, -100, -48, 200, 96, 14); fs(ctx, '#2b2540');
    ctx.save(); ctx.lineWidth = 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
      const h = (c * 40 + r * 30 + t * 120) % 360;
      ctx.fillStyle = `hsl(${h},85%,62%)`; ctx.beginPath(); rr(ctx, -88 + c * 22, -36 + r * 22, 18, 18, 4); ctx.fill(); }
    ctx.fillStyle = '#d9d6e6'; ctx.beginPath(); rr(ctx, -50, 30, 100, 12, 4); ctx.fill(); ctx.restore();
  },
  // Mouse da gaming con rotella e luce
  mouse(ctx, { t = 0, accento = ACCENTO }) {
    ctx.save(); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -78); ctx.bezierCurveTo(10, -110, 50, -100, 60, -120); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(0, -78); ctx.bezierCurveTo(70, -78, 70, -20, 66, 30); ctx.bezierCurveTo(60, 90, 30, 100, 0, 100);
    ctx.bezierCurveTo(-30, 100, -60, 90, -66, 30); ctx.bezierCurveTo(-70, -20, -70, -78, 0, -78); ctx.closePath(); fs(ctx, '#2b2540');
    ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(0, -14); ctx.moveTo(-66, -14); ctx.quadraticCurveTo(0, -4, 66, -14); ctx.stroke();
    ctx.beginPath(); rr(ctx, -8, -60, 16, 30, 8); fs(ctx, accento);
    ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); ctx.strokeStyle = accento; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, 70); ctx.quadraticCurveTo(0, 86, 40, 70); ctx.stroke(); ctx.restore();
  },
  // Squadra: tre giocatori (quello al centro davanti)
  squadra(ctx, { t = 0, accento = ACCENTO }) {
    const gioc = (x, y, sc, col) => { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.beginPath(); ctx.moveTo(-50, 70); ctx.quadraticCurveTo(-50, 10, 0, 10); ctx.quadraticCurveTo(50, 10, 50, 70); ctx.closePath(); fs(ctx, col);
      ctx.beginPath(); ctx.arc(0, -24, 30, 0, 7); fs(ctx, '#f2c6a4'); ctx.restore(); };
    const b = Math.sin(t * 4) * 4;
    gioc(-62, 0 - b, 0.8, '#7c3aed'); gioc(62, 0 + b, 0.8, '#7c3aed'); gioc(0, 18, 1.05, accento);
  },
  // Tabellone del torneo (bracket a eliminazione)
  bracket(ctx, { t = 0, accento = ACCENTO }) {
    ctx.save(); ctx.lineWidth = 7; ctx.strokeStyle = '#d9d6e6';
    const y = [-75, -25, 25, 75];
    for (let k = 0; k < 2; k++) { const a = y[k * 2], b = y[k * 2 + 1], m = (a + b) / 2;
      ctx.beginPath(); ctx.moveTo(-70, a); ctx.lineTo(-30, a); ctx.lineTo(-30, b); ctx.lineTo(-70, b); ctx.moveTo(-30, m); ctx.lineTo(10, m); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(10, -50); ctx.lineTo(10, 50); ctx.moveTo(10, 0); ctx.lineTo(50, 0); ctx.stroke(); ctx.restore(); stileIcona(ctx);
    for (const v of y) { ctx.beginPath(); rr(ctx, -100, v - 14, 34, 28, 6); fs(ctx, '#2b2540'); }
    for (const v of [-50, 50]) { ctx.beginPath(); rr(ctx, -12, v - 14, 34, 28, 6); fs(ctx, '#7c3aed'); }
    const s = 1 + 0.08 * Math.sin(t * 5);
    ctx.save(); ctx.translate(76, 0); ctx.scale(s, s); ctx.beginPath(); rr(ctx, -26, -22, 52, 44, 8); fs(ctx, ORO);
    ctx.fillStyle = INCHIOSTRO; ctx.font = FONT(30, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1°', 0, 2); ctx.restore();
  },
  // Fulmine (energia, clutch, partita veloce)
  fulmine(ctx, { accento = '#facc15' }) {
    ctx.beginPath(); ctx.moveTo(22, -100); ctx.lineTo(-60, 14); ctx.lineTo(-6, 14); ctx.lineTo(-26, 100); ctx.lineTo(62, -18); ctx.lineTo(8, -18); ctx.closePath(); fs(ctx, accento);
  },
  // Mirino (headshot, precisione)
  mirino(ctx, { t = 0, accento = '#ef4444' }) {
    ctx.save(); ctx.rotate(t * 0.6);
    ctx.lineWidth = 16; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(0, 0, 72, 0, 7); ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = accento; ctx.stroke();
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.lineWidth = 14; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(0, -40); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = accento; ctx.stroke(); }
    ctx.restore(); stileIcona(ctx);
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); fs(ctx, accento);
  },
  // Monitor con partita in corso (barre vita)
  monitor(ctx, { t = 0, accento = ACCENTO }) {
    ctx.beginPath(); rr(ctx, -20, 62, 40, 26, 4); fs(ctx, '#2b2540');
    ctx.beginPath(); rr(ctx, -60, 86, 120, 14, 6); fs(ctx, '#2b2540');
    ctx.beginPath(); rr(ctx, -100, -82, 200, 146, 14); fs(ctx, '#2b2540');
    ctx.beginPath(); rr(ctx, -86, -68, 172, 118, 6); ctx.fillStyle = '#1e1b4b'; ctx.fill();
    const v1 = 0.5 + 0.4 * Math.sin(t * 2), v2 = 0.5 + 0.4 * Math.cos(t * 1.7);
    ctx.fillStyle = '#22c55e'; ctx.fillRect(-76, -58, 64 * v1, 10); ctx.fillStyle = '#ef4444'; ctx.fillRect(12, -58, 64 * v2, 10);
    ctx.fillStyle = accento; ctx.font = FONT(40, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('VS', 0, 4);
  },
  // Bollino LIVE (diretta, stream)
  live(ctx, { t = 0 }) {
    ctx.beginPath(); rr(ctx, -96, -44, 192, 88, 22); fs(ctx, '#ef4444');
    ctx.save(); ctx.globalAlpha = 0.4 + 0.6 * (Math.sin(t * 6) > 0 ? 1 : 0); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-56, 0, 14, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = FONT(52, 900); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('LIVE', -32, 3);
  },
  // Il simbolo TeamUp (doppio chevron) in un esagono
  simbolo(ctx, { accento = ACCENTO }) {
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(Math.cos(a) * 96, Math.sin(a) * 96); } ctx.closePath(); fs(ctx, PRIMARIO);
    simbolo(ctx, 0, 0, 120, accento, 16);
  },
};
export const NOMI_ICONE = Object.keys(ICONE);

export function icona(ctx, nome, cx, cy, s, { t = 0, accento = ACCENTO, k = 1, ruota = 0 } = {}) {
  if (k <= 0) return;
  const f = ICONE[nome] || ICONE.stella;
  ctx.save(); ctx.translate(cx, cy); const sc = (s / 200) * pop(k); ctx.scale(sc, sc); ctx.rotate(ruota + (1 - easeOut(k)) * 0.4);
  ctx.globalAlpha *= clamp(k * 2);
  stileIcona(ctx); f(ctx, { t, accento });
  ctx.restore();
}

// Cartello finale (CTA): logo TeamUp grande, testo e bottone che viene toccato
// Cartello "salva e invia" (CTA delle curiosità): testo grande, poi la mano tocca Salva (il segnalibro si
// riempie) e Invia (l'aeroplanino vola via). Il testo è la CTA detta dalla voce.
function iconaSalva(ctx, pieno, colore) {
  ctx.beginPath(); ctx.moveTo(-30, -42); ctx.lineTo(30, -42); ctx.lineTo(30, 44); ctx.lineTo(0, 22); ctx.lineTo(-30, 44); ctx.closePath();
  ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.strokeStyle = colore; if (pieno) { ctx.fillStyle = colore; ctx.fill(); } ctx.stroke();
}
function iconaInvia(ctx, colore) {
  ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(44, -40); ctx.lineTo(18, 42); ctx.lineTo(4, 8); ctx.closePath();
  ctx.moveTo(4, 8); ctx.lineTo(44, -40);
  ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.strokeStyle = colore; ctx.stroke();
}
export function finaleCondividi(ctx, u, { testo: frase = '', accento = ACCENTO, t = 0 } = {}) {
  const k = easeOut(u / 0.4);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2 - 150, 190); ctx.scale(0.375, 0.375); logo(ctx, 800, 600, { colore: accento, slogan: '' }); ctx.restore();
  testo(ctx, frase, W / 2, 580, { size: 96, peso: 900, colore: '#fff', maxW: 900, parole: entra(u, 0.05, 0.6), evidenzia: 'salvalo mandalo', accento, ombra: true });
  const bottoni = [{ x: 360, nome: 'Salva', tap: 1.0 }, { x: 720, nome: 'Invia', tap: 1.7 }];
  bottoni.forEach((b, n) => {
    const kb = entra(u, 0.35 + n * 0.15, 0.35); if (kb <= 0) return;
    const premuto = u > b.tap, tap = clamp((u - b.tap) / 0.2);
    ctx.save(); ctx.translate(b.x, 860); const sc = 1.3 * pop(kb) * (1 - 0.1 * Math.sin(Math.PI * tap)); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(8,4,20,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = premuto ? accento : CHIARO; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
    if (premuto) {                                         // onda di conferma
      const v = clamp((u - b.tap) / 0.7); ctx.save(); ctx.globalAlpha = 1 - v; ctx.strokeStyle = accento; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 92 + v * 90, 0, 7); ctx.stroke(); ctx.restore();
    }
    if (n === 0) iconaSalva(ctx, premuto, PRIMARIO);
    else { const v = premuto ? easeOut(clamp((u - b.tap) / 0.6)) : 0;
      ctx.save(); ctx.translate(v * 160, -v * 220); ctx.rotate(-v * 0.4); ctx.globalAlpha *= 1 - v * 0.9; iconaInvia(ctx, PRIMARIO); ctx.restore();
      if (v > 0.6) { ctx.save(); ctx.globalAlpha *= clamp((v - 0.6) / 0.3); iconaInvia(ctx, PRIMARIO); ctx.restore(); } }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = kb; ctx.fillStyle = '#fff'; ctx.font = FONT(50, 900); ctx.textAlign = 'center'; ctx.fillText(b.nome, b.x, 1045); ctx.restore();
  });
  // mano: va su Salva, tocca, poi su Invia, tocca
  if (u > 0.6 && u < 2.6) {
    const a = clamp((u - 0.6) / 0.35), c = clamp((u - 1.25) / 0.35);
    const x = mix2(mix2(W / 2 + 260, 395, easeOut(a)), 755, easeOut(c)), y = mix2(1100, 905, easeOut(a));
    const tocco = Math.max(Math.sin(Math.PI * clamp((u - 1.0) / 0.2)), Math.sin(Math.PI * clamp((u - 1.7) / 0.2)));
    mano(ctx, x, y, 120, Math.max(0, tocco));
  }
}
const mix2 = (a, b, k) => a + (b - a) * k;

// Cartello "commenta" (CTA dei quiz): testo grande, poi una barra commento in stile Instagram in cui si
// scrive "Per me è la…", la mano tocca Pubblica e salgono fumetti A / B / C (come i commenti che arrivano).
export function finaleCommenta(ctx, u, { testo: frase = '', accento = ACCENTO, t = 0 } = {}) {
  const k = easeOut(u / 0.4);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2 - 150, 190); ctx.scale(0.375, 0.375); logo(ctx, 800, 600, { colore: accento, slogan: '' }); ctx.restore();
  testo(ctx, frase, W / 2, 560, { size: 92, peso: 900, colore: '#fff', maxW: 900, parole: entra(u, 0.05, 0.6), evidenzia: 'commenti A B C', accento, ombra: true });
  const kb = entra(u, 0.4, 0.35);
  if (kb > 0) {
    const scritto = 'Per me è la…', n = Math.floor(clamp((u - 0.7) / 0.7) * scritto.length), tap = 1.65, premuto = u > tap;
    ctx.save(); ctx.translate(W / 2, 880); ctx.scale(pop(kb), pop(kb));
    ctx.shadowColor = 'rgba(8,4,20,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = CHIARO; rr(ctx, -440, -70, 880, 140, 70); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); ctx.translate(-360, 0); ctx.scale(0.42, 0.42); icona(ctx, 'commento', 0, 0, 200, { accento }); ctx.restore();
    ctx.font = FONT(54, 800); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = n ? PRIMARIO : 'rgba(91,33,182,0.45)';
    const str = n ? scritto.slice(0, n) : 'Commenta…'; ctx.fillText(str, -300, 2);
    if (n && n < scritto.length && Math.sin(t * 14) > 0) { const w = ctx.measureText(str).width; ctx.fillRect(-300 + w + 6, -28, 5, 56); }
    const tb = clamp((u - tap) / 0.2), sb = 1 - 0.1 * Math.sin(Math.PI * tb);
    ctx.save(); ctx.translate(300, 0); ctx.scale(sb, sb); pillola(ctx, premuto ? '✓' : 'Pubblica', 0, 0, { size: 40, fondo: premuto ? accento : PRIMARIO, colore: premuto ? PRIMARIO : '#fff', h: 92, w: 220 }); ctx.restore();
    ctx.restore();
    // fumetti A / B / C che salgono dopo il tocco
    ['A', 'B', 'C'].forEach((l, j) => {
      const v = clamp((u - tap - 0.15 - j * 0.22) / 1.6); if (v <= 0) return;
      const x = W / 2 + (j - 1) * 270 + Math.sin(v * 6 + j) * 24, y = 1060 + 60 * (1 - easeOut(v));          // restano sopra i sottotitoli
      ctx.save(); ctx.globalAlpha = clamp(v * 5); ctx.translate(x, y); const sc = pop(clamp(v * 3)); ctx.scale(sc, sc);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-30, 52); ctx.lineTo(-50, 92); ctx.lineTo(4, 66); ctx.fill();
      ctx.fillStyle = PRIMARIO; ctx.font = FONT(76, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l + '!', 0, 4);
      ctx.restore();
    });
    // mano: arriva da destra sotto la barra (non copre il testo) e tocca Pubblica
    if (u > 0.9 && u < 2.5) {
      const a = easeOut(clamp((u - 0.9) / 0.5)), tocco = Math.sin(Math.PI * clamp((u - tap + 0.1) / 0.25));
      mano(ctx, mix2(W + 80, W / 2 + 330, a), mix2(1150, 935, a), 120, Math.max(0, tocco));
    }
  }
}

// Cartello finale per azione della CTA (formati.yaml → cta_azione)
export function finale(ctx, u, opz = {}) {
  if (opz.azione === 'salva_condividi') return finaleCondividi(ctx, u, opz);
  if (opz.azione === 'commenta') return finaleCommenta(ctx, u, opz);
  return finaleBottone(ctx, u, opz);
}

export function finaleBottone(ctx, u, { testo: frase = '', bottone = 'Segui @teamupesportsofficial', accento = ACCENTO, t = 0 } = {}) {
  const k = easeOut(u / 0.6);
  ctx.save(); ctx.globalAlpha = k;
  ctx.translate(W / 2, 450); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-W / 2, -450);
  ctx.save(); ctx.translate(W / 2 - 360, 190); ctx.scale(0.9, 0.9); logo(ctx, 800, 600, { colore: accento }); ctx.restore();
  ctx.restore();
  testo(ctx, frase, W / 2, 800, { size: 56, peso: 800, colore: '#fff', maxW: 880, parole: entra(u, 0.3, 1.0), evidenzia: 'TeamUp', accento });
  // bottone: compare, viene toccato (~1.6 s), diventa "✓"
  const kb = entra(u, 0.7, 0.4), tap = clamp((u - 1.5) / 0.25), dopo = u > 1.75;
  if (kb > 0) {
    ctx.save(); ctx.translate(W / 2, 925); const s = pop(kb) * (1 - 0.08 * Math.sin(Math.PI * tap)); ctx.scale(s, s);
    if (dopo) { ctx.globalAlpha = clamp((u - 1.75) / 0.6); ctx.strokeStyle = accento; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 60 + (u - 1.75) * 260, 0, 7); ctx.globalAlpha = Math.max(0, 1 - (u - 1.75) / 0.8); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.font = FONT(44, 800); const larg = ctx.measureText(bottone).width + 72;
    pillola(ctx, dopo ? '✓ Segui già' : bottone, 0, 0, { size: 44, fondo: dopo ? '#fff' : accento, colore: PRIMARIO, h: 104, w: larg });
    ctx.restore();
    const mx = W / 2 + 330 - 90 * easeOut(clamp((u - 0.9) / 0.6)), my = 1020 - 70 * easeOut(clamp((u - 0.9) / 0.6));
    if (u > 0.9 && u < 3.2) mano(ctx, mx, my, 120, tap * (1 - clamp((u - 1.8) / 0.3)));
  }
}
