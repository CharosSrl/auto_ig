// PRESET — Il narratore di Cintre: una gruccia di legno con occhioni e labbra bordeaux che parla in basso a destra
// (Antonio, 2026-11-21: "simula con il labiale e le espressioni ciò che viene detto… mascotte, al massimo della
// qualità"). Riutilizzabile in ogni scena 2D su canvas:
//
//   const TR = caricaTraccia(p.narratore);                 // parametro calcolato da auto_ig/labiale.py
//   if (TR) narratore(ctx, ...posNarratore(TR), statoNarratore(TR, t));
//
// La traccia ha: b = bocche [[t, visema]] (X M F A E O U L S), e = energia della voce per fotogramma (base36),
// x = espressioni [[t, nome]] (neutra felice sorpresa wow furba curiosa), c = colpi [[t, 'boom'|'rivela']],
// f = inizi delle frasi, lato, s. Tutto è deterministico in t (render fotogramma per fotogramma).
// Principi (skill animazione-personaggi-2d): labiale interpolato e modulato dall'energia vera, respiro, battito di
// ciglia, saccadi dello sguardo, squash & stretch sugli accenti, anticipazione + salto sui colpi, il gancio dorato
// che segue il corpo in ritardo (follow-through), inclinazione sulle domande.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const liscio = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const LEGNO = { chiaro: '#f0b878', medio: '#cf8a4c', scuro: '#8f4f24', venatura: '#7a3f18', bordo: '#3b1a0b' };
export const ORO_GANCIO = { chiaro: '#fff1b0', medio: '#e2b23c', scuro: '#9a6a12' };
export const LABBRA = { base: '#9b1f43', luce: '#d0506f', ombra: '#5e0f27', bocca: '#3a0a17', lingua: '#e0687c' };
const IRIDE = { chiaro: '#f2b450', scuro: '#8a4a12' };

// --- Bocche (visemi): w larghezza, a apertura, r rotondità, d denti, l lingua alzata, p labbra in fuori ------
export const VISEMI = {
  X: { w: 50, a: 0, r: 0, d: 0, l: 0, p: 0 },
  M: { w: 46, a: 0, r: 0, d: 0, l: 0, p: 0.35 },
  F: { w: 54, a: 7, r: 0, d: 1, l: 0, p: 0 },
  A: { w: 60, a: 38, r: 0.25, d: 0.35, l: 0, p: 0 },
  E: { w: 68, a: 20, r: 0, d: 1, l: 0, p: 0 },
  O: { w: 42, a: 32, r: 1, d: 0.15, l: 0, p: 0.4 },
  U: { w: 30, a: 15, r: 1, d: 0, l: 0, p: 1 },
  L: { w: 56, a: 22, r: 0.1, d: 0.7, l: 1, p: 0 },
  S: { w: 62, a: 11, r: 0, d: 1, l: 0, p: 0 },
};
// --- Espressioni: o occhi aperti, gi palpebra sotto (occhi che sorridono), sx/dx sopracciglia (alto, angolo),
//     pu pupilla, sm sorriso, as asimmetria del sorriso, gu guance, tilt testa -----------------------------
export const ESPRESSIONI = {
  neutra:   { o: 1.0, gi: 0.05, sxy: 0, sxa: 0, dxy: 0, dxa: 0, pu: 1.0, sm: 0.45, as: 0, gu: 0.15, tilt: 0, ab: 0, rb: 0 },
  felice:   { o: 0.9, gi: 0.3, sxy: 6, sxa: -0.05, dxy: 6, dxa: 0.05, pu: 1.08, sm: 1, as: 0, gu: 0.6, tilt: 0.02, ab: 6, rb: 0 },
  sorpresa: { o: 1.28, gi: 0, sxy: 20, sxa: 0.12, dxy: 20, dxa: -0.12, pu: 0.78, sm: 0, as: 0, gu: 0.1, tilt: -0.02, ab: 16, rb: 0.9 },
  wow:      { o: 1.32, gi: 0.05, sxy: 22, sxa: 0.1, dxy: 22, dxa: -0.1, pu: 1.3, sm: 0.75, as: 0, gu: 0.55, tilt: 0, ab: 14, rb: 0.3 },
  furba:    { o: 0.72, gi: 0.2, sxy: 13, sxa: 0.18, dxy: -5, dxa: 0.12, pu: 1.0, sm: 0.7, as: 1, gu: 0.3, tilt: 0.06, ab: 0, rb: 0 },
  curiosa:  { o: 1.12, gi: 0, sxy: 16, sxa: 0.16, dxy: 2, dxa: 0, pu: 1.12, sm: 0.25, as: 0.3, gu: 0.15, tilt: 0.09, ab: 0, rb: 0 },
};
const mixObj = (A, B, k) => Object.fromEntries(Object.keys(A).map((n) => [n, lerp(A[n], B[n], k)]));

