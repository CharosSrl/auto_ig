// Scene animate 2D con personaggi (Antonio, 2026-11-19: "vanno bene anche scene animate in 2D, con personaggi che
// fanno cose"). Comparse della storia disegnate a codice, stile adesivo come il resto della resa 2D:
// lo stilista, l'operaio, il ragazzo con i jeans. NON sono la mascotte Cintre (quella solo se Antonio la chiede).
// Ogni personaggio fa UNA azione che si vede (cammina, indica, salta sorpreso, versa, disegna, legge, lancia):
// il video fa quello che dice (skill regia-reel §1). Le scene si muovono già al fotogramma 0 (u parte da 0, ma
// ogni azione ha un ciclo continuo: nessuna posa ferma).
import { W, FONT, clamp, easeOut, rr, icona, pop } from './grafica2d.js';
import { CREMA, BORDEAUX } from './brand.js';

const INK = '#2a0f19';
const PELLI = ['#eab894', '#c98e64', '#8d5a3b', '#f3cfb1'];

// ---- l'omino -----------------------------------------------------------------------------------------------------
// Angoli in radianti da "dritto in giù", positivi = in avanti (verso cui guarda). Braccio/gamba = [spalla, gomito].
function posa(azione, u, t, quando = 0) {
  const s = Math.sin, P = {
    lb: [0.15, -0.1], rb: [-0.15, -0.1], ll: [0.05, 0], rl: [-0.05, 0], dy: 0, tilt: 0, bocca: 0,
  };
  const resp = s(t * 3) * 4;
  switch (azione) {
    case 'cammina': {
      const f = t * 9;
      P.ll = [0.5 * s(f), Math.max(0, -0.7 * s(f + 1))]; P.rl = [-0.5 * s(f), Math.max(0, 0.7 * s(f + 1))];
      P.lb = [-0.5 * s(f), -0.4]; P.rb = [0.5 * s(f), -0.4]; P.dy = -Math.abs(s(f)) * 14; break;
    }
    case 'indica':
      P.rb = [1.75 + 0.06 * s(t * 8), 0.05]; P.lb = [0.2, -0.3]; P.tilt = 0.05; P.dy = resp; P.bocca = 0.5 + 0.5 * s(t * 14); break;
    case 'sorpresa': {
      const k = u - quando;
      if (k < 0) { P.lb = [0.4, -1.4]; P.rb = [-0.3, -1.6]; P.dy = resp; break; }   // prima: pensa (mano al mento)
      const salto = Math.max(0, s(Math.PI * clamp(k / 0.45))) * 110 + (k > 0.45 ? Math.abs(s(t * 7)) * 18 : 0);
      P.lb = [2.6 + 0.2 * s(t * 12), 0.3]; P.rb = [-2.6 - 0.2 * s(t * 12), -0.3]; P.ll = [0.35, 0.6]; P.rl = [-0.35, -0.6];
      P.dy = -salto; P.bocca = 1; break;
    }
    case 'disegna':
      P.rb = [1.2 + 0.15 * s(t * 11), -0.9 + 0.25 * s(t * 17)]; P.lb = [0.9, -0.6]; P.tilt = 0.12; P.dy = resp * 0.5; break;
    case 'legge':
      P.rb = [1.0, -1.3]; P.lb = [1.0, -1.3]; P.tilt = -0.05 + 0.03 * s(t * 2); P.dy = resp; break;
    case 'versa':
      P.rb = [1.6 + 0.12 * s(t * 4), -0.2]; P.lb = [1.3 + 0.12 * s(t * 4), -0.5]; P.tilt = 0.1; P.dy = resp; break;
    case 'lancia': {
      const f = (t * 1.6) % 1;
      P.rb = [f < 0.5 ? -1.2 * (f / 0.5) : -1.2 + 3.4 * easeOut((f - 0.5) / 0.3), -0.3]; P.tilt = f < 0.5 ? -0.12 : 0.12; break;
    }
    case 'raccoglie':
      P.tilt = 0.55 + 0.08 * s(t * 4); P.rb = [0.9 + 0.3 * s(t * 6), -0.4]; P.lb = [0.7 - 0.3 * s(t * 6), -0.3];
      P.ll = [0.4, -0.9]; P.rl = [-0.1, -0.5]; P.dy = 40; break;
    case 'saluta':
      P.rb = [2.6, -0.6 + 0.5 * s(t * 10)]; P.dy = resp; P.bocca = 0.6; break;
    default:
      P.dy = resp; P.lb = [0.15 + 0.04 * s(t * 2), -0.1]; P.rb = [-0.15 - 0.04 * s(t * 2), -0.1];
  }
  return P;
}

