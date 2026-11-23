// PRESET — Identità TeamUp Esports: colori, font e logo ufficiale (marca/logo.png, copiato qui in preset/logo.png).
// Il logo è un'immagine: common.js aspetta `logoPronto` prima del primo fotogramma, così non manca mai nel video.

export const PRIMARIO = '#690aba';   // viola scuro del cappuccio: fondo principale
export const VIOLA = '#900dff';      // viola acceso del cappuccio
export const LILLA = '#b661ff';      // luce del cappuccio
export const ACCENTO = '#32bbf0';    // ciano del controller: evidenziazioni, bottoni
export const ORO = '#eaba02';        // oro del trofeo
export const SCURO = '#0b0a14';      // quasi nero: testo su fondo chiaro, fondi "buio"
export const CHIARO = '#f5f3ff';     // bianco lavanda: card e pillole chiare

export const font = (px, w = 700, fam = '"DejaVu Sans", sans-serif') => `${w} ${px}px ${fam}`;
export const fontLogo = (px) => font(px, 900, 'Lato, "DejaVu Sans", sans-serif');

// Logo ufficiale (stemma: incappucciato + controller + trofeo), 590×872
export const LOGO = new Image();
export const logoPronto = new Promise((ok, ko) => {
  LOGO.onload = () => ok();
  LOGO.onerror = () => ko(new Error('logo non trovato: auto_ig/video/preset/logo.png (copia di marca/logo.png)'));
});
LOGO.src = new URL('./logo.png', import.meta.url).href;
const RAPPORTO = 590 / 872;

// Lo stemma centrato in (cx, cy), alto h px.
export function stemma(ctx, cx, cy, h) {
  if (!LOGO.complete || !LOGO.naturalWidth) return;
  const w = h * RAPPORTO;
  ctx.drawImage(LOGO, cx - w / 2, cy - h / 2, w, h);
}

// Il simbolo del brand dentro un riquadro di lato s (firma storica: colore e spessore ignorati, è il logo vero).
export function simbolo(ctx, cx, cy, s) {
  stemma(ctx, cx, cy, s * 1.25);
}

// Logo completo: stemma + "TeamUp" + "ESPORTS" + slogan (canvas trasparente)
export function logo(ctx, w, h, { colore = ACCENTO, slogan = 'Trova il tuo team', coloreSlogan = '#ffffff' } = {}) {
  stemma(ctx, w / 2, h * 0.235, h * 0.43);
  ctx.fillStyle = '#ffffff'; ctx.font = fontLogo(Math.round(h * 0.2)); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('TeamUp', w / 2, h * 0.64);
  ctx.fillStyle = colore; ctx.font = font(Math.round(h * 0.07), 800);
  ctx.fillText('E S P O R T S', w / 2, h * 0.75);
  if (slogan) { ctx.fillStyle = coloreSlogan; ctx.font = font(Math.round(h * 0.062), 400); ctx.fillText(slogan, w / 2, h * 0.9); }
  ctx.textAlign = 'left';
}
