// PRESET blocchi — OGGETTI di scena animati, uno per ogni cosa che la voce nomina (regia "frase per frase",
// Antonio 2026-11-28: "ogni frase deve avere una animazione ad-hoc").
//   const o = creaOggetto(THREE, def, mondo); scene.add(o.gruppo); o.aggiorna(lt, t)
//   def = {tipo, id, dove:[x,y,z] | [x,z], ry, scala, entra:{al, come:'pop'|'cade'|'vola'}, azioni:[{al, fai}], ...}
//   lt = secondi dall'inizio della frase, t = tempo assoluto. Ogni `al` è già il tempo VERO della parola detta
//   (lo calcola auto_ig/regia3d.py dai tempi di whisper: nel copione si scrive {parola: "spinose"}).
//   mondo = {avatar(chi), oggetto(id)}: per gli oggetti che seguono qualcuno (le palline spinose che si attaccano).
// TIPI: cane, pallina, palline, microscopio, ganci, scarpaVelcro, tavolo, lampada
import { boxTondo, plastica, tono, rnd } from './geometria.js';
import { easeOut, easeInOut, easeBack } from './pose.js';

export const OGGETTI = ['cane', 'pallina', 'palline', 'microscopio', 'ganci', 'scarpaVelcro', 'tavolo', 'lampada'];

const cl = (x) => Math.min(1, Math.max(0, x));
const sin = Math.sin, PI = Math.PI;
const tempo = (x, d = 0) => (x && typeof x.al === 'number' ? x.al : d);

function blocco(THREE, g, w, h, d, c, x, y, z, { r = 0.08, ex } = {}) {
  const m = new THREE.Mesh(boxTondo(THREE, w, h, d, r, 2), typeof c === 'string' ? plastica(THREE, c, ex) : c);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}

