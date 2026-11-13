// PRESET — Identità Cintre: colori, font, logo (gruccia), palette outfit, disegni su canvas.

export const BORDEAUX = '#6d1a36';
export const CIPRIA = '#e8c4c0';
export const SCURO = '#1a0710';
export const CREMA = '#fffaf9';

// Outfit pronti. top/bottom/scarpe = colori; capi = capi del guardaroba (guardaroba.js).
// Senza "capi" la modella usa l'outfit base (tipo: abito | gonna | pantaloni). Usati da modella, card e app.
export const OUTFITS = [
  { nome: 'Classico', tipo: 'gonna', top: '#ffffff', bottom: '#1d3557', scarpe: '#111111', capi: { sopra: 'camicia', sotto: 'minigonna', scarpe: 'decollete' } },
  { nome: 'Cipria', tipo: 'gonna', top: '#e8c4c0', bottom: '#6d1a36', scarpe: '#6d1a36', capi: { sopra: 'maglione', sotto: 'gonnaPieghe', scarpe: 'decollete' } },
  { nome: 'Estate', tipo: 'gonna', top: '#f4a261', bottom: '#264653', scarpe: '#ffffff', capi: { sopra: 'cropTop', sotto: 'minigonna', scarpe: 'sneakers' } },
  { nome: 'Smeraldo', tipo: 'pantaloni', top: '#2a9d8f', bottom: '#e9c46a', scarpe: '#3b2219', capi: { sopra: 'tshirt', sotto: 'palazzo', scarpe: 'mocassini' } },
  { nome: 'Total black', tipo: 'abito', top: '#151515', bottom: '#151515', scarpe: '#d4af37' },
  { nome: 'Cielo', tipo: 'pantaloni', top: '#a8dadc', bottom: '#457b9d', scarpe: '#ffffff', capi: { sopra: 'camicia', sotto: 'jeans', scarpe: 'sneakers' } },
  { nome: 'Pesca', tipo: 'gonna', top: '#ffb4a2', bottom: '#6d6875', scarpe: '#3b2219', capi: { sopra: 'dolcevita', sotto: 'minigonna', scarpe: 'stivali' } },
  { nome: 'Terra', tipo: 'pantaloni', top: '#bc6c25', bottom: '#fefae0', scarpe: '#283618', capi: { sopra: 'blazer', sotto: 'pantaloni', scarpe: 'mocassini' } },
  { nome: 'Ufficio', tipo: 'pantaloni', top: '#2b2d42', bottom: '#2b2d42', scarpe: '#111111', capi: { sopra: 'blazer', sotto: 'pantaloni', scarpe: 'decollete' } },
  { nome: 'Weekend', tipo: 'pantaloni', top: '#ffffff', bottom: '#3b5b8c', scarpe: '#ffffff', capi: { sopra: 'tshirt', sotto: 'jeans', scarpe: 'sneakers' } },
  { nome: 'Inverno', tipo: 'pantaloni', top: '#c19a6b', bottom: '#2b2b2b', scarpe: '#3b2219', capi: { sopra: 'cappotto', sotto: 'jeans', scarpe: 'stivali' } },
  { nome: 'Denim', tipo: 'pantaloni', top: '#e8c4c0', bottom: '#86acd6', scarpe: '#ffffff', capi: { sopra: 'maglione', sotto: 'shorts', scarpe: 'sneakers' } },
];
export const OUTFIT_SERATA = { nome: 'Serata Cintre', tipo: 'abito', top: BORDEAUX, bottom: BORDEAUX, scarpe: '#111111' };
export const OUTFIT_GRIGIO = { nome: 'Spento', tipo: 'gonna', top: '#d9d9d9', bottom: '#8a8a8a', scarpe: '#555555' };
// Outfit per le storie: "in casa" (spento) e "cena di lavoro" (blazer bordeaux, elegante ma comodo)
export const OUTFIT_CASA = { nome: 'Casa', tipo: 'pantaloni', top: '#d6d6d6', bottom: '#8d8d8d', scarpe: '#bdbdbd',
  capi: { sopra: 'tshirt', sotto: 'pantaloni', scarpe: 'sneakers' } };
export const OUTFIT_CENA_LAVORO = { nome: 'Cena di lavoro', tipo: 'pantaloni', top: BORDEAUX, bottom: '#1b1b1b', scarpe: '#1b1b1b',
  capi: { sopra: 'blazer', sotto: 'pantaloni', scarpe: 'decollete', colori: { sopra: { colore: BORDEAUX, interno: '#f3e9df', bottoni: '#d4af37' } } } };

export const font = (px, w = 700, fam = '"DejaVu Sans", sans-serif') => `${w} ${px}px ${fam}`;
export const fontLogo = (px) => font(px, 700, '"DejaVu Serif", serif');

