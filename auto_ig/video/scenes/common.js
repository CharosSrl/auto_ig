// Base comune delle scene: renderer 1080x1920 (Reels 9:16), parametri da URL,
// window.renderFrame(t) deterministico per il render fotogramma per fotogramma.
import * as THREE from '../vendor/three.module.min.js';

export const W = 1080, H = 1920;

export function params(defaults) {
  const q = new URLSearchParams(location.search);
  const p = { ...defaults };
  for (const [k, v] of q) if (v !== '') p[k] = v;
  return p;
}

// Testo su texture (niente font esterni): va a capo da solo.
export function textTexture(text, { width = 960, fontSize = 92, color = '#ffffff', weight = '700' } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${weight} ${fontSize}px system-ui, "DejaVu Sans", sans-serif`;
  ctx.font = font;
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > width - 40 && line) { lines.push(line); line = word; }
      else line = test;
    }
    lines.push(line);
  }
  // Se la parola più lunga non entra, riduci il carattere finché ci sta.
  let widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (widest > width - 40 && fontSize > 24) {
    fontSize -= 4;
    ctx.font = `${weight} ${fontSize}px system-ui, "DejaVu Sans", sans-serif`;
    widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  }
  const lh = fontSize * 1.2;
  c.width = width; c.height = Math.ceil(lines.length * lh + 40);
  ctx.font = `${weight} ${fontSize}px system-ui, "DejaVu Sans", sans-serif`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 12;
  lines.forEach((l, i) => ctx.fillText(l, width / 2, 20 + lh * (i + 0.5)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: c.width / c.height };
}

// Piano con testo, largo `w` unità.
export function textPlane(text, w, opts) {
  const { tex, aspect } = textTexture(text, opts);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w / aspect), mat);
}

// Larghezza/altezza visibili dalla camera prospettica a distanza `dist`.
export function viewSize(camera, dist) {
  const h = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
  return { w: h * camera.aspect, h };
}

// Numero pseudo-casuale deterministico in [0,1) da un intero.
export const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

// build(THREE, p) -> { scene, camera, update(t) }
export function start(defaults, build) {
  const p = params(defaults);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  // qualita=alta: supersampling 2x (2160x3840), poi ffmpeg riduce a 1080x1920 -> bordi più puliti
  renderer.setPixelRatio(p.qualita === 'alta' ? 2 : 1);
  renderer.setSize(W, H, false);
  window.__setRatio = (r) => { renderer.setPixelRatio(r); renderer.setSize(W, H, false); };
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cv = renderer.domElement;
  if (!p.render) { cv.style.height = '90vh'; cv.style.width = 'auto'; }
  document.body.appendChild(cv);
  const ctx = build(THREE, p, renderer);
  window.renderFrame = (t) => { ctx.update(t); renderer.render(ctx.scene, ctx.camera); };
  window.grabFrame = (t, q = 0.92) => { window.renderFrame(t); return cv.toDataURL('image/jpeg', q); };
  window.sceneReady = true;
  if (!p.render) {             // anteprima nel browser: animazione in loop
    const dur = parseFloat(p.durata) || 8, t0 = performance.now();
    const loop = () => { window.renderFrame(((performance.now() - t0) / 1000) % dur); requestAnimationFrame(loop); };
    loop();
  }
}