// pallina spinosa (la bardana): un nucleo con tante punte, una geometria sola
export function geoPallina(THREE, r = 0.32, punta = 1.9) {
  const base = new THREE.IcosahedronGeometry(r, 1).toNonIndexed(), p = base.attributes.position, out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cen = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    cen.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    const ap = cen.clone().normalize().multiplyScalar(r * punta);           // la punta, verso fuori
    for (const [u, v] of [[a, b], [b, c], [c, a]]) out.push(u.x, u.y, u.z, v.x, v.y, v.z, ap.x, ap.y, ap.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals(); return g;
}
function matPallina(THREE, i = 0) {
  return plastica(THREE, ['#8d7a2c', '#7a8a2e', '#9a6f2a'][i % 3], { flatShading: true, roughness: 0.8 });
}

// entrata: pop (scala con rimbalzo), cade (dall'alto, rimbalza a terra), vola (arco di lato)
function entrata(lt, e) {
  if (!e) return { s: 1, dy: 0, dx: 0, vis: true };
  const k = (lt - tempo(e)) / (e.durata || 0.45);
  if (k < 0) return { s: 0, dy: 0, dx: 0, vis: false };
  if (e.come === 'cade') {
    const v = cl(k), alt = e.altezza ?? 7;
    const dy = v < 0.7 ? alt * (1 - (v / 0.7) ** 2) : alt * 0.08 * sin(((v - 0.7) / 0.3) * PI);
    return { s: 1, sy: v > 0.68 && v < 0.85 ? 0.82 : 1, dy, dx: 0, vis: true };
  }
  if (e.come === 'vola') {
    const v = easeOut(k); return { s: Math.min(1, k * 3), dy: 3 * sin(v * PI) * (1 - v), dx: (e.da ?? -8) * (1 - v), vis: true };
  }
  return { s: easeBack(k), dy: 0, dx: 0, vis: true };
}

// --- cane a blocchi: cammina (zampe in diagonale), scodinzola, abbaia, si scuote; si riempie di palline ---
function cane(THREE, d) {
  const g = new THREE.Group(), col = d.colore || '#d9a25a', chiaro = '#fff1dc', scuro = tono(col, -0.45);
  const corpo = new THREE.Group(); corpo.position.y = 1.55; g.add(corpo);
  const busto = blocco(THREE, corpo, 1.55, 1.25, 2.7, col, 0, 0, 0, { r: 0.3 });
  blocco(THREE, corpo, 1.2, 0.9, 0.5, chiaro, 0, -0.1, 1.2, { r: 0.22 });           // petto chiaro
  const testa = new THREE.Group(); testa.position.set(0, 0.95, 1.45); corpo.add(testa);
  blocco(THREE, testa, 1.35, 1.25, 1.3, col, 0, 0.1, 0, { r: 0.32 });
  const muso = new THREE.Group(); muso.position.set(0, -0.15, 0.75); testa.add(muso);
  blocco(THREE, muso, 0.8, 0.32, 0.7, chiaro, 0, 0.06, 0.1, { r: 0.14 });          // muso sopra
  const mascella = blocco(THREE, muso, 0.72, 0.2, 0.62, chiaro, 0, -0.2, 0.06, { r: 0.09 });
  const lingua = blocco(THREE, muso, 0.34, 0.06, 0.4, '#ff7a93', 0, -0.13, 0.18, { r: 0.03 }); lingua.visible = false;
  blocco(THREE, muso, 0.34, 0.24, 0.2, '#1d1416', 0, 0.2, 0.46, { r: 0.09, ex: { roughness: 0.25 } });   // naso lucido
  for (const s of [-1, 1]) {                                                         // occhioni vivi
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), plastica(THREE, '#ffffff', { roughness: 0.3 }));
    o.position.set(s * 0.34, 0.32, 0.6); testa.add(o);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), plastica(THREE, '#1b120c', { roughness: 0.15 }));
    pu.position.set(0, 0, 0.1); o.add(pu);
    const lu = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    lu.position.set(0.04, 0.05, 0.09); pu.add(lu);
  }
  const orecchie = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.68, 0.55, -0.05); testa.add(p);
    blocco(THREE, p, 0.3, 0.95, 0.62, scuro, 0, -0.42, 0, { r: 0.13 }); return p;
  });
  const coda = new THREE.Group(); coda.position.set(0, 0.45, -1.3); corpo.add(coda);
  blocco(THREE, coda, 0.28, 0.28, 1.05, col, 0, 0, -0.45, { r: 0.12 }); coda.rotation.x = -0.75;
  const zampe = [[-0.45, 0.9], [0.45, 0.9], [-0.45, -0.9], [0.45, -0.9]].map(([x, z]) => {
    const p = new THREE.Group(); p.position.set(x, 1.15, z); g.add(p);
    blocco(THREE, p, 0.46, 1.2, 0.5, col, 0, -0.55, 0, { r: 0.14 });
    blocco(THREE, p, 0.5, 0.22, 0.6, chiaro, 0, -1.08, 0.05, { r: 0.09 });          // zampetta chiara
    return p;
  });
  // punti dove si attaccano le palline (sul pelo): coordinate del corpo
  // sulla superficie: fianchi e schiena del corpo, poi fronte e orecchie della testa (si vedono nel primo piano)
  const r = rnd(77), ancore = [];
  for (let i = 0; i < 16; i++) {
    if (i % 3 === 2) ancore.push({ su: testa, v: new THREE.Vector3((r() - 0.5) * 1.1, 0.1 + r() * 0.6, 0.7) });
    else if (i % 3 === 1) ancore.push({ su: corpo, v: new THREE.Vector3((r() - 0.5) * 1.2, 0.68, -1.0 + r() * 2.0) });
    else ancore.push({ su: corpo, v: new THREE.Vector3((r() < 0.5 ? -1 : 1) * 0.82, -0.3 + r() * 0.8, -1.1 + r() * 2.2) });
  }
  const PASSO = 1.5;
  return {
    gruppo: g, corpo, ancore,
    ancora(i, v) { const p = ancore[i % ancore.length]; g.updateMatrixWorld(true); return p.su.localToWorld(v.copy(p.v)); },
    aggiorna(lt, t) {
      let x, z, ry = d.ry ?? 0, fase = 0, amp = 0;
      const dove = d.dove || [0, 0];
      if (d.da && d.a) {
        const t0 = d.parte?.al ?? 0, tc = d.durata ?? 2.2, k = easeInOut((lt - t0) / tc);
        const dx = d.a[0] - d.da[0], dz = d.a[1] - d.da[1], L = Math.hypot(dx, dz);
        x = d.da[0] + dx * k; z = d.da[1] + dz * k;
        if (k > 0 && k < 1) { ry = Math.atan2(dx, dz); fase = (L * k) / PASSO * PI; amp = Math.min(1, 0.4 + (1 - Math.abs(2 * k - 1)) * 0.9); }
        else ry = d.ry ?? Math.atan2(dx, dz);
      } else { x = dove[0]; z = dove[dove.length - 1]; }
      g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(d.scala || 1);
      // zampe in diagonale (anteriore sx con posteriore dx), corpo che rimbalza due volte per ciclo
      zampe.forEach((p, i) => { p.rotation.x = 0.55 * amp * sin(fase + (i === 0 || i === 3 ? 0 : PI)); });
      corpo.position.y = 1.55 + 0.1 * amp * Math.abs(sin(fase)) + 0.02 * sin(t * 2.4);
      // azioni
      let abbaia = 0, scuoti = 0, felice = d.felice ?? true, seduto = 0;
      for (const a of d.azioni || []) {
        const k = lt - tempo(a);
        if (k < 0) continue;
        if (a.fai === 'abbaia' && k < 0.5) abbaia = Math.max(abbaia, Math.max(0, sin((k / 0.22) * PI)));
        if (a.fai === 'scuoti' && k < 1.0) scuoti = Math.exp(-k * 2.2) * sin(k * 34);
        if (a.fai === 'triste') felice = false;
        if (a.fai === 'siede') seduto = easeOut(k / 0.35);
      }
      testa.rotation.x = -0.35 * abbaia + 0.05 * sin(t * 1.7);
      testa.rotation.y = 0.12 * sin(t * 0.9);
      mascella.position.y = -0.2 - 0.22 * abbaia; lingua.visible = abbaia > 0.2 || (felice && amp > 0.3);
      corpo.rotation.z = 0.32 * scuoti; testa.rotation.z = -0.4 * scuoti;
      corpo.rotation.x = -0.35 * seduto; zampe[2].rotation.x -= 1.1 * seduto; zampe[3].rotation.x -= 1.1 * seduto;
      corpo.position.y -= 0.45 * seduto;
      orecchie.forEach((p, i) => { p.rotation.z = (i ? -1 : 1) * (0.15 + 0.5 * Math.abs(scuoti) + 0.1 * amp * sin(fase * 2)); p.rotation.x = -0.4 * abbaia; });
      coda.rotation.y = (felice ? 0.65 : 0.12) * sin(t * (felice ? 15 : 4)); coda.rotation.x = felice ? -0.75 : -0.1;
    },
  };
}

