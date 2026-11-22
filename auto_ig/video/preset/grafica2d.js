// PRESET — Grafica 2D Cintre (resa "2d" dei formati): sfondi, card, testi, icone vettoriali di moda,
// animazioni. Si disegna su un canvas 2D nello spazio 1080x1920 (il canvas può essere 2x per la qualità alta).
//
//   const tela = tela2d(THREE, renderer)   -> { ctx, scene, camera, inizia(), fine() }  (piano a schermo intero)
//   sfondo(ctx, t, { colore, accento })     icona(ctx, 'tacco', cx, cy, 300, { t })
//   testo(ctx, 'Il tubino nero', 540, 900, { size: 76, colore: SCURO, evidenzia: 'nero', accento })
//   card(ctx, x, y, w, h)                   pop(u), entra(u, ritardo, durata)
// Icone disponibili: vedi ICONE (nomi elencati anche in auto_ig/formati.yaml → icone_2d).
import { BORDEAUX, CIPRIA, SCURO, CREMA, gruccia, figurino, logo, OUTFITS } from './brand.js';

export const W = 1080, H = 1920;
export const ORO = '#d4af37', DENIM = '#3b5b8c', INCHIOSTRO = '#2a0f19';
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

export function card(ctx, x, y, w, h, { r = 48, colore = CREMA, ombra = true } = {}) {
  ctx.save();
  if (ombra) { ctx.shadowColor = 'rgba(20,4,10,0.38)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22; }
  ctx.fillStyle = colore; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.restore();
}

// Va a capo dentro maxW; `evidenzia` = parole (stringa) colorate con `accento`. Ritorna l'altezza usata.
// Le parole appaiono una alla volta se `parole` (0..1) < 1.
export function testo(ctx, str, x, y, { size = 72, peso = 800, colore = '#fff', maxW = 860, evidenzia = '', accento = CIPRIA,
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
export function pillola(ctx, str, cx, cy, { size = 40, fondo = CIPRIA, colore = BORDEAUX, padX = 36, h = null, peso = 800, w = null, font = null } = {}) {
  ctx.save(); ctx.font = font || FONT(size, peso);
  const ww = w || ctx.measureText(str).width + padX * 2, hh = h || size * 1.9;
  ctx.fillStyle = fondo; rr(ctx, cx - ww / 2, cy - hh / 2, ww, hh, hh / 2); ctx.fill();
  ctx.fillStyle = colore; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, cx, cy + size * 0.04);
  ctx.restore(); return ww;
}

// --- Sfondo: tinta del brand con luce morbida, grucce che salgono piano, coriandoli di luce ------
export function sfondo(ctx, t, { colore = BORDEAUX, accento = CIPRIA, chiaro = false } = {}) {
  ctx.save();
  ctx.fillStyle = colore; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.3, 60, W * 0.5, H * 0.35, H * 0.75);
  g.addColorStop(0, chiaro ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // righe diagonali sottilissime (texture "tessuto")
  ctx.globalAlpha = 0.05; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  for (let x = -H; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
  // grucce che fluttuano
  for (let i = 0; i < 11; i++) {
    const s = 70 + hash(i) * 90, vel = 18 + hash(i + 7) * 22;
    const y = ((hash(i + 3) * (H + 300) - t * vel) % (H + 300) + H + 300) % (H + 300) - 150;
    const x = hash(i + 11) * W + Math.sin(t * 0.5 + i) * 25;
    ctx.globalAlpha = 0.09 + hash(i + 5) * 0.07;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.4 + i * 2) * 0.25);
    gruccia(ctx, 0, 0, s, accento, 5); ctx.restore();
  }
  ctx.restore();
}

// Intestazione in alto: logo piccolo + etichetta del formato, e i pallini di avanzamento.
export function intestazione(ctx, etichetta, { passi = 0, attuale = -1, accento = CIPRIA, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha;
  gruccia(ctx, 112, 196, 62, accento, 5);
  ctx.fillStyle = '#fff'; ctx.font = '700 46px "DejaVu Serif", serif'; ctx.textBaseline = 'middle'; ctx.fillText('Cintre', 160, 196);
  ctx.font = FONT(30, 700); ctx.fillStyle = accento; ctx.fillText(etichetta.toUpperCase(), 330, 199);
  for (let k = 0; k < passi; k++) {
    const x = W - 90 - (passi - 1 - k) * 46, on = k <= attuale;
    ctx.fillStyle = on ? accento : 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(x, 196, k === attuale ? 15 : 11, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// Numero in un cerchio (curiosità n, consiglio n)
export function numero(ctx, n, cx, cy, r, { fondo = BORDEAUX, colore = CIPRIA, k = 1 } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(pop(k), pop(k)); ctx.rotate((1 - easeOut(k)) * -0.6);
  ctx.shadowColor = 'rgba(20,4,10,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  ctx.fillStyle = fondo; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = colore; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, 7); ctx.stroke();
  ctx.fillStyle = colore; ctx.font = SERIF(r * 1.15, 'italic 700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 0, r * 0.06); ctx.restore();
}

// Freccia curva tra due punti (dal capo alla spiegazione); k = quanto è disegnata
export function freccia(ctx, x1, y1, x2, y2, { colore = BORDEAUX, k = 1, lw = 9 } = {}) {
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
function cucitura(ctx, disegna, colore = '#e9b44c') {
  ctx.save(); ctx.setLineDash([9, 8]); ctx.lineWidth = 4; ctx.strokeStyle = colore; disegna(); ctx.stroke(); ctx.restore();
}
function rivetto(ctx, x, y) { ctx.save(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fillStyle = '#e0b04a'; ctx.fill(); ctx.stroke(); ctx.restore(); }

export const ICONE = {
  // Tasca destra dei jeans con il taschino piccolo (evidenziato) e i rivetti
  taschino(ctx, { t = 0, accento = CIPRIA }) {
    ctx.beginPath(); ctx.moveTo(-95, -92); ctx.lineTo(95, -92); ctx.lineTo(95, 100); ctx.quadraticCurveTo(0, 88, -95, 100); ctx.closePath();
    fs(ctx, DENIM);
    ctx.beginPath(); ctx.moveTo(-95, -92); ctx.lineTo(95, -92); ctx.lineTo(95, -62); ctx.lineTo(-95, -62); ctx.closePath(); fs(ctx, '#33507c');
    cucitura(ctx, () => { ctx.beginPath(); ctx.moveTo(-90, -54); ctx.lineTo(90, -54); });
    // tasca grande (apertura curva) e taschino
    ctx.beginPath(); ctx.moveTo(-95, -62); ctx.quadraticCurveTo(-30, -55, -10, 40); ctx.lineTo(-95, 40); ctx.closePath(); fs(ctx, '#2f4b75');
    cucitura(ctx, () => { ctx.beginPath(); ctx.moveTo(-86, -48); ctx.quadraticCurveTo(-36, -42, -20, 34); });
    const gl = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.save(); ctx.shadowColor = accento; ctx.shadowBlur = 25 + gl * 25;
    ctx.beginPath(); rr(ctx, 15, -50, 58, 62, 6); fs(ctx, '#4d72a8'); ctx.restore();
    ctx.lineWidth = L; ctx.beginPath(); rr(ctx, 15, -50, 58, 62, 6); ctx.stroke();
    cucitura(ctx, () => { ctx.beginPath(); ctx.moveTo(21, -40); ctx.lineTo(67, -40); });
    rivetto(ctx, -12, 36); rivetto(ctx, 15, -50); rivetto(ctx, 73, -50);
    ctx.save(); ctx.strokeStyle = accento; ctx.lineWidth = 6; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.arc(44, -19, 58, 0, 7); ctx.stroke(); ctx.restore();
  },
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
  // Décolleté con tacco a spillo (di profilo)
  tacco(ctx, { accento = CIPRIA }) {
    ctx.beginPath();
    ctx.moveTo(-82, -38); ctx.quadraticCurveTo(-60, -20, -22, 2); ctx.quadraticCurveTo(30, 18, 58, 22);
    ctx.quadraticCurveTo(98, 30, 100, 56); ctx.quadraticCurveTo(100, 70, 82, 70); ctx.lineTo(28, 70);
    ctx.quadraticCurveTo(-20, 66, -52, 22); ctx.lineTo(-74, 14); ctx.quadraticCurveTo(-92, -10, -82, -38); ctx.closePath();
    fs(ctx, BORDEAUX);
    ctx.beginPath(); ctx.moveTo(-74, 14); ctx.lineTo(-52, 20); ctx.lineTo(-58, 96); ctx.lineTo(-68, 96); ctx.closePath(); fs(ctx, '#3b0d1e');
    ctx.save(); ctx.strokeStyle = accento; ctx.lineWidth = 5; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(-64, -22); ctx.quadraticCurveTo(-30, 0, 10, 12); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(28, 70); ctx.lineTo(84, 70); ctx.lineWidth = 9; ctx.strokeStyle = '#c0392b'; ctx.stroke();
  },
  // Staffa da cavaliere con cinghia di cuoio
  staffa(ctx) {
    ctx.beginPath(); rr(ctx, -16, -100, 32, 70, 6); fs(ctx, '#8b5a2b');
    ctx.save(); ctx.strokeStyle = '#e9b44c'; ctx.lineWidth = 4; ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(-7, -94); ctx.lineTo(-7, -36); ctx.moveTo(7, -94); ctx.lineTo(7, -36); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-20, -30); ctx.quadraticCurveTo(-92, 0, -78, 76); ctx.lineTo(-58, 76);
    ctx.quadraticCurveTo(-66, 14, -10, -10); ctx.lineTo(10, -10); ctx.quadraticCurveTo(66, 14, 58, 76); ctx.lineTo(78, 76);
    ctx.quadraticCurveTo(92, 0, 20, -30); ctx.closePath(); fs(ctx, '#b9c1c9');
    ctx.beginPath(); rr(ctx, -90, 68, 180, 26, 8); fs(ctx, '#9aa3ad');
    ctx.save(); ctx.lineWidth = 3; for (let x = -70; x <= 70; x += 20) { ctx.beginPath(); ctx.moveTo(x, 73); ctx.lineTo(x, 89); ctx.stroke(); } ctx.restore();
  },
  // Tubino nero appeso a una gruccia Cintre
  tubino(ctx, { accento = CIPRIA }) {
    gruccia(ctx, 0, -62, 110, ORO, 6);
    ctx.beginPath();
    ctx.moveTo(-26, -66); ctx.lineTo(-40, -30); ctx.quadraticCurveTo(-48, 0, -34, 18); ctx.quadraticCurveTo(-46, 60, -52, 100);
    ctx.lineTo(52, 100); ctx.quadraticCurveTo(46, 60, 34, 18); ctx.quadraticCurveTo(48, 0, 40, -30); ctx.lineTo(26, -66);
    ctx.quadraticCurveTo(14, -44, 0, -42); ctx.quadraticCurveTo(-14, -44, -26, -66); ctx.closePath();
    fs(ctx, '#151515');
    ctx.save(); ctx.strokeStyle = accento; ctx.globalAlpha = 0.5; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-36, 18); ctx.quadraticCurveTo(0, 26, 36, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20, 40); ctx.quadraticCurveTo(-26, 70, -30, 92); ctx.stroke(); ctx.restore();
    // filo di perle
    ctx.save(); ctx.lineWidth = 2; for (let k = 0; k <= 10; k++) { const a = Math.PI * (0.15 + 0.7 * k / 10);
      ctx.beginPath(); ctx.arc(Math.cos(a) * 30, -46 + Math.sin(a) * 22, 6, 0, 7); ctx.fillStyle = '#fbf6ee'; ctx.fill(); ctx.stroke(); } ctx.restore();
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
  lampadina(ctx, { t = 0, accento = CIPRIA }) {
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
    gruccia(ctx, 0, -10, 70, BORDEAUX, 6);
  },
  domanda(ctx, { accento = CIPRIA }) {
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); fs(ctx, accento);
    ctx.fillStyle = BORDEAUX; ctx.font = SERIF(150, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 8);
  },
  commento(ctx, { t = 0 }) {
    ctx.beginPath(); rr(ctx, -96, -78, 192, 132, 40); ctx.moveTo(-40, 50); ctx.lineTo(-62, 96); ctx.lineTo(-2, 52); fs(ctx, CREMA);
    for (let k = 0; k < 3; k++) { const s = 1 + 0.3 * Math.max(0, Math.sin(t * 6 - k * 0.8));
      ctx.fillStyle = BORDEAUX; ctx.beginPath(); ctx.arc(-44 + k * 44, -12, 13 * s, 0, 7); ctx.fill(); }
  },
  cuore(ctx, { accento = '#e8435a' }) {
    ctx.beginPath(); ctx.moveTo(0, 86); ctx.bezierCurveTo(-120, 0, -80, -96, 0, -40); ctx.bezierCurveTo(80, -96, 120, 0, 0, 86); fs(ctx, accento);
  },
  stella(ctx, { accento = ORO }) {
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 40 : 92, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); fs(ctx, accento);
  },
  gruccia(ctx, { accento = CIPRIA }) { gruccia(ctx, 0, 10, 190, accento, 12); },
  telefono(ctx, { accento = CIPRIA }) {
    ctx.beginPath(); rr(ctx, -62, -100, 124, 200, 24); fs(ctx, '#1b1b1b');
    ctx.beginPath(); rr(ctx, -50, -84, 100, 168, 12); ctx.fillStyle = BORDEAUX; ctx.fill();
    gruccia(ctx, 0, -10, 70, accento, 6);
    ctx.fillStyle = accento; ctx.font = '700 22px "DejaVu Serif", serif'; ctx.textAlign = 'center'; ctx.fillText('Cintre', 0, 50);
  },
  armadio(ctx, { accento = CIPRIA }) {
    ctx.beginPath(); rr(ctx, -84, -100, 168, 196, 10); fs(ctx, '#c49a6c');
    ctx.beginPath(); ctx.moveTo(0, -96); ctx.lineTo(0, 92); ctx.stroke();
    ctx.beginPath(); ctx.arc(-12, 0, 6, 0, 7); ctx.arc(12, 0, 6, 0, 7); ctx.fillStyle = ORO; ctx.fill();
    ctx.beginPath(); rr(ctx, -70, -86, 60, 22, 4); ctx.strokeStyle = accento; ctx.lineWidth = 4; ctx.stroke(); stileIcona(ctx);
  },
  outfit(ctx) { figurino(ctx, 0, -100, 200, OUTFITS[0]); },

  // --- Curiosità "capi nati in guerra" / "nomi nascosti" (2026-11-14) ---
  // Trench doppiopetto color cammello con cintura e spalline
  trench(ctx) {
    ctx.beginPath(); ctx.moveTo(-30, -92); ctx.lineTo(-70, -78); ctx.quadraticCurveTo(-84, -40, -80, 0); ctx.lineTo(-92, 98); ctx.lineTo(92, 98);
    ctx.lineTo(80, 0); ctx.quadraticCurveTo(84, -40, 70, -78); ctx.lineTo(30, -92); ctx.lineTo(0, -40); ctx.closePath(); fs(ctx, '#c8a26b');
    ctx.beginPath(); ctx.moveTo(-30, -92); ctx.lineTo(-8, -30); ctx.lineTo(-30, -20); ctx.lineTo(-48, -74); ctx.closePath(); fs(ctx, '#b48d57');   // revers
    ctx.beginPath(); ctx.moveTo(30, -92); ctx.lineTo(8, -30); ctx.lineTo(30, -20); ctx.lineTo(48, -74); ctx.closePath(); fs(ctx, '#b48d57');
    ctx.beginPath(); rr(ctx, -84, 8, 168, 20, 4); fs(ctx, '#a07a45');                                   // cintura
    ctx.beginPath(); rr(ctx, -14, 4, 28, 28, 4); ctx.lineWidth = 5; ctx.stroke(); stileIcona(ctx);
    for (const [x, y] of [[-22, -12], [22, -12], [-22, 50], [22, 50]]) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); fs(ctx, '#5a3d1e'); }
    for (const s of [-1, 1]) { ctx.beginPath(); rr(ctx, s * 66 - 16, -86, 32, 12, 4); fs(ctx, '#a07a45'); } // spalline
    ctx.save(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(0, 98); ctx.stroke(); ctx.restore();
  },
  // Elmetto da soldato (Prima guerra mondiale, forma a scodella)
  elmetto(ctx) {
    ctx.beginPath(); ctx.ellipse(0, 30, 100, 24, 0, 0, 7); fs(ctx, '#5f6b4e');
    ctx.beginPath(); ctx.moveTo(-64, 26); ctx.quadraticCurveTo(-60, -70, 0, -72); ctx.quadraticCurveTo(60, -70, 64, 26); ctx.closePath(); fs(ctx, '#6f7d5a');
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(-6, -6, 46, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-40, 40); ctx.quadraticCurveTo(0, 96, 40, 40); ctx.lineWidth = 5; ctx.strokeStyle = '#8b5a2b'; ctx.stroke(); stileIcona(ctx);
  },
  // Cardigan aperto con bottoni
  cardigan(ctx, { accento = CIPRIA }) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1);
      ctx.beginPath(); ctx.moveTo(6, -86); ctx.lineTo(44, -92); ctx.quadraticCurveTo(86, -80, 96, -30); ctx.lineTo(100, 70); ctx.lineTo(74, 74);
      ctx.lineTo(70, -10); ctx.lineTo(66, 96); ctx.lineTo(6, 96); ctx.closePath(); fs(ctx, '#d98e73');
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-6, -86); ctx.lineTo(0, 20); ctx.lineTo(6, -86); ctx.closePath(); fs(ctx, '#fffaf0');
    ctx.save(); ctx.lineWidth = 3; ctx.globalAlpha = 0.5;
    for (let y = -60; y < 90; y += 16) { ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(-12, y); ctx.moveTo(12, y); ctx.lineTo(60, y); ctx.stroke(); }
    ctx.restore();
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-14, 30 + k * 18, 6, 0, 7); fs(ctx, accento); }
    for (const y of [86, 92]) { ctx.beginPath(); ctx.moveTo(-66, y); ctx.lineTo(66, y); ctx.lineWidth = 3; ctx.stroke(); } stileIcona(ctx);
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
  // Bikini a pois su filo
  bikini(ctx, { accento = CIPRIA }) {
    const pois = (x, y) => { ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.restore(); };
    ctx.save(); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-96, -86); ctx.quadraticCurveTo(0, -60, 96, -86); ctx.stroke(); ctx.restore();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 8, -40); ctx.quadraticCurveTo(s * 20, -82, s * 44, -82); ctx.quadraticCurveTo(s * 78, -64, s * 80, -14); ctx.quadraticCurveTo(s * 40, -4, s * 8, -40); fs(ctx, '#e8435a'); pois(s * 40, -50); pois(s * 58, -28); }
    ctx.beginPath(); ctx.moveTo(-70, 26); ctx.quadraticCurveTo(0, 40, 70, 26); ctx.quadraticCurveTo(46, 66, 18, 92); ctx.lineTo(-18, 92); ctx.quadraticCurveTo(-46, 66, -70, 26); fs(ctx, '#e8435a');
    pois(-30, 48); pois(10, 60); pois(36, 42);
    ctx.save(); ctx.strokeStyle = accento; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-70, 26); ctx.lineTo(-96, 20); ctx.moveTo(70, 26); ctx.lineTo(96, 20); ctx.stroke(); ctx.restore();
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
  // Cravatta a righe
  cravatta(ctx, { accento = CIPRIA }) {
    ctx.beginPath(); ctx.moveTo(-22, -96); ctx.lineTo(22, -96); ctx.lineTo(14, -66); ctx.lineTo(-14, -66); ctx.closePath(); fs(ctx, BORDEAUX);
    ctx.beginPath(); ctx.moveTo(-14, -66); ctx.lineTo(14, -66); ctx.lineTo(42, 66); ctx.lineTo(0, 100); ctx.lineTo(-42, 66); ctx.closePath(); fs(ctx, BORDEAUX);
    ctx.save(); ctx.clip(); ctx.strokeStyle = accento; ctx.lineWidth = 9;
    for (let y = -80; y < 140; y += 34) { ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(60, y - 40); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); ctx.moveTo(-14, -66); ctx.lineTo(14, -66); ctx.lineTo(42, 66); ctx.lineTo(0, 100); ctx.lineTo(-42, 66); ctx.closePath(); ctx.stroke();
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
  // Sneaker di profilo, suola di gomma bianca
  sneaker(ctx, { accento = CIPRIA }) {
    ctx.beginPath(); ctx.moveTo(-96, 40); ctx.lineTo(-92, -30); ctx.quadraticCurveTo(-60, -50, -40, -40); ctx.lineTo(-10, -20);
    ctx.quadraticCurveTo(40, 0, 82, 14); ctx.quadraticCurveTo(100, 22, 98, 40); ctx.closePath(); fs(ctx, '#ffffff');
    ctx.beginPath(); ctx.moveTo(-92, -30); ctx.quadraticCurveTo(-60, -50, -40, -40); ctx.lineTo(-30, 10); ctx.lineTo(-94, 10); ctx.closePath(); fs(ctx, accento);
    ctx.beginPath(); rr(ctx, -100, 40, 202, 26, 12); fs(ctx, '#f3ead8');
    ctx.save(); ctx.lineWidth = 3; for (let x = -88; x < 96; x += 14) { ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x + 6, 58); ctx.stroke(); } ctx.restore();
    ctx.save(); ctx.lineWidth = 4; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-26 + k * 14, -16 + k * 6); ctx.lineTo(-14 + k * 14, -28 + k * 6); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); ctx.moveTo(30, 6); ctx.quadraticCurveTo(50, 14, 70, 14); ctx.lineWidth = 5; ctx.stroke(); stileIcona(ctx);
  },
  // Pugnale (stiletto)
  pugnale(ctx, { t = 0 }) {
    ctx.save(); ctx.rotate(-0.5);
    ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(0, -108); ctx.lineTo(10, 10); ctx.closePath(); fs(ctx, '#e3e9ee');
    ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -80); ctx.stroke(); ctx.restore();
    ctx.beginPath(); rr(ctx, -40, 10, 80, 14, 7); fs(ctx, ORO);
    ctx.beginPath(); rr(ctx, -10, 24, 20, 56, 8); fs(ctx, BORDEAUX);
    ctx.beginPath(); ctx.arc(0, 88, 12, 0, 7); fs(ctx, ORO);
    ctx.restore();
  },
  // Impronte silenziose + "shh"
  silenzio(ctx, { t = 0, accento = CIPRIA }) {
    const passo = (x, y, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 30, 0, 0, 7); fs(ctx, '#fffaf0');
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-10 + k * 7, -38 - (k === 0 ? 2 : 0), 5, 0, 7); fs(ctx, '#fffaf0'); } ctx.restore(); };
    const n = Math.floor(t * 2) % 4;
    [[-60, 70, -0.2], [-20, 20, 0.2], [20, -30, -0.2], [60, -80, 0.2]].forEach(([x, y, a], k) => { if (k <= n) passo(x, y, a); });
    ctx.fillStyle = accento; ctx.font = SERIF(54, 'italic 700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.lineWidth = 8; ctx.strokeText('shh…', -40, -80); ctx.restore(); ctx.fillText('shh…', -40, -80);
  },
  // Paio di jeans (fronte) con cuciture e rivetti
  jeans(ctx) {
    ctx.beginPath(); ctx.moveTo(-70, -96); ctx.lineTo(70, -96); ctx.lineTo(84, 98); ctx.lineTo(18, 98); ctx.lineTo(0, -20);
    ctx.lineTo(-18, 98); ctx.lineTo(-84, 98); ctx.closePath(); fs(ctx, DENIM);
    ctx.beginPath(); rr(ctx, -70, -96, 140, 24, 4); fs(ctx, '#33507c');                                       // cintura
    ctx.beginPath(); rr(ctx, -8, -92, 16, 16, 3); fs(ctx, ORO);                                             // bottone
    cucitura(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, -24); ctx.moveTo(-64, -60); ctx.quadraticCurveTo(-30, -56, -26, -30);
      ctx.moveTo(64, -60); ctx.quadraticCurveTo(30, -56, 26, -30); ctx.moveTo(-78, 80); ctx.lineTo(-24, 80); ctx.moveTo(78, 80); ctx.lineTo(24, 80); });
    rivetto(ctx, -40, -40); rivetto(ctx, 40, -40);
    ctx.save(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-50, 10); ctx.lineTo(-56, 60); ctx.moveTo(50, 10); ctx.lineTo(56, 60); ctx.stroke(); ctx.restore();
  },
  // Abito da sposa bianco con velo
  sposa(ctx, { t = 0, accento = CIPRIA }) {
    ctx.save(); ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.moveTo(-20, -84); ctx.quadraticCurveTo(-110, -10, -96, 96); ctx.lineTo(96, 96);
    ctx.quadraticCurveTo(110, -10, 20, -84); ctx.closePath(); ctx.fillStyle = '#f4f1ff'; ctx.fill(); ctx.restore();             // velo
    ctx.beginPath(); ctx.moveTo(-26, -70); ctx.quadraticCurveTo(0, -60, 26, -70); ctx.lineTo(22, -14); ctx.lineTo(-22, -14); ctx.closePath(); fs(ctx, '#fffdf8');
    ctx.beginPath(); ctx.moveTo(-22, -14); ctx.lineTo(22, -14); ctx.quadraticCurveTo(60, 40, 88, 98); ctx.lineTo(-88, 98); ctx.quadraticCurveTo(-60, 40, -22, -14);
    fs(ctx, '#ffffff');
    ctx.save(); ctx.strokeStyle = '#e6dccb'; ctx.lineWidth = 4; for (const x of [-40, 0, 40]) { ctx.beginPath(); ctx.moveTo(x * 0.3, -6); ctx.quadraticCurveTo(x * 0.8, 50, x * 1.4, 92); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); rr(ctx, -24, -20, 48, 12, 6); fs(ctx, accento);                                         // cintura
    ctx.beginPath(); ctx.arc(-14, -86, 9, 0, 7); ctx.arc(0, -92, 9, 0, 7); ctx.arc(14, -86, 9, 0, 7); fs(ctx, '#ffffff');     // fiori
    const s = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.save(); ctx.globalAlpha = s; ctx.fillStyle = '#ffd166'; ctx.font = FONT(34, 900); ctx.textAlign = 'center'; ctx.fillText('✦', 70, -60); ctx.restore();
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
  // Maglia di jersey a righe marinière (Chanel)
  maglia(ctx, { accento = CIPRIA }) {
    const corpo = () => { ctx.beginPath(); ctx.moveTo(-40, -86); ctx.quadraticCurveTo(0, -66, 40, -86); ctx.lineTo(100, -50); ctx.lineTo(82, 4); ctx.lineTo(60, -6);
      ctx.lineTo(62, 92); ctx.lineTo(-62, 92); ctx.lineTo(-60, -6); ctx.lineTo(-82, 4); ctx.lineTo(-100, -50); ctx.closePath(); };
    corpo(); fs(ctx, '#fffaf0');
    ctx.save(); corpo(); ctx.clip(); ctx.fillStyle = '#1f2f5a';
    for (let y = -56; y < 96; y += 30) ctx.fillRect(-110, y, 220, 12);
    ctx.restore(); corpo(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-40, -86); ctx.quadraticCurveTo(0, -60, 40, -86); ctx.lineWidth = 9; ctx.strokeStyle = accento; ctx.stroke();
  },
  // Boxer da uomo (la biancheria in jersey): sobrio, a righine
  mutande(ctx) {
    ctx.beginPath(); ctx.moveTo(-84, -60); ctx.lineTo(84, -60); ctx.lineTo(92, 70); ctx.lineTo(14, 70); ctx.lineTo(0, 0); ctx.lineTo(-14, 70); ctx.lineTo(-92, 70); ctx.closePath();
    fs(ctx, '#cfe3f2');
    ctx.save(); ctx.strokeStyle = '#7aa7cc'; ctx.lineWidth = 5;
    for (const x of [-60, -36, 36, 60]) { ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x * 1.1, 64); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); rr(ctx, -88, -84, 176, 28, 8); fs(ctx, '#ffffff');
    ctx.beginPath(); ctx.arc(-6, -20, 5, 0, 7); ctx.arc(6, -20, 5, 0, 7); ctx.fillStyle = INCHIOSTRO; ctx.fill();
  },
  // Sandalo con zeppa di sughero (di profilo)
  zeppa(ctx, { accento = CIPRIA }) {
    ctx.beginPath(); ctx.moveTo(-100, 40); ctx.lineTo(70, 40); ctx.lineTo(96, -30); ctx.lineTo(96, 80); ctx.lineTo(-100, 80); ctx.quadraticCurveTo(-112, 60, -100, 40); fs(ctx, '#c8955c');
    ctx.save(); ctx.fillStyle = '#a5743f'; for (const [x, y] of [[-70, 60], [-30, 66], [10, 58], [50, 66], [80, 30], [76, 62], [-50, 52]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); } ctx.restore();
    ctx.beginPath(); ctx.moveTo(-90, 40); ctx.quadraticCurveTo(-60, -30, -10, -26); ctx.lineTo(0, 40); fs(ctx, accento);           // fascia davanti
    ctx.beginPath(); ctx.moveTo(40, 30); ctx.quadraticCurveTo(60, -40, 92, -36); ctx.lineTo(96, -20); ctx.quadraticCurveTo(70, -20, 62, 32); fs(ctx, accento);  // cinturino
  },
  // Tappo / blocco di sughero
  sughero(ctx) {
    ctx.beginPath(); ctx.moveTo(-60, -70); ctx.lineTo(60, -70); ctx.lineTo(80, 80); ctx.lineTo(-80, 80); ctx.closePath(); fs(ctx, '#c8955c');
    ctx.beginPath(); ctx.ellipse(0, -70, 60, 18, 0, 0, 7); fs(ctx, '#ddb07a');
    ctx.save(); ctx.fillStyle = '#9c6b38'; for (let k = 0; k < 16; k++) { ctx.beginPath(); ctx.arc(-56 + hash(k) * 112, -40 + hash(k + 9) * 110, 3 + hash(k + 3) * 4, 0, 7); ctx.fill(); } ctx.restore();
  },
  // Borsa a mano con manico curvo
  borsa(ctx, { accento = CIPRIA }) {
    ctx.save(); ctx.lineWidth = 16; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(0, -30, 62, Math.PI, 0); ctx.stroke();
    ctx.lineWidth = 9; ctx.strokeStyle = '#d9a441'; ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = INCHIOSTRO; for (const a of [-2.6, -1.9, -1.25, -0.55]) {             // nodi del bambù
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 54, -30 + Math.sin(a) * 54); ctx.lineTo(Math.cos(a) * 70, -30 + Math.sin(a) * 70); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-96, -24); ctx.lineTo(96, -24); ctx.lineTo(84, 90); ctx.lineTo(-84, 90); ctx.closePath(); fs(ctx, accento);
    ctx.beginPath(); ctx.moveTo(-96, -24); ctx.lineTo(96, -24); ctx.lineTo(90, 20); ctx.quadraticCurveTo(0, 40, -90, 20); ctx.closePath(); fs(ctx, '#ffffff22');
    ctx.beginPath(); rr(ctx, -16, 14, 32, 24, 5); fs(ctx, ORO);
  },
  // Canne di bambù (manico Gucci)
  bambu(ctx, { t = 0 }) {
    for (const [x, r, h] of [[-50, -0.12, 190], [6, 0.04, 210], [58, 0.16, 180]]) {
      ctx.save(); ctx.translate(x, 10); ctx.rotate(r + Math.sin(t * 2 + x) * 0.03);
      ctx.beginPath(); rr(ctx, -16, -h / 2, 32, h, 14); fs(ctx, '#d9a441');
      for (let y = -h / 2 + 46; y < h / 2 - 10; y += 52) { ctx.beginPath(); ctx.moveTo(-17, y); ctx.lineTo(17, y); ctx.stroke(); }
      ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(40, -78, 28, 12, -0.6, 0, 7); fs(ctx, '#6aa84f');
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
  baule(ctx, { accento = CIPRIA }) {
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
  // Paglietta (cappello di paglia rigido anni '20) con nastro e trama a righe
  paglietta(ctx, { t = 0, accento = '#e8435a' }) {
    ctx.save(); ctx.rotate(Math.sin(t * 2) * 0.03);
    ctx.beginPath(); ctx.ellipse(0, 40, 104, 30, 0, 0, 7); fs(ctx, '#e6c46a');                       // tesa
    ctx.beginPath(); ctx.moveTo(-62, 36); ctx.lineTo(-58, -46); ctx.quadraticCurveTo(0, -62, 58, -46); ctx.lineTo(62, 36);
    ctx.quadraticCurveTo(0, 50, -62, 36); fs(ctx, '#f0d27e');                                          // cupola
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(150,110,30,0.55)'; ctx.lineWidth = 4;
    for (let y = -40; y < 40; y += 12) { ctx.beginPath(); ctx.moveTo(-70, y); ctx.lineTo(70, y + 3); ctx.stroke(); }
    ctx.restore(); stileIcona(ctx);
    ctx.beginPath(); ctx.moveTo(-61, 4); ctx.quadraticCurveTo(0, 16, 61, 4); ctx.lineTo(62, 30); ctx.quadraticCurveTo(0, 42, -62, 30); ctx.closePath(); fs(ctx, accento);  // nastro
    ctx.beginPath(); ctx.ellipse(0, -50, 58, 12, 0, 0, 7); fs(ctx, '#f6dc94');                       // cima piatta
    ctx.restore();
  },
  // Paglietta schiacciata e strappata (calpestata)
  pagliettaRotta(ctx, { accento = '#e8435a' }) {
    ctx.save(); ctx.rotate(-0.12);
    ctx.beginPath(); ctx.moveTo(-108, 52); ctx.lineTo(-70, 30); ctx.lineTo(-84, 14); ctx.lineTo(-30, 22); ctx.lineTo(-10, 2); ctx.lineTo(18, 20);
    ctx.lineTo(60, 8); ctx.lineTo(54, 30); ctx.lineTo(104, 44); ctx.lineTo(40, 70); ctx.lineTo(-20, 62); ctx.lineTo(-60, 74); ctx.closePath(); fs(ctx, '#e6c46a');
    ctx.beginPath(); ctx.moveTo(-60, 30); ctx.lineTo(-56, -6); ctx.lineTo(-20, -14); ctx.lineTo(4, -2); ctx.lineTo(34, -16); ctx.lineTo(58, 0); ctx.lineTo(60, 30);
    ctx.quadraticCurveTo(0, 44, -60, 30); fs(ctx, '#f0d27e');
    ctx.beginPath(); ctx.moveTo(-59, 18); ctx.quadraticCurveTo(0, 30, 59, 18); ctx.lineTo(60, 32); ctx.quadraticCurveTo(0, 44, -60, 32); ctx.closePath(); fs(ctx, accento);
    // impronta della scarpa e pagliuzze volate via
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = INCHIOSTRO;
    ctx.beginPath(); ctx.ellipse(-8, 4, 20, 9, 0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(26, 8, 11, 7, 0.2, 0, 7); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#e6c46a'; ctx.lineWidth = 6;
    for (const [x, y, a] of [[-90, -30, 0.6], [80, -36, -0.5], [-30, -60, 0.2], [96, -6, 1.1]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); ctx.stroke(); }
    ctx.restore();
  },
  // Lumaca di mare (murice): conchiglia a spirale con le spine, da cui si ricavava la porpora
  lumaca(ctx, { t = 0, accento = '#8e3fb0' }) {
    ctx.save(); ctx.rotate(Math.sin(t * 3) * 0.04);
    ctx.beginPath(); ctx.moveTo(-90, 40); ctx.quadraticCurveTo(-40, 72, 40, 62); ctx.quadraticCurveTo(84, 56, 96, 40); ctx.lineTo(60, 40); fs(ctx, accento);  // corpo
    ctx.beginPath(); ctx.moveTo(-100, 0); ctx.quadraticCurveTo(-60, -20, -30, -10); ctx.lineTo(-30, 30); ctx.quadraticCurveTo(-70, 40, -100, 0); fs(ctx, '#e9d6c0');   // canale
    for (let j = 0; j < 5; j++) {                                                              // spine
      const a = -2.6 + j * 0.55; ctx.beginPath(); ctx.moveTo(10 + Math.cos(a) * 58, -6 + Math.sin(a) * 58);
      ctx.lineTo(10 + Math.cos(a + 0.12) * 92, -6 + Math.sin(a + 0.12) * 92); ctx.lineTo(10 + Math.cos(a + 0.26) * 58, -6 + Math.sin(a + 0.26) * 58); fs(ctx, '#d9c1a6');
    }
    ctx.beginPath(); ctx.arc(10, -6, 62, 0, 7); fs(ctx, '#f0dcc4');
    ctx.beginPath(); ctx.arc(14, -8, 40, 0, 7); fs(ctx, '#e3c8aa');
    ctx.beginPath(); ctx.arc(18, -10, 20, 0, 7); fs(ctx, '#d4b18f');
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = accento;                                    // goccia di porpora
    const g = (t * 0.8) % 1; ctx.beginPath(); ctx.arc(-96, 12 + g * 40, 9 * (1 - g * 0.5), 0, 7); ctx.fill(); ctx.restore();
    ctx.restore();
  },
};
export const NOMI_ICONE = Object.keys(ICONE);

export function icona(ctx, nome, cx, cy, s, { t = 0, accento = CIPRIA, k = 1, ruota = 0 } = {}) {
  if (k <= 0) return;
  const f = ICONE[nome] || ICONE.stella;
  ctx.save(); ctx.translate(cx, cy); const sc = (s / 200) * pop(k); ctx.scale(sc, sc); ctx.rotate(ruota + (1 - easeOut(k)) * 0.4);
  ctx.globalAlpha *= clamp(k * 2);
  stileIcona(ctx); f(ctx, { t, accento });
  ctx.restore();
}

// Cartello finale (CTA): logo Cintre grande, testo e bottone che viene toccato
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
export function finaleCondividi(ctx, u, { testo: frase = '', accento = CIPRIA, t = 0 } = {}) {
  const k = easeOut(u / 0.4);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2 - 150, 190); ctx.scale(0.375, 0.375); logo(ctx, 800, 600, { colore: accento, slogan: '' }); ctx.restore();
  testo(ctx, frase, W / 2, 580, { size: 96, peso: 900, colore: '#fff', maxW: 900, parole: entra(u, 0.05, 0.6), evidenzia: 'salvalo mandalo', accento, ombra: true });
  const bottoni = [{ x: 360, nome: 'Salva', tap: 1.0 }, { x: 720, nome: 'Invia', tap: 1.7 }];
  bottoni.forEach((b, n) => {
    const kb = entra(u, 0.35 + n * 0.15, 0.35); if (kb <= 0) return;
    const premuto = u > b.tap, tap = clamp((u - b.tap) / 0.2);
    ctx.save(); ctx.translate(b.x, 860); const sc = 1.3 * pop(kb) * (1 - 0.1 * Math.sin(Math.PI * tap)); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(20,4,10,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = premuto ? accento : CREMA; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
    if (premuto) {                                         // onda di conferma
      const v = clamp((u - b.tap) / 0.7); ctx.save(); ctx.globalAlpha = 1 - v; ctx.strokeStyle = accento; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 92 + v * 90, 0, 7); ctx.stroke(); ctx.restore();
    }
    if (n === 0) iconaSalva(ctx, premuto, BORDEAUX);
    else { const v = premuto ? easeOut(clamp((u - b.tap) / 0.6)) : 0;
      ctx.save(); ctx.translate(v * 160, -v * 220); ctx.rotate(-v * 0.4); ctx.globalAlpha *= 1 - v * 0.9; iconaInvia(ctx, BORDEAUX); ctx.restore();
      if (v > 0.6) { ctx.save(); ctx.globalAlpha *= clamp((v - 0.6) / 0.3); iconaInvia(ctx, BORDEAUX); ctx.restore(); } }
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

// Cartello "segui e metti like" (Antonio, 2026-11-22: la CTA di TUTTI i video). Testo grande, poi la mano tocca
// Segui (diventa "✓ Segui già") e il cuore (si riempie di rosso con un pop e cuoricini che salgono).
const ROSSO_LIKE = '#ff3040';
function cuore(ctx, s, pieno, colore) {
  ctx.save(); ctx.scale(s / 100, s / 100);
  ctx.beginPath(); ctx.moveTo(0, 38);
  ctx.bezierCurveTo(-62, -4, -52, -58, -18, -58); ctx.bezierCurveTo(-6, -58, 0, -48, 0, -40);
  ctx.bezierCurveTo(0, -48, 6, -58, 18, -58); ctx.bezierCurveTo(52, -58, 62, -4, 0, 38); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 9;
  if (pieno) { ctx.fillStyle = ROSSO_LIKE; ctx.fill(); } else { ctx.strokeStyle = colore; ctx.stroke(); }
  ctx.restore();
}
export function finaleSeguiLike(ctx, u, { testo: frase = '', accento = CIPRIA, t = 0 } = {}) {
  const k = easeOut(u / 0.4);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2 - 150, 190); ctx.scale(0.375, 0.375); logo(ctx, 800, 600, { colore: accento, slogan: '' }); ctx.restore();
  testo(ctx, frase, W / 2, 580, { size: 96, peso: 900, colore: '#fff', maxW: 900, parole: entra(u, 0.05, 0.6), evidenzia: 'segui like', accento, ombra: true });
  const tapS = 1.0, tapL = 1.7;
  // Segui: pillola a sinistra
  const ks = entra(u, 0.35, 0.35);
  if (ks > 0) {
    const premuto = u > tapS, tb = clamp((u - tapS) / 0.2);
    ctx.save(); ctx.translate(330, 860); const sc = pop(ks) * (1 - 0.1 * Math.sin(Math.PI * tb)); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(20,4,10,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    pillola(ctx, premuto ? '✓ Segui già' : 'Segui', 0, 0, { size: 58, fondo: premuto ? CREMA : accento, colore: BORDEAUX, h: 150, w: 400, peso: 900 });
    ctx.shadowColor = 'transparent';
    if (premuto) { const v = clamp((u - tapS) / 0.7); ctx.globalAlpha = 1 - v; ctx.strokeStyle = accento; ctx.lineWidth = 6;
      rr(ctx, -200 - v * 60, -75 - v * 60, 400 + v * 120, 150 + v * 120, 75 + v * 60); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = ks; ctx.fillStyle = '#fff'; ctx.font = FONT(50, 900); ctx.textAlign = 'center'; ctx.fillText('@cintre_official', 330, 1045); ctx.restore();
  }
  // cuore: tondo a destra
  const kl = entra(u, 0.5, 0.35);
  if (kl > 0) {
    const premuto = u > tapL, tb = clamp((u - tapL) / 0.2), boom = premuto ? pop(clamp((u - tapL) / 0.35)) : 1;
    ctx.save(); ctx.translate(780, 860); const sc = 1.3 * pop(kl) * (1 - 0.1 * Math.sin(Math.PI * tb)); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(20,4,10,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = CREMA; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
    if (premuto) { const v = clamp((u - tapL) / 0.7); ctx.save(); ctx.globalAlpha = 1 - v; ctx.strokeStyle = ROSSO_LIKE; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 92 + v * 90, 0, 7); ctx.stroke(); ctx.restore(); }
    ctx.translate(0, 8); cuore(ctx, 110 * boom, premuto, BORDEAUX);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = kl; ctx.fillStyle = '#fff'; ctx.font = FONT(50, 900); ctx.textAlign = 'center'; ctx.fillText('Like', 780, 1045); ctx.restore();
    // cuoricini che salgono dopo il tocco (restano sopra i sottotitoli)
    for (let j = 0; j < 5; j++) {
      const v = clamp((u - tapL - 0.05 - j * 0.12) / 1.1); if (v <= 0 || v >= 1) continue;
      const x = 780 + (hash(j + 3) - 0.5) * 220 + Math.sin(v * 7 + j) * 18, y = 760 - easeOut(v) * 300;
      ctx.save(); ctx.globalAlpha = 1 - v; ctx.translate(x, y); cuore(ctx, 40 + hash(j) * 30, true, ROSSO_LIKE); ctx.restore();
    }
  }
  // mano: tocca Segui, poi il cuore
  if (u > 0.6 && u < 2.6) {
    const a = clamp((u - 0.6) / 0.35), c = clamp((u - 1.25) / 0.35);
    const x = mix2(mix2(W / 2 + 260, 370, easeOut(a)), 815, easeOut(c)), y = mix2(1100, 905, easeOut(a));
    const tocco = Math.max(Math.sin(Math.PI * clamp((u - tapS) / 0.2)), Math.sin(Math.PI * clamp((u - tapL) / 0.2)));
    mano(ctx, x, y, 120, Math.max(0, tocco));
  }
}

// Cartello "commenta" (CTA dei quiz): testo grande, poi una barra commento in stile Instagram in cui si
// scrive "Per me è la…", la mano tocca Pubblica e salgono fumetti A / B / C (come i commenti che arrivano).
export function finaleCommenta(ctx, u, { testo: frase = '', accento = CIPRIA, t = 0 } = {}) {
  const k = easeOut(u / 0.4);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2 - 150, 190); ctx.scale(0.375, 0.375); logo(ctx, 800, 600, { colore: accento, slogan: '' }); ctx.restore();
  testo(ctx, frase, W / 2, 560, { size: 92, peso: 900, colore: '#fff', maxW: 900, parole: entra(u, 0.05, 0.6), evidenzia: 'commenti A B C', accento, ombra: true });
  const kb = entra(u, 0.4, 0.35);
  if (kb > 0) {
    const scritto = 'Per me è la…', n = Math.floor(clamp((u - 0.7) / 0.7) * scritto.length), tap = 1.65, premuto = u > tap;
    ctx.save(); ctx.translate(W / 2, 880); ctx.scale(pop(kb), pop(kb));
    ctx.shadowColor = 'rgba(20,4,10,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = CREMA; rr(ctx, -440, -70, 880, 140, 70); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); ctx.translate(-360, 0); ctx.scale(0.42, 0.42); icona(ctx, 'commento', 0, 0, 200, { accento }); ctx.restore();
    ctx.font = FONT(54, 800); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = n ? BORDEAUX : 'rgba(109,26,54,0.45)';
    const str = n ? scritto.slice(0, n) : 'Commenta…'; ctx.fillText(str, -300, 2);
    if (n && n < scritto.length && Math.sin(t * 14) > 0) { const w = ctx.measureText(str).width; ctx.fillRect(-300 + w + 6, -28, 5, 56); }
    const tb = clamp((u - tap) / 0.2), sb = 1 - 0.1 * Math.sin(Math.PI * tb);
    ctx.save(); ctx.translate(300, 0); ctx.scale(sb, sb); pillola(ctx, premuto ? '✓' : 'Pubblica', 0, 0, { size: 40, fondo: premuto ? accento : BORDEAUX, colore: premuto ? BORDEAUX : '#fff', h: 92, w: 220 }); ctx.restore();
    ctx.restore();
    // fumetti A / B / C che salgono dopo il tocco
    ['A', 'B', 'C'].forEach((l, j) => {
      const v = clamp((u - tap - 0.15 - j * 0.22) / 1.6); if (v <= 0) return;
      const x = W / 2 + (j - 1) * 270 + Math.sin(v * 6 + j) * 24, y = 1060 + 60 * (1 - easeOut(v));          // restano sopra i sottotitoli
      ctx.save(); ctx.globalAlpha = clamp(v * 5); ctx.translate(x, y); const sc = pop(clamp(v * 3)); ctx.scale(sc, sc);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-30, 52); ctx.lineTo(-50, 92); ctx.lineTo(4, 66); ctx.fill();
      ctx.fillStyle = BORDEAUX; ctx.font = FONT(76, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l + '!', 0, 4);
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
  if (opz.azione === 'segui_like') return finaleSeguiLike(ctx, u, opz);
  if (opz.azione === 'salva_condividi') return finaleCondividi(ctx, u, opz);
  if (opz.azione === 'commenta') return finaleCommenta(ctx, u, opz);
  return finaleBottone(ctx, u, opz);
}

export function finaleBottone(ctx, u, { testo: frase = '', bottone = 'Segui @cintre_official', accento = CIPRIA, t = 0 } = {}) {
  const k = easeOut(u / 0.6);
  ctx.save(); ctx.globalAlpha = k;
  ctx.translate(W / 2, 450); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-W / 2, -450);
  ctx.save(); ctx.translate(W / 2 - 360, 190); ctx.scale(0.9, 0.9); logo(ctx, 800, 600, { colore: accento }); ctx.restore();
  ctx.restore();
  testo(ctx, frase, W / 2, 800, { size: 56, peso: 800, colore: '#fff', maxW: 880, parole: entra(u, 0.3, 1.0), evidenzia: 'Cintre', accento });
  // bottone: compare, viene toccato (~1.6 s), diventa "✓"
  const kb = entra(u, 0.7, 0.4), tap = clamp((u - 1.5) / 0.25), dopo = u > 1.75;
  if (kb > 0) {
    ctx.save(); ctx.translate(W / 2, 925); const s = pop(kb) * (1 - 0.08 * Math.sin(Math.PI * tap)); ctx.scale(s, s);
    if (dopo) { ctx.globalAlpha = clamp((u - 1.75) / 0.6); ctx.strokeStyle = accento; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 60 + (u - 1.75) * 260, 0, 7); ctx.globalAlpha = Math.max(0, 1 - (u - 1.75) / 0.8); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.font = FONT(44, 800); const larg = ctx.measureText(bottone).width + 72;
    pillola(ctx, dopo ? '✓ Segui già' : bottone, 0, 0, { size: 44, fondo: dopo ? '#fff' : accento, colore: BORDEAUX, h: 104, w: larg });
    ctx.restore();
    const mx = W / 2 + 330 - 90 * easeOut(clamp((u - 0.9) / 0.6)), my = 1020 - 70 * easeOut(clamp((u - 0.9) / 0.6));
    if (u > 0.9 && u < 3.2) mano(ctx, mx, my, 120, tap * (1 - clamp((u - 1.8) / 0.3)));
  }
}