function arto(ctx, x, y, [a1, a2], l1, l2, verso, spessore, colore, mano) {
  const x1 = x + Math.sin(a1) * l1 * verso, y1 = y + Math.cos(a1) * l1;
  const x2 = x1 + Math.sin(a1 + a2) * l2 * verso, y2 = y1 + Math.cos(a1 + a2) * l2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = spessore + 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = colore; ctx.lineWidth = spessore; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  if (mano) { ctx.fillStyle = mano; ctx.beginPath(); ctx.arc(x2, y2, spessore * 0.62, 0, 7); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); }
  return [x2, y2];
}

// x, y = piedi a terra. verso 1 guarda a destra, -1 a sinistra. Ritorna la posizione delle mani (per gli oggetti).
export function omino(ctx, x, y, sc, { azione = 'fermo', u = 0, t = 0, quando = 0, verso = 1, maglia = '#e8435a',
  pantaloni = '#2f5d9a', capelli = '#3a2418', pelle = 0, cappello = '', baffi = false } = {}) {
  const P = posa(azione, u, t, quando), pl = PELLI[pelle % PELLI.length];
  ctx.save(); ctx.translate(x, y + P.dy * 1); ctx.scale(sc, sc);
  // ombra a terra (resta giù quando salta)
  ctx.save(); ctx.translate(0, -P.dy); ctx.fillStyle = 'rgba(20,4,10,0.35)'; ctx.beginPath(); ctx.ellipse(0, 8, 110 * (1 + P.dy / 400), 20, 0, 0, 7); ctx.fill(); ctx.restore();
  // gambe
  arto(ctx, -24, -210, P.rl, 110, 105, verso, 40, pantaloni, INK);
  arto(ctx, 24, -210, P.ll, 110, 105, verso, 40, pantaloni, INK);
  ctx.save(); ctx.translate(0, -210); ctx.rotate(P.tilt * verso); ctx.translate(0, 210);
  // braccio dietro
  const manoDietro = arto(ctx, -40 * verso, -385, P.rb.map((a, j) => (j ? a : a)), 85, 80, verso, 34, maglia, pl);
  // busto
  ctx.fillStyle = maglia; rr(ctx, -66, -420, 132, 225, 50); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = pantaloni; rr(ctx, -66, -235, 132, 46, 18); ctx.fill(); ctx.stroke();
  // testa
  const hx = 6 * verso, hy = -490;
  ctx.fillStyle = pl; ctx.beginPath(); ctx.arc(hx, hy, 66, 0, 7); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = capelli; ctx.beginPath(); ctx.arc(hx, hy - 6, 68, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (cappello === 'basco') { ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.ellipse(hx - 6 * verso, hy - 62, 74, 26, -0.2 * verso, 0, 7); ctx.fill(); ctx.stroke(); }
  if (cappello === 'paglia') { ctx.fillStyle = '#e6c46a'; ctx.beginPath(); ctx.ellipse(hx, hy - 50, 110, 22, 0, 0, 7); ctx.fill(); ctx.stroke(); rr(ctx, hx - 55, hy - 100, 110, 52, 20); ctx.fill(); ctx.stroke(); }
  // faccia: occhi che sbattono, bocca che parla o urla
  const blink = (t % 3.1) < 0.12 ? 0.15 : 1;
  ctx.fillStyle = INK;
  for (const ex of [22, 50]) { ctx.beginPath(); ctx.ellipse(hx + (ex - 20) * verso, hy + 2, 7, 10 * blink, 0, 0, 7); ctx.fill(); }
  if (baffi) { ctx.beginPath(); ctx.ellipse(hx + 34 * verso, hy + 26, 20, 7, 0, 0, 7); ctx.fill(); }
  const bo = P.bocca;
  ctx.beginPath(); ctx.ellipse(hx + 34 * verso, hy + 38, 12 + 4 * bo, 3 + 14 * bo, 0, 0, 7); ctx.fill();
  // braccio davanti
  const manoDavanti = arto(ctx, 40 * verso, -385, P.lb, 85, 80, verso, 34, maglia, pl);
  ctx.restore();
  ctx.restore();
  const m = ([mx, my]) => [x + mx * sc, y + (my + P.dy) * sc];
  return { davanti: m(manoDavanti), dietro: m(manoDietro), testa: [x + hx * sc, y + (hy + P.dy) * sc] };
}

// ---- oggetti di scena --------------------------------------------------------------------------------------------
function ombraRett(ctx, x, y, w, h, r) { ctx.fillStyle = 'rgba(20,4,10,0.4)'; rr(ctx, x + 10, y + 12, w, h, r); ctx.fill(); }
const OGGETTI = {
  // tavolo da disegno con un foglio: il disegno (icona) appare man mano
  tavolo(ctx, x, y, s, { u, t, icona: ic = 'bikini', accento }) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = INK; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(-60, -300); ctx.moveTo(120, 0); ctx.lineTo(60, -300); ctx.stroke();
    ctx.save(); ctx.translate(0, -330); ctx.rotate(-0.25);
    ombraRett(ctx, -190, -130, 380, 250, 18); ctx.fillStyle = '#8a5a3c'; rr(ctx, -190, -130, 380, 250, 18); ctx.fill(); ctx.lineWidth = 7; ctx.stroke();
    ctx.fillStyle = '#fffaf0'; rr(ctx, -160, -110, 320, 210, 8); ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); ctx.globalAlpha = clamp(u / 1.2); ctx.beginPath(); ctx.rect(-160, -110, 320 * clamp(u / 1.2 + 0.15), 210); ctx.clip();
    icona(ctx, ic, 0, -5, 190, { t, accento }); ctx.restore();
    ctx.restore(); ctx.restore();
  },
  // giornale con titolo a caratteri cubitali (testo già censurato da formati.schede)
  giornale(ctx, x, y, s, { u, testo = 'NOTIZIA!' }) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.06 + 0.02 * Math.sin(u * 3));
    ombraRett(ctx, -170, -120, 340, 240, 6); ctx.fillStyle = '#f4efe2'; rr(ctx, -170, -120, 340, 240, 6); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = FONT(30, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LE JOURNAL', 0, -90);
    ctx.fillRect(-150, -70, 300, 4);
    ctx.font = FONT(46, 900); String(testo).split('\n').forEach((r, j) => ctx.fillText(r, 0, -30 + j * 50));
    ctx.fillStyle = 'rgba(42,15,25,0.35)'; for (let j = 0; j < 3; j++) ctx.fillRect(-150, 60 + j * 18, j === 2 ? 180 : 300, 8);
    ctx.restore();
  },
  // lavatrice con il cestello che gira
  lavatrice(ctx, x, y, s, { t }) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(Math.sin(t * 40) * 2, 0);
    ombraRett(ctx, -150, -320, 300, 320, 30); ctx.fillStyle = '#f2f2f2'; rr(ctx, -150, -320, 300, 320, 30); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#d9d9d9'; ctx.fillRect(-150, -320, 300, 60); ctx.strokeRect(-150, -320, 300, 60);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(100, -290, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#9fd3f0'; ctx.beginPath(); ctx.arc(0, -130, 100, 0, 7); ctx.fill(); ctx.lineWidth = 12; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(0, -130, 94, 0, 7); ctx.clip(); ctx.translate(0, -130); ctx.rotate(t * 6);
    ctx.fillStyle = '#2f5d9a'; ctx.beginPath(); ctx.ellipse(20, 30, 70, 40, 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.arc(Math.cos(j) * 60, Math.sin(j * 2) * 50, 10, 0, 7); ctx.fill(); }
    ctx.restore(); ctx.restore();
  },
  // fila di piante di cotone che ondeggiano (batuffoli bianchi)
  cotone(ctx, x, y, s, { t }) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let j = 0; j < 5; j++) {
      const px = -360 + j * 180, sw = Math.sin(t * 2 + j) * 0.08;
      ctx.save(); ctx.translate(px, 0); ctx.rotate(sw);
      ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -220); ctx.moveTo(0, -120); ctx.lineTo(-60, -180); ctx.moveTo(0, -150); ctx.lineTo(55, -210); ctx.stroke();
      ctx.fillStyle = '#3f9a52'; for (const [lx, ly] of [[-40, -110], [40, -140], [-20, -200]]) { ctx.beginPath(); ctx.ellipse(lx, ly, 34, 16, lx > 0 ? -0.5 : 0.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
      for (const [bx, by] of [[0, -235], [-62, -192], [58, -222]]) { ctx.beginPath(); ctx.arc(bx, by, 28, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  },
  // nuvola/sole che "beve": gocce che salgono dal campo (sete del cotone)
  gocce(ctx, x, y, s, { t, colore = '#4fb3ff' }) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let j = 0; j < 10; j++) {
      const f = (t * 0.7 + j / 10) % 1, gx = -380 + ((j * 0.618) % 1) * 760, gy = -f * 380;
      ctx.globalAlpha = Math.sin(Math.PI * f); ctx.fillStyle = colore;
      ctx.beginPath(); ctx.moveTo(gx, gy - 30); ctx.quadraticCurveTo(gx + 22, gy, gx, gy + 14); ctx.quadraticCurveTo(gx - 22, gy, gx, gy - 30); ctx.fill();
    }
    ctx.restore();
  },
  // Torre Eiffel stilizzata (Parigi)
  eiffel(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 14; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-120, 0); ctx.quadraticCurveTo(-40, -200, -12, -480); ctx.lineTo(12, -480); ctx.quadraticCurveTo(40, -200, 120, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-80, -140); ctx.lineTo(80, -140); ctx.moveTo(-40, -300); ctx.lineTo(40, -300); ctx.moveTo(0, -480); ctx.lineTo(0, -560); ctx.stroke();
    ctx.restore();
  },
  icona(ctx, x, y, s, { t, icona: ic = 'stella', accento, u }) {
    const k = pop(clamp(u / 0.4)); if (k <= 0) return;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3) * 10); ctx.scale(k * s, k * s);
    ctx.fillStyle = 'rgba(20,4,10,0.4)'; ctx.beginPath(); ctx.arc(8, 10, 120, 0, 7); ctx.fill();
    ctx.fillStyle = CREMA; ctx.beginPath(); ctx.arc(0, 0, 120, 0, 7); ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
    icona(ctx, ic, 0, 0, 170, { t, accento }); ctx.restore();
  },
};