// --- palline spinose che volano dai cespugli e si attaccano: a gambe di avatar e al pelo del cane ---
//   {tipo:'palline', al (parola), verso:['inventore','cane'], n, passo, da:[[x,y,z]...]}
function palline(THREE, d, mondo) {
  const g = new THREE.Group(), n = d.n || 14, passo = d.passo ?? 0.07, r = rnd(d.seme || 5);
  const geo = geoPallina(THREE, 0.2), parti = [];
  const fonti = d.da || [[-5, 1.2, -2], [5, 1.2, -2], [0, 1.0, -4]];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, matPallina(THREE, i)); m.castShadow = true; g.add(m);
    const chi = (d.verso || ['tu'])[i % (d.verso || ['tu']).length];
    parti.push({ m, chi, i, da: new THREE.Vector3(...fonti[i % fonti.length]).add(new THREE.Vector3((r() - 0.5) * 2, r() * 0.8, (r() - 0.5) * 1.5)),
      off: new THREE.Vector3((r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.1), -0.4 - r() * 1.2, 0.35 + r() * 0.2), gamba: r() < 0.5 ? 'gambaS' : 'gambaD', rot: r() * 6 });
  }
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  const bersaglio = (p, out) => {
    const o = mondo.oggetto(p.chi);
    if (o && o.ancora) return o.ancora(p.i, out);
    const av = mondo.avatar(p.chi); av.root.updateMatrixWorld(true);
    return av[p.gamba].localToWorld(out.copy(p.off).setX(p.off.x * 0.6));
  };
  return {
    gruppo: g,
    aggiorna(lt, t) {
      for (const p of parti) {
        const k = (lt - tempo(d) - p.i * passo) / 0.35;
        p.m.visible = k > 0; if (!p.m.visible) continue;
        bersaglio(p, w);
        if (k < 1) { const e = easeOut(k); v.lerpVectors(p.da, w, e); v.y += 2.2 * sin(e * PI); p.m.position.copy(v); p.m.rotation.set(t * 9 + p.rot, t * 7, 0); p.m.scale.setScalar(0.6 + 0.4 * e); }
        else { const a = k - 1; p.m.position.copy(w); p.m.scale.setScalar(1 + 0.35 * Math.exp(-a * 8) * sin(a * 30)); p.m.rotation.set(p.rot, p.rot * 2, 0); }
      }
    },
  };
}