export function caricaTraccia(param) {
  if (!param || param === '0') return null;
  const tr = typeof param === 'string' ? JSON.parse(param) : param;
  tr.b = tr.b || [[0, 'X']]; tr.x = tr.x || [[0, 'neutra']]; tr.c = tr.c || []; tr.f = tr.f || [];
  tr.fps = tr.fps || 30; tr.e = tr.e || '';
  return tr;
}

// Centro e scala del narratore: in basso a destra, SOTTO i sottotitoli (blocco ASS: ~1290-1480, MarginV 440),
// a sinistra della colonna di icone di Instagram (x > 950) e sopra la caption (y > ~1720).
// lato 'sinistra' quando serve l'angolo destro libero.
export function posNarratore(tr) {
  const s = 0.8 * (tr.s || 1);
  return tr.lato === 'sinistra' ? [262, 1598, s] : [815, 1598, s];
}

function cerca(lista, t) {                       // indice dell'ultimo elemento con tempo <= t
  let lo = 0, hi = lista.length - 1, k = 0;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (lista[m][0] <= t) { k = m; lo = m + 1; } else hi = m - 1; }
  return k;
}
export function energiaA(tr, t) {
  const f = t * tr.fps, i = Math.floor(f), v = (j) => (j >= 0 && j < tr.e.length ? parseInt(tr.e[j], 36) / 35 : 0);
  return lerp(v(i), v(i + 1), f - i);
}

