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
    const kk = att ? clamp((u - 0.3) / 0.35) : 1;            // il nodo nuovo arriva quando la linea lo raggiunge
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
    const a = att ? clamp((u - 0.4) / 0.3) : 1;
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
export function contatore(ctx, { da = 0, a = 100, unita = '', durata = 2.2, colore = '#4fb3ff' } = {}, u, t,
  { accento = '#ffd166', box = { x: 240, y: 690, w: 600, h: 500 } } = {}) {
  const k = easeOut(clamp(u / durata) * 1.0), v = da + (a - da) * k, fine = u >= durata;
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
