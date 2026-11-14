// PRESET — Cartoon 2D ad alto ritmo: la modella Cintre disegnata in 2D piatto (stesso aspetto di modella.js:
// mora, occhi castani, labbra rosate) + effetti "dopamina" (punch-in, scossa, flash, tendina, raggi, esplosioni,
// timbri, testo che sbatte). Tutto su canvas 2D 1080x1920 (vedi grafica2d.js → tela2d), deterministico in t.
//
//   cintre(ctx, x, y, s, { posa: 'indica', da: 'neutro', k, espr: 'sorpresa', parla, t, outfit })
//       x, y = base del collo; s = scala (1 → testa ~165 px, figura ~650 px dalla testa ai fianchi)
//   camera(ctx, { zoom, fx, fy, sx, sy })  ...disegno...  ctx.restore()
//   raggi, puntini, esplosione, lineeVelocita, tendina, flash, timbro, scritta, adesivo, carteMistero, barra
//
// Pose: neutro, presenta, indica, indicaSx, sorpresa, pensa, gioia, saluta, spalle.
// Espressioni: neutra, felice, sorpresa, furba, wow.
import { BORDEAUX, CIPRIA, SCURO, CREMA, OUTFITS, gruccia } from './brand.js';
import { W, H, FONT, SERIF, INCHIOSTRO, clamp, easeOut, pop, rr, icona } from './grafica2d.js';