// Stato del narratore all'istante t (tutto calcolato da t: nessuna memoria tra fotogrammi)
export function statoNarratore(tr, t, { inchino = null } = {}) {
  // --- bocca: dal visema precedente al corrente in ~75 ms, apertura modulata dall'energia vera
  const kb = cerca(tr.b, t), [tb, vb] = tr.b[kb], prima = kb > 0 ? tr.b[kb - 1][1] : 'X';
  const kprec = kb > 1 ? tr.b[kb - 2][1] : prima;
  const da = mixObj(VISEMI[kprec] || VISEMI.X, VISEMI[prima] || VISEMI.X, liscio((tb - (kb > 0 ? tr.b[kb - 1][0] : 0)) / 0.075));
  const bocca = mixObj(da, VISEMI[vb] || VISEMI.X, liscio((t - tb) / 0.075));
  const en = energiaA(tr, t), enLenta = (energiaA(tr, t - 0.05) + en + energiaA(tr, t - 0.1)) / 3;
  bocca.a *= vb === 'X' || vb === 'M' ? 1 : 0.62 + 0.55 * clamp(en * 1.15);
  // --- espressione: cambio in 0,25 s
  const kx = cerca(tr.x, t), [tx, nx] = tr.x[kx], xp = kx > 0 ? tr.x[kx - 1][1] : nx;
  const espr = mixObj(ESPRESSIONI[xp] || ESPRESSIONI.neutra, ESPRESSIONI[nx] || ESPRESSIONI.neutra, liscio((t - tx) / 0.25));
  // --- colpi (boom/rivela): anticipazione (giù 0,08 s), salto (0,3 s), atterraggio schiacciato
  let salto = 0, sq = 0, eccitato = 0, colpoDt = 99;
  for (const [tc] of tr.c) {
    const d = t - tc + 0.08;                    // parte un attimo prima del colpo: anticipazione
    if (d < 0 || d > 0.75) continue;
    colpoDt = Math.min(colpoDt, d);
    if (d < 0.08) { sq += 0.08 * liscio(d / 0.08); salto -= 6 * liscio(d / 0.08); }
    else if (d < 0.38) { const k = (d - 0.08) / 0.3; salto += 46 * Math.sin(Math.PI * k); sq -= 0.07 * Math.sin(Math.PI * k); }
    else { const k = (d - 0.38) / 0.37; sq += 0.1 * Math.exp(-k * 5) * Math.cos(k * 9); }
    eccitato = Math.max(eccitato, Math.exp(-Math.max(0, d - 0.1) * 3));
  }
  // --- accenti della voce: l'energia che sale fa allungare e alzare il corpo
  const accento = clamp((en - enLenta) * 3, -0.4, 1);
  sq -= 0.035 * accento;
  // --- respiro e ondeggio (sempre, anche in silenzio)
  const respiro = Math.sin(t * Math.PI * 2 / 3.1);
  const y = -respiro * 3 - en * 7 - salto;
  let rot = Math.sin(t * 1.3) * 0.035 + Math.sin(t * 2.9 + 1) * 0.012 * en + espr.tilt;
  // inchino alla CTA
  let bow = 0;
  if (inchino != null && t >= inchino) { const k = (t - inchino) / 0.9; bow = k < 1 ? Math.sin(Math.PI * k) : 0; }
  // --- il gancio segue il corpo in ritardo e oscilla dopo i colpi (follow-through)
  const ganc = -Math.sin((t - 0.35) * 1.3) * 0.05 - 0.6 * espr.tilt
    + (colpoDt < 2 ? 0.3 * Math.exp(-colpoDt * 3.5) * Math.sin(colpoDt * 13) : 0);
  // --- occhi: battito ogni 2-5 s (con seme) + uno a inizio frase, a volte
  let ciglio = 0;
  for (let k = 0, tb2 = 0.9; k < 40 && tb2 < t + 0.2; k++) {
    const d = t - tb2;
    if (d >= 0 && d < 0.17) ciglio = Math.max(ciglio, d < 0.06 ? d / 0.06 : 1 - (d - 0.06) / 0.11);
    tb2 += 2 + 3 * hash(k * 3.7 + 1);
  }
  tr.f.forEach((tf, k) => { const d = t - tf + 0.05; if (k > 0 && hash(k * 11) > 0.45 && d >= 0 && d < 0.17) ciglio = Math.max(ciglio, d < 0.06 ? d / 0.06 : 1 - (d - 0.06) / 0.11); });
  // sguardo: saccadi rapide (60 ms) tra la camera, il titolo (in alto a sinistra) e la grafica (a sinistra)
  const BERS = [[0, 0], [0, 0], [-0.32, -0.38], [-0.4, -0.05], [0.05, 0.08], [0, 0], [-0.2, -0.3]];
  let sg = [0, 0], sp = [0, 0];
  for (let k = 0, ts = 0; k < 60; k++) {
    const dur = 0.7 + 1.1 * hash(k * 5.3 + 2), b = BERS[Math.floor(hash(k * 9.1 + 4) * BERS.length)];
    if (t < ts + dur) { sg = b; const q = liscio((t - ts) / 0.06); sg = [lerp(sp[0], b[0], q), lerp(sp[1], b[1], q)]; break; }
    sp = b; ts += dur;
  }
  if (colpoDt < 0.8) sg = [lerp(sg[0], -0.15, 0.7), lerp(sg[1], -0.3, 0.7)];   // sul colpo guarda la scritta
  // a riposo (bocca quasi chiusa) l'espressione tiene la sua bocca: sorpresa = piccola o, wow = sorriso aperto
  const riposo = 1 - clamp(bocca.a / 10);
  if (vb === 'X') { bocca.a = Math.max(bocca.a, espr.ab * riposo); bocca.r = lerp(bocca.r, espr.rb, riposo); bocca.w = lerp(bocca.w, bocca.w * (1 - 0.35 * espr.rb), riposo); }
  const happyBow = bow > 0 ? bow : 0;
  return {
    y: y + 26 * happyBow, rot, ganc, sx: 1 + sq * 0.9, sy: 1 - sq, bocca,
    espr: { ...espr, o: espr.o + 0.25 * eccitato - happyBow * 0.6, sxy: espr.sxy + 8 * eccitato, pu: espr.pu + 0.15 * eccitato },
    ciglio, sguardo: sg, en,
  };
}