// --- microscopio da tavolo, con la pallina sul vetrino e la lucina che si accende ---
function microscopio(THREE, d) {
  const g = new THREE.Group(), met = '#2c3140', bianco = '#f1f1ee', oro = '#d9b44a';
  blocco(THREE, g, 2.0, 0.35, 2.4, met, 0, 0.18, 0, { r: 0.12 });
  const luce = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 24), new THREE.MeshStandardMaterial({ color: '#fff6c8', emissive: '#ffe27a', emissiveIntensity: 0 }));
  luce.position.set(0, 0.42, 0.25); g.add(luce);
  blocco(THREE, g, 0.5, 2.6, 0.55, bianco, 0, 1.6, -0.8, { r: 0.15 });                 // braccio
  blocco(THREE, g, 1.5, 0.12, 1.3, met, 0, 1.25, 0.25, { r: 0.05 });                   // piatto
  blocco(THREE, g, 0.9, 0.04, 0.4, '#cfe8ff', 0, 1.33, 0.25, { r: 0.02, ex: { transparent: true, opacity: 0.7 } });
  const pal = new THREE.Mesh(geoPallina(THREE, 0.12), matPallina(THREE, 1)); pal.position.set(0, 1.45, 0.25); g.add(pal);
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.0, 24), plastica(THREE, bianco)); tubo.position.set(0, 3.0, 0.05); tubo.rotation.x = 0.35; g.add(tubo);
  const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.5, 18), plastica(THREE, met)); ob.position.set(0, 1.95, 0.35); g.add(ob);
  const oc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.55, 18), plastica(THREE, met)); oc.position.set(0, 4.05, -0.3); oc.rotation.x = 0.35; g.add(oc);
  const anello = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.05, 8, 24), plastica(THREE, oro, { metalness: 0.6, roughness: 0.3 })); anello.position.copy(tubo.position); anello.rotation.x = PI / 2 + 0.35; g.add(anello);
  const vite = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 20), plastica(THREE, met)); m.rotation.z = PI / 2; m.position.set(s * 0.38, 1.9, -0.8); g.add(m); return m; });
  return {
    gruppo: g, punto: new THREE.Vector3(0, 4.2, 0),
    aggiorna(lt, t) {
      const [x, y, z] = d.dove || [0, 0, 0]; g.position.set(x, y, z); g.rotation.y = d.ry ?? 0; g.scale.setScalar(d.scala || 1);
      const acc = d.accendi ? cl((lt - tempo(d.accendi)) / 0.2) : 1;
      luce.material.emissiveIntensity = 1.6 * acc;
      vite.forEach((m) => { m.rotation.x = 0.9 * sin(t * 1.1); });                   // la messa a fuoco gira piano
    },
  };
}

