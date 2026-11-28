// PRESET blocchi — pose e azioni animate degli avatar (skill animazione-personaggi-2d + motion-design:
// anticipazione, easing, inerzia, braccia opposte alle gambe, il corpo vive sempre).
//   applicaPosa(av, nome, t, o)    t = tempo assoluto (s); o.u = avanzamento 0..1 delle azioni a tempo; o.fase per camminare
//   mescolaPose(av, [[nome, peso, o], ...], t)   -> transizioni morbide tra due pose
// Convenzioni: rotazione x negativa = arto in avanti; braccio sinistro (−x) verso l'esterno = z negativa, destro = z positiva.
// Testa: x positiva = guarda giù, y = gira. Busto: x positiva = si piega in avanti.

export const POSE_NOMI = ['fermo', 'parla', 'cammina', 'corre', 'indica', 'conserte', 'facepalm', 'salta', 'gira', 'balla',
  'saluta', 'spallucce', 'telefono', 'pensa', 'maniFianchi', 'seduto', 'esulta', 'disperato',
  'ride', 'piegato', 'strappa', 'guardaGiu', 'triste', 'mostra'];

const cl = (x) => Math.min(1, Math.max(0, x));
export const easeOut = (x) => 1 - Math.pow(1 - cl(x), 3);
export const easeInOut = (x) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeBack = (x) => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const sin = Math.sin, PI = Math.PI;

function zero() {
  return { y: 0, x: 0, ry: 0, sy: 1, bx: 0, by: 0, bz: 0, tx: 0, ty: 0, tz: 0, bSx: 0, bSz: -0.05, bDx: 0, bDz: 0.05, gSx: 0, gSz: 0, gDx: 0, gDz: 0 };
}
// respiro e micro-movimenti: il personaggio non è mai fermo
function vivo(p, t, k = 1) {
  p.bx += 0.015 * sin(t * 2.1) * k; p.sy *= 1 + 0.008 * sin(t * 2.1) * k;
  p.bSz += -0.03 * sin(t * 1.3) * k; p.bDz += 0.03 * sin(t * 1.3 + 0.7) * k;
  p.ty += 0.05 * sin(t * 0.7) * k; p.tz += 0.02 * sin(t * 0.9) * k;
  return p;
}

