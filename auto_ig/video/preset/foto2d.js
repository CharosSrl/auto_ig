// Foto vere (Wikimedia Commons, solo PD/CC0) dentro le scene 2D: in cornice, VIVE (ondulano come una bandiera,
// riflesso, glitch sulle battute forti, da bianco e nero a colori sulla risposta).
// Le foto le copia auto_ig/richieste.py in auto_ig/video/_foto/ (servita dal server locale del render);
// la scheda le nomina col campo `foto: "keds-1916.jpg"`. La scena aspetta il caricamento (pronto) prima
// del primo fotogramma: una foto che manca blocca il render invece di dare un video senza foto.
// Regola (marca/lezioni.md n. 12): nei quiz e nelle curiosità la foto c'è dal fotogramma 0.
import { clamp, pop, rr, FONT, INCHIOSTRO } from './grafica2d.js';
import { CHIARO } from './brand.js';

export const CARTELLA_FOTO = '../_foto/';

// { mappa: nome -> Image, pronto: Promise } per tutte le foto citate dalle schede (foto e foto_risposta)
export function caricaFoto(schede) {
  const nomi = [...new Set(schede.flatMap((s) => (s ? [s.foto, s.foto_risposta] : [])).filter(Boolean))];
  const mappa = {};
  const pronto = Promise.all(nomi.map((nome) => new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => { mappa[nome] = img; ok(); };
    img.onerror = () => ko(new Error(`foto non trovata: ${nome} (va in <richiesta>/foto/)`));
    img.src = CARTELLA_FOTO + encodeURIComponent(nome);
  })));
  return { mappa, pronto };
}

