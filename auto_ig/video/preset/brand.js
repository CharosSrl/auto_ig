// PRESET — Identità TeamUp Esports: colori, font, simbolo (doppio chevron "UP") e logo, disegnati su canvas 2D.

export const PRIMARIO = '#5b21b6';   // viola profondo: fondo principale
export const ACCENTO = '#22d3ee';    // ciano neon: evidenziazioni, bottoni, simbolo
export const SCURO = '#0b0a14';      // quasi nero: testo su fondo chiaro, fondi "buio"
export const CHIARO = '#f5f3ff';     // bianco lavanda: card e pillole chiare

export const font = (px, w = 700, fam = '"DejaVu Sans", sans-serif') => `${w} ${px}px ${fam}`;
export const fontLogo = (px) => font(px, 900, 'Lato, "DejaVu Sans", sans-serif');

// Il simbolo: due chevron sovrapposti che salgono ("team" + "up", come i gradi di un rank).
// cx, cy = centro; s = lato del riquadro; lw = spessore del tratto.
export function simbolo(ctx, cx, cy, s, color, lw) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const dy of [-0.16, 0.16]) {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.4, cy + s * (dy + 0.17));
    ctx.lineTo(cx, cy + s * (dy - 0.17));
    ctx.lineTo(cx + s * 0.4, cy + s * (dy + 0.17));
    ctx.stroke();
  }
  ctx.restore();
}

// Logo completo: simbolo + "TeamUp" + "ESPORTS" + slogan (canvas trasparente)
export function logo(ctx, w, h, { colore = ACCENTO, slogan = 'Trova il tuo team', coloreSlogan = '#ffffff' } = {}) {
  simbolo(ctx, w / 2, h * 0.24, h * 0.36, colore, h * 0.045);
  ctx.fillStyle = '#ffffff'; ctx.font = fontLogo(Math.round(h * 0.22)); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('TeamUp', w / 2, h * 0.64);
  ctx.fillStyle = colore; ctx.font = font(Math.round(h * 0.07), 800);
  ctx.fillText('E S P O R T S', w / 2, h * 0.75);
  if (slogan) { ctx.fillStyle = coloreSlogan; ctx.font = font(Math.round(h * 0.062), 400); ctx.fillText(slogan, w / 2, h * 0.9); }
  ctx.textAlign = 'left';
}
