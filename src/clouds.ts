import * as THREE from 'three';
import { rr, ri } from "./random";
import { toon } from "./materials";
import { world } from "./scene";

export function buildClouds() {
  const cloudMat = toon(0xffffff);
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const n = ri(3, 6);
    for (let k = 0; k < n; k++) {
      const r = rr(6, 13);
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), cloudMat);
      s.position.set(rr(-16, 16), rr(-3, 3), rr(-9, 9));
      s.scale.y = rr(0.55, 0.85);
      g.add(s);
    }
    g.position.set(rr(-260, 260), rr(85, 140), rr(-260, 260));
    world.add(g);
  }
}