// ── PRESET CORNICI ────────────────────────────────────────────────────────────────────────────────────────────
// Ognuno: bordi (lato, sopra, piede in px attorno alla foto di w×h) e disegna(c, X, Y, Wt, Ht, foto) dove
// (X, Y, Wt, Ht) è l'ingombro totale e foto = {x, y, w, h} il riquadro della foto. `sopra` = disegnato dopo la foto.
function legno(c, X, Y, W, H, b, chiaro, scuro) {           // 4 listelli a gradiente con gli angoli a 45°
  const lati = [
    [[X, Y], [X + W, Y], [X + W - b, Y + b], [X + b, Y + b], 0, 1],
    [[X + W, Y], [X + W, Y + H], [X + W - b, Y + H - b], [X + W - b, Y + b], -1, 0],
    [[X + W, Y + H], [X, Y + H], [X + b, Y + H - b], [X + W - b, Y + H - b], 0, -1],
    [[X, Y + H], [X, Y], [X + b, Y + b], [X + b, Y + H - b], 1, 0],
  ];
  lati.forEach(([a, bb, cc, d, nx, ny], k) => {
    const [x0, y0] = a, g = c.createLinearGradient(x0 + (nx < 0 ? 0 : 0), y0, x0 + nx * b, y0 + ny * b);
    const luce = k === 0 || k === 3;                         // luce da in alto a sinistra
    g.addColorStop(0, luce ? chiaro[0] : scuro[0]); g.addColorStop(0.45, luce ? chiaro[1] : scuro[1]); g.addColorStop(1, luce ? chiaro[2] : scuro[2]);
    c.beginPath(); c.moveTo(...a); c.lineTo(...bb); c.lineTo(...cc); c.lineTo(...d); c.closePath(); c.fillStyle = g; c.fill();
  });
}
export const CORNICI = {
  polaroid: {
    bordi: (cred) => ({ lato: 26, sopra: 26, piede: cred ? 70 : 26 }),
    disegna(c, X, Y, W, H) {
      c.fillStyle = CHIARO; rr(c, X, Y, W, H, 14); c.fill(); c.lineWidth = 7; c.strokeStyle = INCHIOSTRO; c.stroke();
    },
    credito: '#6b4a55',
  },
  oro: {                                                     // cornice da museo dorata, con smusso e angoli
    bordi: (cred) => ({ lato: 54, sopra: 54, piede: cred ? 96 : 54 }),
    disegna(c, X, Y, W, H, f) {
      const b = 54;
      legno(c, X, Y, W, H, b, ['#fff1b8', '#e8c25a', '#a8761c'], ['#b8862a', '#8a5c12', '#5e3c08']);
      c.lineWidth = 3; c.strokeStyle = '#5e3c08'; c.strokeRect(X + 1.5, Y + 1.5, W - 3, H - 3);
      c.strokeStyle = 'rgba(255,240,190,0.9)'; c.strokeRect(X + 14, Y + 14, W - 28, H - 28);
      c.strokeStyle = '#6b4510'; c.lineWidth = 6; c.strokeRect(X + b - 3, Y + b - 3, W - 2 * b + 6, H - 2 * b + 6);
      for (const [x, y] of [[X + 27, Y + 27], [X + W - 27, Y + 27], [X + 27, Y + H - 27], [X + W - 27, Y + H - 27]]) {
        const g = c.createRadialGradient(x - 6, y - 6, 2, x, y, 22);   // rosette agli angoli
        g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#e2b64a'); g.addColorStop(1, '#7a5010');
        c.beginPath(); for (let k = 0; k < 16; k++) { const r = k % 2 ? 12 : 22, a = (k / 16) * Math.PI * 2; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        c.closePath(); c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = '#5e3c08'; c.stroke();
      }
      if (f.piede > b) {                                     // targhetta per il credito
        c.fillStyle = '#1d140a'; rr(c, X + W / 2 - (W - 2 * b) / 2, Y + H - f.piede + 8, W - 2 * b, f.piede - b + 30, 10); c.fill();
      }
    },
    credito: '#f3d98a',
  },
  pellicola: {                                               // striscia di film con i fori
    bordi: (cred) => ({ lato: 70, sopra: 30, piede: cred ? 76 : 30 }),
    disegna(c, X, Y, W, H) {
      c.fillStyle = '#121010'; rr(c, X, Y, W, H, 10); c.fill();
      c.fillStyle = '#efe6d6';
      for (const x of [X + 18, X + W - 52]) for (let y = Y + 22; y < Y + H - 40; y += 58) { rr(c, x, y, 34, 34, 7); c.fill(); }
      c.font = FONT(22, 900); c.fillStyle = '#e8b04a'; c.textAlign = 'left'; c.fillText('KODAK  ▸ 24', X + 80, Y + 18);
    },
    credito: '#e8b04a',
  },
  nastro: {                                                  // bordo crema e due pezzi di nastro adesivo
    bordi: (cred) => ({ lato: 30, sopra: 30, piede: cred ? 72 : 30 }),
    disegna(c, X, Y, W, H) {
      c.fillStyle = '#fbf4e4'; c.fillRect(X, Y, W, H); c.lineWidth = 3; c.strokeStyle = 'rgba(18,13,36,0.25)'; c.strokeRect(X, Y, W, H);
    },
    sopra(c, X, Y, W, H) {
      for (const [x, y, a] of [[X + 20, Y + 10, -0.6], [X + W - 20, Y + 10, 0.6]]) {
        c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = 'rgba(240,232,205,0.85)'; c.fillRect(-90, -26, 180, 52);
        c.fillStyle = 'rgba(255,255,255,0.25)'; for (let k = -80; k < 90; k += 22) c.fillRect(k, -26, 9, 52); c.restore();
      }
    },
    credito: '#6b4a55',
  },
};
export const nomeCornice = (n, ripiego = 'polaroid') => (CORNICI[n] ? n : ripiego);

// tele fuori schermo riusate (una per la cornice piatta, una per la versione ondulata)
const TELE = {};
function tela(nome, w, h) {
  let c = TELE[nome];
  if (!c) { c = document.createElement('canvas'); TELE[nome] = c; }
  if (c.width < w || c.height < h) { c.width = Math.max(c.width, Math.ceil(w)); c.height = Math.max(c.height, Math.ceil(h)); }
  const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
  return [c, x];
}

// Foto in cornice disegnata piatta su c, centrata in (ox, oy). Ritorna l'ingombro {W, H}.
function piatta(c, img, ox, oy, w, h, u, { cornice = 'polaroid', credito = '', zoom = 0.08, bn = 0 } = {}) {
  const P = CORNICI[nomeCornice(cornice)], f = P.bordi(!!credito), W = w + f.lato * 2, H = h + f.sopra + f.piede;
  const X = ox - W / 2, Y = oy - H / 2, fx = X + f.lato, fy = Y + f.sopra;
  P.disegna(c, X, Y, W, H, f);
  c.save(); c.beginPath(); c.rect(fx, fy, w, h); c.clip();
  c.fillStyle = '#222'; c.fillRect(fx, fy, w, h);
  if (img) {                                                 // cover-fit + Ken Burns (zoom lento dal centro)
    const z = 1 + zoom * clamp(u / 6), r = Math.max(w / img.width, h / img.height) * z, iw = img.width * r, ih = img.height * r;
    if (bn > 0.01) c.filter = `grayscale(${bn}) brightness(${1 - 0.35 * bn}) contrast(${1 + 0.2 * bn})`;
    c.drawImage(img, fx + (w - iw) / 2, fy + (h - ih) / 2, iw, ih);
    c.filter = 'none';
  }
  const v = c.createRadialGradient(fx + w / 2, fy + h / 2, Math.min(w, h) * 0.35, fx + w / 2, fy + h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)'); c.fillStyle = v; c.fillRect(fx, fy, w, h);   // vignetta
  c.restore();
  c.lineWidth = 4; c.strokeStyle = 'rgba(18,13,36,0.35)'; c.strokeRect(fx, fy, w, h);
  if (P.sopra) P.sopra(c, X, Y, W, H, f);
  if (credito) {
    c.font = FONT(credito.length > 48 ? 24 : 28, 700); c.fillStyle = P.credito; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(credito, ox, Y + H - f.piede / 2 + 2);
  }
  return { W, H, fx, fy };
}

// FOTO VIVA. u = tempo dall'ingresso (pop), t = tempo assoluto (onda, riflesso).
// opz: cornice (preset), credito, ruota, onda (ampiezza px a riposo), colpo (0..1 energia della battuta forte:
// onda più ampia + glitch), bn (0..1 bianco e nero), riflesso (bool), zoom (Ken Burns), entrata (false = già lì).
export function fotoViva(ctx, img, cx, cy, w, h, u, t, {
  cornice = 'polaroid', credito = '', ruota = -0.03, onda = 9, colpo = 0, bn = 0, riflesso = true, zoom = 0.08, entrata = true,
} = {}) {
  if (!img || u < 0) return;
  const k = entrata ? clamp(u / 0.45) : 1, sc = entrata ? pop(k) : 1;
  if (sc <= 0) return;
  const M = 60, P = CORNICI[nomeCornice(cornice)], f = P.bordi(!!credito);
  const W = w + f.lato * 2 + M * 2, H = h + f.sopra + f.piede + M * 2;
  const [c1, x1] = tela('piatta', W, H);
  const geo = piatta(x1, img, W / 2, H / 2, w, h, u, { cornice, credito, zoom, bn });

  // riflesso di luce che attraversa il vetro (solo sulla foto)
  if (riflesso) {
    const ph = ((t + 0.6) % 2.6) / 0.9;
    if (ph < 1) {
      x1.save(); x1.beginPath(); x1.rect(geo.fx, geo.fy, w, h); x1.clip();
      const sx = geo.fx - 300 + (w + 600) * ph, g = x1.createLinearGradient(sx - 120, 0, sx + 120, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x1.translate(sx, geo.fy + h / 2); x1.transform(1, 0, -0.35, 1, 0, 0); x1.translate(-sx, -(geo.fy + h / 2));
      x1.fillStyle = g; x1.fillRect(sx - 140, geo.fy - 40, 280, h + 80); x1.restore();
    }
  }

  // ondulazione a bandiera: strisce verticali spostate su una sinusoide che scorre, + ombra sulle creste
  const [c2, x2] = tela('onda', W, H);
  const A = onda + 24 * clamp(colpo), lam = 520, om = 3.2, S = 6;
  for (let x = 0; x < W; x += S) {
    const fase = (2 * Math.PI * x) / lam - om * t, dy = A * Math.sin(fase) * Math.min(1, x / 120 + 0.3);
    x2.drawImage(c1, x, 0, S + 1, H, x, dy, S + 1, H);
  }
  x2.globalCompositeOperation = 'source-atop';
  for (let x = 0; A > 0 && x < W; x += S) {
    const pend = Math.cos((2 * Math.PI * x) / lam - om * t) * Math.min(2.5, A / 9);   // pendenza: luce/ombra del tessuto
    x2.fillStyle = pend > 0 ? `rgba(255,255,255,${0.06 * pend})` : `rgba(0,0,0,${-0.12 * pend})`;
    x2.fillRect(x, 0, S + 1, H);
  }
  x2.globalCompositeOperation = 'source-over';

  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ruota * (1 + 0.6 * (1 - k)) + 0.012 * Math.sin(t * 1.3)); ctx.scale(sc, sc);
  const ox = -W / 2, oy = -H / 2;
  ctx.save(); ctx.globalAlpha = 0.45; ctx.filter = 'brightness(0) blur(6px)'; ctx.drawImage(c2, ox + 16, oy + 22); ctx.restore();   // ombra
  const g = clamp(colpo);
  if (g > 0.05) {                                            // glitch: copie rossa e ciano sfasate + bande spostate
    const d = 22 * g;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * g;
    ctx.filter = 'sepia(1) saturate(9) hue-rotate(-40deg)'; ctx.drawImage(c2, ox - d, oy);
    ctx.filter = 'sepia(1) saturate(9) hue-rotate(150deg)'; ctx.drawImage(c2, ox + d, oy); ctx.restore();
  }
  ctx.drawImage(c2, ox, oy);
  if (g > 0.25) {
    for (let n = 0; n < 4; n++) {
      const yy = ((Math.sin(n * 91.7 + Math.floor(t * 20) * 13.1) + 1) / 2) * (H - 60), hh = 14 + n * 9, sh = (n % 2 ? 1 : -1) * 40 * g;
      ctx.drawImage(c2, 0, yy, W, hh, ox + sh, oy + yy, W, hh);
    }
  }
  ctx.restore();
}

// Compatibilità: la vecchia polaroid ferma = foto viva senza onda né riflesso.
export function cornice(ctx, img, cx, cy, w, h, u, { ruota = -0.03, credito = '', zoom = 0.08 } = {}) {
  fotoViva(ctx, img, cx, cy, w, h, u, 0, { ruota, credito, zoom, onda: 0, riflesso: false });
}
