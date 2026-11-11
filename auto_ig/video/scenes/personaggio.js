// Personaggio 3D stilizzato (forme semplici, materiali "toon"), riutilizzabile nelle scene.
//   const lei = makePerson(THREE, { pelle: '#f1c7a5', capelli: '#3b2219' });
//   lei.setMood('arrabbiata' | 'neutra' | 'felice');
//   lei.setOutfit({ top: '#..', bottom: '#..', scarpe: '#..' });
//   lei.pose.pestaPiedi(t) | maniNeiCapelli(t) | cammina(t) | digita(t) | telefono(t) | gioia(t) | fermo(t)
// Altezza ~3.4 unità, piedi a y = 0, guarda verso +z.

export function makePerson(THREE, opts = {}) {
  const o = { pelle: '#f1c7a5', capelli: '#3b2219', top: '#ffffff', bottom: '#2b2d42', scarpe: '#111111', ...opts };
  const mat = (c) => new THREE.MeshToonMaterial({ color: c });
  const M = { pelle: mat(o.pelle), capelli: mat(o.capelli), top: mat(o.top), bottom: mat(o.bottom),
              scarpe: mat(o.scarpe), scuro: mat('#1b1b1b'), bianco: mat('#ffffff'), guance: mat('#ff8fa3') };

  const root = new THREE.Group();          // posizione nel mondo
  const body = new THREE.Group();          // rimbalzi / inclinazioni
  root.add(body);
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };

  // Gambe (perno all'anca)
  const leg = (side) => {
    const g = new THREE.Group(); g.position.set(0.16 * side, 1.3, 0); body.add(g);
    add(g, new THREE.CapsuleGeometry(0.12, 0.95, 6, 12), M.pelle, 0, -0.6, 0);
    add(g, new THREE.BoxGeometry(0.22, 0.14, 0.38), M.scarpe, 0, -1.22, 0.07);
    return g;
  };
  const legL = leg(-1), legR = leg(1);

  // Busto + gonna
  add(body, new THREE.CapsuleGeometry(0.33, 0.62, 8, 16), M.top, 0, 2.05, 0);
  const skirt = add(body, new THREE.CylinderGeometry(0.34, 0.66, 0.85, 20, 1, true), M.bottom, 0, 1.38, 0);
  skirt.material.side = THREE.DoubleSide;

  // Braccia (perno alla spalla)
  const arm = (side) => {
    const g = new THREE.Group(); g.position.set(0.43 * side, 2.42, 0); body.add(g);
    add(g, new THREE.CapsuleGeometry(0.095, 0.7, 6, 10), M.top, 0, -0.4, 0);
    add(g, new THREE.SphereGeometry(0.11, 12, 10), M.pelle, 0, -0.86, 0);
    return g;
  };
  const armL = arm(-1), armR = arm(1);

  // Testa
  const head = new THREE.Group(); head.position.set(0, 2.62, 0); body.add(head);
  add(head, new THREE.CylinderGeometry(0.1, 0.12, 0.2, 10), M.pelle, 0, 0.05, 0);
  add(head, new THREE.SphereGeometry(0.42, 24, 18), M.pelle, 0, 0.45, 0);
  const hair = add(head, new THREE.SphereGeometry(0.46, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), M.capelli, 0, 0.5, -0.04);
  hair.rotation.x = -0.35;
  add(head, new THREE.SphereGeometry(0.2, 14, 12), M.capelli, 0, 0.78, -0.32);       // chignon
  // Viso (verso +z)
  const eyeL = add(head, new THREE.SphereGeometry(0.055, 10, 8), M.scuro, -0.14, 0.5, 0.38);
  const eyeR = add(head, new THREE.SphereGeometry(0.055, 10, 8), M.scuro, 0.14, 0.5, 0.38);
  const brow = (side) => add(head, new THREE.BoxGeometry(0.17, 0.035, 0.03), M.capelli, 0.15 * side, 0.63, 0.39);
  const browL = brow(-1), browR = brow(1);
  const mouth = add(head, new THREE.TorusGeometry(0.1, 0.022, 8, 20, Math.PI), M.scuro, 0, 0.3, 0.39);
  const cheekL = add(head, new THREE.SphereGeometry(0.07, 10, 8), M.guance, -0.25, 0.36, 0.33);
  const cheekR = add(head, new THREE.SphereGeometry(0.07, 10, 8), M.guance, 0.25, 0.36, 0.33);
  cheekL.scale.z = cheekR.scale.z = 0.3;

  // Ombra a terra
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; root.add(shadow);

  let mood = 'neutra';
  function setMood(m) {
    mood = m;
    const angry = m === 'arrabbiata', happy = m === 'felice';
    browL.rotation.z = angry ? -0.45 : happy ? 0.15 : 0;      // arrabbiata: estremità interne giù
    browR.rotation.z = angry ? 0.45 : happy ? -0.15 : 0;
    browL.position.y = browR.position.y = angry ? 0.6 : happy ? 0.66 : 0.63;
    mouth.rotation.z = angry ? 0 : Math.PI;                   // arco ∩ = broncio, ∪ = sorriso
    mouth.position.y = angry ? 0.27 : 0.33;
    mouth.scale.set(angry ? 0.8 : happy ? 1.25 : 0.9, angry ? 0.8 : happy ? 1.1 : 0.5, 1);
    cheekL.visible = cheekR.visible = happy || angry;
    M.guance.color.set(angry ? '#ff3b30' : '#ff8fa3');
  }

  function setOutfit({ top, bottom, scarpe } = {}) {
    if (top) M.top.color.set(top);
    if (bottom) M.bottom.color.set(bottom);
    if (scarpe) M.scarpe.color.set(scarpe);
  }

  function reset() {
    for (const g of [armL, armR, legL, legR, head, body]) g.rotation.set(0, 0, 0);
    body.position.set(0, 0, 0);
    // rotation.z: per il braccio sinistro (x<0) valori negativi = verso l'esterno, positivi = verso il centro
    armL.rotation.z = -0.12; armR.rotation.z = 0.12;
  }

  const pose = {
    fermo(t) { reset(); body.position.y = Math.sin(t * 2) * 0.02; head.rotation.z = Math.sin(t * 1.3) * 0.04; },
    pestaPiedi(t) {           // arrabbiata: pesta i piedi, pugni stretti che tremano
      reset();
      const s = Math.sin(t * 11);
      legL.rotation.x = -Math.max(0, s) * 0.7;
      legR.rotation.x = -Math.max(0, -s) * 0.7;
      body.position.y = Math.abs(s) * 0.08;
      armL.rotation.z = -0.35 - Math.sin(t * 23) * 0.06; armR.rotation.z = 0.35 + Math.sin(t * 23) * 0.06;
      armL.rotation.x = armR.rotation.x = -0.25;
      head.rotation.z = Math.sin(t * 17) * 0.06;
    },
    maniNeiCapelli(t) {       // disperata: mani in testa, scuote la testa
      reset();
      armL.rotation.z = 2.55; armR.rotation.z = -2.55;
      armL.rotation.x = armR.rotation.x = -0.35;
      head.rotation.y = Math.sin(t * 9) * 0.35;
      body.rotation.x = 0.08;
    },
    digita(t) {               // al computer: braccia avanti, dita che battono
      reset();
      armL.rotation.x = -1.25 + Math.sin(t * 19) * 0.08;
      armR.rotation.x = -1.25 + Math.sin(t * 19 + 1.7) * 0.08;
      armL.rotation.z = 0.25; armR.rotation.z = -0.25;
      head.rotation.x = 0.12;
    },
    telefono(t) {             // tiene il telefono davanti a sé e lo guarda
      reset();
      armR.rotation.x = -1.35; armR.rotation.z = -0.3;     // mani che si incontrano davanti al petto
      armL.rotation.x = -1.1 + Math.sin(t * 3) * 0.05; armL.rotation.z = 0.35;
      head.rotation.x = 0.22;
      body.position.y = Math.sin(t * 2) * 0.02;
    },
    gioia(t) {                // felice: piccoli saltelli, braccia su
      reset();
      const s = Math.abs(Math.sin(t * 6));
      body.position.y = s * 0.18;
      armL.rotation.z = -2.4 - s * 0.3; armR.rotation.z = 2.4 + s * 0.3;   // braccia a V verso l'alto
      head.rotation.z = Math.sin(t * 6) * 0.08;
    },
    cammina(t, ritmo = 5.5) { // passerella: passo deciso, anche e spalle che ondeggiano
      reset();
      const s = Math.sin(t * ritmo);
      legL.rotation.x = s * 0.5; legR.rotation.x = -s * 0.5;
      armL.rotation.x = -s * 0.35; armR.rotation.x = s * 0.35;
      body.position.y = Math.abs(Math.cos(t * ritmo)) * 0.07;
      body.rotation.y = s * 0.08; body.rotation.z = s * 0.03;
      head.rotation.y = -s * 0.05;
    },
  };

  setMood('neutra');
  reset();
  return { root, body, head, armL, armR, legL, legR, setMood, setOutfit, pose, get mood() { return mood; } };
}