// --- i ganci visti al microscopio: uncini della pallina che afferrano i peli (anelli) ---
//   {tipo:'ganci', aggancia:{al}, tira:{al}}
function ganci(THREE, d) {
  const g = new THREE.Group(), legno = '#a07a36', pelo = '#f4e2b8';
  const base = new THREE.Mesh(new THREE.SphereGeometry(9, 48, 24, 0, PI * 2, 0, 0.45), plastica(THREE, tono(legno, -0.15), { roughness: 0.85 }));
  base.position.y = -8.1; base.receiveShadow = true; g.add(base);
  const curva = new THREE.CatmullRomCurve3([[0, 0, 0], [0, 1.4, 0], [0.05, 2.1, 0], [0.4, 2.45, 0], [0.8, 2.3, 0], [0.92, 1.85, 0]].map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curva, 40, 0.12, 10, false);
  const punta = new THREE.SphereGeometry(0.13, 12, 10), mat = plastica(THREE, legno, { roughness: 0.5 });
  const uncini = [], anelli = [], r = rnd(11);
  const geoAnello = new THREE.TorusGeometry(0.62, 0.075, 10, 32), matA = plastica(THREE, pelo, { roughness: 0.7 });
  for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) {
    const u = new THREE.Group(); u.position.set(i * 1.6 + (j % 2) * 0.5, 0.75, j * 1.6); u.rotation.y = (r() - 0.5) * 0.6; g.add(u);
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; u.add(m);
    const pp = new THREE.Mesh(punta, mat); pp.position.set(0.92, 1.85, 0); u.add(pp);
    uncini.push(u);
    // l'anello (un pelo del cane) scende e passa sotto la punta dell'uncino
    const a = new THREE.Mesh(geoAnello, matA); a.castShadow = true; g.add(a);
    anelli.push({ a, u, ritardo: r() * 0.35, giro: (r() - 0.5) * 0.4 });
  }
  const tmp = new THREE.Vector3();
  return {
    gruppo: g,
    aggiorna(lt, t) {
      const [x, y, z] = d.dove || [0, 0, 0]; g.position.set(x, y, z); g.scale.setScalar(d.scala || 1);
      const tA = tempo(d.aggancia, 0.6), tT = tempo(d.tira, tA + 1.2);
      for (const { a, u, ritardo, giro } of anelli) {
        const k = easeOut((lt - tA - ritardo) / 0.55), tira = easeInOut((lt - tT - ritardo * 0.5) / 0.5);
        u.updateMatrixWorld(true);
        u.localToWorld(tmp.set(0.45, 2.45, 0)); g.worldToLocal(tmp);            // la cima dell'uncino
        a.position.set(tmp.x, tmp.y + 0.5 + 5.5 * (1 - k), tmp.z);                 // l'anello ci resta appeso sopra
        a.rotation.set(0, u.rotation.y + PI / 2 + giro, 0.25 * sin(t * 2 + ritardo * 9) * (1 - k));
        // quando tira, l'uncino si piega un po' ma tiene
        u.rotation.z = -0.18 * tira * (1 + 0.15 * sin(t * 18) * (1 - tira));
        u.position.y = 0.75 + 0.25 * tira;
      }
    },
  };
}

// --- la scarpa col velcro gigante: le strisce si aprono (strappo) e si chiudono ---
//   {tipo:'scarpaVelcro', aperta:false, azioni:[{al, fai:'apri'|'chiudi'}], colore, colore2}
function scarpaVelcro(THREE, d) {
  const g = new THREE.Group(), col = d.colore || '#f7f7f7', c2 = d.colore2 || '#e9463c', grigio = '#bfc3c9';
  blocco(THREE, g, 2.3, 0.4, 4.6, '#fbfbf6', 0, 0.2, 0.2, { r: 0.16 });                // suola
  blocco(THREE, g, 2.32, 0.12, 4.62, tono(c2, -0.1), 0, 0.06, 0.2, { r: 0.05 });
  blocco(THREE, g, 2.1, 1.35, 3.6, col, 0, 1.0, -0.1, { r: 0.45 });                    // tomaia
  blocco(THREE, g, 2.0, 0.8, 1.3, tono(col, 0.1), 0, 0.72, 1.85, { r: 0.4 });          // punta
  blocco(THREE, g, 1.7, 1.1, 0.5, c2, 0, 1.8, -1.6, { r: 0.2 });                       // tallone
  for (const s of [-1, 1]) blocco(THREE, g, 0.06, 0.35, 2.4, c2, s * 1.06, 0.85, 0.1, { r: 0.03 });
  const fasce = [0.75, -0.25].map((zz) => {
    blocco(THREE, g, 1.5, 0.05, 0.62, grigio, 0.1, 1.71, zz, { r: 0.02, ex: { roughness: 1 } });   // il "pelo" del velcro
    const p = new THREE.Group(); p.position.set(-1.05, 1.72, zz); g.add(p);
    const m = blocco(THREE, p, 2.25, 0.13, 0.7, c2, 1.1, 0.06, 0, { r: 0.05 });
    blocco(THREE, m, 1.5, 0.03, 0.6, tono(grigio, -0.15), 0, -0.08, 0, { r: 0.01, ex: { roughness: 1 } });
    return p;
  });
  const pel = [], r = rnd(3);                                                           // pelucchi che volano allo strappo
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), plastica(THREE, '#ffffff')); g.add(m); pel.push({ m, v: [r() - 0.3, 0.6 + r(), (r() - 0.5)], f: i % 2 }); }
  return {
    gruppo: g, punto: new THREE.Vector3(0, 1.6, 0.3),
    aggiorna(lt, t) {
      const [x, y, z] = d.dove || [0, 0, 0]; g.position.set(x, y, z); g.rotation.y = d.ry ?? 0; g.scale.setScalar(d.scala || 1);
      let ap = d.aperta ? 1 : 0, ultimo = -1;
      for (const a of d.azioni || []) {
        const k = lt - tempo(a); if (k < 0) continue;
        if (a.fai === 'apri') { ap = easeOut(k / 0.3); ultimo = tempo(a); }
        if (a.fai === 'chiudi') ap = 1 - easeBack(k / 0.28);
      }
      fasce.forEach((p, i) => { p.rotation.z = Math.max(0, ap - i * 0.08) * 2.35 + 0.02 * sin(t * 3 + i); });
      const k = ultimo >= 0 ? lt - ultimo : -1;
      pel.forEach(({ m, v, f }) => {
        m.visible = k > 0 && k < 0.9; if (!m.visible) return;
        m.position.set(0.3 + v[0] * k * 3, 1.85 + v[1] * k * 3 - 4 * k * k, (f ? 0.75 : -0.25) + v[2] * k * 2); m.rotation.set(k * 9, k * 7, 0);
      });
    },
  };
}