// --- Disegno ------------------------------------------------------------------------------------------
// Origine = centro del corpo; s = 1 → gruccia larga ~340 px. Coordinate locali.
function corpo(ctx) {
  ctx.beginPath();
  ctx.moveTo(-160, 40);
  ctx.bezierCurveTo(-112, -4, -78, -96, 0, -98);
  ctx.bezierCurveTo(78, -96, 112, -4, 160, 40);
  ctx.bezierCurveTo(180, 52, 178, 82, 154, 84);
  ctx.bezierCurveTo(104, 76, 52, 80, 0, 82);
  ctx.bezierCurveTo(-52, 80, -104, 76, -154, 84);
  ctx.bezierCurveTo(-178, 82, -180, 52, -160, 40);
  ctx.closePath();
}

function gancio(ctx, ang) {
  ctx.save(); ctx.translate(0, -94); ctx.rotate(ang);
  const filo = () => {
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -74);
    ctx.bezierCurveTo(0, -112, 52, -118, 54, -86);
    ctx.bezierCurveTo(56, -66, 36, -60, 30, -70);
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  filo(); ctx.strokeStyle = LEGNO.bordo; ctx.lineWidth = 17; ctx.stroke();
  const g = ctx.createLinearGradient(-10, -120, 50, -40);
  g.addColorStop(0, ORO_GANCIO.chiaro); g.addColorStop(0.45, ORO_GANCIO.medio); g.addColorStop(1, ORO_GANCIO.scuro);
  filo(); ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2.5, -36); ctx.lineTo(-2.5, -72); ctx.bezierCurveTo(-1, -100, 30, -110, 42, -100);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke();
  // ghiera dorata sul legno
  ctx.beginPath(); ctx.ellipse(0, -14, 14, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = ORO_GANCIO.medio; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = LEGNO.bordo; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-4, -19, 4, 7, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
  ctx.restore();
}

function legno(ctx) {
  // ombra portata morbida + riempimento con gradiente caldo
  ctx.save();
  ctx.shadowColor = 'rgba(20,6,4,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 16;
  const g = ctx.createLinearGradient(0, -98, 0, 86);
  g.addColorStop(0, LEGNO.chiaro); g.addColorStop(0.45, LEGNO.medio); g.addColorStop(1, LEGNO.scuro);
  corpo(ctx); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  // venature (dentro il corpo): curve parallele al bordo alto + due nodi
  ctx.save(); corpo(ctx); ctx.clip();
  ctx.strokeStyle = LEGNO.venatura; ctx.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    const dy = -40 + k * 18, ond = 3 + (k % 3) * 2;
    ctx.globalAlpha = 0.13 + 0.05 * (k % 2); ctx.lineWidth = 2 + (k % 2);
    ctx.beginPath();
    for (let x = -180; x <= 180; x += 12) {
      const yy = dy + Math.abs(x) * (0.45 - k * 0.04) - 60 * (1 - Math.min(1, Math.abs(x) / 160)) ** 1.5
        + Math.sin(x * 0.05 + k * 1.7) * ond;
      if (x === -180) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 0.22; ctx.lineWidth = 2.5;
  [[-118, 48, 13, 6], [112, 52, 10, 5]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.35, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.45, ry * 0.45, 0.35, 0, Math.PI * 2); ctx.stroke();
  });
  // luce speculare lungo il bordo alto (vernice lucida) e ombra interna sul fondo
  ctx.globalAlpha = 1;
  const luce = ctx.createLinearGradient(0, -96, 0, -30);
  luce.addColorStop(0, 'rgba(255,240,210,0.75)'); luce.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.beginPath(); ctx.moveTo(-142, 28); ctx.bezierCurveTo(-102, -8, -70, -84, 0, -86); ctx.bezierCurveTo(70, -84, 102, -8, 142, 28);
  ctx.lineWidth = 12; ctx.strokeStyle = luce; ctx.stroke();
  const sotto = ctx.createLinearGradient(0, 50, 0, 86);
  sotto.addColorStop(0, 'rgba(60,20,5,0)'); sotto.addColorStop(1, 'rgba(60,20,5,0.35)');
  ctx.fillStyle = sotto; ctx.fillRect(-190, 40, 380, 50);
  ctx.restore();
  corpo(ctx); ctx.lineWidth = 6; ctx.strokeStyle = LEGNO.bordo; ctx.lineJoin = 'round'; ctx.stroke();
}

