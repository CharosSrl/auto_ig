// PRESET — Oggetti di scena: telefono con l'app Cintre, monitor con ricerca, card outfit, contatore.
import { BORDEAUX, CIPRIA, CREMA, OUTFITS, canvasTex, font, fontLogo, roundRect, gruccia, figurino } from './brand.js';

const toon = (THREE, c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.1 });
const schermo = (THREE, tex) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

function rounded(THREE, w, h, d, r) {               // parallelepipedo con angoli arrotondati
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: d * 0.3, bevelThickness: d * 0.3, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -d / 2); return g;
}

// Telefono con l'app Cintre. Schermate: splash(k), app(u, len) (catalogo con filtri e outfit che scorrono)
export function telefonoCintre(THREE, w = 0.42, h = 0.86) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(rounded(THREE, w, h, 0.05, w * 0.14), toon(THREE, '#1b1b1b'));
  corpo.castShadow = true; g.add(corpo);
  const ct = canvasTex(THREE, 540, Math.round(540 * h / w));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.93), schermo(THREE, ct.tex));
  scr.position.z = 0.046; g.add(scr);
  const STILI = ['Casual', 'Elegante', 'Sport', 'Serata'];
  return {
    g, ct,
    splash(k = 1) {
      const { ctx, c } = ct;
      ctx.fillStyle = BORDEAUX; ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalAlpha = k;
      gruccia(ctx, c.width / 2, c.height * 0.4, 230, CIPRIA, 16);
      ctx.fillStyle = CIPRIA; ctx.font = fontLogo(96); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Cintre', c.width / 2, c.height * 0.6);
      ctx.font = font(30, 400); ctx.fillText('ti aiuta a vestirti', c.width / 2, c.height * 0.66);
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ct.tex.needsUpdate = true;
    },
    // opzioni: stili (chip), outfits (card), ricerca (testo che si scrive al posto dei chip),
    // evidenzia (0..1: la prima card viene scelta, con bordo e "Perfetto per te")
    app(u, len, { scelto = u > 0.9 ? 1 : -1, tocco = true, stili = STILI, outfits = OUTFITS, ricerca = '', evidenzia = 0 } = {}) {
      const { ctx, c } = ct;
      ctx.fillStyle = CREMA; ctx.fillRect(0, 0, c.width, c.height);
      const scroll = ricerca ? 0 : Math.max(0, Math.min(1, (u - 1.1) / Math.max(0.8, len - 1.3)));
      const sc = (1 - Math.pow(1 - scroll, 3)) * 520;
      for (let k = 0; k < 10; k++) {
        const col = k % 2, row = Math.floor(k / 2), x = 22 + col * 255, y = 260 + row * 330 - sc;
        if (y > c.height || y < -330) continue;
        ctx.fillStyle = '#f7e1dd'; roundRect(ctx, x, y, 240, 310, 22); ctx.fill();
        figurino(ctx, x + 120, y + 22, 255, outfits[(k + (scelto > 0 && !ricerca ? 1 : 0)) % outfits.length]);
        ctx.fillStyle = BORDEAUX; ctx.font = font(30); ctx.textBaseline = 'middle'; ctx.fillText('♥', x + 198, y + 36);
        if (k === 0 && evidenzia > 0) {
          ctx.save(); ctx.globalAlpha = Math.min(1, evidenzia);
          ctx.strokeStyle = BORDEAUX; ctx.lineWidth = 10; roundRect(ctx, x, y, 240, 310, 22); ctx.stroke();
          ctx.fillStyle = BORDEAUX; roundRect(ctx, x + 18, y + 258, 204, 40, 20); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = font(18, 700); ctx.textAlign = 'center';
          ctx.fillText('✓ Perfetto per te', x + 120, y + 279); ctx.textAlign = 'left'; ctx.restore();
        }
      }
      ctx.fillStyle = CREMA; ctx.fillRect(0, 150, c.width, 100);
      ctx.fillStyle = BORDEAUX; ctx.fillRect(0, 0, c.width, 150);
      gruccia(ctx, 70, 85, 70, CIPRIA, 8);
      ctx.fillStyle = CIPRIA; ctx.font = fontLogo(56); ctx.textBaseline = 'middle'; ctx.fillText('Cintre', 125, 82);
      if (ricerca) {                                   // barra di ricerca che si scrive da sola
        const n = Math.min(ricerca.length, Math.floor(u * 14));
        ctx.fillStyle = '#ffffff'; roundRect(ctx, 22, 168, c.width - 44, 66, 33); ctx.fill();
        ctx.strokeStyle = BORDEAUX; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#333'; ctx.font = font(26, 500); ctx.textBaseline = 'middle';
        ctx.strokeStyle = BORDEAUX; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(60, 198, 11, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(68, 206); ctx.lineTo(77, 215); ctx.stroke();
        ctx.fillText(ricerca.slice(0, n) + (n < ricerca.length && Math.floor(u * 3) % 2 ? '|' : ''), 92, 202);
        ct.tex.needsUpdate = true;
        return;
      }
      stili.forEach((st, i) => {
        const x = 22 + i * 128;
        ctx.fillStyle = i === scelto ? BORDEAUX : '#f1dcd9'; roundRect(ctx, x, 175, 118, 56, 28); ctx.fill();
        ctx.fillStyle = i === scelto ? '#fff' : BORDEAUX; ctx.font = font(21, 600); ctx.textAlign = 'center';
        ctx.fillText(st, x + 59, 204); ctx.textAlign = 'left';
      });
      if (tocco && u > 0.55 && u < 1.25) {
        const k = 1 - Math.abs((u - 0.9) / 0.35);
        ctx.fillStyle = `rgba(109,26,54,${0.35 * k})`; ctx.beginPath(); ctx.arc(209, 204, 40 + 30 * (1 - k), 0, 7); ctx.fill();
      }
      ct.tex.needsUpdate = true;
    },
  };
}

