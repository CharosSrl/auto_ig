// PRESET — Qualità di render: tone mapping, ombre morbide, luci a 3 punti, riflessi d'ambiente.
//   const luci = applicaQualita(THREE, renderer, scene, p.qualita);   // 'alta' | 'bozza'
//   luci.segui(lei.root.position)  -> l'ombra segue il soggetto
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

export function applicaQualita(THREE, renderer, scene, qualita = 'alta') {
  const alta = qualita !== 'bozza';
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = alta;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (alta) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
  }
  // luce principale (con ombra), riempimento caldo, controluce per staccare la figura dallo sfondo
  const key = new THREE.DirectionalLight(0xfff4e8, 2.4); key.position.set(3, 7, 6);
  key.castShadow = alta; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004;
  key.shadow.radius = 4; Object.assign(key.shadow.camera, { left: -4, right: 4, top: 6, bottom: -2, near: 1, far: 25 });
  const fill = new THREE.DirectionalLight(0xffe0e8, 0.9); fill.position.set(-5, 3, 4);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(-2, 5, -6);
  const amb = new THREE.HemisphereLight(0xffffff, 0x8a6f78, 0.9);
  scene.add(key, key.target, fill, rim, amb);
  return {
    key, fill, rim, amb, alta,
    segui(pos) { key.position.set(pos.x + 3, 7, pos.z + 6); key.target.position.set(pos.x, 1.5, pos.z); },
    ombre(...oggetti) { if (alta) oggetti.flat().forEach((o) => o.traverse((m) => { if (m.isMesh) m.receiveShadow = true; })); },
  };
}
