// PRESET — Guardaroba Cintre: capi 3D (sopra, sotto, scarpe) in stile toon con contorno.
// Ogni capo si costruisce sullo "scheletro" della modella (gli stessi gruppi delle articolazioni),
// quindi segue tutte le pose. Gli stessi capi si possono mostrare da soli (gruccia, stender, vetrina).
//
//   lei.indossa({ sopra: 'camicia', sotto: 'jeans', scarpe: 'sneakers',
//                 colori: { sopra: '#ffffff', sotto: { colore: '#3b5b8c', cuciture: '#d9a441' } } });
//   const c = capoSingolo(THREE, 'maglione', { colori: '#e8c4c0' });  scene.add(c.g);   // su gruccia
//   capiDi('sopra')  -> ['tshirt', 'camicia', ...]
// Colori di un capo: stringa (colore principale) oppure { colore, interno, cuciture, suola, dettagli, bottoni }.
import { BORDEAUX } from './brand.js';

export const CAPI = {
  // --- sopra ---
  tshirt:      { nome: 'T-shirt', categoria: 'sopra', colore: '#ffffff', tessuto: 'jersey' },
  camicia:     { nome: 'Camicia', categoria: 'sopra', colore: '#f4f1ea', tessuto: 'popeline', bottoni: '#fbfbfb' },
  maglione:    { nome: 'Maglione', categoria: 'sopra', colore: '#e8c4c0', tessuto: 'maglia' },
  dolcevita:   { nome: 'Dolcevita', categoria: 'sopra', colore: '#2b2b2b', tessuto: 'maglia' },
  cropTop:     { nome: 'Crop top', categoria: 'sopra', colore: '#f4a261', tessuto: 'maglia' },
  blazer:      { nome: 'Blazer', categoria: 'sopra', colore: '#6d1a36', tessuto: 'lana', interno: '#ffffff', bottoni: '#d4af37' },
  cappotto:    { nome: 'Cappotto', categoria: 'sopra', colore: '#c19a6b', tessuto: 'lana', interno: '#f2ece4', bottoni: '#3b2a1e' },
  // --- sotto ---
  jeans:       { nome: 'Jeans', categoria: 'sotto', colore: '#3b5b8c', tessuto: 'denim', cuciture: '#d9a441' },
  pantaloni:   { nome: 'Pantaloni', categoria: 'sotto', colore: '#2b2d42', tessuto: 'lana' },
  palazzo:     { nome: 'Palazzo', categoria: 'sotto', colore: '#efe6d8', tessuto: 'popeline' },
  shorts:      { nome: 'Shorts', categoria: 'sotto', colore: '#86acd6', tessuto: 'denim', cuciture: '#d9a441' },
  minigonna:   { nome: 'Minigonna', categoria: 'sotto', colore: '#1d1d1d', tessuto: 'lana' },
  gonnaPieghe: { nome: 'Gonna a pieghe', categoria: 'sotto', colore: '#6d1a36', tessuto: 'popeline' },
  // --- scarpe ---
  decollete:   { nome: 'Décolleté', categoria: 'scarpe', colore: '#1b1b1b' },
  sneakers:    { nome: 'Sneakers', categoria: 'scarpe', colore: '#ffffff', suola: '#f1efea', dettagli: '#6d1a36', abbassa: 0.07 },
  stivali:     { nome: 'Stivali', categoria: 'scarpe', colore: '#3b2219' },
  mocassini:   { nome: 'Mocassini', categoria: 'scarpe', colore: '#5a3a26', dettagli: '#d4af37', suola: '#2b1a12', abbassa: 0.07 },
};
export const SLOT = ['sopra', 'sotto', 'scarpe'];
export const PREDEFINITI = { sopra: 'tshirt', sotto: 'jeans', scarpe: 'decollete' };
export const capiDi = (categoria) => Object.keys(CAPI).filter((k) => CAPI[k].categoria === categoria);

