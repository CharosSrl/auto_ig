// PRESET blocchi — facce disegnate (texture sul davanti della testa).
//   disegnaFaccia(ctx, W, H, f)   f = {occhi, espr, bocca, palpebra, sguardo:[x,y], guance, lentiggini, colOcchi, sopracciglia}
//   OCCHI, ESPRESSIONI, BOCCHE (le 9 del labiale: X M F A E O U L S)
// Stile: tratti scuri pieni, riflessi bianchi negli occhi, guance rosate leggere. Si legge anche a 100 px.

export const OCCHI = ['tondi', 'ciglia', 'sottili', 'assonnati', 'furbi', 'grandi'];
export const ESPRESSIONI = ['neutra', 'felice', 'risata', 'sorpresa', 'schifata', 'arrabbiata', 'furba', 'triste'];
export const BOCCHE = ['X', 'M', 'F', 'A', 'E', 'O', 'U', 'L', 'S'];

const INK = '#1d1418', BOCCA_DENTRO = '#4a1620', LINGUA = '#e2737b', DENTI = '#fffaf3';

// Per espressione: sopracciglia [sinistro, destro] come {y: alzate (+ su), a: inclinazione (+ = interno giù)},
// occhi (scala, "chiusi felici"), bocca di base.
const ESPR = {
  neutra:     { br: [{ y: 0, a: 0 }, { y: 0, a: 0 }], sc: 1, bocca: 'neutra' },
  felice:     { br: [{ y: 6, a: -0.08 }, { y: 6, a: -0.08 }], sc: 1, bocca: 'felice' },
  risata:     { br: [{ y: 12, a: -0.12 }, { y: 12, a: -0.12 }], sc: 1, chiusi: true, bocca: 'risata' },
  sorpresa:   { br: [{ y: 22, a: -0.1 }, { y: 22, a: -0.1 }], sc: 1.22, bocca: 'sorpresa' },
  schifata:   { br: [{ y: -4, a: 0.3 }, { y: 12, a: -0.15 }], sc: 0.9, socchiusi: 0.35, bocca: 'schifata' },
  arrabbiata: { br: [{ y: -6, a: 0.42 }, { y: -6, a: 0.42 }], sc: 0.95, socchiusi: 0.3, bocca: 'arrabbiata' },
  furba:      { br: [{ y: -2, a: 0.15 }, { y: 16, a: -0.12 }], sc: 1, socchiusi: 0.4, bocca: 'furba' },
  triste:     { br: [{ y: 6, a: -0.4 }, { y: 6, a: -0.4 }], sc: 1, bocca: 'triste' },
};

function ellisse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), rot, 0, Math.PI * 2); }