function tavolo(THREE, d) {
  const g = new THREE.Group(), c = d.colore || '#a8693f';
  blocco(THREE, g, d.largo || 8, 0.4, d.fondo || 4.2, c, 0, 3.4, 0, { r: 0.1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) blocco(THREE, g, 0.35, 3.2, 0.35, tono(c, -0.25), sx * ((d.largo || 8) / 2 - 0.5), 1.6, sz * ((d.fondo || 4.2) / 2 - 0.4));
  return { gruppo: g, aggiorna() { const [x, y, z] = d.dove || [0, 0, 0]; g.position.set(x, y, z); g.rotation.y = d.ry ?? 0; } };
}

function lampada(THREE, d) {
  const g = new THREE.Group();
  blocco(THREE, g, 1.0, 0.2, 1.0, '#2c3140', 0, 0.1, 0);
  blocco(THREE, g, 0.16, 2.4, 0.16, '#2c3140', 0, 1.3, 0, { r: 0.05 });
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.9, 20, 1, true), plastica(THREE, '#e9463c', { side: THREE.DoubleSide })); cap.position.set(0.3, 2.6, 0.3); cap.rotation.z = -0.5; g.add(cap);
  const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: '#fff6c8', emissive: '#ffd36a', emissiveIntensity: 2 })); bulbo.position.set(0.42, 2.4, 0.3); g.add(bulbo);
  const luce = new THREE.PointLight('#ffd9a0', 18, 14, 2); luce.position.set(0.6, 2.2, 0.5); g.add(luce);
  return { gruppo: g, aggiorna() { const [x, y, z] = d.dove || [0, 0, 0]; g.position.set(x, y, z); g.rotation.y = d.ry ?? 0; } };
}

function pallina(THREE, d) {
  const g = new THREE.Group(), m = new THREE.Mesh(geoPallina(THREE, d.raggio || 0.35), matPallina(THREE, 0)); m.castShadow = true; g.add(m);
  return { gruppo: g, punto: new THREE.Vector3(), aggiorna(lt, t) { const [x, y, z] = d.dove || [0, 1, 0]; g.position.set(x, y + 0.08 * sin(t * 2.2), z); m.rotation.set(t * 0.4, t * 0.6, 0); } };
}

const COSTRUISCI = { cane, palline, microscopio, ganci, scarpaVelcro, tavolo, lampada, pallina };

// def.dove a 2 numeri = [x, z] a terra; a 3 = [x, y, z]
export function creaOggetto(THREE, def, mondo) {
  const d = { ...def };
  if (Array.isArray(d.dove) && d.dove.length === 2 && d.tipo !== 'cane') d.dove = [d.dove[0], 0, d.dove[1]];
  const o = (COSTRUISCI[d.tipo] || pallina)(THREE, d, mondo);
  o.gruppo.name = 'oggetto:' + (d.id || d.tipo);
  const agg = o.aggiorna.bind(o);
  o.aggiorna = (lt, t) => {                                   // entrata comune a tutti gli oggetti
    agg(lt, t);
    const e = entrata(lt, d.entra);
    o.gruppo.visible = e.vis;
    if (e.vis && d.entra) { o.gruppo.position.y += e.dy; o.gruppo.position.x += e.dx; o.gruppo.scale.multiplyScalar(e.s); if (e.sy) o.gruppo.scale.y *= e.sy; }
  };
  o.mondoPunto = (v) => { o.gruppo.updateMatrixWorld(true); return o.gruppo.localToWorld(v.copy(o.punto || new THREE.Vector3(0, 1, 0))); };
  return o;
}
