import * as THREE from 'three';
import { rnd, rr, pick } from "./random";
import { toon } from "./materials";
import { GROUND_Y } from "./config";
import { world } from "./scene";

export const cars = [];
export function buildCars() {
  const bodyCols = [0xef476f, 0xffd166, 0x06d6a0, 0x118ab2, 0xf78c6b, 0xffffff, 0x9b5de5];

  const routes = [
    { type: 'x', line: -38, from: -30, to: 70 },
    { type: 'x', line: -10, from: -30, to: 70 },
    { type: 'x', line: 18, from: -30, to: 70 },
    { type: 'x', line: 46, from: -30, to: 70 },
    { type: 'x', line: 74, from: -30, to: 70 },
    { type: 'z', line: -34, from: -62, to: 70 },
    { type: 'z', line: -6, from: -62, to: 70 },
    { type: 'z', line: 22, from: -62, to: 70 },
    { type: 'z', line: 50, from: -62, to: 70 },
    { type: 'z', line: 74, from: -62, to: 70 }
  ];

  for (let i = 0; i < 18; i++) {
    const r = routes[i % routes.length];
    const dir = rnd() > 0.5 ? 1 : -1;

    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.3, 1.7), toon(pick(bodyCols)));
    body.position.y = 0.85;
    body.castShadow = true;
    g.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.55), toon(0x2d3f57));
    cabin.position.set(-0.2, 1.85, 0);
    cabin.castShadow = true;
    g.add(cabin);

    for (const dx of [-1.0, 1.0]) {
      for (const dz of [-0.85, 0.85]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.28, 8), toon(0x2a2a33));
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(dx, 0.45, dz);
        g.add(wheel);
      }
    }

    const offset = rnd();
    if (r.type === 'x') {
      g.position.set(r.from + (r.to - r.from) * offset, GROUND_Y, r.line + dir * 1.6);
      g.rotation.y = dir > 0 ? 0 : Math.PI;
    } else {
      g.position.set(r.line - dir * 1.6, GROUND_Y, r.from + (r.to - r.from) * offset);
      g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    }

    world.add(g);
    cars.push({ mesh: g, route: r, dir, t: offset, speed: rr(0.055, 0.11) });
  }
}

