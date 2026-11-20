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
// Angoli in radianti da "dritto in giù", positivi = in avanti (verso cui guarda). Arto = [spalla/anca, gomito/ginocchio].
// Skill animazione-personaggi-2d: il GINOCCHIO piega solo all'indietro (≤ 0), il GOMITO solo in avanti (≥ 0);
// braccio davanti (lb) per i gesti che si devono vedere. sx/sy: schiacciamento e allungamento (volume costante).
const COSCIA = 110, STINCO = 105, GAMBA = COSCIA + STINCO;
const piedeY = ([a1, a2]) => COSCIA * Math.cos(a1) + STINCO * Math.cos(a1 + a2);
const PASSO = 150;                               // lunghezza di un passo (px a scala 1): fase dalla distanza percorsa

// fase: avanzamento del ciclo di camminata in radianti (2π = due passi), calcolato dalla distanza in scena2d.
function posa(azione, u, t, quando = 0, fase = null) {
  const s = Math.sin, c = Math.cos, P = {
    lb: [0.15, 0.15], rb: [-0.1, 0.15], ll: [0.05, -0.05], rl: [-0.05, -0.05], dy: 0, tilt: 0, bocca: 0, sx: 1, sy: 1,
  };
  const resp = s(t * 3) * 4;
  switch (azione) {
    case 'cammina': {
      const f = fase ?? t * 7;
      // gamba: coscia avanti/indietro; ginocchio molto piegato nel passaggio (quando la gamba va avanti), quasi
      // dritto in appoggio. Le due gambe sono sfasate di π, le braccia opposte alle gambe.
      const gamba = (g) => [0.42 * s(g), -0.12 - 1.05 * Math.pow(Math.max(0, c(g)), 1.6)];
      P.ll = gamba(f); P.rl = gamba(f + Math.PI);
      P.lb = [-0.42 * s(f), 0.35 + 0.15 * Math.max(0, -s(f))]; P.rb = [0.42 * s(f), 0.35 + 0.15 * Math.max(0, s(f))];
      P.tilt = 0.07;                                         // leggermente in avanti, verso dove va
      P.dy = GAMBA - Math.max(piedeY(P.ll), piedeY(P.rl));   // il piede d'appoggio tocca terra: su e giù naturale
      break;
    }
    case 'indica':
      P.lb = [1.7 + 0.05 * s(t * 8), 0.05]; P.rb = [0.15, 0.3]; P.tilt = 0.05; P.dy = resp; P.bocca = 0.5 + 0.5 * s(t * 14); break;
    case 'sorpresa': {
      const k = u - quando;
      if (k < -0.14) { P.lb = [0.45, 2.2]; P.rb = [0.1, 0.3]; P.dy = resp; P.tilt = -0.04; break; }   // pensa: mano al mento
      if (k < 0) {                                           // ANTICIPAZIONE: si accuccia, braccia indietro
        const a = easeOut((k + 0.14) / 0.14);
        P.ll = [0.5 * a, -1.0 * a]; P.rl = [0.3 * a, -0.8 * a]; P.lb = [-0.7 * a, 0.3]; P.rb = [-0.8 * a, 0.3];
        P.dy = GAMBA - Math.max(piedeY(P.ll), piedeY(P.rl)); P.sy = 1 - 0.08 * a; P.sx = 1 + 0.05 * a; P.tilt = 0.15 * a; break;
      }
      const T = 0.45;
      if (k < T) {                                           // SALTO: allungato in salita, gambe raccolte in cima
        const v = k / T, h = s(Math.PI * v) * 120;
        P.lb = [2.6 + 0.15 * s(t * 12), 0.25]; P.rb = [-2.45 - 0.15 * s(t * 12), 0.25];
        P.ll = [0.55 * s(Math.PI * v), -1.0 * s(Math.PI * v)]; P.rl = [0.25 * s(Math.PI * v), -0.8 * s(Math.PI * v)];
        P.dy = -h; P.sy = 1 + 0.1 * (1 - v); P.sx = 1 - 0.06 * (1 - v); P.bocca = 1; break;
      }
      const d = k - T, sq = Math.exp(-d * 14) * c(d * 30);   // ATTERRAGGIO: schiaccia e torna, poi saltella felice
      P.lb = [2.6 + 0.15 * s(t * 12), 0.25]; P.rb = [-2.45 - 0.15 * s(t * 12), 0.25];
      P.sy = 1 - 0.15 * sq; P.sx = 1 + 0.1 * sq; P.dy = -Math.abs(s(d * 7)) * 16 * Math.min(1, d * 3); P.bocca = 1; break;
    }
    case 'disegna':
      P.lb = [0.75 + 0.12 * s(t * 11), 0.85 + 0.25 * s(t * 17)]; P.rb = [0.3, 0.6]; P.tilt = 0.1; P.dy = resp * 0.5; break;
    case 'legge':
      P.lb = [0.5, 1.05]; P.rb = [0.45, 1.1]; P.tilt = -0.04 + 0.03 * s(t * 2); P.dy = resp; break;
    case 'versa':
      P.lb = [1.35 + 0.1 * s(t * 4), 0.2]; P.rb = [1.1 + 0.1 * s(t * 4), 0.4]; P.tilt = 0.1; P.dy = resp; break;
    case 'lancia': {                                         // carica dietro (anticipazione) e lancia in avanti ad arco
      const f = (t * 1.4) % 1;
      P.lb = [f < 0.45 ? -1.1 * easeOut(f / 0.45) : -1.1 + 3.4 * easeOut((f - 0.45) / 0.25), 0.3];
      P.tilt = f < 0.45 ? -0.1 : 0.14; P.rb = [0.3, 0.4]; break;
    }
    case 'raccoglie':
      P.tilt = 0.55 + 0.08 * s(t * 4); P.lb = [0.9 + 0.3 * s(t * 6), 0.4]; P.rb = [0.7 - 0.3 * s(t * 6), 0.3];
      P.ll = [0.4, -0.9]; P.rl = [-0.1, -0.5]; P.dy = GAMBA - Math.max(piedeY(P.ll), piedeY(P.rl)); break;
    case 'saluta':
      P.lb = [2.55, 0.35 * s(t * 10)]; P.rb = [0.1, 0.3]; P.dy = resp; P.bocca = 0.6; break;   // braccio davanti: si vede
    default:
      P.dy = resp; P.lb = [0.15 + 0.04 * s(t * 2), 0.15]; P.rb = [-0.1 - 0.04 * s(t * 2), 0.15];
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
  pantaloni = '#2f5d9a', capelli = '#3a2418', pelle = 0, cappello = '', baffi = false, tacchi = '', lanterna = false, fase = null } = {}) {
  const P = posa(azione, u, t, quando, fase), pl = PELLI[pelle % PELLI.length];
  ctx.save(); ctx.translate(x, y); ctx.scale(sc * P.sx, sc * P.sy); ctx.translate(0, P.dy);   // schiaccia dai piedi
  // ombra a terra (resta giù quando salta)
  ctx.save(); ctx.translate(0, -P.dy); ctx.fillStyle = 'rgba(20,4,10,0.35)'; ctx.beginPath(); ctx.ellipse(0, 8, 110 * (1 + P.dy / 400), 20, 0, 0, 7); ctx.fill(); ctx.restore();
  // gambe
  const piedi = [arto(ctx, -24, -210, P.rl, 110, 105, verso, 40, pantaloni, INK), arto(ctx, 24, -210, P.ll, 110, 105, verso, 40, pantaloni, INK)];
  if (tacchi) for (const [fx, fy] of piedi) {            // scarpa col tacco alto, ben visibile
    ctx.save(); ctx.translate(fx, fy); ctx.scale(verso, 1);
    ctx.fillStyle = tacchi; ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-34, -14); ctx.quadraticCurveTo(10, -26, 44, 4); ctx.lineTo(48, 20); ctx.lineTo(-10, 16); ctx.lineTo(-24, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(-24, 52); ctx.lineTo(-12, 52); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.save(); ctx.translate(0, -210); ctx.rotate(P.tilt * verso); ctx.translate(0, 210);
  // braccio dietro
  const manoDietro = arto(ctx, -40 * verso, -385, P.rb, 85, 80, verso, 34, maglia, pl);
  // busto
  ctx.fillStyle = maglia; rr(ctx, -66, -420, 132, 225, 50); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = pantaloni; rr(ctx, -66, -235, 132, 46, 18); ctx.fill(); ctx.stroke();
  // testa
  const hx = 6 * verso, hy = -490;
  ctx.fillStyle = pl; ctx.beginPath(); ctx.arc(hx, hy, 66, 0, 7); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = capelli; ctx.beginPath(); ctx.arc(hx, hy - 6, 68, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (cappello === 'basco') { ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.ellipse(hx - 6 * verso, hy - 62, 74, 26, -0.2 * verso, 0, 7); ctx.fill(); ctx.stroke(); }
  if (cappello === 'corona') {
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(hx - 60, hy - 50); ctx.lineTo(hx - 64, hy - 120); ctx.lineTo(hx - 30, hy - 85); ctx.lineTo(hx, hy - 135);
    ctx.lineTo(hx + 30, hy - 85); ctx.lineTo(hx + 64, hy - 120); ctx.lineTo(hx + 60, hy - 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8435a'; for (const dx of [-32, 0, 32]) { ctx.beginPath(); ctx.arc(hx + dx, hy - 66, 9, 0, 7); ctx.fill(); }
  }
  if (cappello === 'casco') { ctx.fillStyle = '#e6a020'; ctx.beginPath(); ctx.arc(hx, hy - 20, 74, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(hx + 30 * verso, hy - 62, 16, 0, 7); ctx.fill(); ctx.stroke(); }
  if (cappello === 'turbante') { ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.ellipse(hx, hy - 58, 80, 46, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8435a'; ctx.beginPath(); ctx.arc(hx + 10 * verso, hy - 74, 12, 0, 7); ctx.fill(); }
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
  if (lanterna) {                                         // lanterna in mano, con l'alone che tremola
    const [lx, ly] = manoDavanti, fl = 1 + 0.08 * Math.sin(t * 23) + 0.05 * Math.sin(t * 37);
    const g = ctx.createRadialGradient(lx, ly + 50, 10, lx, ly + 50, 260 * fl);
    g.addColorStop(0, 'rgba(255,209,102,0.55)'); g.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly + 50, 260 * fl, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 20); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; rr(ctx, lx - 26, ly + 20, 52, 66, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b4330'; ctx.fillRect(lx - 30, ly + 16, 60, 10); ctx.fillRect(lx - 30, ly + 82, 60, 10);
  }
  ctx.restore();
  ctx.restore();
  const m = ([mx, my]) => [x + mx * sc * P.sx, y + (my + P.dy) * sc * P.sy];
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
  // jeans vecchi a terra, strappati e impolverati: la polvere si alza
  jeansVecchi(ctx, x, y, s, { t, u }) {
    const k = pop(clamp(u / 0.4)); if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.rotate(-0.08);
    ctx.fillStyle = 'rgba(20,4,10,0.4)'; ctx.beginPath(); ctx.ellipse(10, 8, 170, 24, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a6f8f'; ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-150, -150); ctx.lineTo(150, -150); ctx.lineTo(160, 0); ctx.lineTo(30, 0); ctx.lineTo(0, -90); ctx.lineTo(-30, 0); ctx.lineTo(-160, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9a36a'; for (const [rx, ry] of [[-110, -60], [100, -40], [-60, -120]]) { ctx.beginPath(); ctx.ellipse(rx, ry, 22, 12, 0.3, 0, 7); ctx.fill(); }   // toppe di terra
    ctx.strokeStyle = '#2a3a55'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-120, -30); ctx.lineTo(-90, -24); ctx.moveTo(90, -90); ctx.lineTo(120, -84); ctx.stroke();   // strappi
    ctx.fillStyle = '#e0a03a'; for (const [bx, by] of [[-120, -135], [120, -135]]) { ctx.beginPath(); ctx.arc(bx, by, 8, 0, 7); ctx.fill(); }      // rivetti
    ctx.fillStyle = 'rgba(230,210,170,0.5)';
    for (let j = 0; j < 9; j++) { const f = (t * 0.5 + j / 9) % 1; ctx.globalAlpha = Math.sin(Math.PI * f) * 0.6; ctx.beginPath(); ctx.arc(-140 + j * 35 + Math.sin(t + j) * 10, -20 - f * 200, 12 + f * 20, 0, 7); ctx.fill(); }
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
  } else if (tipo === 'miniera') {                      // galleria buia con le travi di legno
    ctx.fillStyle = 'rgba(10,4,2,0.55)'; ctx.fillRect(0, 380, W, y0 - 380 + 400);
    ctx.fillStyle = '#6b4330'; ctx.strokeStyle = INK; ctx.lineWidth = 7;
    for (const bx of [70, 1010]) { ctx.fillRect(bx - 28, 450, 56, y0 - 450); ctx.strokeRect(bx - 28, 450, 56, y0 - 450); }
    ctx.fillRect(40, 430, 1000, 60); ctx.strokeRect(40, 430, 1000, 60);
    ctx.fillStyle = '#4a3020'; ctx.fillRect(0, y0, W, 400);
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(0, y0 + 40); ctx.lineTo(W, y0 + 40); ctx.moveTo(0, y0 + 90); ctx.lineTo(W, y0 + 90); ctx.stroke();   // binari
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
    let x = a.x ?? 540, azione = a.azione, fase = null, verso = a.verso ?? 1;
    if (a.azione === 'cammina' && a.a != null) {           // si sposta: guarda dove va, piedi che non scivolano
      const x0 = a.da ?? x, k = clamp(u / (a.durata || 2)), e = k < 1 ? 0.5 - 0.5 * Math.cos(Math.PI * k) : 1;
      x = x0 + (a.a - x0) * e; verso = a.verso ?? (Math.sign(a.a - x0) || 1);
      fase = (Math.abs(x - x0) / (PASSO * (a.s ?? 1))) * Math.PI;
      if (k >= 1) azione = 'fermo';
    }
    const mani = omino(ctx, x, a.y ?? 1180, a.s ?? 1, { ...a, azione, u, t, verso, fase });
    if (a.azione === 'versa') secchio(ctx, mani.davanti, verso, t);
    if (a.dice) nuvoletta(ctx, mani.testa, a.dice, clamp((u - (a.quando || 0) - 0.15) / 0.3), accento);
  }
  ctx.restore();
}

// Istanti dei suoni della scena (secondi dalla frase): passi, salto, getto. Stessa logica letta da audio.suoni.
// Passi: uno ogni PASSO px percorsi (contatto del tallone a metà passo); stessa formula in audio.tempi_passi.
export { PASSO };
