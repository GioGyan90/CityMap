import * as THREE from 'three';
import { rnd } from "./random";
import { toon } from "./materials";
import { Z0, X_END, COAST, BEACH_W, Z1 } from "./config";
import { world } from "./scene";

export function makeWaveTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 4;
  g.lineCap = 'round';
  for (let i = 0; i < 20; i++) {
    const x = rnd() * S, y = rnd() * S, len = 16 + rnd() * 28;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + len * 0.32, y - 7, x + len * 0.66, y + 7, x + len, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(100, 100);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const waveTex = makeWaveTexture();

export const sea = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), toon(0x2b8fcd));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.25;
sea.receiveShadow = true;
world.add(sea);

export const seaWaves = new THREE.Mesh(
  new THREE.PlaneGeometry(10000, 10000),
  new THREE.MeshBasicMaterial({ map: waveTex, transparent: true, opacity: 0.55, depthWrite: false, fog: true })
);
seaWaves.rotation.x = -Math.PI / 2;
seaWaves.position.y = 0.02;
world.add(seaWaves);

/* ============================================================
   3. 陆地 / 沙滩 / 草地 / 海岸泡沫
   ============================================================ */
export function makeBandMesh(xA, xB, depth, y, material, step = 2) {
  const pts = [];
  for (let z = Z0; z <= Z1; z += step) pts.push([xA(z), z]);
  for (let z = Z1; z >= Z0; z -= step) pts.push([xB(z), z]);

  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}

/* 岛体（沙色） */
makeBandMesh(COAST, () => X_END, 1.0, 0, toon(0xf2dfae));
/* 城市草地 */
makeBandMesh(z => COAST(z) + BEACH_W, () => X_END, 0.06, 1.0, toon(0x86c96b));
/* 湿沙 */
makeBandMesh(z => COAST(z) + 0.4, z => COAST(z) + 3.4, 0.035, 1.0, toon(0xe3cb94));
/* 海岸白色浪花 */
makeBandMesh(
  z => COAST(z) - 3.4, z => COAST(z) + 0.6, 0.02, -0.12,
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
);