export const ASPETTO = { pelle: '#eab894', ombra: '#d99b78', capelli: '#4a2c1d', capelliLuce: '#6b4330', occhi: '#6b4226', labbra: '#b84a5e' };
const LW = 6;                                   // contorno "disegnato"
export const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const backOut = (x) => { x = clamp(x); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;

// --- Pose: dove stanno le mani (coordinate del corpo, origine = base del collo, s = 1) -------------
// Le braccia si piegano da sole (cinematica inversa a 2 ossa), il gomito va sempre verso l'esterno.
export const POSE = {
  neutro:   { sx: [-100, 250], dx: [100, 250] },
  presenta: { sx: [-100, 250], dx: [235, 110], palmo: 'dx' },
  indica:   { sx: [-100, 250], dx: [205, -150], dito: 'dx' },
  indicaSx: { sx: [-205, -150], dx: [100, 250], dito: 'sx' },
  sorpresa: { sx: [-76, -48], dx: [76, -48] },
  pensa:    { sx: [-100, 250], dx: [30, -18] },
  gioia:    { sx: [-195, -175], dx: [195, -175] },
  saluta:   { sx: [-100, 250], dx: [175, -135], onda: 'dx' },
  spalle:   { sx: [-185, 60], dx: [185, 60], palmo: 'entrambe' },
};
export const ESPRESSIONI = {
  neutra:   { occhi: 1.0, ciglia: 0, bocca: 'sorriso', guance: 0.15 },
  felice:   { occhi: 0.9, ciglia: -4, bocca: 'grande', guance: 0.45 },
  sorpresa: { occhi: 1.28, ciglia: -16, bocca: 'o', guance: 0.2 },
  furba:    { occhi: 0.85, ciglia: 0, bocca: 'ghigno', guance: 0.3, unSopracciglio: true },
  wow:      { occhi: 1.35, ciglia: -20, bocca: 'grande', guance: 0.55 },
};

function ik(S, T, l1, l2, lato) {
  let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
  d = clamp(d, Math.abs(l1 - l2) + 1, l1 + l2 - 1);
  const a = Math.atan2(dy, dx), A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const cand = [a + A, a - A].map((b) => [S[0] + Math.cos(b) * l1, S[1] + Math.sin(b) * l1]);
  const E = lato > 0 ? (cand[0][0] > cand[1][0] ? cand[0] : cand[1]) : (cand[0][0] < cand[1][0] ? cand[0] : cand[1]);
  const ang = Math.atan2(T[1] - E[1], T[0] - E[0]);
  return { E, H: [E[0] + Math.cos(ang) * l2, E[1] + Math.sin(ang) * l2] };
}

function tubo(ctx, A, B, r, colore) {             // segmento di braccio con contorno
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = INCHIOSTRO; ctx.lineWidth = r * 2 + LW * 2; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.stroke();
  ctx.strokeStyle = colore; ctx.lineWidth = r * 2; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.stroke();
  ctx.restore();
}
function forma(ctx, colore, disegna) { ctx.beginPath(); disegna(); ctx.fillStyle = colore; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INCHIOSTRO; ctx.lineJoin = 'round'; ctx.stroke(); }

const MANICHE_LUNGHE = ['camicia', 'maglione', 'dolcevita', 'blazer', 'cappotto'];
export function outfitDaNome(nome) { return OUTFITS.find((o) => o.nome.toLowerCase() === String(nome || '').toLowerCase()) || OUTFITS[1]; }

// --- La modella Cintre in 2D --------------------------------------------------------------------
export function cintre(ctx, x, y, s, { posa = 'neutro', da = null, k = 1, espr = 'neutra', parla = false, t = 0,
  outfit = OUTFITS[1], inclina = 0, salto = 0 } = {}) {
  const P1 = POSE[posa] || POSE.neutro, P0 = POSE[da] || P1, kk = backOut(k);
  const mano = (lato) => [lerp(P0[lato][0], P1[lato][0], kk), lerp(P0[lato][1], P1[lato][1], kk)];
  const E = ESPRESSIONI[espr] || ESPRESSIONI.neutra;
  const resp = Math.sin(t * 2.2) * 4, onda = P1.onda ? Math.sin(t * 9) * 26 : 0;
  const c = outfit.capi || {}, pelle = ASPETTO.pelle;
  const top = outfit.top, sotto = outfit.tipo === 'abito' ? outfit.top : outfit.bottom;
  const manica = MANICHE_LUNGHE.includes(c.sopra) ? top : pelle;

  ctx.save(); ctx.translate(x, y - salto); ctx.scale(s, s);
  // ombra a terra (morbida, dà peso alla figura)
  // capelli dietro: lunghi e mossi, ondeggiano
  const sw = Math.sin(t * 1.7) * 6;
  forma(ctx, ASPETTO.capelli, () => {
    ctx.moveTo(-96, -150); ctx.quadraticCurveTo(-130, -40, -112 + sw, 60); ctx.quadraticCurveTo(-100 + sw, 140, -60 + sw, 170);
    ctx.quadraticCurveTo(-30, 120, -40, 40); ctx.lineTo(40, 40); ctx.quadraticCurveTo(30, 120, 60 - sw, 170);
    ctx.quadraticCurveTo(100 - sw, 140, 112 - sw, 60); ctx.quadraticCurveTo(130, -40, 96, -150); ctx.closePath();
  });
  // gambe (sotto la gonna) e parte bassa
  const tipoSotto = c.sotto || (outfit.tipo === 'pantaloni' ? 'pantaloni' : 'gonna');
  const pant = ['jeans', 'pantaloni', 'palazzo'].includes(tipoSotto);
  if (!pant) for (const sx of [-1, 1]) forma(ctx, pelle, () => { rr(ctx, sx * 40 - 22, 330, 44, 200, 20); });
  // busto
  forma(ctx, top, () => {
    ctx.moveTo(-26, -6); ctx.quadraticCurveTo(-84, 0 + resp * 0.3, -88, 40); ctx.quadraticCurveTo(-70, 140, -62, 215);
    ctx.lineTo(62, 215); ctx.quadraticCurveTo(70, 140, 88, 40); ctx.quadraticCurveTo(84, 0 + resp * 0.3, 26, -6); ctx.closePath();
  });
  // collo e scollo
  forma(ctx, pelle, () => { ctx.moveTo(-20, -30); ctx.lineTo(-22, 4); ctx.quadraticCurveTo(0, 30, 22, 4); ctx.lineTo(20, -30); ctx.closePath(); });
  if (c.sopra === 'camicia' || c.sopra === 'blazer') {
    for (const sx of [-1, 1]) forma(ctx, c.sopra === 'blazer' ? top : '#ffffff', () => { ctx.moveTo(sx * 4, 18); ctx.lineTo(sx * 30, -6); ctx.lineTo(sx * 36, 30); ctx.closePath(); });
  }
  // parte bassa
  if (pant) {
    for (const sx of [-1, 1]) forma(ctx, sotto, () => { ctx.moveTo(sx * 4, 205); ctx.lineTo(sx * 66, 205); ctx.lineTo(sx * (tipoSotto === 'palazzo' ? 86 : 70), 530); ctx.lineTo(sx * 10, 530); ctx.closePath(); });
  } else {
    const svasa = 10 * Math.sin(t * 2.5);
    forma(ctx, sotto, () => { ctx.moveTo(-64, 205); ctx.lineTo(64, 205); ctx.lineTo(118 + svasa, 345); ctx.quadraticCurveTo(0, 370, -118 - svasa, 345); ctx.closePath(); });
  }
  forma(ctx, SCURO, () => { rr(ctx, -64, 198, 128, 16, 6); });                  // cintura
  for (const sx of [-1, 1]) forma(ctx, outfit.scarpe || SCURO, () => { ctx.ellipse(sx * 40 + sx * 6, 530, 34, 17, 0, Math.PI, 0); ctx.lineTo(sx * 40 + sx * 6 - 34, 536); ctx.lineTo(sx * 40 + sx * 6 + 34, 536); ctx.closePath(); });
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(-30, 120, 14, 60, 0.1, 0, 7); ctx.fill(); ctx.restore();

  // braccia
  for (const [lato, sx] of [['sx', -1], ['dx', 1]]) {
    let T = mano(lato);
    if (P1.onda === lato) T = [T[0] + onda, T[1] - Math.abs(onda) * 0.3];
    const S = [sx * 72, 26 + resp * 0.3];
    const { E: G, H: M } = ik(S, T, 125, 118, sx);
    tubo(ctx, S, G, 21, manica === pelle ? top : manica);                       // spalla sempre col colore del top
    tubo(ctx, G, M, 18, manica);
    // mano
    ctx.save(); ctx.translate(...M);
    forma(ctx, pelle, () => { ctx.arc(0, 0, 22, 0, 7); });
    if (P1.dito === lato) {
      const a = Math.atan2(M[1] - G[1], M[0] - G[0]);
      ctx.rotate(a); forma(ctx, pelle, () => { rr(ctx, 8, -8, 40, 16, 8); });
    } else if (P1.palmo === lato || P1.palmo === 'entrambe') {
      forma(ctx, pelle, () => { ctx.ellipse(0, -10, 26, 12, 0, 0, 7); });
    }
    ctx.restore();
  }

  // testa
  ctx.save(); ctx.translate(0, -40); ctx.rotate(inclina + Math.sin(t * 1.3) * 0.03); ctx.translate(0, -112);
  forma(ctx, pelle, () => { ctx.ellipse(0, 0, 78, 90, 0, 0, 7); });
  // guance
  ctx.save(); ctx.globalAlpha = E.guance; ctx.fillStyle = '#ff7f8a';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 44, 30, 18, 11, 0, 0, 7); ctx.fill(); } ctx.restore();
  // occhi (battito ogni ~3 s, deterministico)
  const fase = (t + 0.7) % 3.1, blink = fase < 0.14 ? Math.sin((fase / 0.14) * Math.PI) : 0;
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.translate(sx * 31, -2); ctx.scale(E.occhi, E.occhi * (1 - 0.92 * blink));
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 19, 23, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
    ctx.fillStyle = ASPETTO.occhi; ctx.beginPath(); ctx.arc(sx * 2, 3, 13, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b0f0a'; ctx.beginPath(); ctx.arc(sx * 2, 3, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx * 2 - 4, -3, 4, 0, 7); ctx.fill();
    ctx.restore();
    // ciglia (linea spessa + due "code" verso l'esterno)
    ctx.save(); ctx.translate(sx * 31, -2); ctx.strokeStyle = INCHIOSTRO; ctx.lineCap = 'round'; ctx.lineWidth = 6;
    const hy = -23 * E.occhi * (1 - 0.92 * blink);
    ctx.beginPath(); ctx.ellipse(0, 0, 21 * E.occhi, -hy + 1, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx * 18 * E.occhi, hy * 0.55); ctx.lineTo(sx * 30 * E.occhi, hy * 0.85); ctx.moveTo(sx * 12 * E.occhi, hy * 0.85); ctx.lineTo(sx * 20 * E.occhi, hy * 1.15); ctx.stroke();
    ctx.restore();
    // sopracciglia
    const alza = E.ciglia + (E.unSopracciglio && sx > 0 ? -14 : 0);
    ctx.save(); ctx.strokeStyle = ASPETTO.capelli; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx * 14, -42 + alza * 0.6); ctx.quadraticCurveTo(sx * 32, -52 + alza, sx * 50, -44 + alza * 0.8); ctx.stroke(); ctx.restore();
  }
  // naso
  ctx.save(); ctx.strokeStyle = ASPETTO.ombra; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, 18); ctx.quadraticCurveTo(6, 30, -4, 34); ctx.stroke(); ctx.restore();
  // bocca: forma dell'espressione, si apre a sillabe mentre parla
  const ap = parla ? 0.3 + 0.7 * Math.abs(Math.sin(t * 15 + Math.sin(t * 4.3) * 2)) : 0;
  ctx.save(); ctx.translate(0, 52); ctx.lineWidth = 4; ctx.strokeStyle = INCHIOSTRO;
  if (E.bocca === 'o' && !parla) {
    ctx.fillStyle = '#5a1a25'; ctx.beginPath(); ctx.ellipse(0, 2, 13, 17, 0, 0, 7); ctx.fill(); ctx.stroke();
  } else if (E.bocca === 'grande' || ap > 0) {
    const h = E.bocca === 'grande' ? 14 + 10 * ap : 4 + 16 * ap, w = E.bocca === 'o' ? 16 : 26;
    ctx.fillStyle = '#5a1a25'; ctx.beginPath(); ctx.moveTo(-w, -2); ctx.quadraticCurveTo(0, 4, w, -2); ctx.quadraticCurveTo(0, h * 2.1, -w, -2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9aa6'; ctx.beginPath(); ctx.ellipse(0, h * 0.9, w * 0.45, h * 0.35, 0, 0, Math.PI); ctx.fill();
  } else if (E.bocca === 'ghigno') {
    ctx.strokeStyle = ASPETTO.labbra; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, 2); ctx.quadraticCurveTo(4, 10, 24, -8); ctx.stroke();
  } else {
    ctx.strokeStyle = ASPETTO.labbra; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, -2); ctx.quadraticCurveTo(0, 14, 20, -2); ctx.stroke();
  }
  ctx.restore();
  // capelli davanti: calotta + frangia laterale morbida
  forma(ctx, ASPETTO.capelli, () => {
    ctx.moveTo(-84, 10); ctx.quadraticCurveTo(-96, -86, -20, -100); ctx.quadraticCurveTo(70, -108, 88, -20);
    ctx.quadraticCurveTo(92, 10, 82, 40); ctx.quadraticCurveTo(70, -30, 30, -52);
    ctx.quadraticCurveTo(-10, -30, -60, -36); ctx.quadraticCurveTo(-74, -10, -84, 10); ctx.closePath();
  });
  ctx.save(); ctx.strokeStyle = ASPETTO.capelliLuce; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-40, -82); ctx.quadraticCurveTo(10, -92, 50, -70); ctx.stroke(); ctx.restore();
  // orecchino a gruccia Cintre (dettaglio di brand)
  ctx.save(); ctx.translate(-80, 30); gruccia(ctx, 0, 14, 26, '#d4af37', 3); ctx.restore();
  ctx.restore();   // testa
  ctx.restore();
}

