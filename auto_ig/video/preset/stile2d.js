// PRESET — Stile illustrato delle icone 2D (Antonio, 2026-11-25: "i disegni sono veramente scarsi… devono essere
// bellissimi, accattivanti"). Studio e regole: skill .claude/skills/illustrazione-2d.
//
// Le icone di grafica2d.js disegnano ogni forma con fs(ctx, colore). Qui quella stessa chiamata diventa una forma
// "illustrata", senza riscrivere le icone una per una:
//   1. base piatta;
//   2. luce: una mezzaluna di luce tinta in alto a sinistra (la luce viene SEMPRE da lì, mai da tutti i lati);
//   3. ombra a taglio netto (cel) in basso a destra: più satura e più scura, tono spostato verso il freddo;
//   4. contorno dello stesso colore molto scurito (non più nero uguale per tutto), più spesso fuori che dentro.
// Poi l'icona intera riceve: ombra morbida a terra, grana fine (texture "risograph") e un filo di luce sul bordo.
//
// Per farlo serve il tracciato della forma come oggetto: `registra(ctx)` restituisce un ctx che, oltre a
// disegnare, copia beginPath/moveTo/lineTo/... in un Path2D (ctx.__path).

const METODI = ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'closePath'];

export function registra(ctx) {
  if (ctx.__registra) return ctx;
  const stato = { path: new Path2D() };
  return new Proxy(ctx, {
    get(t, k) {
      if (k === '__registra') return true;
      if (k === '__path') return stato.path;
      if (k === 'beginPath') return () => { stato.path = new Path2D(); t.beginPath(); };
      if (METODI.includes(k)) return (...a) => { try { stato.path[k](...a); } catch (e) { /* forma non registrabile */ } return t[k](...a); };
      const v = t[k];
      return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

// --- colori ------------------------------------------------------------------------------------
export function hsl(c) {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).trim());
  let r, g, b;
  if (m) {
    let h = m[1]; if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    r = parseInt(h.slice(0, 2), 16) / 255; g = parseInt(h.slice(2, 4), 16) / 255; b = parseInt(h.slice(4, 6), 16) / 255;
  } else if ((m = /^rgba?\(([^)]+)\)$/i.exec(String(c).trim()))) {
    [r, g, b] = m[1].split(',').map((x) => parseFloat(x) / 255);
  } else return null;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return { h, s, l };
}
const css = ({ h, s, l }, a = 1) => `hsla(${((h % 360) + 360) % 360},${Math.round(Math.max(0, Math.min(1, s)) * 100)}%,${Math.round(Math.max(0, Math.min(1, l)) * 100)}%,${a})`;
// sposta la tinta di `gradi` verso `meta` (es. 240 = blu freddo per le ombre, 50 = giallo caldo per le luci)
function verso(h, meta, gradi) { let d = ((meta - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), gradi); }

export function toni(colore) {
  const c = hsl(colore);
  if (!c) return null;
  const grigio = c.s < 0.08 || (c.l > 0.85 && c.s < 0.6);   // bianchi e crema: ombra lilla fredda, mai arancio
  // ombra: più scura e più satura, verso il freddo (sui gialli verso l'arancio, non verso il marrone)
  const caldo = c.h > 35 && c.h < 75;
  const ombra = grigio ? { h: 255, s: 0.14, l: c.l * 0.84 } : { h: verso(c.h, caldo ? 25 : 255, caldo ? 14 : 10), s: Math.min(1, c.s + 0.12), l: c.l * 0.8 };
  const luce = { h: grigio ? c.h : verso(c.h, 50, 8), s: c.s * 0.95, l: Math.min(0.96, c.l + (1 - c.l) * 0.38) };
  const linea = grigio ? { h: 315, s: 0.4, l: 0.13 } : { h: verso(c.h, 280, 12), s: Math.min(0.9, c.s * 0.9 + 0.15), l: Math.min(0.2, c.l * 0.32) };
  return { base: colore, ombra: css(ombra), luce: css(luce, 0.85), linea: css(linea), c };
}

// --- la forma illustrata (sostituisce fs) --------------------------------------------------------
export const LUCE = { x: -1, y: -1 };         // direzione da cui arriva la luce (alto a sinistra)

export function forma(ctx, colore, { ombra = 9, luce = 7, linea = 6.5 } = {}) {
  const p = ctx.__path, T = typeof colore === 'string' && toni(colore);
  ctx.fillStyle = colore;
  if (!p || !T) { ctx.fill(); ctx.stroke(); return; }
  ctx.fill(p);
  const lungo = (dx, dy) => { const q = new Path2D(); q.rect(-4000, -4000, 8000, 8000); q.addPath(p, new DOMMatrix().translate(dx, dy)); return q; };
  ctx.save();
  ctx.clip(p);
  // luce: mezzaluna dove la forma, spostata verso il basso-destra, non arriva
  ctx.fillStyle = T.luce; ctx.fill(lungo(-LUCE.x * luce, -LUCE.y * luce), 'evenodd');
  // ombra a taglio netto: dove la forma spostata verso la luce non copre
  ctx.fillStyle = T.ombra; ctx.fill(lungo(LUCE.x * ombra, LUCE.y * ombra), 'evenodd');
  ctx.restore();
  // contorno: colore della forma scurito (lineWidth già impostata dall'icona viene scalata)
  ctx.save(); ctx.strokeStyle = T.linea; ctx.lineWidth = linea; ctx.stroke(p); ctx.restore();
}

// --- rifinitura dell'icona intera ------------------------------------------------------------------
let GRANA = null;
function grana() {
  if (GRANA) return GRANA;
  const c = new OffscreenCanvas(256, 256), g = c.getContext('2d'), im = g.createImageData(256, 256);
  let s = 1234567;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = rnd(), on = v > 0.5 ? 255 : 0;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = on; im.data[i + 3] = Math.abs(v - 0.5) > 0.42 ? 18 : 0;
  }
  g.putImageData(im, 0, 0);
  GRANA = c;
  return c;
}

