import * as THREE from 'three';
import { rnd } from "./random";
import { toon } from "./materials";
import { Z0, X_END, COAST, BEACH_W, Z1 } from "./config";
import { world } from "./scene";

import './water';

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
