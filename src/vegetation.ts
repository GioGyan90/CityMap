import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd, rr, TAU } from "./random";
import { toon } from "./materials";
import { GROUND_Y, Z0, COAST, BEACH_W, Z1 } from "./config";
import { world } from "./scene";
import { ROAD_X, ROAD_Z } from "./roads";

export function nm(g) { return g.index ? g.toNonIndexed() : g; }

export function colorize(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export function palmGeometry() {
  const parts = [];

  const trunk = nm(new THREE.CylinderGeometry(0.28, 0.55, 7, 6, 1));
  trunk.translate(0, 3.5, 0);
  parts.push(colorize(trunk, 0x9a7048));

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const f = nm(new THREE.ConeGeometry(0.85, 5.4, 4, 1));
    f.scale(1, 1, 0.3);
    f.translate(0, 2.7, 0);
    f.rotateX(Math.PI / 2 + 0.34);
    f.rotateY(a);
    f.translate(0, 6.9, 0);
    parts.push(colorize(f, i % 2 ? 0x3f9e4f : 0x58b862));
  }

  /* 椰子 */
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const nut = nm(new THREE.IcosahedronGeometry(0.42, 0));
    nut.translate(Math.cos(a) * 0.55, 6.7, Math.sin(a) * 0.55);
    parts.push(colorize(nut, 0x6b4a2f));
  }

  return mergeGeometries(parts, false);
}

export function roundTreeGeometry(leafColor) {
  const parts = [];

  const trunk = nm(new THREE.CylinderGeometry(0.28, 0.42, 3.0, 6, 1));
  trunk.translate(0, 1.5, 0);
  parts.push(colorize(trunk, 0x8a6440));

  const blobs = [
    [0, 4.1, 0, 2.2],
    [1.3, 3.4, 0.5, 1.5],
    [-1.2, 3.6, -0.6, 1.5],
    [0.2, 5.3, -0.3, 1.4]
  ];
  for (const [bx, by, bz, br] of blobs) {
    const b = nm(new THREE.IcosahedronGeometry(br, 0));
    b.translate(bx, by, bz);
    parts.push(colorize(b, leafColor));
  }

  return mergeGeometries(parts, false);
}

export const treeMat = toon(0xffffff, { vertexColors: true });

export function blocked(x, z) {
  /* 避开道路 */
  for (const rx of ROAD_X) if (Math.abs(x - rx) < 5.4 && z > ROAD_Z[0] - 2 && z < ROAD_Z[ROAD_Z.length - 1] + 2) return true;
  for (const rz of ROAD_Z) if (Math.abs(z - rz) < 5.4 && x > ROAD_X[0] - 2 && x < ROAD_X[ROAD_X.length - 1] + 2) return true;
  /* 避开地标 */
  for (const s of ZONE_CENTERS) if (Math.hypot(x - s[0], z - s[1]) < 15) return true;
  return false;
}

export const ZONE_CENTERS = [
  [-20, -24], [8, 4], [36, -24], [-20, 32], [8, 32], [36, 32], [-20, 60], [-70, 86], [-56, 100]
];

export function plantTrees() {
  /* --- 棕榈：沿海滩 --- */
  const palms = [];
  for (let z = Z0 + 4; z < Z1 - 4; z += 5.5) {
    const cx = COAST(z) + rr(2.5, 10.5);
    palms.push([cx, z + rr(-1.6, 1.6), rr(0.8, 1.25)]);
  }
  for (let z = Z0 + 6; z < Z1 - 6; z += 9) {
    if (rnd() < 0.5) palms.push([COAST(z) + rr(13, 16), z, rr(0.8, 1.2)]);
  }
  /* --- 内陆树 --- */
  const trees = [];
  let tries = 0;
  while (trees.length < 190 && tries < 4000) {
    tries++;
    const x = rr(-26, 88);
    const z = rr(Z0 + 6, Z1 - 6);
    if (x < COAST(z) + BEACH_W + 1) continue;
    if (blocked(x, z)) continue;
    trees.push([x, z, rr(0.75, 1.35)]);
  }

  const mkInstanced = (geo, list) => {
    const mesh = new THREE.InstancedMesh(geo, treeMat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    list.forEach((p, i) => {
      v.set(p[0], GROUND_Y, p[1]);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * TAU);
      s.setScalar(p[2]);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
  };

  mkInstanced(palmGeometry(), palms);
  mkInstanced(roundTreeGeometry(0x4fa860), trees.slice(0, 70));
  mkInstanced(roundTreeGeometry(0x63bb70), trees.slice(70, 135));
  mkInstanced(roundTreeGeometry(0x3d9250), trees.slice(135));
}