function occhio(ctx, x, y, f, lato, e) {
  const tipo = f.occhi || 'tondi', sc = e.sc, [gx, gy] = f.sguardo || [0, 0];
  const pal = Math.min(1, Math.max(f.palpebra || 0, e.socchiusi || 0));
  ctx.save(); ctx.translate(x + gx * 7, y - gy * 5);
  if (e.chiusi || pal >= 0.95) {                               // occhio chiuso: arco (felice ^ o battito —)
    ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath();
    if (e.chiusi) ctx.arc(0, 10, 20, Math.PI * 1.15, Math.PI * 1.85); else { ctx.moveTo(-19, 0); ctx.quadraticCurveTo(0, 7, 19, 0); }
    ctx.stroke(); ctx.restore(); return;
  }
  let rx = 15 * sc, ry = 22 * sc;
  if (tipo === 'sottili') { rx = 21 * sc; ry = 8 * sc; }
  if (tipo === 'grandi') { rx = 24 * sc; ry = 28 * sc; }
  // palpebra (assonnati, furbi, socchiusi, battito): l'occhio si RITAGLIA sotto la linea, niente pezze color pelle
  const lid = tipo === 'assonnati' ? Math.max(pal, 0.45) : tipo === 'furbi' ? Math.max(pal, 0.3) : pal;
  const incl = tipo === 'furbi' ? (lato < 0 ? -6 : 6) : 0, cut = -ry + 2 * ry * lid;
  ctx.save();
  if (lid > 0.02) { ctx.beginPath(); ctx.moveTo(-50, cut - incl); ctx.lineTo(50, cut + incl); ctx.lineTo(50, 60); ctx.lineTo(-50, 60); ctx.closePath(); ctx.clip(); }
  if (tipo === 'grandi') {                                     // bianco + iride colorata + pupilla
    ellisse(ctx, 0, 0, rx, ry); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ellisse(ctx, gx * 5, 3 - gy * 4, 15 * sc, 18 * sc); ctx.fillStyle = f.colOcchi || '#5b3a24'; ctx.fill();
    ellisse(ctx, gx * 5, 3 - gy * 4, 8 * sc, 10 * sc); ctx.fillStyle = INK; ctx.fill();
  } else { ellisse(ctx, 0, 0, rx, ry); ctx.fillStyle = INK; ctx.fill(); }
  // riflessi: uno grande in alto verso la luce (sinistra), uno piccolo in basso
  ctx.fillStyle = '#fff';
  if (tipo !== 'sottili') {
    ellisse(ctx, -rx * 0.32, -ry * 0.38, Math.max(4.5, rx * 0.3), Math.max(5, ry * 0.24)); ctx.fill();
    ellisse(ctx, rx * 0.3, ry * 0.42, 2.6, 2.6); ctx.fill();
  } else { ellisse(ctx, -rx * 0.4, -2, 3.5, 2.5); ctx.fill(); }
  ctx.restore();
  if (lid > 0.02) {
    const half = rx * Math.sqrt(Math.max(0.05, 1 - Math.pow(cut / ry, 2)));
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(-half - 5, cut - incl * (half + 5) / 50); ctx.lineTo(half + 5, cut + incl * (half + 5) / 50); ctx.stroke();
  }
  if (tipo === 'ciglia') {                                     // tre ciglia verso l'esterno
    ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + lato * (0.55 + i * 0.32), bx = Math.cos(a) * rx * 0.95, by = Math.sin(a) * ry * 0.95;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * 12, by + Math.sin(a) * 12); ctx.stroke();
    }
  }
  ctx.restore();
}

function sopracciglio(ctx, x, y, b, lato, spessore) {
  ctx.save(); ctx.translate(x, y - b.y); ctx.rotate(b.a * -lato);
  ctx.strokeStyle = INK; ctx.lineWidth = spessore; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-22, 3); ctx.quadraticCurveTo(0, -6, 22, 3); ctx.stroke(); ctx.restore();
}

// Bocca aperta generica: contorno, interno scuro, denti sopra, lingua sotto
function aperta(ctx, x, y, w, h, { denti = 0.28, lingua = 0.4, forma = 'ovale' } = {}) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  if (forma === 'D') { ctx.moveTo(-w, -h * 0.35); ctx.quadraticCurveTo(0, -h * 0.55, w, -h * 0.35); ctx.quadraticCurveTo(w * 0.9, h, 0, h); ctx.quadraticCurveTo(-w * 0.9, h, -w, -h * 0.35); }
  else ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
  ctx.closePath(); ctx.fillStyle = BOCCA_DENTRO; ctx.fill();
  ctx.save(); ctx.clip();
  if (denti > 0) { ctx.fillStyle = DENTI; ctx.fillRect(-w, -h * 1.2, w * 2, h * (0.2 + denti * 1.5)); }
  if (lingua > 0) { ctx.fillStyle = LINGUA; ellisse(ctx, 0, h * 0.95, w * 0.7, h * lingua * 1.2); ctx.fill(); }
  ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
}

function linea(ctx, pts, lw = 8) {
  ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  if (pts.length === 6) ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
  else for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
}