// Monitor su piedistallo con un browser: la ricerca si scrive da sola, poi compare Cintre come primo risultato
export function monitorRicerca(THREE, { ricerca = 'cosa mi metto oggi?' } = {}) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(rounded(THREE, 1.75, 1.15, 0.06, 0.05), toon(THREE, '#222222')); corpo.castShadow = true; g.add(corpo);
  const piede = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.08), toon(THREE, '#222222')); piede.position.set(0, -0.78, -0.05); g.add(piede);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.3), toon(THREE, '#222222')); base.position.set(0, -1.03, 0); g.add(base);
  const ct = canvasTex(THREE, 900, 580);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 1.04), schermo(THREE, ct.tex)); scr.position.z = 0.05; g.add(scr);
  return {
    g, ct,
    disegna(u) {
      const { ctx, c } = ct;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#e0e0e0'; ctx.fillRect(0, 0, c.width, 50);
      ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(30 + i * 28, 25, 9, 0, 7); ctx.fill(); });
      ctx.strokeStyle = '#bbbbbb'; ctx.lineWidth = 4; roundRect(ctx, 70, 95, 760, 80, 40); ctx.stroke();
      const n = Math.min(ricerca.length, Math.floor(u * 11));
      ctx.fillStyle = '#222'; ctx.font = font(40, 400); ctx.textBaseline = 'middle';
      ctx.fillText(ricerca.slice(0, n) + (Math.floor(u * 3) % 2 ? '|' : ''), 110, 136);
      if (u > 1.9) {
        ctx.globalAlpha = Math.min(1, (u - 1.9) / 0.4);
        ctx.fillStyle = '#f7e9e7'; roundRect(ctx, 60, 210, 780, 120, 18); ctx.fill();
        gruccia(ctx, 120, 272, 60, BORDEAUX, 7);
        ctx.fillStyle = BORDEAUX; ctx.font = font(40); ctx.fillText('Cintre', 175, 250);
        ctx.fillStyle = '#444'; ctx.font = font(28, 400); ctx.fillText("L'app che ti aiuta a vestirti", 175, 295);
        ctx.fillStyle = '#ddd';
        for (let r = 0; r < 3; r++) { ctx.fillRect(70, 370 + r * 60, 560 - r * 90, 18); ctx.fillRect(70, 395 + r * 60, 380, 12); }
        ctx.globalAlpha = 1;
      }
      ct.tex.needsUpdate = true;
    },
  };
}