// Secchio in mano + getto d'acqua (azione 'versa'): segue la mano davanti dell'omino.
function secchio(ctx, [mx, my], verso, t) {
  ctx.save(); ctx.translate(mx, my); ctx.rotate(1.1 * verso);
  ctx.fillStyle = '#9aa7b0'; ctx.beginPath(); ctx.moveTo(-45, -10); ctx.lineTo(45, -10); ctx.lineTo(35, 80); ctx.lineTo(-35, 80); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.fillStyle = '#4fb3ff'; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(mx + 70 * verso, my + 30);
  for (let j = 0; j <= 10; j++) ctx.lineTo(mx + (70 + j * 14) * verso + Math.sin(t * 20 + j) * 4, my + 30 + j * 30);
  for (let j = 10; j >= 0; j--) ctx.lineTo(mx + (100 + j * 14) * verso + Math.sin(t * 20 + j) * 4, my + 30 + j * 30);
  ctx.fill(); ctx.restore();
}

// Fumetto sopra la testa (testo corto: "BIKINI!", "Ahia!").
function nuvoletta(ctx, [hx, hy], testo, k, accento) {
  if (k <= 0 || !testo) return;
  ctx.save(); ctx.translate(hx, hy - 150); ctx.scale(pop(k), pop(k)); ctx.rotate(-0.05);
  ctx.font = FONT(64, 900); const w = ctx.measureText(testo).width + 70;
  ctx.fillStyle = 'rgba(20,4,10,0.4)'; rr(ctx, -w / 2 + 8, -52, w, 104, 40); ctx.fill();
  ctx.fillStyle = accento; rr(ctx, -w / 2, -60, w, 104, 40); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20, 42); ctx.lineTo(0, 90); ctx.lineTo(20, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = accento; ctx.fillRect(-18, 36, 36, 10);
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(testo, 0, -8);
  ctx.restore();
}

