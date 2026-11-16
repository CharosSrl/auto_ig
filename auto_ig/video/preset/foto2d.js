// Foto vere (Wikimedia Commons, solo PD/CC0) dentro le scene 2D.
// Le foto le copia auto_ig/richieste.py in auto_ig/video/_foto/ (servita dal server locale del render);
// la scheda le nomina col campo `foto: "keds-1916.jpg"`. La scena aspetta il caricamento (pronto) prima
// del primo fotogramma: una foto che manca blocca il render invece di dare un video senza foto.
import { clamp, pop, rr, FONT, INCHIOSTRO } from './grafica2d.js';
import { CREMA } from './brand.js';

export const CARTELLA_FOTO = '../_foto/';

// { mappa: nome -> Image, pronto: Promise } per tutte le foto citate dalle schede
export function caricaFoto(schede) {
  const nomi = [...new Set(schede.map((s) => s && s.foto).filter(Boolean))];
  const mappa = {};
  const pronto = Promise.all(nomi.map((nome) => new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => { mappa[nome] = img; ok(); };
    img.onerror = () => ko(new Error(`foto non trovata: ${nome} (va in <richiesta>/foto/)`));
    img.src = CARTELLA_FOTO + encodeURIComponent(nome);
  })));
  return { mappa, pronto };
}

// Cornice tipo polaroid: la foto riempie il riquadro (ritaglio al centro) con un lento zoom; entra con un pop.
// u = tempo dall'inizio della scheda; credito = riga piccola sotto la foto.
export function cornice(ctx, img, cx, cy, w, h, u, { ruota = -0.03, credito = '', bordo = 26, zoom = 0.08 } = {}) {
  if (!img || u < 0) return;
  const k = clamp(u / 0.4), sc = pop(k);
  if (sc <= 0) return;
  const piede = credito ? 70 : bordo;                      // bordo basso più alto (polaroid) se c'è il credito
  const W = w + bordo * 2, H = h + bordo + piede;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ruota * (1 + 0.5 * (1 - k))); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(20,4,10,0.45)'; rr(ctx, -W / 2 + 16, -H / 2 + 20, W, H, 14); ctx.fill();
  ctx.fillStyle = CREMA; rr(ctx, -W / 2, -H / 2, W, H, 14); ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  // foto: cover-fit + Ken Burns (zoom lento dal centro)
  const fx = -w / 2, fy = -H / 2 + bordo;
  ctx.save(); rr(ctx, fx, fy, w, h, 6); ctx.clip();
  const z = 1 + zoom * clamp(u / 6), r = Math.max(w / img.width, h / img.height) * z;
  const iw = img.width * r, ih = img.height * r;
  ctx.drawImage(img, fx + (w - iw) / 2, fy + (h - ih) / 2, iw, ih);
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(42,15,25,0.35)'; rr(ctx, fx, fy, w, h, 6); ctx.stroke();
  if (credito) {
    ctx.font = FONT(30, 700); ctx.fillStyle = '#6b4a55'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(credito, 0, H / 2 - piede / 2 + 2);
  }
  ctx.restore();
}
