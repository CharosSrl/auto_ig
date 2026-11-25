// PRESET blocchi — accessori 3D. Ognuno sa dove agganciarsi: testa, busto, mano destra/sinistra, anca.
//   aggiungiAccessorio(THREE, av, nome, opz)     ACCESSORI: occhiali, occhialiSole, cuffie, catenina, orecchini, zaino, borsa, telefono, cartello
import { boxTondo, plastica, tono, tela } from './geometria.js';

export const ACCESSORI = ['occhiali', 'occhialiSole', 'cuffie', 'catenina', 'orecchini', 'zaino', 'borsa', 'telefono', 'cartello'];

const ORO = { color: '#e8b84a', roughness: 0.25, metalness: 0.85 };

export function aggiungiAccessorio(THREE, av, nome, o = {}) {
  const P = (c, ex) => plastica(THREE, c, ex);
  const g = new THREE.Group(); g.name = 'acc:' + nome;
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; g.add(k); return k; };
  switch (nome) {
    case 'occhiali': case 'occhialiSole': {
      const sole = nome === 'occhialiSole', col = o.colore || (sole ? '#151515' : '#2a1f1a'), m = P(col, { roughness: 0.3 });
      for (const s of [-1, 1]) {
        const x = s * 0.19, z = 0.64;
        if (sole) { const l = mesh(new THREE.CircleGeometry(0.15, 28), P('#101318', { roughness: 0.1, metalness: 0.3 }), x, 0.07, z + 0.005); l.rotation.y = s * 0.3; }
        const anello = mesh(new THREE.TorusGeometry(0.15, 0.026, 8, 28), m, x, 0.07, z); anello.rotation.y = s * 0.3;
        const asta = mesh(new THREE.BoxGeometry(0.03, 0.03, 0.5), m, s * 0.6, 0.1, 0.33); asta.rotation.y = s * 0.05;
      }
      mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), m, 0, 0.1, 0.69);
      av.testa.add(g); break;
    }
    case 'cuffie': {
      const col = o.colore || '#222', m = P(col, { roughness: 0.4 });
      mesh(new THREE.TorusGeometry(0.7, 0.06, 10, 32, Math.PI), m, 0, 0.12, 0);   // arco da orecchio a orecchio
      for (const s of [-1, 1]) {
        const c = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 24), m, s * 0.68, 0.05, 0); c.rotation.z = Math.PI / 2;
        const cu = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 24), P(o.colore2 || '#e94b6a'), s * 0.77, 0.05, 0); cu.rotation.z = Math.PI / 2;
      }
      av.testa.add(g); break;
    }
    case 'catenina': {
      const c = mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 32, Math.PI), P('#e8b84a', ORO), 0, 2.0, 0.5);
      c.rotation.set(0, 0, Math.PI); c.scale.set(1, 1.15, 1);
      mesh(new THREE.OctahedronGeometry(0.07), P('#e8b84a', ORO), 0, 1.5, 0.52);
      av.busto.add(g); break;
    }
    case 'orecchini': {
      for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16), P('#e8b84a', ORO), s * 0.6, -0.12, 0.02).rotation.y = Math.PI / 2;
      av.testa.add(g); break;
    }
    case 'zaino': {
      const col = o.colore || '#2f6fd1';
      mesh(boxTondo(THREE, 1.5, 1.6, 0.6, 0.22), P(col), 0, 1.05, -0.8);
      mesh(boxTondo(THREE, 1.1, 0.6, 0.25, 0.1), P(tono(col, -0.15)), 0, 0.65, -1.15);
      for (const s of [-1, 1]) mesh(boxTondo(THREE, 0.2, 2.0, 0.08, 0.03), P(tono(col, -0.3)), s * 0.62, 1.0, 0.52);
      av.busto.add(g); break;
    }
    case 'borsa': {
      const col = o.colore || '#b5532e';
      mesh(boxTondo(THREE, 0.32, 0.6, 0.9, 0.1), P(col, { roughness: 0.4 }), 0, -1.45, 0);
      const t = mesh(new THREE.TorusGeometry(0.4, 0.035, 6, 24, Math.PI), P(tono(col, -0.3)), 0, -1.1, 0); t.rotation.y = Math.PI / 2;
      g.position.x = -0.62; av.braccioS.add(g); break;
    }
    case 'telefono': {
      const tel = mesh(boxTondo(THREE, 0.42, 0.8, 0.07, 0.06), P('#1b1b1f', { roughness: 0.3 }), 0, 0, 0);
      const sch = mesh(new THREE.PlaneGeometry(0.36, 0.72), new THREE.MeshBasicMaterial({ color: o.schermo || '#7fc8ff' }), 0, 0, 0.04);
      g.position.set(0, -1.85, 0.42); g.rotation.x = -0.9; av.braccioD.add(g); g.userData.schermo = sch; break;
    }
    case 'cartello': {
      const testo = o.testo || 'NO', col = o.colore || '#fff6e0';
      const tex = tela(THREE, 512, 320, (c, w, h) => {
        c.fillStyle = col; c.fillRect(0, 0, w, h); c.strokeStyle = '#1d1418'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
        c.fillStyle = o.inchiostro || '#d32f2f'; c.font = '900 120px system-ui, "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        let fs = 130; while (c.measureText(testo).width > w - 60 && fs > 30) { fs -= 6; c.font = `900 ${fs}px system-ui, "DejaVu Sans", sans-serif`; }
        c.fillText(testo, w / 2, h / 2 + 6);
      });
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), P('#8a5a33'), 0, 0.6, 0);
      const pan = mesh(boxTondo(THREE, 2.0, 1.25, 0.08, 0.04), [P('#e8dcc4'), P('#e8dcc4'), P('#e8dcc4'), P('#e8dcc4'), P('#fff', { map: tex }), P('#e8dcc4')], 0, 2.2, 0.05);
      g.position.set(0, -1.85, 0.2); av.braccioD.add(g); break;
    }
  }
  return g;
}