const POSE = {
  fermo: (t) => vivo(zero(), t),
  parla: (t, o) => {
    const e = o.energia ?? 0.6, p = vivo(zero(), t);
    const g = 0.5 + 0.5 * sin(t * 4.3), g2 = 0.5 + 0.5 * sin(t * 3.1 + 1.7);
    p.bDx = -0.35 - 0.55 * e * g; p.bDz = 0.12 + 0.12 * e * g;            // gesticola col braccio destro
    p.bSx = -0.12 - 0.35 * e * g2; p.bSz = -0.1 - 0.08 * e * g2;
    p.tx = 0.06 * e * sin(t * 6.5); p.ty += 0.12 * sin(t * 1.4); p.by = 0.06 * sin(t * 1.4 + 0.5);
    return p;
  },
  cammina: (t, o) => {
    const f = o.fase ?? t * 6, p = zero(), a = 0.6 * (o.ampiezza ?? 1);
    p.gSx = -a * sin(f); p.gDx = a * sin(f);
    p.bSx = a * 0.85 * sin(f); p.bDx = -a * 0.85 * sin(f);                // braccia opposte alle gambe
    p.y = 0.08 * Math.abs(sin(f)); p.bx = 0.05; p.by = 0.06 * sin(f); p.tx = 0.03;
    return p;
  },
  corre: (t, o) => {
    const f = o.fase ?? t * 10, p = zero();
    p.gSx = -1.05 * sin(f); p.gDx = 1.05 * sin(f); p.bSx = 1.1 * sin(f); p.bDx = -1.1 * sin(f);
    p.bSz = -0.2; p.bDz = 0.2; p.y = 0.2 * Math.abs(sin(f)); p.bx = 0.22; p.tx = -0.12; p.by = 0.1 * sin(f);
    return p;
  },
  indica: (t, o) => {                                                    // anticipazione all'indietro, poi scatta in avanti
    const u = o.u ?? 1, p = vivo(zero(), t, 0.6);
    const ant = u < 0.18 ? easeOut(u / 0.18) : 1 - easeOut((u - 0.18) / 0.12);
    const su = easeBack((u - 0.12) / 0.3);
    p.bDx = 0.35 * ant - 1.55 * su; p.bDz = 0.08 - 0.1 * su; p.by = -0.12 * su; p.bx = -0.04 * su;
    p.ty += -0.15 * su; p.bSx = 0.1;
    return p;
  },
  conserte: (t, o) => {
    const k = easeOut((o.u ?? 1) / 0.35), p = vivo(zero(), t);
    p.bSx = -1.2 * k; p.bSz = 0.78 * k; p.bDx = -1.3 * k; p.bDz = -0.8 * k; p.tx = -0.06 * k; p.tz += 0.08 * k;
    return p;
  },
  facepalm: (t, o) => {
    const u = o.u ?? 1, k = easeOut(u / 0.3), p = vivo(zero(), t, 0.5);
    p.bDx = -2.55 * k; p.bDz = -0.55 * k; p.tx = 0.32 * k; p.bx = 0.12 * k;
    p.ty = 0.1 * sin(t * 5) * k; p.bSz = -0.08;                          // scuote piano la testa
    return p;
  },
  salta: (t, o) => {                                                     // schiaccia, vola, atterra schiacciato
    const u = o.u ?? 0.5, p = zero(), alt = o.altezza ?? 1.2;
    if (u < 0.15) { const k = easeOut(u / 0.15); p.sy = 1 - 0.14 * k; p.bx = 0.15 * k; p.bSx = 0.4 * k; p.bDx = 0.4 * k; }
    else if (u < 0.75) {
      const v = (u - 0.15) / 0.6; p.y = alt * 4 * v * (1 - v); p.sy = 1 + 0.1 * (1 - Math.abs(v * 2 - 1));
      p.bSz = -2.5; p.bDz = 2.5; p.gSx = -0.35; p.gDx = 0.2; p.tx = -0.15;
    } else { const k = 1 - easeOut((u - 0.75) / 0.25); p.sy = 1 - 0.12 * k; p.bSz = -0.5 * k; p.bDz = 0.5 * k; }
    return p;
  },
  gira: (t, o) => { const p = vivo(zero(), t); p.ry = easeInOut(o.u ?? 1) * (o.angolo ?? PI); p.by = 0.15 * sin((o.u ?? 1) * PI); return p; },
  balla: (t) => {
    const p = zero(), b = t * 2 * PI * 1.1;                              // ~130 bpm
    p.x = 0.18 * sin(b / 2); p.y = 0.08 * Math.abs(sin(b)); p.bz = 0.1 * sin(b / 2);
    p.bSz = -1.2 - 0.9 * Math.max(0, sin(b / 2)); p.bDz = 1.2 + 0.9 * Math.max(0, -sin(b / 2));
    p.bSx = -0.3; p.bDx = -0.3; p.gSz = -0.18 * Math.max(0, sin(b / 2)); p.gDz = 0.18 * Math.max(0, -sin(b / 2));
    p.tz = 0.15 * sin(b / 2); p.tx = 0.08 * sin(b);
    return p;
  },
  saluta: (t, o) => {
    const k = easeBack((o.u ?? 1) / 0.25), p = vivo(zero(), t);
    p.bDz = 2.55 * k + 0.28 * sin(t * 11) * k; p.bDx = -0.2 * k; p.tz += -0.1 * k; return p;
  },
  spallucce: (t, o) => {
    const u = o.u ?? 1, k = Math.sin(cl(u / 0.5) * PI) * 0.6 + easeOut(u / 0.3) * 0.4, p = vivo(zero(), t);
    p.bSx = -0.75 * k; p.bDx = -0.75 * k; p.bSz = -0.5 * k; p.bDz = 0.5 * k; p.tz += 0.2 * k; p.sy = 1 + 0.03 * k; return p;
  },
  telefono: (t) => { const p = vivo(zero(), t); p.bDx = -1.0; p.bDz = -0.42; p.tx = 0.32; p.ty = -0.18; p.bSx = -0.15; return p; },
  pensa: (t) => { const p = vivo(zero(), t); p.bDx = -2.3; p.bDz = -0.55; p.tz += 0.18; p.ty += 0.25; p.tx = -0.12; p.bSx = -0.9; p.bSz = 0.6; return p; },
  maniFianchi: (t) => { const p = vivo(zero(), t); p.bSz = -0.55; p.bDz = 0.55; p.bSx = 0.18; p.bDx = 0.18; p.tx = -0.05; return p; },
  seduto: (t) => { const p = vivo(zero(), t, 0.6); p.gSx = -PI / 2; p.gDx = -PI / 2; p.bSx = -0.6; p.bDx = -0.6; return p; },
  esulta: (t, o) => {
    const k = easeBack((o.u ?? 1) / 0.3), p = zero(); p.bSz = -2.7 * k; p.bDz = 2.7 * k; p.bSx = -0.2; p.bDx = -0.2;
    p.y = 0.3 * Math.abs(sin(t * 7)) * k; p.tx = -0.2 * k; return p;
  },
  disperato: (t, o) => {                                                 // mani in testa
    const k = easeOut((o.u ?? 1) / 0.3), p = vivo(zero(), t);
    p.bSx = -2.75 * k; p.bSz = 0.5 * k; p.bDx = -2.75 * k; p.bDz = -0.5 * k; p.tx = 0.15 * k; p.tz = 0.12 * sin(t * 6) * k; return p;
  },
  // --- 2026-11-28: azioni per la regia frase per frase ---
  ride: (t, o) => {                                                      // risata: testa indietro, mani alla pancia, sussulti
    const k = easeOut((o.u ?? 1) / 0.2), p = vivo(zero(), t);
    p.tx = -0.28 * k + 0.07 * sin(t * 17) * k; p.bx = -0.06 * k; p.y = 0.05 * Math.abs(sin(t * 8.5)) * k;
    p.bSx = -0.85 * k; p.bSz = 0.55 * k; p.bDx = -0.85 * k; p.bDz = -0.55 * k; return p;
  },
  piegato: (t, o) => {                                                   // si china a guardare (microscopio, tavolo)
    const k = easeInOut((o.u ?? 1) / 0.35), p = vivo(zero(), t, 0.4);
    p.bx = 0.5 * k; p.tx = 0.3 * k; p.bSx = -0.95 * k; p.bDx = -0.95 * k; p.bSz = 0.2 * k; p.bDz = -0.2 * k;
    p.bDx += 0.08 * sin(t * 2.3) * k; return p;                         // la mano gira la messa a fuoco
  },
  strappa: (t, o) => {                                                   // si stacca le palline dai pantaloni, a strattoni
    const k = easeOut((o.u ?? 1) / 0.25), p = vivo(zero(), t, 0.5), tir = Math.max(0, sin(t * 7.5));
    p.bx = 0.42 * k; p.tx = 0.38 * k; p.ty = -0.15 * k;
    p.bDx = (-0.45 + 0.4 * tir) * k; p.bDz = (-0.32 - 0.12 * tir) * k; p.bSz = -0.35 * k; p.bSx = 0.15 * k; return p;
  },
  guardaGiu: (t, o) => {                                                 // guarda le sue scarpe
    const k = easeOut((o.u ?? 1) / 0.3), p = vivo(zero(), t);
    p.tx = 0.55 * k; p.bx = 0.14 * k; p.bSx = -0.2 * k; p.bDx = -0.2 * k; return p;
  },
  triste: (t, o) => {                                                    // spalle giù, testa bassa, dondola piano
    const k = easeInOut((o.u ?? 1) / 0.5), p = vivo(zero(), t, 0.5);
    p.tx = 0.32 * k; p.bx = 0.1 * k; p.sy = 1 - 0.03 * k; p.bSz = 0.05 * k; p.bDz = -0.05 * k; p.ty += 0.1 * sin(t * 0.8) * k; return p;
  },
  mostra: (t, o) => {                                                    // tiene una cosa davanti con due mani
    const k = easeBack((o.u ?? 1) / 0.3), p = vivo(zero(), t);
    p.bSx = -1.4 * k; p.bDx = -1.4 * k; p.bSz = 0.22 * k; p.bDz = -0.22 * k; p.tx = 0.1 * k; return p;
  },
};

