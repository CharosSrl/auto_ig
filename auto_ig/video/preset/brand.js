// PRESET — Identità Cintre: colori, font, logo (gruccia), palette outfit, disegni su canvas.

export const BORDEAUX = '#6d1a36';
export const CIPRIA = '#e8c4c0';
export const SCURO = '#1a0710';
export const CREMA = '#fffaf9';

// Outfit pronti (tipo: abito | gonna | pantaloni). Usati da modella, card e app.
export const OUTFITS = [
  { nome: 'Classico', tipo: 'gonna', top: '#ffffff', bottom: '#1d3557', scarpe: '#111111' },
  { nome: 'Cipria', tipo: 'gonna', top: '#e8c4c0', bottom: '#6d1a36', scarpe: '#6d1a36' },
  { nome: 'Estate', tipo: 'gonna', top: '#f4a261', bottom: '#264653', scarpe: '#ffffff' },
  { nome: 'Smeraldo', tipo: 'pantaloni', top: '#2a9d8f', bottom: '#e9c46a', scarpe: '#3b2219' },
  { nome: 'Total black', tipo: 'abito', top: '#151515', bottom: '#151515', scarpe: '#d4af37' },
  { nome: 'Cielo', tipo: 'pantaloni', top: '#a8dadc', bottom: '#457b9d', scarpe: '#ffffff' },
  { nome: 'Pesca', tipo: 'gonna', top: '#ffb4a2', bottom: '#6d6875', scarpe: '#111111' },
  { nome: 'Terra', tipo: 'pantaloni', top: '#fefae0', bottom: '#bc6c25', scarpe: '#283618' },
];
export const OUTFIT_SERATA = { nome: 'Serata Cintre', tipo: 'abito', top: BORDEAUX, bottom: BORDEAUX, scarpe: '#111111' };
export const OUTFIT_GRIGIO = { nome: 'Spento', tipo: 'gonna', top: '#d9d9d9', bottom: '#8a8a8a', scarpe: '#555555' };

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
export function figurino(ctx, cx, top, h, o) {
  const w = h * 0.42;
  ctx.fillStyle = '#4a2c1d'; ctx.beginPath(); ctx.ellipse(cx, top + h * 0.1, h * 0.09, h * 0.11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#eab894'; ctx.beginPath(); ctx.arc(cx, top + h * 0.09, h * 0.07, 0, 7); ctx.fill();
  ctx.fillStyle = o.top; roundRect(ctx, cx - w * 0.33, top + h * 0.19, w * 0.66, h * 0.29, 10); ctx.fill();
  ctx.fillStyle = o.tipo === 'abito' ? o.top : o.bottom;
  if (o.tipo === 'pantaloni') {
    ctx.fillRect(cx - w * 0.3, top + h * 0.47, w * 0.27, h * 0.42); ctx.fillRect(cx + w * 0.03, top + h * 0.47, w * 0.27, h * 0.42);
  } else {
    ctx.beginPath(); ctx.moveTo(cx - w * 0.31, top + h * 0.47); ctx.lineTo(cx + w * 0.31, top + h * 0.47);
    ctx.lineTo(cx + w * 0.55, top + h * 0.8); ctx.lineTo(cx - w * 0.55, top + h * 0.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eab894'; ctx.fillRect(cx - w * 0.22, top + h * 0.8, w * 0.13, h * 0.1); ctx.fillRect(cx + w * 0.09, top + h * 0.8, w * 0.13, h * 0.1);
  }
  ctx.fillStyle = o.scarpe; ctx.fillRect(cx - w * 0.27, top + h * 0.9, w * 0.2, h * 0.06); ctx.fillRect(cx + w * 0.07, top + h * 0.9, w * 0.2, h * 0.06);
}
