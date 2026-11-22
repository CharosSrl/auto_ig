// Infografiche disegnate a codice per la resa 2D (spunto di Antonio, 2026-11-19: "sfrutta al massimo grafici, schemi,
// timeline… soprattutto quando non sai che immagine mettere"). Il video fa quello che dice: la grafica si costruisce
// mentre la voce parla, e ogni cosa che compare ha il suo suono (auto_ig/audio.suoni: pop sui nodi e sui puntini).
//  - timeline: tappe verticali; schede `timeline` consecutive con le stesse `tappe` sono UNA timeline che cresce
//    (attiva = indice della tappa di questa frase; le tappe successive restano nascoste: suspense).
//  - mappa: sagoma del paese (oggi 'usa'), un percorso tratteggiato che si disegna, puntini che si accendono uno alla
//    volta e un'icona (es. auto) che viaggia sul percorso. I puntini sono illustrativi: mai spacciarli per dati.
import { W, FONT, clamp, easeOut, rr, icona, pop } from './grafica2d.js';
import { CREMA, BORDEAUX } from './brand.js';

const INCHIOSTRO = '#2a0f19';
export const MAPPA_PUNTI = 8;                  // quanti puntini si accendono sulla mappa (uguale in audio.suoni)

// ---- TIMELINE ---------------------------------------------------------------------------------------------------
// tappe: [{quando, testo, icona?}], attiva: indice; u: secondi dall'inizio della frase.
export function timeline(ctx, tappe, attiva, u, t, { accento = '#ffd166', y0 = 520, y1 = 1080, x = 150 } = {}) {
  const n = tappe.length, passo = n > 1 ? (y1 - y0) / (n - 1) : 0;
  const yDi = (k) => y0 + k * passo;
  const cresce = easeOut(u / 0.4);                           // la linea scende fino alla tappa nuova
  const yFine = attiva > 0 ? yDi(attiva - 1) + (yDi(attiva) - yDi(attiva - 1)) * cresce : yDi(0);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 18;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();      // binario vuoto: si capisce che c'è un seguito
  ctx.strokeStyle = accento; ctx.lineWidth = 18;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, yFine); ctx.stroke();
  for (let k = 0; k <= Math.min(attiva, n - 1); k++) {
    const y = yDi(k), att = k === attiva;
    // il nodo nuovo arriva quando la linea lo raggiunge; il primo (nessuna linea da percorrere) entra subito
    const kk = att ? (k === 0 ? clamp(u / 0.2) : clamp((u - 0.3) / 0.35)) : 1;
    if (kk <= 0) continue;
    const sc = att ? pop(kk) * (1 + 0.05 * Math.sin(t * 6)) : 0.82;
    const r = 76;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (att) { ctx.fillStyle = accento; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6); ctx.beginPath(); ctx.arc(0, 0, r * 1.45, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = 'rgba(20,4,10,0.5)'; ctx.beginPath(); ctx.arc(6, 8, r, 0, 7); ctx.fill();
    ctx.fillStyle = att ? accento : CREMA; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
    if (tappe[k].icona) icona(ctx, tappe[k].icona, 0, 0, r * 1.3, { t, accento: BORDEAUX });
    else { ctx.fillStyle = INCHIOSTRO; ctx.font = FONT(44, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(k + 1), 0, 2); }
    ctx.restore();
    // testo a destra del nodo: "quando" piccolo in pillola, testo grande
    const a = att ? (k === 0 ? clamp((u - 0.1) / 0.25) : clamp((u - 0.4) / 0.3)) : 1;
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = att ? a : 0.55; ctx.translate(att ? (1 - easeOut(a)) * 60 : 0, 0);
    const tx = x + 120;
    if (tappe[k].quando) {
      ctx.font = FONT(38, 900); const w = ctx.measureText(tappe[k].quando).width + 36;
      ctx.fillStyle = att ? accento : 'rgba(255,255,255,0.25)'; rr(ctx, tx, y - 66, w, 54, 27); ctx.fill();
      ctx.fillStyle = att ? INCHIOSTRO : '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(tappe[k].quando, tx + 18, y - 38);
    }
    ctx.font = FONT(att ? 78 : 58, 900); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = INCHIOSTRO;
    const ty = y + (tappe[k].quando ? 16 : 0), str = String(tappe[k].testo || '');
    ctx.strokeText(str, tx, ty); ctx.fillStyle = '#fff'; ctx.fillText(str, tx, ty);
    ctx.restore();
  }
  ctx.restore();
}

// ---- MAPPA ------------------------------------------------------------------------------------------------------
// Sagoma semplificata (lon, lat) degli Stati Uniti continentali: basta per riconoscerli, non è cartografia.
const USA = [[-124.7, 48.4], [-124, 46.2], [-124.2, 42], [-124.2, 40.3], [-122.4, 37.8], [-120.6, 34.6], [-117.1, 32.5],
  [-114.7, 32.7], [-111, 31.3], [-108.2, 31.3], [-106.5, 31.8], [-104, 29.5], [-103, 29], [-101.4, 29.8], [-99.5, 27.5],
  [-97.4, 25.9], [-97.4, 27.8], [-94.7, 29.4], [-90, 29.1], [-89, 30.2], [-85.5, 29.8], [-84, 30], [-82.8, 27.9],
  [-81.8, 26.1], [-80.2, 25.2], [-80.1, 26.8], [-81.4, 30.3], [-79.9, 32.6], [-75.6, 35.2], [-76.3, 37.1], [-75, 38.6],
  [-74, 40.6], [-71.9, 41.3], [-70, 41.7], [-70.7, 43], [-67, 44.8], [-68.4, 47.3], [-69.2, 47.4], [-71.5, 45], [-74.9, 45],
  [-76.8, 43.6], [-79.2, 43.4], [-79, 42.9], [-82.5, 41.7], [-83.5, 42], [-82.5, 45.3], [-84.8, 46.5], [-88, 48.2],
  [-89.6, 48], [-95.2, 49], [-123.2, 49]];
