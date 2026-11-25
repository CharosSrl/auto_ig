// PRESET blocchi — capelli e cappelli 3D da agganciare alla testa (coordinate della testa: centro 0, raggio 0.6, alta 1.2).
//   creaCapelli(THREE, tipo, colore) -> Group      CAPELLI: rasati, corti, ciuffo, ricci, afro, cresta, caschetto, lunghi, coda, chignon, treccine, pelato
//   creaCappello(THREE, tipo, colore, colore2)     CAPPELLI: cappellino, cappellinoRovescio, berretto
import { boxTondo, plastica, tono, rnd } from './geometria.js';

export const CAPELLI = ['rasati', 'corti', 'ciuffo', 'ricci', 'afro', 'cresta', 'caschetto', 'lunghi', 'coda', 'chignon', 'treccine', 'pelato'];
export const CAPPELLI = ['cappellino', 'cappellinoRovescio', 'berretto'];

function mat(THREE, c) { return plastica(THREE, c, { roughness: 0.5, side: THREE.DoubleSide }); }
function cupola(THREE, m, r, sy, y) {
  const g = new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const o = new THREE.Mesh(g, m); o.scale.y = sy; o.position.y = y; return o;
}
// calotta: segue la forma della testa (cilindro con bordi tondi) gonfiata di `sp`, da y=`giu` fino in cima
export function calotta(THREE, m, sp = 0.07, giu = 0.18, { r = 0.6, h = 1.2, rb = 0.2, fronte = 0.13 } = {}) {
  // due pezzi: dietro e ai lati scende fino a `giu`, sulla fronte si ferma più in alto (lascia libere le sopracciglia)
  const R = r + sp, RB = rb + sp, top = h / 2 - rb;
  const profilo = (y0) => {
    const p = [new THREE.Vector2(R, y0)];
    if (y0 < top) p.push(new THREE.Vector2(R, top));
    for (let i = 1; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2); p.push(new THREE.Vector2(r - rb + Math.cos(a) * RB, top + Math.sin(a) * RB)); }
    p.push(new THREE.Vector2(0.001, top + RB)); return p;
  };
  const g = new THREE.Group(), ap = 1.5;
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profilo(giu), 40, ap / 2, Math.PI * 2 - ap), m));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profilo(Math.min(top, giu + fronte)), 16, -ap / 2, ap), m));
  return g;
}
// fascia dei capelli ai lati e dietro (lascia libera la faccia)
function fascia(THREE, m, r, h, yC, apertura = 1.25) {
  const g = new THREE.CylinderGeometry(r, r, h, 40, 1, true, apertura / 2, Math.PI * 2 - apertura);
  const o = new THREE.Mesh(g, m); o.position.y = yC; return o;
}
// bordo arrotondato in basso alla fascia, perché non sembri un tubo tagliato
function bordo(THREE, m, r, y, apertura = 1.25, spessore = 0.05) {
  const g = new THREE.TorusGeometry(r, spessore, 8, 40, Math.PI * 2 - apertura);
  const o = new THREE.Mesh(g, m); o.rotation.set(Math.PI / 2, 0, Math.PI / 2 + apertura / 2); o.position.y = y; return o;
}
// frangia: una ciocca morbida sulla fronte, sopra le sopracciglia
function frangia(THREE, m, w = 0.95, y = 0.44, inclina = 0.3, z = 0.6) {
  const o = new THREE.Mesh(boxTondo(THREE, w, 0.24, 0.24, 0.1), m);
  o.position.set(0, y, z); o.rotation.x = inclina; return o;
}

