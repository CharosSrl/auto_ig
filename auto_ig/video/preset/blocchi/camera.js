// PRESET blocchi — la camera che si muove (come nei reel con gli avatar): primi piani, quinte, campo largo, orbita.
//   inquadra(THREE, cam, {tipo, chi, verso, ...}, u, t)   u = avanzamento 0..1 dentro l'inquadratura, t = tempo assoluto
//   TIPI: primoPiano, mezzoBusto, figura, quinta, campoLargo, dalBasso, orbita, carrello, dettaglio
//   scossa(t, colpi)  -> offset [x, y] da sommare (colpi = tempi in s dei boom)
// Il movimento è sempre un po' vivo: push-in lento e "mano" leggera, mai camera ferma.

export const TIPI_CAMERA = ['primoPiano', 'mezzoBusto', 'figura', 'gruppo', 'quinta', 'campoLargo', 'dalBasso', 'orbita', 'carrello', 'dettaglio'];

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };

function mano(t, k = 1) {   // tremolio da camera a mano, deterministico
  return [0.035 * k * (Math.sin(t * 1.7) + 0.5 * Math.sin(t * 3.9 + 1)), 0.03 * k * (Math.sin(t * 1.3 + 2) + 0.5 * Math.sin(t * 4.3))];
}

export function scossa(t, colpi = []) {
  let x = 0, y = 0;
  for (const c of colpi) { const d = t - c; if (d >= 0 && d < 0.45) { const k = Math.exp(-d * 9) * 0.22; x += k * Math.sin(d * 70); y += k * Math.cos(d * 55); } }
  return [x, y];
}

// direzione "davanti" di un avatar nel mondo
function davanti(THREE, av) { const ry = av.root.rotation.y; return new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)); }

export function inquadra(THREE, cam, s, u = 0, t = 0) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const chi = s.chi, testa = chi ? chi.testaMondo(V()) : V(0, 4.6, 0);
  let pos, mira, fov = s.fov || 38;
  const angolo = s.angolo ?? 0.22;                     // un po' di tre quarti: più bello del frontale piatto
  const dirDa = (dist, alt, ang) => { const d = chi ? davanti(THREE, chi) : V(0, 0, 1); d.applyAxisAngle(V(0, 1, 0), ang); return d.multiplyScalar(dist).add(V(0, alt, 0)); };
  switch (s.tipo) {
    case 'primoPiano': {                                // testa e spalle, push-in lento
      const dist = (s.dist || 6.2) * (1 - 0.12 * ease(u));
      mira = testa.clone().add(V(0, -0.35, 0)); pos = mira.clone().add(dirDa(dist, 0.25, angolo)); break;
    }
    case 'mezzoBusto': {
      const dist = (s.dist || 9.5) * (1 - 0.08 * ease(u));
      mira = testa.clone().add(V(0, -1.3, 0)); pos = mira.clone().add(dirDa(dist, 0.6, angolo)); break;
    }
    case 'figura': {
      const dist = (s.dist || 16) * (1 - 0.06 * ease(u));
      mira = testa.clone().add(V(0, -2.3, 0)); pos = mira.clone().add(dirDa(dist, 1.6, angolo)); break;
    }
    case 'gruppo': {                                    // due personaggi interi in campo, dal punto di mezzo
      const ta = s.verso ? s.verso.testaMondo(V()) : testa.clone(), m = testa.clone().add(ta).multiplyScalar(0.5);
      const larg = testa.distanceTo(ta), dist = (s.dist || 15 + larg * 1.3) * (1 - 0.07 * ease(u));
      mira = m.add(V(0, -2.2, 0)); pos = mira.clone().add(V(Math.sin(angolo * 0.5) * dist, 1.8, Math.cos(angolo * 0.5) * dist)); break;
    }
    case 'quinta': {                                    // dietro la spalla di `verso`, guardando `chi`
      const altro = s.verso, ta = altro.testaMondo(V());
      const asse = testa.clone().sub(ta).setY(0).normalize(), lato = V(asse.z, 0, -asse.x).multiplyScalar(s.lato ?? 1);
      pos = ta.clone().add(asse.clone().multiplyScalar(-4.2 + 0.6 * ease(u))).add(lato.multiplyScalar(2.9)).add(V(0, 0.9, 0));
      mira = testa.clone().add(V(0, -0.4, 0)); fov = s.fov || 40; break;
    }
    case 'campoLargo': {                                // dall'alto, si apre piano
      const c = s.centro || V(0, 1.5, 0);
      mira = c.clone(); pos = c.clone().add(V(Math.sin(0.35 + 0.1 * u) * 30, 17 - 2 * ease(u), Math.cos(0.35 + 0.1 * u) * 30)); fov = s.fov || 42; break;
    }
    case 'dalBasso': {                                  // camera bassa, il personaggio sembra enorme
      mira = testa.clone().add(V(0, -0.6, 0)); pos = testa.clone().add(dirDa(7.5 - 0.8 * ease(u), -3.9, angolo)); fov = s.fov || 44; break;
    }
    case 'orbita': {
      const c = s.centro || testa.clone().add(V(0, -1.5, 0)), r = s.dist || 11, a = (s.da ?? -0.6) + (s.giro ?? 1.2) * ease(u);
      mira = c.clone(); pos = c.clone().add(V(Math.sin(a) * r, 1.5, Math.cos(a) * r)); break;
    }
    case 'carrello': {                                  // segue di lato chi cammina
      mira = testa.clone().add(V(0, -1.6, 0)); pos = mira.clone().add(V(s.lato === -1 ? -1 : 1, 0, 0).multiplyScalar(0).add(V(0, 0.8, s.dist || 13))); break;
    }
    case 'dettaglio': {
      const dd = (s.dist || 4) * (1 - 0.15 * ease(u)), aa = s.angolo ?? 0.1;     // angolo: giro intorno all'oggetto
      mira = s.punto.clone(); pos = mira.clone().add(V(Math.sin(aa) * dd, s.alto ?? 0.6, Math.cos(aa) * dd)); fov = s.fov || 34; break;
    }
    default: mira = testa; pos = testa.clone().add(V(0, 0, 8));
  }
  const [hx, hy] = mano(t, s.mano ?? 1), [sx, sy] = scossa(t, s.colpi || []);
  pos.x += hx + sx; pos.y += hy + sy;
  cam.fov = fov; cam.updateProjectionMatrix();
  cam.position.copy(pos); cam.lookAt(mira);
  if (s.rollio) cam.rotation.z += s.rollio * Math.sin(u * Math.PI);
}