// Tappe illustrative del viaggio (città grandi, da Chicago verso fuori): NON sono dati, solo il disegno del giro.
const GIRO_USA = [[-87.6, 41.9], [-86.2, 39.8], [-84.4, 33.7], [-96.8, 32.8], [-104.9, 39.7], [-118.2, 34.1],
  [-122.3, 47.6], [-93.3, 45], [-75.2, 40], [-71.1, 42.4]];
const REGIONI = { usa: { forma: USA, giro: GIRO_USA, lon: [-125, -66.5], lat: [24.5, 49.5] } };

function proietta(reg, box) {
  const [l0, l1] = reg.lon, [b0, b1] = reg.lat, cosl = Math.cos(((b0 + b1) / 2) * Math.PI / 180);
  const sx = box.w / ((l1 - l0) * cosl), sy = box.h / (b1 - b0), s = Math.min(sx, sy);
  const ox = box.x + (box.w - (l1 - l0) * cosl * s) / 2, oy = box.y + (box.h - (b1 - b0) * s) / 2;
  return ([lon, lat]) => [ox + (lon - l0) * cosl * s, oy + (b1 - lat) * s];
}

// k: 0..1 avanzamento del viaggio (la scena lo lega alla durata della frase); u: secondi dall'inizio della frase.
export function mappa(ctx, regione, k, u, t, { accento = '#ffd166', mezzo = 'auto', box = { x: 70, y: 470, w: 940, h: 600 } } = {}) {
  const reg = REGIONI[regione] || REGIONI.usa, P = proietta(reg, box);
  const ent = easeOut(u / 0.35);
  ctx.save();
  ctx.translate(W / 2, box.y + box.h / 2); ctx.scale(0.9 + 0.1 * ent, 0.9 + 0.1 * ent); ctx.translate(-W / 2, -(box.y + box.h / 2));
  ctx.globalAlpha = ent;
  // sagoma: ombra netta + crema + contorno a inchiostro (stile adesivo)
  const forma = (dx, dy) => { ctx.beginPath(); reg.forma.forEach((q, j) => { const [x, y] = P(q); j ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy); }); ctx.closePath(); };
  ctx.fillStyle = 'rgba(20,4,10,0.45)'; forma(12, 16); ctx.fill();
  ctx.fillStyle = CREMA; forma(0, 0); ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  // percorso tratteggiato fino al punto raggiunto
  const tappe = reg.giro.slice(0, MAPPA_PUNTI).map(P), seg = tappe.length - 1;
  const pos = clamp(k) * seg, fino = Math.floor(pos), fr = pos - fino;
  ctx.setLineDash([22, 18]); ctx.lineDashOffset = -t * 40; ctx.lineWidth = 9; ctx.strokeStyle = BORDEAUX; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...tappe[0]);
  for (let j = 1; j <= fino; j++) ctx.lineTo(...tappe[j]);
  const qa = tappe[fino], qb = tappe[Math.min(fino + 1, seg)], qx = qa[0] + (qb[0] - qa[0]) * fr, qy = qa[1] + (qb[1] - qa[1]) * fr;
  ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]);
  // puntini: si accendono quando il mezzo ci arriva (pop + alone)
  tappe.forEach(([x, y], j) => {
    const d = (pos - j) / 0.35; if (d < 0) return;
    const sc = pop(clamp(d)), alone = Math.exp(-Math.max(0, pos - j) * 2.5);
    ctx.fillStyle = accento; ctx.globalAlpha = ent * 0.45 * alone; ctx.beginPath(); ctx.arc(x, y, 60 * sc, 0, 7); ctx.fill();
    ctx.globalAlpha = ent; ctx.fillStyle = accento; ctx.beginPath(); ctx.arc(x, y, 20 * sc, 0, 7); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  });
  // il mezzo che viaggia (adesivo tondo con l'icona)
  if (mezzo) {
    const b = Math.sin(t * 14) * 5;
    ctx.save(); ctx.translate(qx, qy - 70 + b);
    ctx.fillStyle = 'rgba(20,4,10,0.45)'; ctx.beginPath(); ctx.arc(6, 8, 62, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 62, 0, 7); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
    icona(ctx, mezzo, 0, 0, 92, { t, accento });
    ctx.restore();
  }
  ctx.restore();
}

// Istanti (secondi dall'inizio della frase) in cui si accendono i puntini: usati anche da audio.suoni (stessa formula).
export function tempiPuntini(durata) {
  const d = Math.max(0.8, durata - 0.6);
  return Array.from({ length: MAPPA_PUNTI }, (_, j) => 0.3 + (d * j) / (MAPPA_PUNTI - 1));
}

