// PRESET — Regia: atti sincronizzati con le frasi, dissolvenze tra set, movimenti di camera.
//
//   const atti = tempiAtti(p, 8);          // p.atti = "0.6,3.1,..." (inizio di ogni frase), p.fine
//   const { i, u, len } = atti.a(t);       // atto corrente, secondi dall'inizio dell'atto, durata atto
//   const velo = dissolvenza(THREE, camera, '#1a0710');  velo(opacita)
//   inquadra(camera, [x, y, z], [lx, ly, lz]);
// Regola d'oro: il contenuto importante sta nel 58% alto dell'immagine (sotto ci sono i sottotitoli).

export const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
export const easeInOut = (x) => { x = Math.min(Math.max(x, 0), 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const mix = (a, b, k) => a + (b - a) * k;

export function tempiAtti(p, numero, predefiniti = null) {
  const def = predefiniti || Array.from({ length: numero }, (_, k) => 0.6 + k * 2.4).join(',');
  const A = String(p.atti || def).split(',').map(Number).filter((x) => !isNaN(x));
  const fine = parseFloat(p.fine) || (A[A.length - 1] + 3);
  const S = [0, ...A.slice(1)];                       // il primo atto parte da t = 0
  return {
    inizi: S, fine,
    a(t) {
      let i = 0;
      for (let k = 0; k < S.length; k++) if (t >= S[k]) i = k;
      return { i: Math.min(i, numero - 1), u: t - S[i], len: (S[i + 1] ?? fine) - S[i] };
    },
  };
}

export function dissolvenza(THREE, camera, colore = '#1a0710') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: 0, depthTest: false, toneMapped: false }));
  m.position.z = -1; m.renderOrder = 999; camera.add(m);
  return (opacita) => { m.material.opacity = Math.max(0, Math.min(1, opacita)); m.visible = opacita > 0.001; };
}

export function inquadra(camera, pos, guarda) {
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(guarda[0], guarda[1], guarda[2]);
}

// Carrellata: interpola posizione e punto guardato tra due inquadrature con k (0..1)
export function carrellata(camera, da, a, k) {
  const e = easeInOut(k);
  inquadra(camera, da[0].map((v, i) => mix(v, a[0][i], e)), da[1].map((v, i) => mix(v, a[1][i], e)));
}