function bocca(ctx, x, y, nome) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1.3, 1.3); ctx.translate(-x, -y);
  boccaForma(ctx, x, y, nome); ctx.restore();
}
function boccaForma(ctx, x, y, nome) {
  switch (nome) {
    // espressioni
    case 'neutra': return linea(ctx, [x - 26, y, x, y + 7, x + 26, y]);
    case 'felice': return linea(ctx, [x - 36, y - 8, x, y + 24, x + 36, y - 8], 9);
    case 'risata': return aperta(ctx, x, y + 4, 40, 30, { forma: 'D', denti: 0.22, lingua: 0.45 });
    case 'sorpresa': return aperta(ctx, x, y + 8, 17, 23, { denti: 0, lingua: 0.25 });
    case 'schifata': return linea(ctx, [x - 30, y + 6, x - 14, y - 4, x, y + 4, x + 14, y - 4, x + 30, y + 8], 8);
    case 'arrabbiata': return aperta(ctx, x, y + 6, 34, 11, { denti: 0.9, lingua: 0 });
    case 'furba': return linea(ctx, [x - 26, y + 4, x + 6, y + 10, x + 32, y - 10], 8);
    case 'triste': return linea(ctx, [x - 30, y + 14, x, y - 6, x + 30, y + 14], 8);
    // labiale (stesse 9 forme di labiale.py)
    case 'X': return linea(ctx, [x - 24, y + 2, x, y + 8, x + 24, y + 2]);
    case 'M': return linea(ctx, [x - 22, y + 4, x + 22, y + 4], 10);
    case 'F': return aperta(ctx, x, y + 4, 24, 9, { denti: 0.9, lingua: 0 });
    case 'A': return aperta(ctx, x, y + 8, 28, 26, { forma: 'D', denti: 0.18, lingua: 0.45 });
    case 'E': return aperta(ctx, x, y + 5, 32, 14, { denti: 0.35, lingua: 0.3 });
    case 'O': return aperta(ctx, x, y + 7, 18, 21, { denti: 0, lingua: 0.3 });
    case 'U': return aperta(ctx, x, y + 6, 11, 13, { denti: 0, lingua: 0 });
    case 'L': return aperta(ctx, x, y + 6, 25, 17, { denti: 0.25, lingua: 0.75 });
    case 'S': return aperta(ctx, x, y + 5, 30, 10, { denti: 1, lingua: 0 });
  }
}

export function disegnaFaccia(ctx, W, H, f) {
  ctx.clearRect(0, 0, W, H);
  const e = ESPR[f.espr] || ESPR.neutra;
  const ox = W / 2, ey = H * 0.53, dx = W * 0.118, my = H * 0.745;
  // tratti grandi (si leggono a 100 px): tutto ingrandito 1.4 volte intorno al centro del viso
  ctx.save(); ctx.translate(ox, H * 0.6); ctx.scale(1.7, 1.7); ctx.translate(-ox, -H * 0.6);
  if (f.guance !== false) {                                    // guance rosate morbide
    for (const s of [-1, 1]) {
      const g = ctx.createRadialGradient(ox + s * dx * 1.45, ey + 52, 2, ox + s * dx * 1.45, ey + 52, 34);
      g.addColorStop(0, 'rgba(255,120,130,0.42)'); g.addColorStop(1, 'rgba(255,120,130,0)');
      ctx.fillStyle = g; ctx.fillRect(ox + s * dx * 1.45 - 40, ey + 10, 80, 84);
    }
  }
  if (f.lentiggini) {
    ctx.fillStyle = 'rgba(150,80,45,0.55)';
    for (const s of [-1, 1]) for (const [a, b] of [[-14, 0], [0, 8], [14, -2], [6, 18], [-8, 16]]) {
      ellisse(ctx, ox + s * (dx * 1.25 + a), ey + 44 + b, 3, 3); ctx.fill();
    }
  }
  occhio(ctx, ox - dx, ey, f, -1, e);
  occhio(ctx, ox + dx, ey, f, 1, e);
  const sp = f.sopracciglia === 'folte' ? 12 : f.sopracciglia === 'sottili' ? 5 : 8;
  if (f.sopracciglia !== 'no') {
    sopracciglio(ctx, ox - dx, ey - 44, e.br[0], -1, sp);
    sopracciglio(ctx, ox + dx, ey - 44, e.br[1], 1, sp);
  }
  // naso: una piccola curva d'ombra (non un tratto nero)
  ctx.strokeStyle = 'rgba(120,60,40,0.35)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ox - 6, ey + 46); ctx.quadraticCurveTo(ox + 2, ey + 54, ox + 8, ey + 46); ctx.stroke();
  bocca(ctx, ox, my, f.bocca || e.bocca);
  ctx.restore();
}