// disegna l'icona (funzione `disegna(ctx)` nello spazio 200x200 centrato) con ombra a terra, grana e bordo di luce
const CACHE = new Map();
export function iconaIllustrata(ctx, disegna, cx, cy, s, { scala = 1, ruota = 0, alpha = 1, terra = true, chiave = null } = {}) {
  // la cache serve quando la stessa icona si ripete nello stesso fotogramma (pila del contatore: decine di icone)
  const tr = ctx.getTransform(), px = Math.max(64, Math.min(1024, Math.ceil(s * Math.hypot(tr.a, tr.b) * scala * 1.25)));
  let off = chiave && CACHE.get(chiave + '|' + px);
  if (!off) {
    off = new OffscreenCanvas(px, px);
    const o = off.getContext('2d');
    o.translate(px / 2, px / 2); o.scale(px / 250, px / 250);
    disegna(registra(o));
    // grana solo dentro l'icona
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-atop';
    o.fillStyle = o.createPattern(grana(), 'repeat'); o.fillRect(0, 0, px, px);
    o.globalCompositeOperation = 'source-over';
    if (chiave) { CACHE.set(chiave + '|' + px, off); if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value); }
  }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ruota); ctx.globalAlpha *= alpha;
  const d = s * scala * 1.25;
  if (terra) {     // ombra a terra: ellisse morbida sotto l'oggetto (lo "appoggia")
    ctx.save(); ctx.fillStyle = 'rgba(10,0,8,0.28)'; ctx.filter = `blur(${Math.max(2, s * 0.04)}px)`;
    ctx.beginPath(); ctx.ellipse(s * 0.04 * scala, s * 0.5 * scala, s * 0.36 * scala, s * 0.06 * scala, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.shadowColor = 'rgba(15,0,10,0.35)'; ctx.shadowBlur = s * 0.06; ctx.shadowOffsetY = s * 0.03;
  ctx.drawImage(off, -d / 2, -d / 2, d, d);
  ctx.restore();
}

// Riflesso lucido (pelle, gomma, vernice, metallo): ellisse chiara e sfumata, solo dove la luce batte (alto-sinistra
// della forma). Si usa con parsimonia: uno o due per oggetto, mai su tutto (studio Kenney: troppi riflessi = caos).
export function lucido(ctx, x, y, rx, ry, { rot = -0.5, alpha = 0.55, colore = '255,250,240' } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, `rgba(${colore},${alpha})`); g.addColorStop(0.55, `rgba(${colore},${alpha * 0.45})`); g.addColorStop(1, `rgba(${colore},0)`);
  ctx.scale(1, ry / rx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill();
  ctx.restore();
}
// Striscia di luce netta (riflesso "a lama" su superfici lisce): una curva chiara arrotondata
export function lama(ctx, pts, { w = 7, alpha = 0.7 } = {}) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(255,252,245,${alpha})`; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  if (pts.length === 3) ctx.quadraticCurveTo(...pts[1], ...pts[2]); else pts.slice(1).forEach((q) => ctx.lineTo(...q));
  ctx.stroke(); ctx.restore();
}