function calcola(nome, t, o = {}) { return (POSE[nome] || POSE.fermo)(t, o); }

function imposta(av, p) {
  const b = av.base;
  av.root.position.set(b.x + p.x * Math.cos(b.ry), b.y + p.y, b.z - p.x * Math.sin(b.ry));
  av.root.rotation.y = b.ry + p.ry;
  const s = p.sy; av.root.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  av.busto.rotation.set(p.bx, p.by, p.bz);
  av.collo.rotation.set(p.tx, p.ty, p.tz);
  av.braccioS.rotation.set(p.bSx, 0, p.bSz); av.braccioD.rotation.set(p.bDx, 0, p.bDz);
  av.gambaS.rotation.set(p.gSx, 0, p.gSz); av.gambaD.rotation.set(p.gDx, 0, p.gDz);
}

export function applicaPosa(av, nome, t, o) { imposta(av, calcola(nome, t, o)); }

export function mescolaPose(av, lista, t) {
  const tot = lista.reduce((s, [, w]) => s + w, 0) || 1, acc = {};
  for (const [nome, w, o] of lista) {
    const p = calcola(nome, t, o);
    for (const k in p) acc[k] = (acc[k] || 0) + p[k] * (k === 'sy' ? w / tot : w / tot);
  }
  imposta(av, acc);
}
