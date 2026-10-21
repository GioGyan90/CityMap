import * as THREE from 'three';
import { rr, pick, clamp, TAU } from "./random";
import { toon } from "./materials";
import { GROUND_Y, Z0, Z1 } from "./config";
import { world } from "./scene";

export function buildMountains() {
  const cols = [0x4fa062, 0x439256, 0x5cb26e, 0x3b8350, 0x66bd77];

  for (let i = 0; i < 22; i++) {
    const z = Z0 + 12 + i * ((Z1 - Z0 - 24) / 21) + rr(-5, 5);
    const baseX = 104 + Math.abs(z) * 0.16 + rr(-6, 10);
    const h = 40 + rr(-10, 26) + (1 - Math.abs(z) / 170) * 26;
    const r = clamp(h * rr(0.72, 0.95), 26, 46);

    const geo = new THREE.ConeGeometry(r, h, 6, 2, false);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      if (y < h / 2 - 0.5) {
        pos.setX(v, pos.getX(v) + rr(-r * 0.14, r * 0.14));
        pos.setZ(v, pos.getZ(v) + rr(-r * 0.14, r * 0.14));
      }
    }
    geo.computeVertexNormals();

    const m = new THREE.Mesh(geo, toon(pick(cols)));
    m.position.set(baseX, GROUND_Y + h / 2 - 3, z);
    m.receiveShadow = true;
    world.add(m);
  }

  /* 山脚低矮丘陵 */
  for (let i = 0; i < 26; i++) {
    const z = rr(Z0 + 6, Z1 - 6);
    const x = rr(78, 100);
    const r = rr(6, 13);
    const geo = new THREE.SphereGeometry(r, 8, 6, 0, TAU, 0, Math.PI / 2);
    const m = new THREE.Mesh(geo, toon(pick([0x6ec27a, 0x5cae6b, 0x7ccb86])));
    m.position.set(x, GROUND_Y + rr(-1, 2), z);
    m.scale.y = rr(0.5, 1.0);
    m.receiveShadow = true;
    m.castShadow = false;
    world.add(m);
  }
}