// --- Camera: punch-in + scossa attorno al punto di interesse --------------------------------------
export function camera(ctx, { zoom = 1, fx = W / 2, fy = 700, sx = 0, sy = 0, ruota = 0 } = {}) {
  ctx.save(); ctx.translate(fx + sx, fy + sy); ctx.rotate(ruota); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
}

// --- Sfondi ad alta energia ----------------------------------------------------------------------
export function sfondoPop(ctx, t, { colore = BORDEAUX, raggi: colRaggi = CIPRIA, cx = W / 2, cy = 640, alfa = 0.1, vel = 0.15 } = {}) {
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
export function esplosione(ctx, cx, cy, u, { colori = [CIPRIA, '#ffd166', '#ffffff'], n = 22, seme = 1, forza = 900 } = {}) {
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
export function tendina(ctx, u, { colore = CIPRIA, colore2 = SCURO, dir = 1 } = {}) {
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
export function scritta(ctx, str, x, y, u, { size = 84, colore = '#ffffff', maxW = 840, evidenzia = '', accento = CIPRIA,
  passo = 0.09, interlinea = 1.1, peso = 900, pennarello = BORDEAUX, bordo = INCHIOSTRO } = {}) {
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
        ctx.fillStyle = 'rgba(20,4,10,0.55)'; ctx.fillText(w, 5, 8);                                   // ombra netta
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
  ctx.fillStyle = 'rgba(20,4,10,0.5)'; rr(ctx, -w / 2 + 8, -h / 2 + 10, w, h, 18); ctx.fill();
  ctx.fillStyle = fondo; rr(ctx, -w / 2, -h / 2, w, h, 18); ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  ctx.fillStyle = colore; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, size * 0.04);
  ctx.restore();
}

// Adesivo: card con contorno e ombra netta che contiene un'icona (entra cadendo e rimbalza)
export function adesivo(ctx, nome, cx, cy, s, u, { t = 0, ruota = 0, fondo = CREMA, accento = CIPRIA, dall = 'alto' } = {}) {
  const k = clamp(u / 0.35); if (k <= 0) return;
  const dy = dall === 'alto' ? (1 - backOut(k)) * -500 : 0, sc = dall === 'pop' ? backOut(k) : 1;
  ctx.save(); ctx.translate(cx, cy + dy); ctx.rotate(ruota + Math.sin(t * 2 + cx) * 0.03); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(20,4,10,0.45)'; rr(ctx, -s / 2 + 14, -s / 2 + 18, s, s, s * 0.14); ctx.fill();
  ctx.fillStyle = fondo; rr(ctx, -s / 2, -s / 2, s, s, s * 0.14); ctx.fill(); ctx.lineWidth = LW + 2; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  icona(ctx, nome, 0, 0, s * 0.78, { t, accento });
  ctx.restore();
}

// Carte mistero: fila di carte, quelle già scoperte mostrano l'icona, le altre "?" che tremano (open loop)
export function carteMistero(ctx, icone, scoperte, cx, cy, s, t, { attiva = -1, accento = CIPRIA, gap = 1.18 } = {}) {
  const n = icone.length;
  icone.forEach((nome, k) => {
    const x = cx + (k - (n - 1) / 2) * s * gap, su = k < scoperte, att = k === attiva;
    ctx.save(); ctx.translate(x, cy + (att ? -12 + Math.sin(t * 8) * 6 : 0)); ctx.rotate((su ? 0 : Math.sin(t * 6 + k * 2) * 0.07) + (k - 1) * 0.05);
    const sc = att ? 1.12 : 1; ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(20,4,10,0.45)'; rr(ctx, -s / 2 + 8, -s * 0.62 + 10, s, s * 1.24, 18); ctx.fill();
    ctx.fillStyle = su ? CREMA : BORDEAUX; rr(ctx, -s / 2, -s * 0.62, s, s * 1.24, 18); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = su ? INCHIOSTRO : accento; ctx.stroke();
    if (su) icona(ctx, nome, 0, 0, s * 0.8, { t, accento });
    else { ctx.fillStyle = accento; ctx.font = SERIF(s * 0.8, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, s * 0.05); }
    ctx.restore();
  });
}

// Barra di avanzamento in alto (k 0..1) e contatore "1/3"
export function barra(ctx, k, { colore = CIPRIA } = {}) {
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, 60, 70, W - 120, 14, 7); ctx.fill();
  ctx.fillStyle = colore; rr(ctx, 60, 70, Math.max(14, (W - 120) * clamp(k)), 14, 7); ctx.fill(); ctx.restore();
}
export function contatore(ctx, n, tot, cx, cy, u, { accento = CIPRIA } = {}) {
  const k = clamp(u / 0.3), sc = lerp(1.8, 1, backOut(k));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.rotate(0.06);
  ctx.fillStyle = 'rgba(20,4,10,0.5)'; rr(ctx, -84 + 6, -46 + 8, 168, 92, 46); ctx.fill();
  ctx.fillStyle = accento; rr(ctx, -84, -46, 168, 92, 46); ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  ctx.fillStyle = BORDEAUX; ctx.font = FONT(56, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${n}/${tot}`, 0, 3);
  ctx.restore();
}

// Fumetto (commenti): rettangolo arrotondato con punta verso (px, py)
export function fumetto(ctx, x, y, w, h, px, py, { fondo = CREMA } = {}) {
  ctx.save(); ctx.fillStyle = 'rgba(20,4,10,0.45)'; rr(ctx, x + 10, y + 12, w, h, 50); ctx.fill();
  ctx.beginPath(); rr(ctx, x, y, w, h, 50); ctx.moveTo(px - 40, y + h - 2); ctx.lineTo(px, py); ctx.lineTo(px + 40, y + h - 2);
  ctx.fillStyle = fondo; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INCHIOSTRO; ctx.lineJoin = 'round';
  ctx.beginPath(); rr(ctx, x, y, w, h, 50); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px - 40, y + h); ctx.lineTo(px, py); ctx.lineTo(px + 40, y + h); ctx.stroke();
  ctx.fillStyle = fondo; ctx.fillRect(px - 36, y + h - 8, 72, 12);
  ctx.restore();
}
