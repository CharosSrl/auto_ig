// PRESET blocchi — geometrie di base degli avatar a blocchi (tutte fatte da noi, nessun asset esterno).
//   boxTondo(THREE, w, h, d, r)  -> scatola con spigoli arrotondati e UV "piatte" per faccia (per dipingere i vestiti)
//   testaTonda(THREE, r, h, rb)  -> cilindro con bordi arrotondati (la testa)
//   tela(w, h, disegna)          -> CanvasTexture disegnata da una funzione (ctx, w, h)

// Ordine delle facce di BoxGeometry: +x, -x, +y, -y, +z (davanti), -z (dietro)
export const FACCE = ['destra', 'sinistra', 'sopra', 'sotto', 'davanti', 'dietro'];

export function boxTondo(THREE, w, h, d, r = 0.08, k = 3) {
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const n = 2 * k + 1;
  const g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const half = [w / 2, h / 2, d / 2], v = new THREE.Vector3(), s = [0, 0, 0], dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const c = [v.x, v.y, v.z], out = [0, 0, 0];
    for (let a = 0; a < 3; a++) {
      const gi = Math.round((c[a] + 0.5) * n);                 // indice della linea della griglia 0..n
      const base = gi <= k ? -(half[a] - r) : half[a] - r;      // il segmento centrale si allunga sul piatto
      s[a] = gi <= k ? gi / k - 1 : (gi - k - 1) / k;           // -1..0 nella fascia bassa, 0..1 in quella alta
      out[a] = base;
    }
    dir.set(s[0], s[1], s[2]);
    if (dir.lengthSq() < 1e-9) dir.copy(new THREE.Vector3().fromBufferAttribute(nor, i));
    dir.normalize();
    pos.setXYZ(i, out[0] + dir.x * r, out[1] + dir.y * r, out[2] + dir.z * r);
    nor.setXYZ(i, dir.x, dir.y, dir.z);
  }
  // UV proiettate per faccia: la texture copre tutta la faccia in modo uniforme
  const idx = g.index;
  g.groups.forEach((gr, f) => {
    for (let j = gr.start; j < gr.start + gr.count; j++) {
      const i = idx.getX(j); v.fromBufferAttribute(pos, i);
      const x = (v.x + w / 2) / w, y = (v.y + h / 2) / h, z = (v.z + d / 2) / d;
      const [u, vv] = [[1 - z, y], [z, y], [x, 1 - z], [x, z], [x, y], [1 - x, y]][f];
      uv.setXY(i, u, vv);
    }
  });
  g.computeBoundingSphere();
  return g;
}

export function testaTonda(THREE, r = 0.6, h = 1.2, rb = 0.2, seg = 48) {
  const p = [new THREE.Vector2(0, -h / 2)];
  const archi = 8;
  for (let i = 0; i <= archi; i++) {                 // bordo sotto
    const a = -Math.PI / 2 + (i / archi) * (Math.PI / 2);
    p.push(new THREE.Vector2(r - rb + Math.cos(a) * rb, -h / 2 + rb + Math.sin(a) * rb));
  }
  for (let i = 0; i <= archi; i++) {                 // bordo sopra
    const a = (i / archi) * (Math.PI / 2);
    p.push(new THREE.Vector2(r - rb + Math.cos(a) * rb, h / 2 - rb + Math.sin(a) * rb));
  }
  p.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(p, seg);
}

export function tela(THREE, w, h, disegna) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  disegna(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Colori: schiarisce/scurisce un esadecimale (f > 0 schiarisce, f < 0 scurisce)
export function tono(hex, f) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, a = Math.abs(f);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// Materiale opaco "giocattolo": un filo di lucido, niente metallo
export function plastica(THREE, colore, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: colore, roughness: 0.62, metalness: 0, ...extra });
}

// Pseudo-casuale deterministico
export function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