export function canvasTex(THREE, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { c, ctx: c.getContext('2d'), tex };
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// La gruccia: simbolo di Cintre ("cintre" = gruccia in francese)
export function gruccia(ctx, cx, cy, s, color, lw) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.42, s * 0.14, Math.PI * 1.05, Math.PI * 2.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.22); ctx.lineTo(cx - s * 0.62, cy + s * 0.25);
  ctx.lineTo(cx + s * 0.62, cy + s * 0.25); ctx.closePath(); ctx.stroke(); ctx.restore();
}

// Logo completo: gruccia + "Cintre" + slogan (canvas trasparente)
export function logo(ctx, w, h, { colore = CIPRIA, slogan = "L'app che ti aiuta a vestirti", coloreSlogan = '#ffffff' } = {}) {
  gruccia(ctx, w / 2, h * 0.3, h * 0.43, colore, h * 0.026);
  ctx.fillStyle = colore; ctx.font = fontLogo(Math.round(h * 0.25)); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Cintre', w / 2, h * 0.74);
  if (slogan) { ctx.fillStyle = coloreSlogan; ctx.font = font(Math.round(h * 0.068), 400); ctx.fillText(slogan, w / 2, h * 0.9); }
  ctx.textAlign = 'left';
}

// Figurino stilizzato di un outfit (per card e app)
const MANICHE_LUNGHE = ['camicia', 'maglione', 'dolcevita', 'blazer', 'cappotto'];
export function figurino(ctx, cx, top, h, o) {
  const w = h * 0.42, c = o.capi || {};
  const pelle = '#eab894';
  ctx.fillStyle = '#4a2c1d'; ctx.beginPath(); ctx.ellipse(cx, top + h * 0.1, h * 0.09, h * 0.11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = pelle; ctx.beginPath(); ctx.arc(cx, top + h * 0.09, h * 0.07, 0, 7); ctx.fill();
  // braccia (pelle o maniche lunghe)
  ctx.fillStyle = MANICHE_LUNGHE.includes(c.sopra) ? o.top : pelle;
  ctx.fillRect(cx - w * 0.45, top + h * 0.2, w * 0.1, h * 0.27); ctx.fillRect(cx + w * 0.35, top + h * 0.2, w * 0.1, h * 0.27);
  ctx.fillStyle = o.top;
  const lungo = c.sopra === 'cappotto' ? 0.33 : 0;
  roundRect(ctx, cx - w * 0.33, top + h * 0.19, w * 0.66, h * (c.sopra === 'cropTop' ? 0.2 : 0.29 + lungo), 10); ctx.fill();
  ctx.fillStyle = o.tipo === 'abito' ? o.top : o.bottom;
  const tipoSotto = c.sotto || (o.tipo === 'pantaloni' ? 'pantaloni' : 'gonna');
  const yV = top + h * 0.47;
  if (['jeans', 'pantaloni', 'palazzo', 'shorts'].includes(tipoSotto)) {
    const lung = tipoSotto === 'shorts' ? 0.14 : 0.42, larg = tipoSotto === 'palazzo' ? 0.36 : 0.27;
    {
      ctx.beginPath(); ctx.moveTo(cx - w * 0.3, yV); ctx.lineTo(cx - w * 0.02, yV); ctx.lineTo(cx - w * 0.02, yV + h * lung);
      ctx.lineTo(cx - w * (0.03 + larg), yV + h * lung); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + w * 0.3, yV); ctx.lineTo(cx + w * 0.02, yV); ctx.lineTo(cx + w * 0.02, yV + h * lung);
      ctx.lineTo(cx + w * (0.03 + larg), yV + h * lung); ctx.closePath(); ctx.fill();
    }
    if (tipoSotto === 'shorts') { ctx.fillStyle = pelle; ctx.fillRect(cx - w * 0.25, yV + h * 0.14, w * 0.2, h * 0.28); ctx.fillRect(cx + w * 0.05, yV + h * 0.14, w * 0.2, h * 0.28); }
  } else {
    const fondo = tipoSotto === 'gonnaPieghe' ? 0.37 : 0.33;
    ctx.beginPath(); ctx.moveTo(cx - w * 0.31, yV); ctx.lineTo(cx + w * 0.31, yV);
    ctx.lineTo(cx + w * 0.55, top + h * (0.47 + fondo)); ctx.lineTo(cx - w * 0.55, top + h * (0.47 + fondo)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pelle; ctx.fillRect(cx - w * 0.22, top + h * 0.8, w * 0.13, h * 0.1); ctx.fillRect(cx + w * 0.09, top + h * 0.8, w * 0.13, h * 0.1);
  }
  if (lungo) { ctx.fillStyle = o.top; ctx.fillRect(cx - w * 0.36, top + h * 0.45, w * 0.18, h * 0.32); ctx.fillRect(cx + w * 0.18, top + h * 0.45, w * 0.18, h * 0.32); }
  ctx.fillStyle = o.scarpe;
  const alte = c.scarpe === 'stivali' ? 0.12 : 0.06;
  ctx.fillRect(cx - w * 0.27, top + h * (0.96 - alte), w * 0.2, h * alte); ctx.fillRect(cx + w * 0.07, top + h * (0.96 - alte), w * 0.2, h * alte);
}
