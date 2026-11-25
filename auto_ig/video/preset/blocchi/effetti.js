// PRESET blocchi — effetti 3D da scena: germi (puntini verdi che escono e galleggiano), cuori, stelline.
//   const e = creaEffetto(THREE, 'germi'); scene.add(e.gruppo); e.aggiorna(dt, origine)   dt = secondi dall'inizio
import { rnd } from './geometria.js';

export const EFFETTI = ['germi', 'cuori', 'stelle', 'puzza'];

export function creaEffetto(THREE, tipo = 'germi', n = 34) {
  const g = new THREE.Group(); g.name = 'effetto:' + tipo;
  const r = rnd(tipo.length * 31 + n), parti = [];
  const colori = { germi: ['#7be35a', '#a6f06a', '#4fc24a'], cuori: ['#ff4d6d'], stelle: ['#ffd23f'], puzza: ['#b6c95a', '#93a83f'] }[tipo] || ['#ffffff'];
  for (let i = 0; i < n; i++) {
    const col = colori[i % colori.length];
    const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.4, transparent: true });
    let geo;
    if (tipo === 'germi') geo = new THREE.IcosahedronGeometry(0.16 + r() * 0.12, 1);
    else if (tipo === 'puzza') geo = new THREE.TorusGeometry(0.22, 0.06, 6, 16, Math.PI * 1.4);
    else geo = new THREE.OctahedronGeometry(0.2);
    const m = new THREE.Mesh(geo, mat); g.add(m);
    // germi: qualche "pallino" con gli occhietti scuri, così si capisce che sono vivi
    if (tipo === 'germi' && i % 3 === 0) for (const s of [-1, 1]) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#13240f' }));
      o.position.set(s * 0.06, 0.05, 0.15); m.add(o);
    }
    parti.push({ m, ritardo: r() * 1.2, ang: r() * Math.PI * 2, rag: 0.4 + r() * 1.3, vel: 0.8 + r() * 1.2, fase: r() * 6 });
  }
  return {
    gruppo: g,
    aggiorna(dt, o = new THREE.Vector3()) {
      for (const p of parti) {
        const k = Math.max(0, dt - p.ritardo), vis = k > 0;
        p.m.visible = vis; if (!vis) continue;
        const sale = Math.min(1.7, k * p.vel * 0.9);          // restano intorno alle scarpe, non salgono in faccia
        const a = p.ang + k * 0.8;
        p.m.position.set(o.x + Math.cos(a) * p.rag * Math.min(1, k * 2), o.y + 0.3 + sale + Math.sin(k * 4 + p.fase) * 0.12, o.z + Math.sin(a) * p.rag * Math.min(1, k * 2));
        const pop = Math.min(1, k * 5);
        p.m.scale.setScalar(pop * (1 + 0.15 * Math.sin(k * 9 + p.fase)));
        p.m.rotation.set(k * 2 + p.fase, k * 1.5, 0);
        p.m.material.opacity = 1;
      }
    },
  };
}