// Texture delle card outfit (una per outfit della palette)
export function textureCard(THREE) {
  return OUTFITS.map((o) => {
    const ct = canvasTex(THREE, 260, 340);
    ct.ctx.fillStyle = CREMA; roundRect(ct.ctx, 6, 6, 248, 328, 26); ct.ctx.fill();
    ct.ctx.strokeStyle = CIPRIA; ct.ctx.lineWidth = 8; ct.ctx.stroke();
    figurino(ct.ctx, 130, 28, 290, o); ct.tex.needsUpdate = true; return ct.tex;
  });
}

// Scritta "N outfit" che conta (piano trasparente)
export function contatore(THREE, { larghezza = 3.2 } = {}) {
  const ct = canvasTex(THREE, 900, 220);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(larghezza, larghezza * 220 / 900),
    new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, toneMapped: false }));
  return {
    mesh: m,
    disegna(n, testo = 'outfit') {
      const { ctx, c } = ct;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = BORDEAUX; ctx.font = font(112, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,255,255,.85)'; ctx.shadowBlur = 18;
      ctx.fillText(`${n}${n >= 1000 ? '+' : ''} ${testo}`, c.width / 2, c.height / 2);
      ctx.shadowBlur = 0; ct.tex.needsUpdate = true;
    },
  };
}

// Calice (vetro + vino). Origine = base del piede. Da tenere in mano: lei.articolazioni.bR.mano.add(c.g)
export function calice(THREE, { vino = '#7a1029', scala = 1 } = {}) {
  const g = new THREE.Group();
  const vetro = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false });
  const pts = [[0.04, 0], [0.04, 0.008], [0.006, 0.015], [0.005, 0.13], [0.012, 0.145], [0.045, 0.19], [0.05, 0.25], [0.042, 0.29]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const bicchiere = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), vetro); g.add(bicchiere);
  const liquido = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: vino, roughness: 0.2 }));
  liquido.position.y = 0.215; liquido.scale.y = 1.1; g.add(liquido);
  const pelo = new THREE.Mesh(new THREE.CircleGeometry(0.046, 20), new THREE.MeshStandardMaterial({ color: vino, roughness: 0.2 }));
  pelo.rotation.x = -Math.PI / 2; pelo.position.y = 0.215; g.add(pelo);
  g.scale.setScalar(scala);
  return { g };
}

// Scintille dorate: esplodono intorno a un punto e salgono a spirale. burst(u, centro) con u in secondi.
export function scintille(THREE, { n = 70, colori = ['#ffd27a', '#ffffff', CIPRIA] } = {}) {
  const ct = canvasTex(THREE, 64, 64);
  const gr = ct.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  ct.ctx.fillStyle = gr; ct.ctx.fillRect(0, 0, 64, 64);
  ct.ctx.fillStyle = '#ffffff'; ct.ctx.fillRect(30, 2, 4, 60); ct.ctx.fillRect(2, 30, 60, 4); ct.tex.needsUpdate = true;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) { c.set(colori[i % colori.length]); col.set([c.r, c.g, c.b], i * 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.16, map: ct.tex, vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
  const punti = new THREE.Points(geo, mat); punti.frustumCulled = false; punti.visible = false;
  const h = (i) => { const x = Math.sin(i * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
  return {
    g: punti,
    burst(u, [cx, cy, cz], durata = 1.6) {
      punti.visible = u >= 0 && u <= durata;
      if (!punti.visible) return;
      const k = u / durata;
      for (let i = 0; i < n; i++) {
        const a = h(i) * Math.PI * 2 + u * (2 + h(i + 5) * 2), r = 0.25 + k * (0.9 + h(i + 9) * 0.9);
        pos[i * 3] = cx + Math.cos(a) * r; pos[i * 3 + 1] = cy - 1.6 + h(i + 3) * 3.2 + k * 0.8; pos[i * 3 + 2] = cz + Math.sin(a) * r;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.sin(Math.min(1, k) * Math.PI); mat.size = 0.12 + 0.1 * Math.sin(u * 20);
    },
  };
}
