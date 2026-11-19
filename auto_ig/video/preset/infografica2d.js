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
