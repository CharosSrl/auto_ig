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
export function finale(ctx, u, { testo: frase = '', bottone = 'Segui @cintre_official', accento = CIPRIA, t = 0 } = {}) {
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