// --- tessuti: texture procedurali chiare (il colore del capo le moltiplica) -----------------------
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const TEX = {};
function tessuto(THREE, tipo) {
  if (TEX[tipo]) return TEX[tipo];
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, N, N);
  const puntini = (n, a, seme) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rnd(seme + i * 3) > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 2})`;
      ctx.fillRect(Math.floor(rnd(seme + i) * N), Math.floor(rnd(seme + i * 7 + 1) * N), 2, 2);
    }
  };
  let rep = [4, 8];
  if (tipo === 'maglia') {                 // coste verticali + punti a maglia
    for (let x = 0; x < N; x++) {
      const v = 0.5 + 0.5 * Math.cos((x / N) * Math.PI * 2 * 16);
      const g = Math.round(255 - 52 * v * v); ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(x, 0, 1, N);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < N; y += 8) for (let x = 0; x < N; x += 16) ctx.fillRect(x + 4, y, 8, 3);
    rep = [2, 5];
  } else if (tipo === 'denim') {           // diagonale del twill + fiammature
    ctx.lineWidth = 2;
    for (let i = -N; i < N; i += 4) {
      ctx.strokeStyle = `rgba(0,0,0,${0.09 + 0.06 * rnd(i)})`;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + N, N); ctx.stroke();
    }
    puntini(2600, 0.1, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 40; i++) ctx.fillRect(rnd(i + 90) * N, rnd(i + 190) * N, 18 + rnd(i) * 30, 1);
    rep = [4, 8];
  } else if (tipo === 'jersey') {
    ctx.fillStyle = 'rgba(0,0,0,0.035)';
    for (let y = 0; y < N; y += 3) ctx.fillRect(0, y, N, 1);
    puntini(900, 0.04, 21);
  } else if (tipo === 'lana') {
    puntini(5200, 0.07, 31);
    rep = [3, 6];
  } else if (tipo === 'popeline') {
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let i = 0; i < N; i += 2) { ctx.fillRect(i, 0, 1, N); ctx.fillRect(0, i, N, 1); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (TEX[tipo] = t);
}

// --- geometria di base ------------------------------------------------------------------------
// z della superficie di un profilo (lathe schiacciato di sz) nel punto (x, y)
const zSu = (pts, sz, x, y, off = 0.004) => { const R = rAt(pts, y); return Math.sqrt(Math.max(0, R * R - x * x)) * sz + off; };
const giu = (pts) => [...pts].sort((a, b) => a[1] - b[1]);      // profilo dal basso: normali verso l'esterno
function rAt(pts, y) {                                           // raggio del profilo all'altezza y
  const s = giu(pts);
  if (y <= s[0][1]) return s[0][0];
  for (let i = 0; i < s.length - 1; i++) {
    if (y >= s[i][1] && y <= s[i + 1][1]) {
      const f = (y - s[i][1]) / (s[i + 1][1] - s[i][1] || 1);
      return s[i][0] + (s[i + 1][0] - s[i][0]) * f;
    }
  }
  return s[s.length - 1][0];
}
// Busto della modella "vestito" (raggi già un po' più grandi del corpo)
const TORSO = [[0.268, 2.885], [0.276, 2.75], [0.256, 2.6], [0.222, 2.46], [0.19, 2.33], [0.193, 2.24],
  [0.222, 2.14], [0.25, 2.02], [0.258, 1.9], [0.262, 1.78]];
// fuori = il capo resta sopra pantaloni e gonne (raggio minimo in vita)
function profiloTorso({ fondo = 2.0, largo = 0, gonfio = 0.01, scollo = 0.1, coda = [], fuori = false } = {}) {
  const base = TORSO.map(([r, y]) => {
    let R = r + gonfio + largo * Math.max(0, 0.262 - r);
    if (fuori && y < 2.4) R = Math.max(R, 0.272 + (y < 2.3 ? 0 : (2.4 - y) * 0)) ;
    return [R, y];
  });
  const pts = [[scollo + gonfio, 2.975], [0.17 + gonfio, 2.952]];
  for (const q of base) if (q[1] > fondo) pts.push(q);
  if (fondo >= 1.78) pts.push([rAt(base, fondo), fondo]); else pts.push(...coda);
  return pts;
}

function gradiente(THREE) {
  const d = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}

// --- il sarto: costruisce i capi su uno scheletro ----------------------------------------------
export function creaSarto(THREE, { contorno = null } = {}) {
  const grad = gradiente(THREE);
  const linea = contorno || new THREE.MeshBasicMaterial({ color: '#2a1714', side: THREE.BackSide });
  const materiale = (colore, tipo) => {
    const m = new THREE.MeshToonMaterial({ color: colore, gradientMap: grad, side: THREE.DoubleSide });
    if (tipo && tipo !== 'liscio') m.map = tessuto(THREE, tipo);
    return m;
  };
  const v2 = ([r, y]) => new THREE.Vector2(r, y);

  function veste(sk, id) {
    const def = CAPI[id];
    if (!def) throw new Error(`capo sconosciuto: ${id}`);
    const pezzi = [], vivi = [];                    // vivi: animazioni secondarie (seguono la posa)
    const mats = { colore: materiale(def.colore, def.tessuto) };
    const TESS = { interno: 'jersey', ombra: def.tessuto };
    const M = (k) => (mats[k] ||= materiale(def[k] || '#ffffff', TESS[k] || null));

    function add(parent, geo, mat, x = 0, y = 0, z = 0, cont = 0) {
      if (cont) {                                   // geometria centrata: il contorno si scala dal centro
        geo.computeBoundingBox();
        const c = geo.boundingBox.getCenter(new THREE.Vector3());
        geo.translate(-c.x, -c.y, -c.z); x += c.x; y += c.y; z += c.z;
      }
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
      parent.add(m); pezzi.push(m);
      if (cont) { const o = new THREE.Mesh(geo, linea); o.scale.setScalar(1 + cont); m.add(o); }
      return m;
    }
    const anello = (parent, r, tubo, y, mat, sz = 1, x = 0, z = 0) => {
      const g = new THREE.TorusGeometry(r, tubo, 10, 72); g.rotateX(Math.PI / 2);
      const m = add(parent, g, mat, x, y, z); m.scale.z = sz; return m;
    };
    const tubo = (parent, rTop, rBot, yTop, yBot, mat, cont = 0.03) =>
      add(parent, new THREE.CylinderGeometry(rTop, rBot, yTop - yBot, 40, 1, true), mat, 0, (yTop + yBot) / 2, 0, cont);
    const lathe = (pts, seg = 64, apertura = 0) =>
      new THREE.LatheGeometry(giu(pts).map(v2), seg, apertura / 2, Math.PI * 2 - apertura);

    function torso(mat, o = {}) {
      const p = profiloTorso(o), sz = o.sz || 0.78;
      const m = add(sk.body, lathe(p, 72, o.apertura || 0), mat, 0, 0, 0, o.contorno ?? 0.02);
      m.scale.z = sz;
      if (!o.apertura && o.orlo !== false) anello(sk.body, rAt(p, o.fondo ?? 2.0) + 0.002, 0.011, o.fondo ?? 2.0, mat, sz);
      return { p, sz };
    }
    function maniche(mat, { lunga = true, rTop = 0.09, rGomito = 0.082, rPolso = 0.068, corta = 0.22, polsino = null } = {}) {
      for (const b of [sk.bL, sk.bR]) {
        add(b.spalla, new THREE.SphereGeometry(rTop, 28, 18), mat);
        if (!lunga) {
          tubo(b.spalla, rTop, rTop - 0.006, 0, -corta, mat, 0.04);
          anello(b.spalla, rTop - 0.006, 0.011, -corta, mat);
          continue;
        }
        tubo(b.spalla, rTop, rGomito, 0, -0.56, mat, 0.04);
        add(b.gomito, new THREE.SphereGeometry(rGomito, 24, 16), mat);
        tubo(b.gomito, rGomito - 0.002, rPolso, 0.0, -0.43, mat, 0.04);
        if (polsino) tubo(b.gomito, rPolso + 0.004, rPolso + 0.004, -0.4, -0.46, polsino, 0.05);
        else anello(b.gomito, rPolso, 0.012, -0.43, mat);
      }
    }
    // bottoni sul davanti (x = 0) di un busto con profilo p
    function bottoni(p, sz, ys, mat, x = 0, r = 0.013) {
      for (const y of ys) {
        const R = rAt(p, y), z = Math.sqrt(Math.max(0, R * R - x * x)) * sz + 0.006;
        const g = new THREE.CylinderGeometry(r, r, 0.008, 18); g.rotateX(Math.PI / 2);
        add(sk.body, g, mat, x, y, z);
      }
    }
    // revers: striscia che si ripiega sul davanti di una giacca aperta
    function revers(p, sz, mezzoVarco, yTop, yBot, larg, mat) {
      for (const s of [1, -1]) {
        const N = 14, pos = [], idx = [];
        for (let j = 0; j <= N; j++) {
          const f = j / N, y = yTop + (yBot - yTop) * f, R = rAt(p, y) + 0.012;
          const a0 = s * mezzoVarco, a1 = s * (mezzoVarco + larg * Math.pow(1 - f, 0.85));
          pos.push(R * Math.sin(a0), y, R * Math.cos(a0) * sz + 0.004, R * Math.sin(a1), y + 0.012 * (1 - f), R * Math.cos(a1) * sz + 0.004);
          if (j < N) { const a = 2 * j; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        add(sk.body, g, mat);
        // bordo scuro del revers (linea)
        const bordo = [];
        for (let j = 0; j <= N; j++) bordo.push(new THREE.Vector3(pos[j * 6 + 3], pos[j * 6 + 4], pos[j * 6 + 5] + 0.002));
        add(sk.body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bordo), 24, 0.0035, 5, false), linea.clone()).material.side = THREE.FrontSide;
      }
    }
    // pantaloni: vita + due gambe (coscia sull'anca, polpaccio sul ginocchio)
    function pantalone(mat, { rCoscia = 0.13, rGin = 0.112, rCav = 0.092, fine = -0.82, corti = 0, rCorti = 0.14 } = {}) {
      const vita = [[0.214, 2.235], [0.246, 2.08], [0.256, 1.95], [0.245, 1.84], [0.18, 1.77], [0.001, 1.73]];
      add(sk.body, lathe(vita, 64), mat, 0, 0, 0, 0.02).scale.z = 0.78;
      anello(sk.body, 0.216, 0.017, 2.215, mat, 0.78);
      for (const g of [sk.gL, sk.gR]) {
        if (corti) { tubo(g.anca, rCoscia, rCorti, 0.06, -corti, mat); anello(g.anca, rCorti, 0.012, -corti, mat); continue; }
        tubo(g.anca, rCoscia, rGin, 0.06, -0.84, mat);
        add(g.ginocchio, new THREE.SphereGeometry(rGin, 28, 18), mat);
        tubo(g.ginocchio, rGin, rCav, 0.0, fine, mat);
        anello(g.ginocchio, rCav, 0.01, fine, mat);
      }
      return vita;
    }
    // dettagli jeans: passanti, tasche, cuciture laterali, patta, tasche dietro
    function dettagliDenim(vita, cuc, mat, lunghi = true) {
      for (const a of [-1.25, -0.55, 0.55, 1.25, Math.PI]) {
        const m = add(sk.body, new THREE.BoxGeometry(0.022, 0.055, 0.012), mat, 0.228 * Math.sin(a), 2.215, 0.228 * Math.cos(a) * 0.78 + 0.004);
        m.rotation.y = a;
      }
      for (const s of [1, -1]) {
        const arco = [];                          // apertura della tasca, appoggiata sulla superficie
        for (let k = 0; k <= 10; k++) {
          const a = (k / 10) * Math.PI / 2, x = s * (0.2 - 0.075 * Math.cos(a)), y = 2.205 - 0.075 * Math.sin(a);
          arco.push(new THREE.Vector3(x, y, zSu(vita, 0.78, x, y, 0.003)));
        }
        add(sk.body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arco), 20, 0.0045, 6, false), cuc);
        const rivetto = add(sk.body, new THREE.SphereGeometry(0.008, 8, 6), cuc, s * 0.2, 2.13, zSu(vita, 0.78, 0.2, 2.13, 0.002));
        rivetto.scale.z = 0.5;
        const dietro = add(sk.body, new THREE.BoxGeometry(0.12, 0.13, 0.006), cuc, s * 0.115, 1.93, -zSu(vita, 0.78, 0.115, 1.93, 0.006));
        dietro.rotation.y = -s * 0.45;
        add(dietro, new THREE.BoxGeometry(0.105, 0.115, 0.006), mat, 0, 0, -0.003);
      }
      add(sk.body, new THREE.BoxGeometry(0.005, 0.15, 0.005), cuc, 0.022, 2.12, zSu(vita, 0.78, 0.022, 2.12));
      for (const [g, s] of [[sk.gL, -1], [sk.gR, 1]]) {
        const lati = lunghi ? [[g.anca, 0.13, 0.112, 0.06, -0.84], [g.ginocchio, 0.112, 0.092, 0, -0.82]] : [[g.anca, 0.14, 0.145, 0.06, -0.3]];
        for (const [par, r1, r2, y1, y2] of lati) {
          const m = add(par, new THREE.BoxGeometry(0.006, y1 - y2, 0.006), cuc, s * ((r1 + r2) / 2 + 0.002), (y1 + y2) / 2, 0);
          m.rotation.z = s * Math.atan((r1 - r2) / (y1 - y2));
        }
      }
    }
    // piega stirata sul davanti dei pantaloni
    function piega(mat, r1, r2, r3, fine) {
      for (const g of [sk.gL, sk.gR]) {
        add(g.anca, new THREE.BoxGeometry(0.006, 0.86, 0.006), mat, 0, -0.39, (r1 + r2) / 2 + 0.001).rotation.x = -Math.atan((r1 - r2) / 0.9);
        add(g.ginocchio, new THREE.BoxGeometry(0.006, -fine, 0.006), mat, 0, fine / 2, (r2 + r3) / 2 + 0.001).rotation.x = Math.atan((r3 - r2) / -fine);
      }
    }
    // gonne (sul bacino)
    // Tessuto che segue le gambe: ogni vertice ruota attorno alle anche con l'angolo della gamba del suo lato
    // (sfumato al centro), di più verso l'orlo. yFermo = sopra questa quota non si muove.
    function mobile(geo, mat, { k = 0.75, yFermo = 1.93, yPieno = 1.45, cont = 0.012, fascia = 0.12 } = {}) {
      const m = add(sk.body, geo, mat, 0, 0, 0, cont);
      const P = geo.attributes.position, base = Float32Array.from(P.array), o = m.position.clone();
      let ultimo = '';
      vivi.push(() => {
        const aR = sk.gR.anca.rotation.x, aL = sk.gL.anca.rotation.x, chiave = aR.toFixed(4) + aL.toFixed(4);
        if (chiave === ultimo) return; ultimo = chiave;
        for (let i = 0; i < P.count; i++) {
          const x = base[i * 3] + o.x, y = base[i * 3 + 1] + o.y, z = base[i * 3 + 2] + o.z;
          const lato = Math.min(1, Math.max(0, (x + fascia) / (2 * fascia))), w = lato * lato * (3 - 2 * lato);
          const f = Math.min(1, Math.max(0, (yFermo - y) / (yFermo - yPieno)));
          const a = (w * aR + (1 - w) * aL) * k * f, c = Math.cos(a), sn = Math.sin(a), dy = y - 1.93;
          P.setXYZ(i, x - o.x, 1.93 + dy * c - z * sn - o.y, dy * sn + z * c - o.z);
        }
        P.needsUpdate = true; geo.computeVertexNormals();
      });
      return m;
    }
    // gonne (sul bacino), con pieghe opzionali
    function gonna(mat, pts, { sz = 0.82, pieghe = 0, k = 0.75 } = {}) {
      const yTop = pts[1][1];
      const g = lathe(pts, pieghe ? 144 : 72);
      if (pieghe) {
        const P = g.attributes.position;
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i), y = P.getY(i), z = P.getZ(i), phi = Math.atan2(x, z);
          const f = Math.min(1, Math.max(0, (yTop - y) / 0.9));
          const q = 1 + 0.06 * f * (Math.abs(Math.sin(phi * pieghe / 2)) - 0.5);
          P.setXYZ(i, x * q, y, z * q);
        }
      }
      g.scale(1, 1, sz); g.computeVertexNormals();
      mobile(g, mat, { k, yFermo: 2.0, yPieno: Math.min(1.5, pts[pts.length - 1][1] + 0.2) });
      anello(sk.body, 0.217, 0.017, 2.215, mat, sz);
    }
    // scarpe: un pezzo per piede (gruppo "piede" = caviglia; il pavimento è a y ≈ -0.178)
    const ROT = Math.PI / 2 + 0.45;                 // pianta inclinata dal tacco
    // capsula tra due punti [y, z] nel piano del piede; ritorna direzione d e normale n (verso l'alto)
    function capsulaTra(p, A, B, r, mat, cont = 0) {
      const dy = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dy, dz);
      const m = add(p, new THREE.CapsuleGeometry(r, L, 8, 18), mat, 0, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, cont);
      m.rotation.x = Math.atan2(dz, dy);
      const d = [dy / L, dz / L];
      return { d, n: [d[1], -d[0]], m };
    }
    const puntoSu = (A, d, n, t, h) => [A[0] + d[0] * t + n[0] * h, A[1] + d[1] * t + n[1] * h];
    // suola piatta (impronta del piede vista dall'alto, estrusa verso il basso)
    function suolaPiatta(p, yF, spessore, mat) {
      const f = new THREE.Shape();
      f.moveTo(-0.052, -0.06); f.absarc(0, -0.06, 0.052, Math.PI, Math.PI * 2, false);
      f.lineTo(0.066, 0.17); f.absarc(0, 0.17, 0.066, 0, Math.PI, false); f.lineTo(-0.052, -0.06);
      const g = new THREE.ExtrudeGeometry(f, { depth: spessore, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.006, bevelSegments: 3, curveSegments: 16 });
      g.rotateX(Math.PI / 2);                     // impronta -> piano xz, spessore verso il basso
      return add(p, g, mat, 0, yF + spessore + 0.006, 0, 0.04);
    }
    function scarpa(fn) { for (const [g, s] of [[sk.gL, -1], [sk.gR, 1]]) fn(g.piede, s, g); }

    const C = {
      tshirt() {
        torso(mats.colore, { fondo: 2.0, largo: 0.25, scollo: 0.1 , fuori: true });
        anello(sk.body, 0.112, 0.012, 2.972, mats.colore, 0.8);
        maniche(mats.colore, { lunga: false, corta: 0.22 });
      },
      camicia() {
        const t = torso(mats.colore, { fondo: 1.95, largo: 0.3, scollo: 0.095 , fuori: true });
        maniche(mats.colore, { rTop: 0.092, rGomito: 0.084, rPolso: 0.066, polsino: mats.colore });
        anello(sk.body, 0.09, 0.016, 2.975, mats.colore, 1);
        for (const s of [1, -1]) {                // punte del colletto
          const m = add(sk.body, new THREE.BoxGeometry(0.075, 0.06, 0.01), mats.colore, s * 0.045, 2.935, 0.098, 0.12);
          m.rotation.set(-0.25, s * 0.35, s * 0.85);
        }
        bottoni(t.p, t.sz, [2.86, 2.71, 2.56, 2.41, 2.26, 2.11], M('bottoni'), 0, 0.011);
        // taschino sul petto
        const R = rAt(t.p, 2.66), x = 0.11, z = Math.sqrt(R * R - x * x) * t.sz + 0.004;
        add(sk.body, new THREE.BoxGeometry(0.085, 0.09, 0.006), M('ombra'), x, 2.66, z).rotation.y = 0.45;
      },
      maglione() {
        torso(mats.colore, { fondo: 1.92, largo: 0.45, scollo: 0.1, orlo: false, fuori: true });
        const p = profiloTorso({ fondo: 1.92, largo: 0.45, fuori: true });
        tubo(sk.body, rAt(p, 1.98) + 0.004, rAt(p, 1.92) - 0.012, 1.98, 1.9, mats.colore, 0.02).scale.z = 0.78;
        anello(sk.body, 0.114, 0.016, 2.97, mats.colore, 0.82);
        maniche(mats.colore, { rTop: 0.096, rGomito: 0.09, rPolso: 0.068, polsino: mats.colore });
      },
      dolcevita() {
        torso(mats.colore, { fondo: 2.0, largo: 0.1, scollo: 0.09 , fuori: true });
        tubo(sk.body, 0.084, 0.09, 3.04, 2.93, mats.colore, 0.04);
        anello(sk.body, 0.084, 0.012, 3.04, mats.colore);
        maniche(mats.colore, { rTop: 0.088, rGomito: 0.08, rPolso: 0.064, polsino: mats.colore });
      },
      cropTop() {
        torso(mats.colore, { fondo: 2.42, largo: 0, scollo: 0.12 });
        anello(sk.body, 0.13, 0.011, 2.965, mats.colore, 0.8);
      },
      blazer() {
        torso(M('interno'), { fondo: 2.1, scollo: 0.1, orlo: false });
        const varco = 0.8;
        const t = torso(mats.colore, { fondo: 1.8, largo: 0.25, gonfio: 0.028, scollo: 0.115, apertura: varco });
        revers(t.p, t.sz, varco / 2, 2.95, 2.36, 0.62, mats.colore);
        maniche(mats.colore, { rTop: 0.1, rGomito: 0.09, rPolso: 0.075 });
        bottoni(t.p, t.sz, [2.32], M('bottoni'), -0.05, 0.014);
        for (const s of [1, -1]) {                // patte delle tasche
          const R = rAt(t.p, 1.98), x = s * 0.16, z = Math.sqrt(R * R - x * x) * t.sz + 0.006;
          add(sk.body, new THREE.BoxGeometry(0.13, 0.03, 0.012), M('ombra'), x, 1.98, z).rotation.y = s * 0.55;
        }
      },
      cappotto() {
        torso(M('interno'), { fondo: 2.1, scollo: 0.09, orlo: false });
        tubo(sk.body, 0.084, 0.09, 3.03, 2.93, M('interno'), 0.04);
        const varco = 0.62;
        const t = torso(mats.colore, { fondo: 1.8, largo: 0.4, gonfio: 0.035, scollo: 0.125, apertura: varco, sz: 0.84 });
        // parte bassa: segue le gambe (deformazione continua)
        const coda = [[rAt(t.p, 1.8), 1.83], [0.305, 1.62], [0.33, 1.35], [0.35, 1.02]];
        const geo = lathe(coda, 72, varco); geo.scale(1, 1, t.sz);
        mobile(geo, mats.colore, { k: 0.95, yFermo: 1.83, yPieno: 1.62, fascia: 0.07 });
        revers(t.p, t.sz, varco / 2, 2.96, 2.2, 0.75, mats.colore);
        maniche(mats.colore, { rTop: 0.106, rGomito: 0.096, rPolso: 0.082 });
        for (const s of [1, -1]) {
          bottoni(t.p, t.sz, [2.22, 2.02], M('bottoni'), s * 0.1, 0.016);
          const R = rAt(t.p, 1.72), x = s * 0.2, z = Math.sqrt(R * R - x * x) * t.sz + 0.006;
          add(sk.body, new THREE.BoxGeometry(0.15, 0.035, 0.014), M('ombra'), x, 1.72, z).rotation.y = s * 0.6;
        }
      },
      jeans() {
        const vita = pantalone(mats.colore, { rCoscia: 0.128, rGin: 0.112, rCav: 0.092, fine: -0.82 });
        dettagliDenim(vita, M('cuciture'), mats.colore);
      },
      pantaloni() {
        pantalone(mats.colore, { rCoscia: 0.138, rGin: 0.12, rCav: 0.108, fine: -0.84 });
        piega(M('ombra'), 0.138, 0.12, 0.108, -0.84);
      },
      palazzo() {
        pantalone(mats.colore, { rCoscia: 0.15, rGin: 0.17, rCav: 0.255, fine: -0.92 });
      },
      shorts() {
        const vita = pantalone(mats.colore, { corti: 0.3, rCoscia: 0.14, rCorti: 0.145 });
        dettagliDenim(vita, M('cuciture'), mats.colore, false);
      },
      minigonna() {
        gonna(mats.colore, [[0.216, 2.235], [0.25, 2.06], [0.272, 1.94], [0.325, 1.62]], { k: 0.6 });
      },
      gonnaPieghe() {
        gonna(mats.colore, [[0.216, 2.235], [0.25, 2.06], [0.29, 1.9], [0.38, 1.5], [0.47, 1.1], [0.5, 0.98]], { sz: 0.88, pieghe: 28 });
      },
      decollete() {
        scarpa((p) => {
          add(p, new THREE.CapsuleGeometry(0.047, 0.16, 6, 14), mats.colore, 0, -0.06, 0.07, 0.08).rotation.x = ROT;
          add(p, new THREE.CylinderGeometry(0.012, 0.018, 0.15, 10), mats.colore, 0, -0.1, -0.035);
        });
      },
      sneakers() {                                 // scarpa bassa: modella abbassata di "abbassa", pianta in piano
        const yF = -0.178 + CAPI.sneakers.abbassa;
        scarpa((p, lato) => {
          suolaPiatta(p, yF, 0.032, M('suola'));
          const A = [-0.02, -0.045], B = [-0.05, 0.16];
          const { d, n } = capsulaTra(p, A, B, 0.064, mats.colore, 0.06);
          for (let k = 0; k < 3; k++) {             // lacci
            const P = puntoSu(A, d, n, 0.07 + k * 0.042, 0.06);
            add(p, new THREE.BoxGeometry(0.072, 0.01, 0.014), M('suola'), 0, P[0], P[1]).rotation.x = Math.atan2(n[1], n[0]);
          }
          add(p, new THREE.BoxGeometry(0.032, 0.07, 0.02), M('dettagli'), 0, -0.01, -0.108);   // linguetta del tallone
          for (const sx of [-1, 1]) {               // banda laterale
            const b = add(p, new THREE.BoxGeometry(0.004, 0.024, 0.12), M('dettagli'), sx * 0.064, -0.045, 0.045);
            b.rotation.x = -0.4;
          }
          add(p, new THREE.TorusGeometry(0.058, 0.011, 8, 28), mats.colore, 0, 0.03, -0.035).rotation.x = Math.PI / 2 + 0.15;
        });
      },
      stivali() {
        scarpa((p, s, g) => {
          tubo(g.ginocchio, 0.098, 0.085, -0.1, -0.85, mats.colore);
          anello(g.ginocchio, 0.098, 0.012, -0.1, mats.colore);
          add(p, new THREE.CapsuleGeometry(0.053, 0.16, 6, 14), mats.colore, 0, -0.06, 0.07, 0.07).rotation.x = ROT;
          add(p, new THREE.SphereGeometry(0.075, 18, 12), mats.colore, 0, 0.0, -0.005);
          add(p, new THREE.BoxGeometry(0.05, 0.14, 0.06), mats.colore, 0, -0.105, -0.04, 0.06);
        });
      },
      mocassini() {
        const yF = -0.178 + CAPI.mocassini.abbassa;
        scarpa((p) => {
          suolaPiatta(p, yF, 0.012, M('suola'));
          add(p, new THREE.BoxGeometry(0.07, 0.04, 0.07), M('suola'), 0, yF + 0.032, -0.05);       // tacco basso
          const A = [-0.018, -0.04], B = [-0.058, 0.165];
          const { d, n, m } = capsulaTra(p, A, B, 0.05, mats.colore, 0.07);
          m.scale.x = 1.12;
          const P = puntoSu(A, d, n, 0.13, 0.048), ang = Math.atan2(n[1], n[0]);
          add(p, new THREE.BoxGeometry(0.118, 0.012, 0.032), M('ombra'), 0, P[0], P[1]).rotation.x = ang;
          const Q = puntoSu(A, d, n, 0.165, 0.052);
          const bit = add(p, new THREE.TorusGeometry(0.013, 0.004, 6, 16), M('dettagli'), 0, Q[0], Q[1]);
          bit.rotation.x = Math.atan2(-n[0], n[1]); bit.scale.x = 1.7;
        });
      },
    };
    C[id]();

    function colora(c) {
      if (!c) c = {}; else if (typeof c === 'string') c = { colore: c };
      for (const [k, m] of Object.entries(mats)) {
        if (k === 'ombra') m.color.set(c.colore || def.colore).multiplyScalar(0.78);
        else m.color.set(c[k] || def[k] || '#ffffff');
      }
    }
    colora();
    return {
      id, categoria: def.categoria, pezzi, colora,
      tick() { vivi.forEach((f) => f()); },
      mostra(v) { pezzi.forEach((p) => (p.visible = v)); },
    };
  }
  return { veste, materiale };
}

// Scheletro "a riposo" con le stesse misure della modella (per i capi da soli)
export function scheletroRiposo(THREE, parent) {
  const body = new THREE.Group(); parent.add(body);
  const braccio = (s) => {
    const spalla = new THREE.Group(); spalla.position.set(0.28 * s, 2.84, 0); spalla.rotation.z = 0.07 * s; body.add(spalla);
    const gomito = new THREE.Group(); gomito.position.y = -0.54; gomito.rotation.x = -0.06; spalla.add(gomito);
    const mano = new THREE.Group(); mano.position.y = -0.5; gomito.add(mano);
    return { spalla, gomito, mano };
  };
  const gamba = (s) => {
    const anca = new THREE.Group(); anca.position.set(0.11 * s, 1.93, 0); body.add(anca);
    const ginocchio = new THREE.Group(); ginocchio.position.y = -0.84; anca.add(ginocchio);
    const piede = new THREE.Group(); piede.position.y = -0.86; ginocchio.add(piede);
    return { anca, ginocchio, piede };
  };
  return { body, bL: braccio(-1), bR: braccio(1), gL: gamba(-1), gR: gamba(1) };
}

// Gruccia 3D Cintre: "spalle" per i capi sopra, barra con pinze per pantaloni e gonne.
// Origine = punta del gancio (y = 0), la gruccia pende verso il basso.
export function gruccia3D(THREE, { tipo = 'spalle', colore = BORDEAUX } = {}) {
  const g = new THREE.Group();
  const lacca = new THREE.MeshStandardMaterial({ color: colore, roughness: 0.35, metalness: 0.1 });
  const metallo = new THREE.MeshStandardMaterial({ color: '#c8c8c8', roughness: 0.25, metalness: 0.9 });
  const gancio = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.007, 8, 28, Math.PI * 1.25), metallo);
  gancio.position.y = -0.045; gancio.rotation.z = -0.3; g.add(gancio);
  const collo = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 8), metallo);
  collo.position.set(0.045, -0.1, 0); g.add(collo);
  if (tipo === 'spalle') {
    const curva = new THREE.CatmullRomCurve3([[-0.34, -0.27], [-0.17, -0.165], [0, -0.14], [0.17, -0.165], [0.34, -0.27]]
      .map(([x, y]) => new THREE.Vector3(x + 0.045, y, 0)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.018, 10, false), lacca));
  } else {
    const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 10), lacca);
    barra.rotation.z = Math.PI / 2; barra.position.set(0.045, -0.15, 0); g.add(barra);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.035), metallo);
      p.position.set(0.045 + s * 0.2, -0.18, 0); g.add(p);
    }
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.position.x = -0.045;                         // gancio centrato sull'asse
  return g;
}

// Un capo da solo. appeso = su gruccia (origine = punta del gancio);
// altrimenti "manichino invisibile" in coordinate della modella (piedi a y = 0).
export function capoSingolo(THREE, id, { colori = null, appeso = true, sarto = null } = {}) {
  sarto ||= creaSarto(THREE);
  const g = new THREE.Group(), dentro = new THREE.Group(); g.add(dentro);
  const sk = scheletroRiposo(THREE, dentro);
  const capo = sarto.veste(sk, id); capo.colora(colori);
  const categoria = capo.categoria;
  if (categoria === 'scarpe') {
    dentro.position.y = -0.052 - (CAPI[id].abbassa || 0);   // suole a terra
  } else if (appeso) {
    const spalle = categoria === 'sopra';
    dentro.position.y = spalle ? -2.98 - 0.165 : -2.235 - 0.18;
    g.add(gruccia3D(THREE, { tipo: spalle ? 'spalle' : 'pinze' }));
  }
  return { g, capo, categoria, colora: capo.colora };
}