function barra(ctx, en) {                          // la barra per i pantaloni, appesa sotto con due ganci di metallo
  ctx.save(); ctx.lineCap = 'round';
  const yb = 116 + en * 2;
  [-138, 138].forEach((x) => {
    ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x * 0.98, yb); ctx.strokeStyle = LEGNO.bordo; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = ORO_GANCIO.medio; ctx.lineWidth = 4; ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(-146, yb); ctx.lineTo(146, yb); ctx.strokeStyle = LEGNO.bordo; ctx.lineWidth = 20; ctx.stroke();
  const g = ctx.createLinearGradient(0, yb - 7, 0, yb + 7); g.addColorStop(0, LEGNO.chiaro); g.addColorStop(1, LEGNO.scuro);
  ctx.strokeStyle = g; ctx.lineWidth = 12; ctx.stroke();
  ctx.restore();
}

function occhio(ctx, cx, cy, R, e, ciglio, sg, lato) {
  const apre = clamp(e.o * (1 - ciglio), 0, 1.4);
  const ry = R * 1.08 * Math.min(1.12, 0.62 + 0.38 * Math.min(apre, 1.2));
  // bulbo
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, R, ry, 0, 0, Math.PI * 2);
  const sc = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.2, cx, cy, R * 1.05);
  sc.addColorStop(0, '#ffffff'); sc.addColorStop(0.75, '#f6f1ee'); sc.addColorStop(1, '#d9cfd2');
  ctx.fillStyle = sc; ctx.fill();
  ctx.clip();
  // iride + pupilla che guardano (sg in [-1,1] relativo al raggio)
  const ix = cx + sg[0] * R * 0.62, iy = cy + sg[1] * R * 0.5, ri = R * 0.6;
  const gi = ctx.createRadialGradient(ix, iy, ri * 0.15, ix, iy, ri);
  gi.addColorStop(0, IRIDE.chiaro); gi.addColorStop(0.7, '#c97a26'); gi.addColorStop(1, IRIDE.scuro);
  ctx.beginPath(); ctx.arc(ix, iy, ri, 0, Math.PI * 2); ctx.fillStyle = gi; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(60,25,5,0.8)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(ix, iy, ri * 0.48 * e.pu, 0, Math.PI * 2); ctx.fillStyle = '#1a0a05'; ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ix - ri * 0.32, iy - ri * 0.36, ri * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ix + ri * 0.3, iy + ri * 0.28, ri * 0.1, 0, Math.PI * 2); ctx.fill();
  // palpebra sopra (legno) e palpebra sotto quando sorride
  const yTop = cy - ry + 2 * ry * clamp(1 - apre, 0, 1);
  ctx.fillStyle = LEGNO.medio; ctx.fillRect(cx - R - 4, cy - ry - 6, R * 2 + 8, yTop - (cy - ry - 6));
  const yBot = cy + ry - 2 * ry * (e.gi > 0.12 ? clamp(e.gi, 0, 0.6) : 0);
  ctx.beginPath(); ctx.moveTo(cx - R - 4, cy + ry + 6); ctx.lineTo(cx - R - 4, yBot + 6);
  ctx.quadraticCurveTo(cx, yBot - 10 * e.gi, cx + R + 4, yBot + 6); ctx.lineTo(cx + R + 4, cy + ry + 6); ctx.closePath();
  ctx.fill();
  ctx.restore();
  // contorno (solo la parte visibile tra le palpebre) + linee delle palpebre
  ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = LEGNO.bordo; ctx.lineCap = 'round';
  ctx.save(); ctx.beginPath(); ctx.rect(cx - R - 8, yTop - 1, R * 2 + 16, Math.max(0, yBot + 2 - yTop)); ctx.clip();
  ctx.beginPath(); ctx.ellipse(cx, cy, R, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  if (e.gi > 0.12 && yBot < cy + ry - 2) {
    ctx.beginPath(); ctx.moveTo(cx - R * 0.95, yBot + 4); ctx.quadraticCurveTo(cx, yBot - 12 * e.gi, cx + R * 0.95, yBot + 4); ctx.stroke();
  }
  if (apre < 0.97) {
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx - R, yTop); ctx.quadraticCurveTo(cx, yTop + (apre < 0.15 ? 8 : 3), cx + R, yTop); ctx.stroke();
  }
  // ciglia (tre trattini sul bordo esterno: danno carattere)
  const est = lato < 0 ? -1 : 1;
  ctx.lineWidth = 4.5;
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + est * (0.55 + k * 0.32), x0 = cx + Math.cos(a) * R * 0.98, y0 = Math.min(cy + Math.sin(a) * ry, yTop + 4 + k * 4);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + est * (8 + k * 2), y0 - 9 + k * 3); ctx.stroke();
  }
  ctx.restore();
}

