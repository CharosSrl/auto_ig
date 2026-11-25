// PRESET blocchi — scarpe 3D sotto le gambe (coordinate della gamba: anca in 0, piede da y=-2; davanti = +z).
//   creaScarpa(THREE, tipo, colore, colore2) -> Group      SCARPE: sneaker, alte, stivali, anfibi, crocs, tacchi, ciabatte, scalzo
import { boxTondo, plastica, tono } from './geometria.js';

export const SCARPE = ['sneaker', 'alte', 'stivali', 'anfibi', 'crocs', 'tacchi', 'ciabatte', 'scalzo'];

export function creaScarpa(THREE, tipo, colore = '#f2f2f2', colore2) {
  const g = new THREE.Group(); g.name = 'scarpa:' + tipo;
  const P = (c, ex) => plastica(THREE, c, ex);
  const box = (w, h, d, r, c, x, y, z, ex) => { const m = new THREE.Mesh(boxTondo(THREE, w, h, d, r), P(c, ex)); m.position.set(x, y, z); g.add(m); return m; };
  const Y = -2, c2 = colore2 || tono(colore, -0.35);
  switch (tipo) {
    case 'scalzo': break;
    case 'sneaker': case 'alte': {
      const alta = tipo === 'alte' ? 0.32 : 0;
      box(1.08, 0.16, 1.36, 0.06, '#fbfbf6', 0, Y + 0.08, 0.12);                       // suola chiara
      box(1.06, 0.06, 1.38, 0.03, tono(c2, -0.1), 0, Y + 0.03, 0.12, { roughness: 0.9 }); // battistrada
      box(1.02, 0.46 + alta, 1.12, 0.14, colore, 0, Y + 0.38 + alta / 2, 0.06);          // tomaia
      box(0.96, 0.26, 0.36, 0.12, tono(colore, 0.15), 0, Y + 0.27, 0.6);                 // punta
      for (const s of [-1, 1]) box(0.04, 0.12, 0.62, 0.02, c2, s * 0.52, Y + 0.36, 0.06); // riga laterale
      for (let i = 0; i < 3; i++) box(0.5, 0.05, 0.07, 0.02, '#ffffff', 0, Y + 0.62 + alta + 0.0 - i * 0.0, 0.2 + i * 0.13).rotation.x = -0.15; // lacci
      box(0.6, 0.18, 0.12, 0.05, c2, 0, Y + 0.62 + alta, -0.5);                         // linguetta del tallone
      break;
    }
    case 'stivali': {
      box(1.08, 0.18, 1.32, 0.05, '#2a1b14', 0, Y + 0.09, 0.1);
      box(1.04, 1.1, 1.08, 0.1, colore, 0, Y + 0.72, 0.02);
      box(0.96, 0.34, 0.34, 0.14, tono(colore, 0.08), 0, Y + 0.33, 0.58);
      box(1.06, 0.12, 1.1, 0.04, tono(colore, -0.2), 0, Y + 1.24, 0.02);                 // bordo in alto
      break;
    }
    case 'anfibi': {
      box(1.1, 0.24, 1.36, 0.06, '#141414', 0, Y + 0.12, 0.12, { roughness: 0.85 });
      box(1.12, 0.05, 1.38, 0.02, '#f2c230', 0, Y + 0.25, 0.12);                          // cucitura gialla
      box(1.04, 0.8, 1.1, 0.12, colore, 0, Y + 0.66, 0.04, { roughness: 0.35 });
      box(0.98, 0.32, 0.36, 0.15, tono(colore, 0.1), 0, Y + 0.42, 0.6, { roughness: 0.3 });
      for (let i = 0; i < 4; i++) box(0.5, 0.045, 0.06, 0.02, '#d9d9d9', 0, Y + 0.95 - i * 0.14, 0.58 + i * 0.0);
      break;
    }
    case 'crocs': {
      box(1.12, 0.2, 1.4, 0.08, tono(colore, -0.12), 0, Y + 0.1, 0.14);
      box(1.1, 0.48, 1.3, 0.24, colore, 0, Y + 0.38, 0.14, { roughness: 0.75 });
      const hole = new THREE.CylinderGeometry(0.055, 0.055, 0.1, 10), hm = P(tono(colore, -0.5));
      [[-0.25, 0.5], [0, 0.55], [0.25, 0.5], [-0.12, 0.32], [0.12, 0.32], [-0.3, 0.2], [0.3, 0.2]].forEach(([x, z]) => {
        const h = new THREE.Mesh(hole, hm); h.position.set(x, Y + 0.62, z + 0.14); g.add(h);
      });
      box(1.18, 0.12, 0.16, 0.05, colore, 0, Y + 0.48, -0.4);                              // cinturino dietro
      break;
    }
    case 'tacchi': {
      box(1.0, 0.1, 1.2, 0.04, '#1e1414', 0, Y + 0.3, 0.12).rotation.x = 0.12;          // pianta inclinata
      box(1.0, 0.3, 0.6, 0.14, colore, 0, Y + 0.25, 0.42, { roughness: 0.25 });           // punta lucida
      box(1.0, 0.22, 0.5, 0.08, colore, 0, Y + 0.45, -0.25, { roughness: 0.25 });         // tallone
      box(0.16, 0.36, 0.16, 0.04, '#1e1414', 0, Y + 0.18, -0.38);                          // tacco
      box(0.9, 0.06, 0.7, 0.03, '#1e1414', 0, Y + 0.03, 0.4);
      break;
    }
    case 'ciabatte': {
      box(1.08, 0.16, 1.36, 0.06, tono(colore, -0.15), 0, Y + 0.08, 0.12);
      box(1.12, 0.26, 0.48, 0.12, colore, 0, Y + 0.28, 0.32);
      break;
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
