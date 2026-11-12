// PRESET — La modella Cintre: protagonista fissa dei video.
// Stile "bambola fashion": proporzioni slanciate (~7,5 teste, alta ~3.6), viso curato, capelli lunghi
// castani mossi, contorno cartoon, ombreggiatura toon a 3 toni.
//
//   const lei = creaModella(THREE, { outfit: { tipo: 'abito', top: '#6d1a36' } });
//   scene.add(lei.root);
//   ogni fotogramma:  lei.pose.cammina(t);  lei.tick(t);
//   lei.setMood('arrabbiata' | 'neutra' | 'felice' | 'sorpresa');
//   lei.setOutfit({ tipo: 'abito' | 'gonna' | 'pantaloni', top, bottom, scarpe });
// Piedi a y = 0, guarda verso +z. Tutto dipende solo da t: render deterministico.

export const ASPETTO = { pelle: '#eab894', capelli: '#4a2c1d', occhi: '#6b4226', labbra: '#b84a5e' };
export const OUTFIT_BASE = { tipo: 'gonna', top: '#ffffff', bottom: '#2b2d42', scarpe: '#1b1b1b' };

export function creaModella(THREE, opts = {}) {
  const asp = { ...ASPETTO, ...(opts.aspetto || {}) };

  // --- materiali ---------------------------------------------------------------
  const grad = (() => {                                   // 3 toni: ombra, medio, luce
    const d = new Uint8Array([90, 170, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
  })();
  const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
  const M = {
    pelle: toon(asp.pelle), capelli: toon(asp.capelli), top: toon('#ffffff'), bottom: toon('#2b2d42'),
    gambe: toon(asp.pelle), scarpe: toon('#1b1b1b'), bianco: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    iride: new THREE.MeshBasicMaterial({ color: asp.occhi }), nero: new THREE.MeshBasicMaterial({ color: '#141414' }),
    labbra: toon(asp.labbra), bocca: new THREE.MeshBasicMaterial({ color: '#5a1a25' }),
    guance: new THREE.MeshBasicMaterial({ color: '#ff8a8a', transparent: true, opacity: 0.0, depthWrite: false }),
    ciglia: new THREE.MeshBasicMaterial({ color: '#1a0f0a' }),
    contorno: new THREE.MeshBasicMaterial({ color: '#2a1714', side: THREE.BackSide }),
  };

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const ombreggia = [];
  function mesh(parent, geo, mat, x = 0, y = 0, z = 0, contorno = 0) {
    if (contorno) {                                       // centra la geometria: il contorno si scala dal centro
      geo.computeBoundingBox();
      const c = geo.boundingBox.getCenter(new THREE.Vector3());
      geo.translate(-c.x, -c.y, -c.z); x += c.x; y += c.y; z += c.z;
    }
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m);
    m.castShadow = true; ombreggia.push(m);
    if (contorno) {                                       // guscio invertito = linea di contorno
      const o = new THREE.Mesh(geo, M.contorno); o.scale.setScalar(1 + contorno); m.add(o);
    }
    return m;
  }
  // profilo [raggio, y]: ordinato dal basso verso l'alto, così le normali puntano verso l'esterno
  const lathe = (pts, seg = 28) => new THREE.LatheGeometry(
    [...pts].sort((a, b) => a[1] - b[1]).map(([r, y]) => new THREE.Vector2(r, y)), seg);

  // --- busto (top) e bacino -------------------------------------------------------------
  const busto = mesh(body, lathe([[0.001, 2.93], [0.12, 2.92], [0.25, 2.86], [0.255, 2.74], [0.235, 2.6],
    [0.2, 2.46], [0.165, 2.33], [0.17, 2.24], [0.2, 2.14], [0.001, 2.1]]), M.top, 0, 0, 0, 0.03);
  busto.scale.z = 0.72;
  const bacino = mesh(body, lathe([[0.001, 2.18], [0.18, 2.17], [0.23, 2.02], [0.235, 1.9], [0.001, 1.86]]),
    M.bottom, 0, 0, 0, 0.03);
  bacino.scale.z = 0.75;
  // gonna (svasata) — nascosta con i pantaloni; con l'abito è più lunga
  const gonna = mesh(body, lathe([[0.44, 1.38], [0.43, 1.42], [0.33, 1.7], [0.24, 2.0], [0.17, 2.24]], 32),
    M.bottom, 0, 0, 0, 0.025);
  gonna.material = M.bottom; gonna.scale.z = 0.8;
  gonna.geometry.computeVertexNormals();
  M.bottom.side = THREE.DoubleSide;

  // --- collo e testa -------------------------------------------------------------------
  mesh(body, new THREE.CylinderGeometry(0.058, 0.07, 0.24, 14), M.pelle, 0, 3.0, 0);
  const head = new THREE.Group(); head.position.set(0, 3.12, 0); body.add(head);
  const cranio = mesh(head, new THREE.SphereGeometry(0.235, 32, 24), M.pelle, 0, 0.2, 0, 0.035);
  cranio.scale.set(0.93, 1.13, 1.0);
  const mento = mesh(head, new THREE.SphereGeometry(0.13, 20, 14), M.pelle, 0, 0.04, 0.07);
  mento.scale.set(1.05, 0.9, 1.0);

  // occhi
  const occhi = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(0.085 * s, 0.185, 0.2); head.add(g);
    const bianco = mesh(g, new THREE.SphereGeometry(0.052, 18, 14), M.bianco); bianco.scale.set(1.15, 0.88, 0.45);
    const iride = mesh(g, new THREE.CircleGeometry(0.032, 22), M.iride, 0, -0.004, 0.0245);
    mesh(g, new THREE.CircleGeometry(0.016, 16), M.nero, 0, -0.004, 0.0255);
    mesh(g, new THREE.CircleGeometry(0.008, 10), M.bianco, 0.011 * -s, 0.01, 0.0265);
    // palpebra: calotta color pelle che scende (battito / occhi socchiusi)
    const palp = mesh(g, new THREE.SphereGeometry(0.056, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.pelle);
    palp.scale.set(1.18, 0.92, 0.55);
    // ciglia: arco scuro con 3 ciuffi verso l'esterno
    const ciglia = mesh(g, new THREE.TorusGeometry(0.055, 0.007, 6, 18, Math.PI * 0.9), M.ciglia, 0, 0.002, 0.014);
    ciglia.rotation.z = Math.PI * 0.05; ciglia.scale.set(1.12, 0.9, 1);
    for (let k = 0; k < 3; k++) {
      const c = mesh(g, new THREE.BoxGeometry(0.005, 0.026, 0.004), M.ciglia, s * (0.04 + k * 0.011), 0.036 - k * 0.01, 0.018);
      c.rotation.z = -s * (0.6 + k * 0.35);
    }
    return { g, palp, iride };
  });
  const sopracciglia = [-1, 1].map((s) => {
    const geo = new THREE.TorusGeometry(0.06, 0.009, 6, 14, Math.PI * 0.7);
    geo.rotateZ(Math.PI * 0.15); geo.translate(0, -0.06, 0);      // perno al centro dell'arco
    const b = mesh(head, geo, M.capelli, 0.088 * s, 0.265, 0.205);
    b.scale.set(1, 0.55, 1); b.userData.s = s; return b;
  });
  const naso = mesh(head, new THREE.SphereGeometry(0.03, 12, 10), M.pelle, 0, 0.13, 0.238);
  naso.scale.set(0.8, 1.25, 0.9);
  // bocca: una forma per umore (labbra chiuse, sorriso aperto, broncio, "o")
  const bocca = new THREE.Group(); bocca.position.set(0, 0.075, 0.214); head.add(bocca);
  const ellisse = (r, sx, sy, mat, x, y, z) => { const m = mesh(bocca, new THREE.SphereGeometry(r, 16, 10), mat, x, y, z); m.scale.set(sx, sy, 0.45); return m; };
  const chiusa = new THREE.Group(); bocca.add(chiusa);                       // neutra
  chiusa.add(ellisse(0.02, 1.5, 0.4, M.labbra, 0, 0.006, 0), ellisse(0.022, 1.3, 0.52, M.labbra, 0, -0.011, 0));
  const sorriso = new THREE.Group(); bocca.add(sorriso);                     // felice: "D" aperta con denti
  const dGeo = new THREE.CircleGeometry(0.04, 24, Math.PI, Math.PI);
  const dInt = mesh(sorriso, dGeo, M.bocca, 0, 0.004, 0.006); dInt.scale.set(1.15, 0.75, 1);
  const denti = mesh(sorriso, new THREE.PlaneGeometry(0.068, 0.011), M.bianco, 0, -0.002, 0.008);
  const lSup = mesh(sorriso, new THREE.TorusGeometry(0.046, 0.006, 6, 20, Math.PI), M.labbra, 0, 0.004, 0.009);
  lSup.scale.set(1.0, 0.12, 1);
  const lInf = mesh(sorriso, new THREE.TorusGeometry(0.046, 0.008, 6, 20, Math.PI), M.labbra, 0, 0.004, 0.009);
  lInf.rotation.z = Math.PI; lInf.scale.set(1.0, 0.68, 1);
  const broncio = new THREE.Group(); bocca.add(broncio);                     // arrabbiata
  const arco = mesh(broncio, new THREE.TorusGeometry(0.036, 0.009, 6, 20, Math.PI), M.labbra, 0, -0.018, 0.008);
  arco.scale.set(1, 0.55, 1);
  const linea = mesh(broncio, new THREE.TorusGeometry(0.036, 0.0035, 6, 20, Math.PI), M.bocca, 0, -0.016, 0.012);
  linea.scale.set(0.92, 0.5, 1);
  const o = new THREE.Group(); bocca.add(o);                                 // sorpresa
  mesh(o, new THREE.CircleGeometry(0.019, 20), M.bocca, 0, -0.008, 0.006).scale.set(0.85, 1.15, 1);
  const anello = mesh(o, new THREE.TorusGeometry(0.02, 0.008, 8, 24), M.labbra, 0, -0.008, 0.008);
  anello.scale.set(0.85, 1.15, 1);
  const guance = [-1, 1].map((s) => {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.045, 18), M.guance); c.position.set(0.14 * s, 0.12, 0.19);
    c.rotation.y = s * 0.55; head.add(c); return c;
  });

  // capelli: calotta + frangia laterale + ciocche lunghe mosse (tubi)
  const capelli = new THREE.Group(); head.add(capelli);
  const calotta = mesh(capelli, new THREE.SphereGeometry(0.255, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), M.capelli, 0, 0.23, -0.02, 0.03);
  calotta.scale.set(0.98, 1.12, 1.04); calotta.rotation.x = -0.62;   // fronte scoperta
  const ciocche = [];
  const N = 30;
  for (let k = 0; k < N; k++) {
    // angolo intorno alla testa: dai lati (±100°) passando dietro (180°), niente davanti al viso
    const a = (-100 + (200 * k) / (N - 1)) * Math.PI / 180;
    const back = Math.cos(a), side = Math.sin(a);
    const len = 0.95 + 0.25 * Math.abs(Math.sin(k * 1.7)) - (Math.abs(side) > 0.9 ? 0.25 : 0);
    const pts = [];
    for (let j = 0; j <= 10; j++) {
      const f = j / 10, y = 0.34 - f * len;
      const r = 0.24 + Math.min(f * 3, 1) * 0.05 + f * 0.04;
      const onda = Math.sin(f * 9 + k) * 0.035 * f;
      pts.push(new THREE.Vector3(side * r + onda, y, -back * r * 0.95 - 0.02 + Math.cos(f * 7 + k) * 0.02 * f));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.042 - (k % 3) * 0.006, 8, false);
    const piv = new THREE.Group(); piv.position.set(0, 0.34, 0); capelli.add(piv);
    const m = mesh(piv, geo, M.capelli, 0, -0.34, 0); m.userData.k = k;
    ciocche.push(piv);
  }
  // frangia laterale morbida
  for (let k = 0; k < 4; k++) {
    const pts = [[-0.06, 0.47, 0.14], [0.04, 0.45, 0.19], [0.14, 0.4, 0.19], [0.22, 0.3, 0.13], [0.25, 0.18, 0.06]].map(
      ([x, y, z]) => new THREE.Vector3(x - k * 0.035, y - k * 0.01, z - k * 0.012));
    mesh(capelli, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.035, 8, false), M.capelli);
  }

  // --- braccia (spalla -> gomito -> mano) ------------------------------------------------
  const braccio = (s) => {
    const spalla = new THREE.Group(); spalla.position.set(0.28 * s, 2.84, 0); body.add(spalla);
    mesh(spalla, new THREE.SphereGeometry(0.075, 14, 12), M.top);
    mesh(spalla, new THREE.CapsuleGeometry(0.064, 0.44, 6, 12), M.top, 0, -0.27, 0, 0.05);
    const gomito = new THREE.Group(); gomito.position.set(0, -0.54, 0); spalla.add(gomito);
    mesh(gomito, new THREE.SphereGeometry(0.052, 12, 10), M.pelle);
    mesh(gomito, new THREE.CapsuleGeometry(0.05, 0.42, 6, 12), M.pelle, 0, -0.24, 0, 0.06);
    const mano = new THREE.Group(); mano.position.set(0, -0.5, 0); gomito.add(mano);
    const palmo = mesh(mano, new THREE.SphereGeometry(0.055, 14, 12), M.pelle, 0, -0.035, 0);
    palmo.scale.set(0.75, 1.05, 0.45);
    for (let f = 0; f < 4; f++)
      mesh(mano, new THREE.CapsuleGeometry(0.011, 0.06, 4, 6), M.pelle, (-0.024 + f * 0.016) * s, -0.105 + Math.abs(f - 1.5) * 0.008, 0.004);
    const pollice = mesh(mano, new THREE.CapsuleGeometry(0.012, 0.045, 4, 6), M.pelle, 0.04 * -s, -0.05, 0.02);
    pollice.rotation.z = 0.6 * s;
    return { spalla, gomito, mano };
  };
  const bL = braccio(-1), bR = braccio(1);

  // --- gambe (anca -> ginocchio -> piede con tacco) ----------------------------------------
  const gamba = (s) => {
    const anca = new THREE.Group(); anca.position.set(0.11 * s, 1.93, 0); body.add(anca);
    const coscia = mesh(anca, new THREE.CapsuleGeometry(0.1, 0.64, 6, 14), M.gambe, 0, -0.42, 0, 0.045);
    const ginocchio = new THREE.Group(); ginocchio.position.set(0, -0.84, 0); anca.add(ginocchio);
    mesh(ginocchio, new THREE.SphereGeometry(0.078, 14, 12), M.gambe);
    const polpaccio = mesh(ginocchio, new THREE.CapsuleGeometry(0.072, 0.66, 6, 14), M.gambe, 0, -0.42, 0, 0.05);
    polpaccio.scale.set(1, 1, 1.08);
    const piede = new THREE.Group(); piede.position.set(0, -0.86, 0); ginocchio.add(piede);
    // décolleté: pianta inclinata in avanti + tacco
    const scarpa = mesh(piede, new THREE.CapsuleGeometry(0.045, 0.16, 4, 10), M.scarpe, 0, -0.06, 0.07, 0.08);
    scarpa.rotation.x = Math.PI / 2 + 0.45;
    mesh(piede, new THREE.CylinderGeometry(0.012, 0.018, 0.15, 8), M.scarpe, 0, -0.1, -0.035);
    return { anca, ginocchio, piede, coscia };
  };
  const gL = gamba(-1), gR = gamba(1);

  // ombra morbida a terra (utile anche senza shadow map)
  const ombra = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2; ombra.position.y = 0.012; root.add(ombra);

  // --- outfit --------------------------------------------------------------------------
  let tipo = 'gonna';
  function setOutfit(o = {}) {
    if (o.tipo) tipo = o.tipo;
    if (o.top) M.top.color.set(o.top);
    if (o.bottom) M.bottom.color.set(o.bottom);
    if (o.scarpe) M.scarpe.color.set(o.scarpe);
    if (tipo === 'abito') { M.bottom.color.copy(M.top.color); }
    gonna.visible = tipo !== 'pantaloni';
    gonna.scale.y = tipo === 'abito' ? 1.0 : 1.0;
    M.gambe.color.copy(tipo === 'pantaloni' ? M.bottom.color : new THREE.Color(asp.pelle));
  }

  // --- umori (sopracciglia, palpebre, bocca, guance) --------------------------------------
  const MOODS = {
    neutra:     { brow: 0.0,  browY: 0.27,  sorriso: 0.25, apertura: 0.0, larg: 1.0,  socchiusi: 0.0,  guance: 0.0 },
    felice:     { brow: -0.12, browY: 0.285, sorriso: 1.0,  apertura: 0.55, larg: 1.25, socchiusi: 0.15, guance: 0.55 },
    arrabbiata: { brow: 0.5,  browY: 0.245, sorriso: -0.9, apertura: 0.0, larg: 0.8,  socchiusi: 0.32, guance: 0.5 },
    sorpresa:   { brow: -0.2, browY: 0.305, sorriso: 0.0,  apertura: 1.0, larg: 0.7,  socchiusi: -0.1, guance: 0.2 },
  };
  let mood = MOODS.neutra, moodName = 'neutra';
  function setMood(name, from = null, k = 1) {       // from + k: transizione morbida tra due umori
    moodName = name;
    const a = MOODS[from] || MOODS[name], b = MOODS[name] || MOODS.neutra;
    mood = Object.fromEntries(Object.keys(b).map((key) => [key, a[key] + (b[key] - a[key]) * k]));
    M.guance.color.set(name === 'arrabbiata' ? '#ff4a4a' : '#ff8a8a');
  }
  function applyMood(blink) {
    const m = mood;
    sopracciglia.forEach((b) => {
      b.rotation.z = b.userData.s * m.brow;   // arrabbiata: estremità interne giù
      b.position.y = m.browY;
      b.scale.y = Math.max(0.12, 0.55 - Math.max(0, m.brow) * 0.85);  // arrabbiata: sopracciglio quasi dritto
      b.position.x = b.userData.s * (0.088 - Math.max(0, m.brow) * 0.012);
    });
    const chiusura = Math.max(blink, m.socchiusi);
    occhi.forEach(({ palp }) => {
      const c = Math.max(0, Math.min(1, chiusura));
      palp.rotation.x = -1.5 + c * 2.9;          // -1.5 = occhio aperto, +1.4 = chiuso
      palp.visible = c > 0.02;
    });
    // forma della bocca: quella dell'umore attuale; sorriso più o meno ampio con m.sorriso
    chiusa.visible = moodName === 'neutra' || !MOODS[moodName];
    sorriso.visible = moodName === 'felice';
    broncio.visible = moodName === 'arrabbiata';
    o.visible = moodName === 'sorpresa';
    sorriso.scale.set(0.8 + m.larg * 0.2, 0.6 + m.apertura * 0.7, 1);
    chiusa.rotation.z = 0; chiusa.scale.x = m.larg;
    guance.forEach((g) => (g.material.opacity = m.guance * 0.55));
  }

  // --- pose -------------------------------------------------------------------------------
  function reset() {
    for (const j of [bL.spalla, bR.spalla, bL.gomito, bR.gomito, bL.mano, bR.mano, gL.anca, gR.anca,
                     gL.ginocchio, gR.ginocchio, gL.piede, gR.piede, head, body]) j.rotation.set(0, 0, 0);
    body.position.set(0, 0, 0);
    // a riposo: braccia leggermente aperte e gomiti morbidi (z<0 = fuori per il sinistro)
    bL.spalla.rotation.z = -0.1; bR.spalla.rotation.z = 0.1;
    bL.gomito.rotation.x = bR.gomito.rotation.x = -0.12;
  }
  const S = Math.sin;
  const pose = {
    fermo(t) {
      reset();
      body.position.y = S(t * 2.2) * 0.008;
      body.rotation.z = S(t * 0.7) * 0.015;
      gR.ginocchio.rotation.x = 0.08; gR.anca.rotation.x = -0.04;
      head.rotation.z = S(t * 1.1) * 0.03; head.rotation.y = S(t * 0.6) * 0.06;
    },
    posa(t) {                 // posa da modella: mano sul fianco, peso su una gamba
      reset();
      body.rotation.z = 0.04; body.rotation.y = -0.15;
      bL.spalla.rotation.set(0.15, 0, -0.55); bL.gomito.rotation.set(0, 0, 2.0);
      bR.spalla.rotation.z = 0.12; bR.gomito.rotation.x = -0.2;
      gR.anca.rotation.set(-0.1, 0, -0.06); gR.ginocchio.rotation.x = 0.2;
      gL.anca.rotation.z = 0.04;
      head.rotation.set(-0.05, 0.25, 0.08 + S(t * 1.3) * 0.02);
    },
    pestaPiedi(t) {           // arrabbiata: pesta i piedi, pugni che tremano
      reset();
      const s = S(t * 11), up = Math.max(0, s), dn = Math.max(0, -s);
      gL.anca.rotation.x = -up * 0.55; gL.ginocchio.rotation.x = up * 0.9;
      gR.anca.rotation.x = -dn * 0.55; gR.ginocchio.rotation.x = dn * 0.9;
      body.position.y = Math.abs(s) * 0.035;
      const tr = S(t * 25) * 0.06;
      bL.spalla.rotation.set(-0.1, 0, -0.32 - tr); bR.spalla.rotation.set(-0.1, 0, 0.32 + tr);
      bL.gomito.rotation.x = bR.gomito.rotation.x = -0.55;
      head.rotation.set(0.06, 0, S(t * 17) * 0.05);
    },
    maniNeiCapelli(t) {       // disperata: mani sulla testa, scuote la testa
      reset();
      // braccio su e in fuori, avambraccio ripiegato verso la testa (mani ai lati della testa)
      bL.spalla.rotation.set(-0.2, 0, -2.45); bL.gomito.rotation.set(0, 0, -2.1);
      bR.spalla.rotation.set(-0.2, 0, 2.45); bR.gomito.rotation.set(0, 0, 2.1);
      head.rotation.set(0.1, S(t * 8) * 0.3, 0);
      body.rotation.x = 0.06;
    },
    digita(t) {
      reset();
      bL.spalla.rotation.set(-0.45, 0, 0.12); bR.spalla.rotation.set(-0.45, 0, -0.12);
      bL.gomito.rotation.x = -1.05 + S(t * 19) * 0.06; bR.gomito.rotation.x = -1.05 + S(t * 19 + 1.7) * 0.06;
      head.rotation.x = 0.12;
    },
    telefono(t) {             // tiene il telefono davanti al petto e lo guarda
      reset();
      bL.spalla.rotation.set(-0.3, 0, 0.25); bL.gomito.rotation.x = -1.55;
      bR.spalla.rotation.set(-0.3, 0, -0.25); bR.gomito.rotation.x = -1.55;
      bL.mano.rotation.z = -0.3; bR.mano.rotation.z = 0.3;
      head.rotation.x = 0.18; body.position.y = S(t * 2) * 0.008;
    },
    gioia(t) {
      reset();
      const s = Math.abs(S(t * 6));
      body.position.y = s * 0.12;
      gL.ginocchio.rotation.x = gR.ginocchio.rotation.x = (1 - s) * 0.25;
      gL.anca.rotation.x = gR.anca.rotation.x = -(1 - s) * 0.12;
      bL.spalla.rotation.z = -2.5 - s * 0.25; bR.spalla.rotation.z = 2.5 + s * 0.25;
      bL.gomito.rotation.x = bR.gomito.rotation.x = -0.2;
      head.rotation.z = S(t * 6) * 0.06;
    },
    cammina(t, ritmo = 5.5) { // passo da passerella: piedi sulla linea, anche che ondeggiano
      reset();
      const s = S(t * ritmo), c = Math.cos(t * ritmo);
      gL.anca.rotation.set(s * 0.42, 0, 0.05); gR.anca.rotation.set(-s * 0.42, 0, -0.05);
      gL.ginocchio.rotation.x = Math.max(0, -c) * 0.55 + 0.05;
      gR.ginocchio.rotation.x = Math.max(0, c) * 0.55 + 0.05;
      bL.spalla.rotation.set(-s * 0.28, 0, -0.08); bR.spalla.rotation.set(s * 0.28, 0, 0.08);
      bL.gomito.rotation.x = bR.gomito.rotation.x = -0.2;
      body.position.y = Math.abs(c) * 0.035;
      body.rotation.set(0, s * 0.07, s * 0.04);
      head.rotation.set(-0.03, -s * 0.05, -s * 0.03);
    },
  };

  // --- vita: battito delle palpebre + capelli che ondeggiano ------------------------------
  function tick(t) {
    const ph = (t + 0.7) % 3.6;
    const blink = ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0;
    applyMood(blink);
    ciocche.forEach((c, k) => {
      c.rotation.x = S(t * 1.6 + k * 0.4) * 0.025 + body.position.y * 0.3;
      c.rotation.z = S(t * 1.3 + k) * 0.02 - body.rotation.z * 0.6;
    });
  }

  setOutfit({ ...OUTFIT_BASE, ...(opts.outfit || {}) });
  setMood('neutra');
  reset();
  tick(0);
  return {
    root, body, head, setMood, setOutfit, pose, tick, mesh: ombreggia,
    articolazioni: { bL, bR, gL, gR },
    get mood() { return moodName; },
    // compatibilità con personaggio.js
    armL: bL.spalla, armR: bR.spalla, legL: gL.anca, legR: gR.anca,
  };
}