// Fondi di scena: un pavimento e due elementi che danno il luogo (sempre sopra il colore del video).
function fondale(ctx, tipo, t) {
  const y0 = 1170;
  ctx.save();
  if (tipo === 'campo') {
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(860, 560, 90 + Math.sin(t * 2) * 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#a0703f'; ctx.fillRect(0, y0, W, 400);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 8; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(0, y0 + 30 + j * 40); ctx.lineTo(W, y0 + 30 + j * 40); ctx.stroke(); }
  } else if (tipo === 'mare') {
    ctx.fillStyle = '#1f6fa8'; ctx.fillRect(0, y0 - 40, W, 440);
    ctx.fillStyle = '#f2d98d'; ctx.fillRect(0, y0 + 60, W, 400);
  } else {                                              // studio / casa: pavimento e battiscopa
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, y0, W, 400);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, y0 - 6, W, 12);
  }
  ctx.restore();
}

// La scena intera. s: {sfondo, attori: [{azione, x, verso, maglia, pantaloni, capelli, pelle, cappello, baffi,
// quando, dice}], oggetti: [{cosa, x, y, s, testo, icona}]}. u: secondi dalla frase (già anticipati nel gancio).
export function scena2d(ctx, s, u, t, { accento = '#ffd166' } = {}) {
  const ent = easeOut(u / 0.3);
  ctx.save(); ctx.globalAlpha = Math.max(0.0001, ent);
  fondale(ctx, s.sfondo || 'studio', t);
  for (const o of s.oggetti || []) {
    const f = OGGETTI[o.cosa]; if (!f) continue;
    f(ctx, o.x ?? 540, o.y ?? 1170, o.s ?? 1, { u: u - (o.dopo || 0), t, accento, testo: o.testo, icona: o.icona, colore: o.colore });
  }
  for (const a of s.attori || []) {
    const verso = a.verso ?? 1;
    let x = a.x ?? 540;
    if (a.azione === 'cammina' && a.a != null) x = (a.da ?? x) + (a.a - (a.da ?? x)) * clamp(u / (a.durata || 2));
    const mani = omino(ctx, x, a.y ?? 1180, a.s ?? 1, { ...a, u, t, verso });
    if (a.azione === 'versa') secchio(ctx, mani.davanti, verso, t);
    if (a.dice) nuvoletta(ctx, mani.testa, a.dice, clamp((u - (a.quando || 0) - 0.15) / 0.3), accento);
  }
  ctx.restore();
}

// Istanti dei suoni della scena (secondi dalla frase): passi, salto, getto. Stessa logica letta da audio.suoni.
export const PASSO_CAMMINA = Math.PI / 9;       // un passo ogni mezzo ciclo della gamba (t * 9)