export function creaCapelli(THREE, tipo, colore = '#3a2618', o = {}) {
  const g = new THREE.Group(); g.name = 'capelli:' + tipo;
  const m = mat(THREE, colore), mScuro = mat(THREE, tono(colore, -0.25));
  const add = (...o) => o.forEach((x) => g.add(x));
  const cap = !!o.sottoCappello;        // sotto un cappello: niente ciuffi e frange che bucano la visiera
  switch (tipo) {
    case 'pelato': break;
    case 'rasati': add(calotta(THREE, m, 0.022, 0.24)); break;
    case 'corti':
      add(calotta(THREE, m, 0.07, 0.2), fascia(THREE, m, 0.672, 0.5, 0.0, 2.0), bordo(THREE, m, 0.672, -0.25, 2.0, 0.045));
      if (!cap) add(frangia(THREE, m, 0.9, 0.44, 0.35, 0.62)); break;
    case 'ciuffo': {
      add(calotta(THREE, m, 0.07, 0.2), fascia(THREE, m, 0.672, 0.5, 0.0, 2.0), bordo(THREE, m, 0.672, -0.25, 2.0, 0.045));
      if (cap) break;
      const c = new THREE.Mesh(boxTondo(THREE, 1.12, 0.5, 0.8, 0.22), m); c.position.set(0.04, 0.78, 0.22); c.rotation.set(-0.3, 0, -0.06); add(c);
      const p = new THREE.Mesh(boxTondo(THREE, 0.9, 0.36, 0.5, 0.16), m); p.position.set(0.08, 0.72, 0.56); p.rotation.set(-0.75, 0, -0.08); add(p);
      break;
    }
    case 'ricci': case 'afro': {
      const afro = tipo === 'afro', rr = rnd(afro ? 5 : 3);
      add(calotta(THREE, m, afro ? 0.24 : 0.09, afro ? 0.05 : 0.2));
      if (!afro) add(fascia(THREE, m, 0.68, 0.45, 0.0, 2.0));
      const sg = new THREE.IcosahedronGeometry(1, 2), n = afro ? 110 : 60, R = afro ? 0.86 : 0.7, H = afro ? 0.86 : 0.62, y0 = afro ? 0.05 : 0.12;
      for (let i = 0; i < n; i++) {
        const a = rr() * Math.PI * 2, el = rr() * (Math.PI / 2);
        const y = y0 + Math.sin(el) * H, fronte = Math.cos(a) > 0.35;
        if (fronte && y < 0.42) continue;                    // la faccia resta libera
        const s = new THREE.Mesh(sg, i % 3 ? m : mScuro); s.scale.setScalar((afro ? 0.17 : 0.13) + rr() * 0.06);
        s.position.set(Math.sin(a) * Math.cos(el) * R, y, Math.cos(a) * Math.cos(el) * R); add(s);
      }
      break;
    }
    case 'cresta': {
      add(calotta(THREE, mScuro, 0.02, 0.24));
      const cg = new THREE.ConeGeometry(0.15, 0.55, 4);
      for (let i = 0; i < 6; i++) {
        const c = new THREE.Mesh(cg, m); c.position.set(0, 0.86 - Math.abs(i - 1.5) * 0.02, 0.42 - i * 0.17); c.rotation.x = 0.4 - i * 0.12; c.scale.set(1, 1 + (i < 3 ? 0.3 : 0), 1.4); add(c);
      }
      break;
    }
    case 'caschetto':
      add(calotta(THREE, m, 0.09, 0.15), fascia(THREE, m, 0.69, 0.9, -0.12, 1.6), bordo(THREE, m, 0.69, -0.57, 1.6, 0.07));
      if (!cap) add(frangia(THREE, m, 1.05, 0.44, 0.25, 0.64)); break;
    case 'lunghi': {
      add(calotta(THREE, m, 0.09, 0.15), fascia(THREE, m, 0.69, 1.6, -0.47, 1.6), bordo(THREE, m, 0.69, -1.27, 1.6, 0.07));
      if (!cap) { const fr = new THREE.Mesh(boxTondo(THREE, 1.0, 0.26, 0.26, 0.11), m); fr.position.set(-0.12, 0.45, 0.6); fr.rotation.set(0.3, 0, 0.2); add(fr); }
      break;
    }
    case 'coda': {
      add(calotta(THREE, m, 0.07, 0.2), fascia(THREE, m, 0.672, 0.45, 0.02, 2.0));
      const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.8, 6, 14), m); c.position.set(0, 0.05, -0.92); c.rotation.x = 0.35; add(c);
      const el = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.06, 8, 16), plastica(THREE, '#e94b6a')); el.position.set(0, 0.5, -0.8); el.rotation.x = Math.PI / 2 + 0.35; add(el);
      break;
    }
    case 'chignon': {
      add(calotta(THREE, m, 0.07, 0.2), fascia(THREE, m, 0.672, 0.4, 0.05, 2.0));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), m); b.position.set(0, 0.92, -0.18); add(b);
      break;
    }
    case 'treccine': {
      add(calotta(THREE, m, 0.07, 0.2), fascia(THREE, m, 0.672, 0.45, 0.02, 2.0));
      const tg = new THREE.CapsuleGeometry(0.075, 1.0, 4, 8);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.5 + (i / 8) * Math.PI;
        const t = new THREE.Mesh(tg, i % 2 ? m : mScuro); t.position.set(Math.sin(a) * 0.7, -0.3, Math.cos(a) * 0.7); t.rotation.set(Math.cos(a) * -0.12, 0, Math.sin(a) * 0.12); add(t);
      }
      break;
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function creaCappello(THREE, tipo, colore = '#d33a3a', colore2) {
  const g = new THREE.Group(); g.name = 'cappello:' + tipo;
  const m = plastica(THREE, colore, { side: THREE.DoubleSide }), m2 = plastica(THREE, colore2 || tono(colore, -0.25));
  if (tipo === 'cappellino' || tipo === 'cappellinoRovescio') {
    g.add(calotta(THREE, m, 0.12, 0.26, { fronte: 0 }));
    const bott = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), m2); bott.position.y = 0.93; g.add(bott);
    const vis = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.06, 40, 1, false, -0.8, 1.6), m2);
    vis.position.set(0, 0.3, 0); vis.rotation.x = 0.08; g.add(vis);
    const fascia = new THREE.Mesh(new THREE.CylinderGeometry(0.725, 0.725, 0.1, 40, 1, true), m2); fascia.position.y = 0.31; g.add(fascia);
    if (tipo === 'cappellinoRovescio') g.rotation.y = Math.PI;
  } else if (tipo === 'berretto') {
    const cal = calotta(THREE, m, 0.13, 0.18, { fronte: 0.04 }); cal.scale.y = 1.12; g.add(cal);
    const risvolto = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 40, 1, true), m2); risvolto.position.y = 0.3; g.add(risvolto);
    const rr = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 6, 40), m2); rr.rotation.x = Math.PI / 2; rr.position.y = 0.15; g.add(rr);
    const pon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), m2); pon.position.y = 1.02; g.add(pon);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