function sopracciglio(ctx, cx, cy, alto, ang, lato) {
  ctx.save(); ctx.translate(cx, cy - alto); ctx.rotate(ang * lato);
  ctx.beginPath(); ctx.moveTo(-25, 5); ctx.quadraticCurveTo(0, -11, 25, 3);
  ctx.lineCap = 'round'; ctx.strokeStyle = LEGNO.bordo; ctx.lineWidth = 11; ctx.stroke();
  ctx.restore();
}

function bocca(ctx, cy, b, e) {
  const w = b.w * (1 - 0.18 * b.p), a = Math.max(0, b.a), sm = e.sm * (1 - 0.6 * b.r);
  const lo = 8 + 4 * b.p, lb = 10 + 5 * b.p;                    // spessore labbro sopra / sotto
  const xL = -w / 2, xR = w / 2;
  const yL = cy - sm * 9 - e.as * 5, yR = cy - sm * 9 + e.as * 7;   // angoli (furba: uno su, uno giù)
  const top = cy - a * 0.42, bot = cy + a * 0.58, tondo = b.r;
  const apertura = () => {
    ctx.beginPath(); ctx.moveTo(xL, yL);
    ctx.bezierCurveTo(xL + w * (0.12 - 0.1 * tondo), top - a * 0.15 * tondo, xR - w * (0.12 - 0.1 * tondo), top - a * 0.15 * tondo, xR, yR);
    ctx.bezierCurveTo(xR - w * (0.08 - 0.08 * tondo), bot + a * 0.2 * tondo, xL + w * (0.08 - 0.08 * tondo), bot + a * 0.2 * tondo, xL, yL);
    ctx.closePath();
  };
  // labbra: forma esterna (arco di cupido sopra) riempita
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xL - 4, yL);
  ctx.bezierCurveTo(xL + w * 0.12, top - lo * 1.1, -w * 0.16, top - lo * 1.45, 0, top - lo * 0.75);
  ctx.bezierCurveTo(w * 0.16, top - lo * 1.45, xR - w * 0.12, top - lo * 1.1, xR + 4, yR);
  ctx.bezierCurveTo(xR - w * 0.1, bot + lb * 1.3, xL + w * 0.1, bot + lb * 1.3, xL - 4, yL);
  ctx.closePath();
  const gl = ctx.createLinearGradient(0, top - lo, 0, bot + lb);
  gl.addColorStop(0, LABBRA.base); gl.addColorStop(0.55, LABBRA.base); gl.addColorStop(1, LABBRA.ombra);
  ctx.fillStyle = gl; ctx.fill();
  ctx.lineWidth = 4.5; ctx.strokeStyle = LEGNO.bordo; ctx.lineJoin = 'round'; ctx.stroke();
  // interno: bocca scura, denti, lingua
  if (a > 1.5) {
    apertura(); ctx.fillStyle = LABBRA.bocca; ctx.fill();
    ctx.save(); apertura(); ctx.clip();
    if (b.d > 0.05) {                                         // denti di sopra
      ctx.fillStyle = '#fbf6ef'; ctx.globalAlpha = clamp(b.d * 1.4);
      ctx.beginPath(); ctx.ellipse(0, top - 2, w * 0.36, Math.min(9, a * 0.5) + 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const ly = lerp(bot + 4, top + a * 0.35, b.l);           // lingua: in basso, alzata per la L
    ctx.fillStyle = LABBRA.lingua;
    ctx.beginPath(); ctx.ellipse(0, ly, w * 0.3, Math.max(6, a * 0.35), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    apertura(); ctx.lineWidth = 2.5; ctx.strokeStyle = LABBRA.ombra; ctx.stroke();
  } else {                                                    // bocca chiusa: la linea tra le labbra
    ctx.beginPath(); ctx.moveTo(xL, yL); ctx.quadraticCurveTo(0, cy + 2 + sm * 3 - b.p * 2, xR, yR);
    ctx.lineWidth = 3.5; ctx.strokeStyle = LABBRA.ombra; ctx.lineCap = 'round'; ctx.stroke();
  }
  // luce sul labbro di sotto (lucidalabbra)
  ctx.beginPath(); ctx.ellipse(-w * 0.12, bot + lb * 0.55, w * 0.14, 2.6, -0.08, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,220,230,0.55)'; ctx.fill();
  ctx.restore();
  // fossette agli angoli quando sorride
  if (sm > 0.5) {
    ctx.save(); ctx.strokeStyle = LEGNO.bordo; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.globalAlpha = clamp((sm - 0.5) * 2);
    ctx.beginPath(); ctx.arc(xL - 6, yL - 2, 7, Math.PI * 0.6, Math.PI * 1.25); ctx.stroke();
    ctx.beginPath(); ctx.arc(xR + 6, yR - 2, 7, -Math.PI * 0.25, Math.PI * 0.4); ctx.stroke();
    ctx.restore();
  }
}

// Disegna il narratore centrato in (x, y) con scala s nello stato st (da statoNarratore).
export function narratore(ctx, x, y, s, st) {
  const e = st.espr;
  ctx.save();
  ctx.translate(x, y + st.y * s); ctx.scale(s, s); ctx.rotate(st.rot);
  ctx.save(); ctx.scale(st.sx, st.sy);                     // squash & stretch dal centro del corpo
  gancio(ctx, st.ganc);
  barra(ctx, st.en);
  legno(ctx);
  // guance
  if (e.gu > 0.05) {
    ctx.save(); ctx.globalAlpha = clamp(e.gu) * 0.55;
    [-1, 1].forEach((l) => {
      const g = ctx.createRadialGradient(l * 86, 34, 2, l * 86, 34, 28);
      g.addColorStop(0, '#ff7f8f'); g.addColorStop(1, 'rgba(255,127,143,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(l * 86, 34, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  // occhioni e sopracciglia (sx = a sinistra di chi guarda)
  const R = 37, ey = -24;
  occhio(ctx, -44, ey, R, e, st.ciglio, st.sguardo, -1);
  occhio(ctx, 44, ey, R, e, st.ciglio, st.sguardo, 1);
  const alto = (v) => R * 1.08 * Math.min(1.08, 0.62 + 0.38 * Math.min(e.o, 1.15)) + 7 + v * 0.5;
  sopracciglio(ctx, -46, ey, alto(e.sxy), -e.sxa, 1);
  sopracciglio(ctx, 46, ey, alto(e.dxy), e.dxa, 1);
  ctx.save(); ctx.translate(0, 38); ctx.scale(1.25, 1.25); bocca(ctx, 0, st.bocca, e); ctx.restore();
  ctx.restore();
  ctx.restore();
}