// ---- CONTATORE ---------------------------------------------------------------------------------------------------
// Numero enorme che sale (da → a) mentre una vasca si riempie di liquido che ondeggia. u: secondi dalla frase
// (nel gancio parte già avanti, così al fotogramma 0 si muove). durata: secondi per arrivare al numero finale.
export const fmtNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export function contatore(ctx, { da = 0, a = 100, unita = '', durata = 2.2, colore = '#4fb3ff', forma = 'vasca', icona: ic = 'lumaca' } = {}, u, t,
  { accento = '#ffd166', box = { x: 240, y: 690, w: 600, h: 500 } } = {}) {
  const k = easeOut(clamp(u / durata) * 1.0), v = da + (a - da) * k, fine = u >= durata;
  if (forma === 'pila') return contatorePila(ctx, { v, k, u, t, fine, durata, unita, colore, ic, accento });
  const { x, y, w, h } = box;
  ctx.save();
  // vasca: ombra, vetro crema trasparente, contorno a inchiostro
  ctx.fillStyle = 'rgba(20,4,10,0.45)'; rr(ctx, x + 12, y + 16, w, h, 46); ctx.fill();
  ctx.fillStyle = 'rgba(255,248,236,0.16)'; rr(ctx, x, y, w, h, 46); ctx.fill();
  ctx.save(); rr(ctx, x, y, w, h, 46); ctx.clip();
  const lv = y + h - h * 0.92 * k;                      // livello del liquido
  ctx.fillStyle = colore; ctx.beginPath(); ctx.moveTo(x, y + h);
  for (let px = 0; px <= w; px += 12) ctx.lineTo(x + px, lv + Math.sin(px / 55 + t * 5) * 14 * (1 - 0.5 * k) + Math.sin(px / 23 - t * 7) * 5);
  ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';             // bollicine che salgono
  for (let j = 0; j < 14; j++) {
    const fr = (t * (0.35 + (j % 5) * 0.08) + j * 0.137) % 1, by = y + h - fr * (y + h - lv), bx = x + 40 + ((j * 0.618) % 1) * (w - 80);
    if (by > lv + 10) { ctx.beginPath(); ctx.arc(bx + Math.sin(t * 3 + j) * 8, by, 6 + (j % 3) * 4, 0, 7); ctx.fill(); }
  }
  // tacche a lato
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 6;
  for (let j = 1; j < 5; j++) { const ty = y + h - (h * 0.92 * j) / 5; ctx.beginPath(); ctx.moveTo(x + 24, ty); ctx.lineTo(x + 84, ty); ctx.stroke(); }
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = INCHIOSTRO; rr(ctx, x, y, w, h, 46); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(ctx, x + w - 70, y + 40, 22, h * 0.55, 11); ctx.fill();   // riflesso
  // rubinetto che versa finché il numero sale
  if (!fine) {
    ctx.fillStyle = colore; ctx.globalAlpha = 0.9;
    ctx.fillRect(x + w / 2 - 18 + Math.sin(t * 30) * 2, y - 100, 36 + Math.sin(t * 40) * 3, lv - y + 100); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = CREMA; rr(ctx, x + w / 2 - 70, y - 150, 140, 56, 20); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  // numero enorme sopra la vasca: scuote mentre sale, pop all'arrivo
  const arr = fine ? pop(clamp((u - durata) / 0.3)) : 1, sh = fine ? 0 : Math.sin(t * 50) * 4;
  ctx.save(); ctx.translate(W / 2 + sh, y + h * 0.42); ctx.scale(arr, arr); ctx.rotate(fine ? -0.04 : 0);
  ctx.font = FONT(190, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 26; ctx.strokeStyle = INCHIOSTRO; const str = fmtNum(v);
  ctx.strokeText(str, 0, 0); ctx.fillStyle = fine ? accento : '#fff'; ctx.fillText(str, 0, 0);
  if (unita) { ctx.font = FONT(70, 900); ctx.lineWidth = 16; ctx.strokeText(unita, 0, 140); ctx.fillStyle = '#fff'; ctx.fillText(unita, 0, 140); }
  ctx.restore();
  ctx.restore();
}
// Contatore senza vasca (forma: 'pila'): mentre il numero sale, le icone (icona: lumaca…) cadono dall'alto e si
// ammucchiano in una piramide; ognuna atterra con uno schiacciamento. Stesso easing e stessi tic del contatore.
const PILA_FILE = [7, 6, 5, 4, 3, 2, 1];                 // icone per fila, dal basso
const PILA_N = PILA_FILE.reduce((a, b) => a + b, 0);
function contatorePila(ctx, { v, k, u, t, fine, durata, unita, colore, ic, accento }) {
  const S = 128, PASSO = 112, RIGA = 72, BASE = 1200;
  ctx.save();
  ctx.fillStyle = 'rgba(20,4,10,0.35)'; ctx.beginPath(); ctx.ellipse(W / 2, BASE + 62, 430, 34, 0, 0, 7); ctx.fill();   // ombra a terra
  let j = 0;
  PILA_FILE.forEach((n, r) => {
    for (let c = 0; c < n; c++, j++) {
      const soglia = (j + 1) / (PILA_N + 1);
      if (k < soglia) continue;
      const nasce = durata * (1 - Math.cbrt(1 - soglia)), eta = u - nasce;       // inversa di easeOut (cubica)
      const cade = clamp(eta / 0.22), yd = (1 - cade * cade) * -260;             // caduta con accelerazione
      const atterra = clamp((eta - 0.22) / 0.18), sq = eta > 0.22 ? Math.sin(atterra * Math.PI) * 0.22 : 0;
      const x = W / 2 + (c - (n - 1) / 2) * PASSO + Math.sin(j * 2.3) * 8;
      const y = BASE - r * RIGA + yd + (fine ? Math.sin(t * 2 + j) * 2 : 0);
      ctx.save(); ctx.translate(x, y + S * 0.3); ctx.scale(1 + sq * 0.6, 1 - sq); ctx.translate(0, -S * 0.3);
      icona(ctx, ic, 0, 0, S, { t: t + j * 0.3, accento: colore, ruota: Math.sin(j * 1.7) * 0.25 });
      ctx.restore();
    }
  });
  // numero enorme sopra la pila: scuote mentre sale, pop all'arrivo
  const arr = fine ? pop(clamp((u - durata) / 0.3)) : 1, sh = fine ? 0 : Math.sin(t * 50) * 4;
  ctx.save(); ctx.translate(W / 2 + sh, 560); ctx.scale(arr, arr); ctx.rotate(fine ? -0.04 : 0);
  ctx.font = FONT(200, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 26; ctx.strokeStyle = INCHIOSTRO; const str = fmtNum(v);
  ctx.strokeText(str, 0, 0); ctx.fillStyle = fine ? accento : '#fff'; ctx.fillText(str, 0, 0);
  if (unita) { ctx.font = FONT(70, 900); ctx.lineWidth = 16; ctx.strokeText(unita, 0, 115); ctx.fillStyle = '#fff'; ctx.fillText(unita, 0, 115); }
  ctx.restore();
  ctx.restore();
}
// Istanti dei tic del contatore (rallentano come l'easing) + arrivo: usati da audio.suoni (stessa logica).
export function tempiContatore(durata = 2.2, n = 12) {
  return Array.from({ length: n }, (_, j) => durata * (1 - Math.cbrt(1 - (j + 1) / (n + 1))));
}

// ---- RADAR -------------------------------------------------------------------------------------------------------
// Un punto nel mare visto dall'alto: onde, un atollo (anello di isolette), cerchi che pulsano dal centro, un mirino
// che si stringe e l'etichetta del posto. Per i luoghi lontani senza bisogno del planisfero. esplode: secondi dalla
// frase in cui il centro fa un lampo (facoltativo).
export const RADAR_PERIODO = 0.9;                // un cerchio (e un ping) ogni RADAR_PERIODO secondi
export function radar(ctx, { etichetta = '', esplode = -1 } = {}, u, t, { accento = '#ffd166', cx = W / 2, cy = 800, r = 360 } = {}) {
  ctx.save();
  // mare: disco con onde
  ctx.fillStyle = 'rgba(20,4,10,0.45)'; ctx.beginPath(); ctx.arc(cx + 12, cy + 16, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#1f6fa8'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let j = 0; j < 9; j++) {
    const yy = cy - r + 50 + j * 85, off = (t * 40 + j * 60) % 120;
    for (let xx = cx - r - 120 + off; xx < cx + r; xx += 120) { ctx.beginPath(); ctx.arc(xx, yy, 22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  }
  // atollo: laguna più chiara e anello di isolette
  ctx.fillStyle = '#5cc6d6'; ctx.beginPath(); ctx.ellipse(cx, cy, 170, 120, -0.3, 0, 7); ctx.fill();
  for (let j = 0; j < 16; j++) {
    const a = (j / 16) * Math.PI * 2, ex = cx + Math.cos(a) * 170 * Math.cos(-0.3) - Math.sin(a) * 120 * Math.sin(-0.3);
    const ey = cy + Math.cos(a) * 170 * Math.sin(-0.3) + Math.sin(a) * 120 * Math.cos(-0.3);
    ctx.fillStyle = '#f2d98d'; ctx.beginPath(); ctx.ellipse(ex, ey, 26 + (j % 3) * 8, 14, a, 0, 7); ctx.fill();
    ctx.fillStyle = '#3f9a52'; ctx.beginPath(); ctx.arc(ex, ey - 4, 9 + (j % 2) * 4, 0, 7); ctx.fill();
  }
  // cerchi che pulsano (radar)
  for (let j = 0; j < 4; j++) {
    const f = ((u + 10 * RADAR_PERIODO) / RADAR_PERIODO + j / 4) % 1;
    ctx.strokeStyle = accento; ctx.globalAlpha = (1 - f) * 0.8; ctx.lineWidth = 10 * (1 - f) + 2;
    ctx.beginPath(); ctx.arc(cx, cy, 30 + f * r, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // lancetta del radar
  const ang = t * 2.4;
  const g = ctx.createConicGradient ? ctx.createConicGradient(ang - 0.9, cx, cy) : null;
  if (g) { g.addColorStop(0, 'rgba(255,209,102,0)'); g.addColorStop(0.14, 'rgba(255,209,102,0.35)'); g.addColorStop(0.145, 'rgba(255,209,102,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  // lampo al centro
  if (esplode >= 0 && u >= esplode) {
    const e = u - esplode, rr2 = 40 + 900 * easeOut(e / 0.6);
    ctx.fillStyle = '#fff6d0'; ctx.globalAlpha = Math.max(0, 1 - e / 1.2); ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.lineWidth = 10; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  // mirino che si stringe sul centro
  const m = 1 - easeOut(u / 0.9), mr = 70 + 160 * m;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(m * 1.2); ctx.strokeStyle = '#e8435a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  for (let q = 0; q < 4; q++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.arc(0, 0, mr, -0.45, 0.45); ctx.stroke(); ctx.beginPath(); ctx.moveTo(mr + 14, 0); ctx.lineTo(mr + 50, 0); ctx.stroke(); }
  ctx.restore();
  // etichetta che pende dal punto
  const a2 = clamp((u - 0.5) / 0.3);
  if (etichetta && a2 > 0) {
    ctx.save(); ctx.translate(cx, cy + r + 70); ctx.scale(pop(a2), pop(a2));
    ctx.font = FONT(64, 900); const lw = ctx.measureText(etichetta).width + 70;
    ctx.fillStyle = 'rgba(20,4,10,0.45)'; rr(ctx, -lw / 2 + 8, -48, lw, 96, 48); ctx.fill();
    ctx.fillStyle = accento; rr(ctx, -lw / 2, -56, lw, 96, 48); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
    ctx.fillStyle = INCHIOSTRO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(etichetta, 0, -6);
    ctx.restore();
  }
  ctx.restore();
}

// ---- CHAT --------------------------------------------------------------------------------------------------------
// REGOLA DI ANTONIO (2026-11-21): "se ci sta una chat rendila quanto più uguale a WhatsApp". Quindi: barra di stato,
// intestazione verde (#008069) con freccia, avatar grigio con la sagoma, nome e "online" → "sta scrivendo…", icone
// videochiamata/telefono/menu; sfondo beige (#efeae2) con i disegnini; fumetti verde chiaro (#d9fdd3, i miei, a destra)
// e bianchi (l'amico, a sinistra) con la codina sul primo di ogni gruppo, ora in grigio e spunte blu sui miei; barra in
// basso con faccina, "Messaggio", fotocamera e cerchio verde (#00a884) col microfono, che diventa "invia" mentre
// scrivo (il mio messaggio compare lettera per lettera nella barra). Niente logo né nome dell'app: solo l'aspetto.
// Amici INVENTATI (mai profili veri). Tempi: CHAT_INIZIO + j·CHAT_PASSO, uguali al "ding" di audio.suoni_grafica.
// messaggi: [{da: 'a'|'b', testo}], 'a' = io (a destra), 'b' = l'amico (`nome`, a sinistra); ora: '21:14'.
export const CHAT_INIZIO = 0.45, CHAT_PASSO = 1.0;
const WA = { verde: '#008069', verdeScuro: '#017561', fondo: '#efeae2', mio: '#d9fdd3', suo: '#ffffff', testo: '#111b21',
             grigio: '#667781', icone: '#8696a0', spunte: '#53bdeb', tasto: '#00a884' };
const WAFONT = (px, w = 400) => `${w} ${px}px Roboto, "Helvetica Neue", Arial, "Noto Color Emoji", sans-serif`;

function waSfondo(ctx, x, y, w, h) {                                 // carta da parati con i disegnini, appena visibili
  ctx.fillStyle = WA.fondo; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.strokeStyle = 'rgba(84,101,111,0.13)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let n = 0;
  for (let yy = y + 30; yy < y + h; yy += 92) for (let xx = x + 30 + ((yy - y) / 92 % 2) * 46; xx < x + w; xx += 92, n++) {
    ctx.beginPath();
    switch (n % 5) {
      case 0: ctx.arc(xx, yy, 14, 0, 7); break;                                                    // bolla
      case 1: ctx.moveTo(xx - 14, yy - 4); ctx.quadraticCurveTo(xx - 14, yy - 18, xx, yy - 8);       // cuoricino
              ctx.quadraticCurveTo(xx + 14, yy - 18, xx + 14, yy - 4); ctx.lineTo(xx, yy + 14); ctx.closePath(); break;
      case 2: for (let q = 0; q < 5; q++) { const a = -Math.PI / 2 + q * 4 * Math.PI / 5; ctx[q ? 'lineTo' : 'moveTo'](xx + 15 * Math.cos(a), yy + 15 * Math.sin(a)); } ctx.closePath(); break;
      case 3: ctx.moveTo(xx - 16, yy + 6); ctx.quadraticCurveTo(xx - 8, yy - 12, xx, yy + 6); ctx.quadraticCurveTo(xx + 8, yy + 22, xx + 16, yy + 4); break; // onda
      default: ctx.rect(xx - 12, yy - 9, 24, 18); ctx.moveTo(xx - 12, yy - 9); ctx.lineTo(xx, yy + 2); ctx.lineTo(xx + 12, yy - 9); // busta
    }
    ctx.stroke();
  }
  ctx.restore();
}

function waSpunte(ctx, x, y, col) {                                  // doppia spunta (letto)
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const dx of [0, 9]) { ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx + 6, y + 6); ctx.lineTo(x + dx + 18, y - 7); ctx.stroke(); }
  ctx.restore();
}

function waAvatar(ctx, cx, cy, r) {                                  // avatar predefinito: cerchio grigio con la sagoma
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = '#dfe5e7'; ctx.fill(); ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.18, r * 0.36, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.78, r * 0.66, r * 0.5, 0, 0, 7); ctx.fill();
  ctx.restore();
}

function waIntestazione(ctx, x, y, w, nome, stato, ora) {
  ctx.fillStyle = WA.verdeScuro; ctx.fillRect(x, y, w, 44);                                    // barra di stato
  ctx.fillStyle = '#ffffff'; ctx.font = WAFONT(26, 500); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(ora, x + 28, y + 23);
  ctx.fillRect(x + w - 70, y + 14, 36, 18); ctx.fillRect(x + w - 34, y + 19, 4, 8);            // batteria
  for (let q = 0; q < 4; q++) ctx.fillRect(x + w - 128 + q * 10, y + 30 - q * 5, 6, 4 + q * 5); // tacche del segnale
  const hy = y + 44, hh = 108;
  ctx.fillStyle = WA.verde; ctx.fillRect(x, hy, w, hh);
  ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const my = hy + hh / 2;
  ctx.beginPath(); ctx.moveTo(x + 52, my); ctx.lineTo(x + 24, my); ctx.moveTo(x + 36, my - 13); ctx.lineTo(x + 24, my); ctx.lineTo(x + 36, my + 13); ctx.stroke(); // freccia
  waAvatar(ctx, x + 100, my, 36);
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = WAFONT(36, 500); ctx.fillText(nome, x + 152, my - 16);
  ctx.font = WAFONT(25, 400); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(stato, x + 152, my + 22);
  // icone a destra: videocamera, telefono, menu
  const ix = x + w - 190;
  ctx.fillStyle = '#ffffff';
  rr(ctx, ix, my - 13, 32, 26, 6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(ix + 34, my - 2); ctx.lineTo(ix + 46, my - 11); ctx.lineTo(ix + 46, my + 11); ctx.lineTo(ix + 34, my + 2); ctx.fill();
  ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(ix + 96, my - 2, 14, Math.PI * 0.55, Math.PI * 1.25); ctx.stroke(); // cornetta
  ctx.beginPath(); ctx.arc(ix + 87, my + 12, 5, 0, 7); ctx.arc(ix + 86, my - 16, 5, 0, 7); ctx.fill();
  for (let q = -1; q <= 1; q++) { ctx.beginPath(); ctx.arc(x + w - 36, my + q * 12, 4, 0, 7); ctx.fill(); }
  ctx.restore();
  return hy + hh;
}

function waBarra(ctx, x, yb, w, scritto) {                           // barra in basso: "Messaggio" + tasto verde
  const bh = 78, bw = w - 130, by = yb - bh - 14, bx = x + 14;
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; rr(ctx, bx, by + 3, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
  ctx.save(); ctx.strokeStyle = WA.icone; ctx.fillStyle = WA.icone; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  const fy = by + bh / 2;
  ctx.beginPath(); ctx.arc(bx + 42, fy, 17, 0, 7); ctx.stroke();                                   // faccina
  ctx.beginPath(); ctx.arc(bx + 36, fy - 5, 2.6, 0, 7); ctx.arc(bx + 48, fy - 5, 2.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 42, fy + 1, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  if (!scritto) {                                                                                   // fotocamera
    rr(ctx, bx + bw - 56, fy - 13, 36, 28, 6); ctx.stroke(); ctx.beginPath(); ctx.arc(bx + bw - 38, fy + 1, 7, 0, 7); ctx.stroke();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.beginPath(); ctx.rect(bx + 74, by, bw - 150, bh); ctx.clip();
  if (scritto) {
    ctx.font = WAFONT(32, 400); ctx.fillStyle = WA.testo;
    const tw = ctx.measureText(scritto).width, ox = Math.min(0, bw - 160 - tw);                  // scorre se è lungo
    ctx.fillText(scritto, bx + 74 + ox, fy);
    ctx.fillStyle = WA.tasto; ctx.fillRect(bx + 76 + ox + tw, fy - 18, 3, 36);                       // cursore
  } else { ctx.font = WAFONT(32, 400); ctx.fillStyle = WA.icone; ctx.fillText('Messaggio', bx + 74, fy); }
  ctx.restore();
  // tasto verde: microfono, oppure "invia" mentre scrivo
  const cx = x + w - 60, r = 42;
  ctx.fillStyle = WA.tasto; ctx.beginPath(); ctx.arc(cx, fy, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff';
  if (scritto) { ctx.beginPath(); ctx.moveTo(cx - 14, fy - 16); ctx.lineTo(cx + 18, fy); ctx.lineTo(cx - 14, fy + 16); ctx.lineTo(cx - 9, fy); ctx.closePath(); ctx.fill(); }
  else {
    rr(ctx, cx - 8, fy - 20, 16, 26, 8); ctx.fill();
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, fy - 4, 13, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, fy + 9); ctx.lineTo(cx, fy + 18); ctx.stroke();
  }
  ctx.restore();
  return by;
}

export function chat(ctx, { messaggi = [], nome = 'Giulia', ora = '21:14' } = {}, u, t, { accento = '#ffd166' } = {}) {
  const x = 180, y = 400, w = 720, h = 860, bordo = 16;               // telefono; schermo = dentro il bordo
  const sx = x + bordo, sy = y + bordo, sw = w - 2 * bordo, sh = h - 2 * bordo;
  ctx.save();
  ctx.translate(0, Math.sin(t * 1.6) * 6);                            // il telefono "respira" in mano
  ctx.fillStyle = 'rgba(20,4,10,0.45)'; rr(ctx, x + 14, y + 18, w, h, 60); ctx.fill();
  ctx.fillStyle = '#16161a'; rr(ctx, x, y, w, h, 60); ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  ctx.save(); rr(ctx, sx, sy, sw, sh, 46); ctx.clip();

  const arrivati = messaggi.map((m, j) => ({ ...m, k: clamp((u - CHAT_INIZIO - j * CHAT_PASSO) / 0.25) })).filter((m) => m.k > 0);
  const prossimo = messaggi.length > arrivati.length ? messaggi[arrivati.length] : null;
  const tArrivo = CHAT_INIZIO + arrivati.length * CHAT_PASSO;
  const scrive = prossimo && u > tArrivo - 0.75;
  const loScrivoIo = scrive && prossimo.da === 'a';
  const luiScrive = scrive && prossimo.da !== 'a';
  let scritto = '';
  if (loScrivoIo) { const s = String(prossimo.testo || ''); scritto = s.slice(0, Math.ceil(s.length * clamp((u - (tArrivo - 0.75)) / 0.6))); }

  waSfondo(ctx, sx, sy, sw, sh);
  const top = waIntestazione(ctx, sx, sy, sw, nome, luiScrive ? 'sta scrivendo…' : 'online', ora);
  const fondo = waBarra(ctx, sx, sy + sh, sw, scritto);

  // chip della data in alto
  ctx.font = WAFONT(24, 500); const dw = ctx.measureText('OGGI').width + 36;
  ctx.fillStyle = '#ffffff'; rr(ctx, sx + sw / 2 - dw / 2, top + 22, dw, 44, 12); ctx.fill();
  ctx.fillStyle = WA.grigio; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('OGGI', sx + sw / 2, top + 45);

  ctx.save(); ctx.beginPath(); ctx.rect(sx, top + 80, sw, fondo - top - 80); ctx.clip();
  let yy = fondo - 16;
  if (luiScrive) {                                                     // fumetto bianco con i tre puntini
    const bx = sx + 34, bw = 120, bh = 66, by = yy - bh;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; rr(ctx, bx, by + 3, bw, bh, 18); ctx.fill();
    ctx.fillStyle = WA.suo; rr(ctx, bx, by, bw, bh, 18); ctx.fill();
    for (let q = 0; q < 3; q++) { ctx.fillStyle = WA.icone; ctx.beginPath(); ctx.arc(bx + 34 + q * 26, by + bh / 2 - Math.max(0, Math.sin(t * 10 - q)) * 7, 8, 0, 7); ctx.fill(); }
    yy = by - 14;
  }
  const L = 54, PAD = 24, MAXW = sw * 0.76;
  for (let j = arrivati.length - 1; j >= 0 && yy > top + 80; j--) {
    const m = arrivati[j], mio = m.da === 'a';
    const primo = j === 0 || messaggi[j - 1].da !== m.da;             // la codina solo sul primo del gruppo
    ctx.font = WAFONT(43, 400);
    const righe = []; let r = '';
    for (const p of String(m.testo || '').split(' ')) { const prova = r ? r + ' ' + p : p; if (ctx.measureText(prova).width > MAXW - 2 * PAD && r) { righe.push(r); r = p; } else r = prova; }
    righe.push(r);
    ctx.font = WAFONT(22, 400); const meta = ctx.measureText(ora).width + (mio ? 36 : 0) + 18;
    ctx.font = WAFONT(43, 400);
    const larghe = righe.map((q) => ctx.measureText(q).width);
    const ultimaCi = larghe[larghe.length - 1] + meta <= MAXW - 2 * PAD;
    const bw = Math.max(...larghe, ultimaCi ? larghe[larghe.length - 1] + meta : meta) + 2 * PAD;
    const bh = righe.length * L + (ultimaCi ? 0 : 32) + 28;
    const bx = mio ? sx + sw - 34 - bw : sx + 34, by = yy - bh;
    const e = easeOut(m.k);
    ctx.save(); ctx.globalAlpha = e; ctx.translate(0, (1 - e) * 40);  // sale dal basso come su WhatsApp
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; rr(ctx, bx, by + 3, bw, bh, 18); ctx.fill();
    ctx.fillStyle = mio ? WA.mio : WA.suo; rr(ctx, bx, by, bw, bh, 18); ctx.fill();
    if (primo) {                                                        // codina in alto, verso l'esterno
      ctx.beginPath();
      if (mio) { ctx.moveTo(bx + bw - 24, by); ctx.lineTo(bx + bw + 16, by); ctx.quadraticCurveTo(bx + bw + 4, by + 10, bx + bw, by + 26); }
      else { ctx.moveTo(bx + 24, by); ctx.lineTo(bx - 16, by); ctx.quadraticCurveTo(bx - 4, by + 10, bx, by + 26); }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = WA.testo; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    righe.forEach((q, n) => ctx.fillText(q, bx + PAD, by + 13 + L / 2 + n * L));
    const my = by + bh - 20;
    ctx.font = WAFONT(22, 400); ctx.fillStyle = WA.grigio; ctx.textAlign = 'right';
    ctx.fillText(ora, bx + bw - PAD - (mio ? 34 : 0), my);
    if (mio) waSpunte(ctx, bx + bw - PAD - 27, my, WA.spunte);
    ctx.restore();
    yy = by - (j > 0 && messaggi[j - 1].da === m.da ? 6 : 16);
  }
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

// ---- LENTE -------------------------------------------------------------------------------------------------------
// Un oggetto disegnato grande; una lente d'ingrandimento lo scorre e si ferma su un dettaglio (punto: [dx, dy] in
// -1..1 rispetto al centro dell'oggetto), che si cerchia di rosso con l'etichetta. LENTE_ARRIVO: quando si ferma.
export const LENTE_ARRIVO = 1.3;
export function lente(ctx, { icona: ic = 'jeans', punto = [0.3, -0.3], etichetta = '' } = {}, u, t, { accento = '#ffd166', cx = W / 2, cy = 820, lato = 620 } = {}) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,4,10,0.35)'; ctx.beginPath(); ctx.arc(cx + 12, cy + 16, lato * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = CREMA; ctx.beginPath(); ctx.arc(cx, cy, lato * 0.55, 0, 7); ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  icona(ctx, ic, cx, cy, lato * 0.8, { t, accento });
  // percorso della lente: arco dal basso a sinistra fino al dettaglio, con easeInOut e un piccolo assestamento
  const k = clamp(u / LENTE_ARRIVO), e = k < 1 ? 0.5 - 0.5 * Math.cos(Math.PI * k) : 1;
  const tx = cx + punto[0] * lato * 0.4, ty = cy + punto[1] * lato * 0.4, sx = cx - lato * 0.55, sy = cy + lato * 0.5;   // parte dal basso: non copre il titolo
  const arco = Math.sin(Math.PI * e) * 120;
  const assest = u > LENTE_ARRIVO ? Math.exp(-(u - LENTE_ARRIVO) * 8) * Math.sin((u - LENTE_ARRIVO) * 30) * 10 : 0;
  const lx = sx + (tx - sx) * e + assest, ly = sy + (ty - sy) * e - arco, R = 150;
  ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.clip();          // dentro la lente: ingrandito 2×
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(lx - R, ly - R, 2 * R, 2 * R);
  ctx.translate(lx, ly); ctx.scale(2, 2); ctx.translate(-lx, -ly);
  icona(ctx, ic, cx + (cx - lx) * 0, cy, lato * 0.8, { t, accento });
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(lx - 50, ly - 50, 40, 0, 7); ctx.fill();   // riflesso
  ctx.lineWidth = 22; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.stroke();
  ctx.lineWidth = 12; ctx.strokeStyle = '#c9c9c9'; ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineWidth = 46; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.moveTo(lx + R * 0.72, ly + R * 0.72); ctx.lineTo(lx + R * 1.5, ly + R * 1.5); ctx.stroke();
  ctx.lineWidth = 32; ctx.strokeStyle = '#8a5a3c'; ctx.beginPath(); ctx.moveTo(lx + R * 0.78, ly + R * 0.78); ctx.lineTo(lx + R * 1.48, ly + R * 1.48); ctx.stroke();
  // cerchio rosso che si disegna e etichetta
  const c = clamp((u - LENTE_ARRIVO - 0.1) / 0.4);
  if (c > 0) {
    ctx.lineWidth = 12; ctx.strokeStyle = '#e8435a'; ctx.beginPath(); ctx.arc(lx, ly, R + 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(c)); ctx.stroke();
    if (etichetta) {
      const a = clamp((c - 0.5) / 0.5); ctx.save(); ctx.translate(lx < cx ? lx + 60 : lx - 60, ly - R - 90); ctx.scale(pop(a), pop(a)); ctx.rotate(-0.06);
      ctx.font = FONT(56, 900); const lw = ctx.measureText(etichetta).width + 60;
      ctx.fillStyle = '#e8435a'; rr(ctx, -lw / 2, -46, lw, 88, 44); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(etichetta, 0, -2); ctx.restore();
    }
  }
  ctx.restore();
}

// ---- CONFRONTO ---------------------------------------------------------------------------------------------------
// Schermo diviso PRIMA | DOPO con una tendina che scorre (entra da destra, rimbalza al centro, poi oscilla piano).
// prima/dopo: {icona, etichetta}. CONFRONTO_CENTRO: quando la tendina arriva al centro (suono).
export const CONFRONTO_CENTRO = 0.55;
export function confronto(ctx, { prima = {}, dopo = {} } = {}, u, t, { accento = '#ffd166', y = 470, h = 760 } = {}) {
  const k = clamp(u / CONFRONTO_CENTRO), e = 1 - Math.pow(1 - k, 3);
  const over = u > CONFRONTO_CENTRO ? Math.exp(-(u - CONFRONTO_CENTRO) * 5) * Math.sin((u - CONFRONTO_CENTRO) * 18) * 60 : 0;
  const dx = 1000 + (W / 2 - 1000) * e + over + (u > 1.5 ? Math.sin((u - 1.5) * 1.4) * 70 : 0);
  const pannello = (lato, x0, x1) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, h); ctx.clip();
    ctx.fillStyle = lato === prima ? '#3a3a44' : accento; ctx.fillRect(x0, y, x1 - x0, h);
    ctx.save(); if (lato === prima) ctx.filter = 'grayscale(1)';
    icona(ctx, lato.icona || 'stella', lato === prima ? W * 0.27 : W * 0.73, y + h * 0.48, 380, { t, accento: lato === prima ? '#bbbbbb' : '#ffffff' });
    ctx.restore();
    ctx.font = FONT(58, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const lx = lato === prima ? W * 0.27 : W * 0.73;
    ctx.lineWidth = 14; ctx.strokeStyle = INCHIOSTRO; ctx.strokeText(String(lato.etichetta || (lato === prima ? 'PRIMA' : 'DOPO')).toUpperCase(), lx, y + h - 80);
    ctx.fillStyle = '#fff'; ctx.fillText(String(lato.etichetta || (lato === prima ? 'PRIMA' : 'DOPO')).toUpperCase(), lx, y + h - 80);
    ctx.restore();
  };
  ctx.save();
  ctx.fillStyle = 'rgba(20,4,10,0.45)'; rr(ctx, 56, y + 16, W - 100, h, 40); ctx.fill();
  ctx.save(); rr(ctx, 44, y, W - 88, h, 40); ctx.clip();
  pannello(prima, 0, dx); pannello(dopo, dx, W);
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = INCHIOSTRO; rr(ctx, 44, y, W - 88, h, 40); ctx.stroke();
  // la tendina: barra bianca con la maniglia
  ctx.fillStyle = '#fff'; ctx.fillRect(dx - 7, y, 14, h);
  ctx.beginPath(); ctx.arc(dx, y + h / 2, 44, 0, 7); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  ctx.fillStyle = INCHIOSTRO; ctx.font = FONT(40, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('‹ ›', dx, y + h / 2 + 2);
  ctx.restore();
}
