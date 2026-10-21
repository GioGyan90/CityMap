import * as THREE from 'three';
import { toon } from "./materials";
import { GROUND_Y } from "./config";
import { world } from "./scene";

export const ROAD_X = [-34, -6, 22, 50, 74];
export const ROAD_Z = [-66, -38, -10, 18, 46, 74];
export const RW = 7;
export const ROAD_Y = GROUND_Y + 0.02;

export const roadMat = toon(0x8d94a8);
export const walkMat = toon(0xd9d2c0);
export const dashMat = toon(0xfdfbf2);

export function flatQuad(cx, cz, w, d, y, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mat);
  m.position.set(cx, y, cz);
  m.receiveShadow = true;
  world.add(m);
  return m;
}

export function buildRoads() {
  const xA = ROAD_X[0], xB = ROAD_X[ROAD_X.length - 1];
  const zA = ROAD_Z[0], zB = ROAD_Z[ROAD_Z.length - 1];

  /* 人行道底板 */
  for (const x of ROAD_X) flatQuad(x, (zA + zB) / 2, RW + 3.4, zB - zA + 3.4, ROAD_Y - 0.04, walkMat);
  for (const z of ROAD_Z) flatQuad((xA + xB) / 2, z, xB - xA + 3.4, RW + 3.4, ROAD_Y - 0.04, walkMat);

  /* 路面 */
  for (const x of ROAD_X) flatQuad(x, (zA + zB) / 2, RW, zB - zA, ROAD_Y, roadMat);
  for (const z of ROAD_Z) flatQuad((xA + xB) / 2, z, xB - xA, RW, ROAD_Y, roadMat);

  /* 中心虚线 */
  for (const x of ROAD_X) {
    for (let z = zA + 2; z < zB - 1; z += 6) {
      flatQuad(x, z, 0.4, 2.6, ROAD_Y + 0.04, dashMat);
    }
  }
  for (const z of ROAD_Z) {
    for (let x = xA + 2; x < xB - 1; x += 6) {
      flatQuad(x, z, 2.6, 0.4, ROAD_Y + 0.04, dashMat);
    }
  }
}
buildRoads();

/* 斑马线（几处路口） */
export function crosswalk(cx, cz, dir) {
  for (let i = -2; i <= 2; i++) {
    if (dir === 'x') flatQuad(cx + i * 1.5, cz, 0.7, RW - 1.4, ROAD_Y + 0.06, dashMat);
    else flatQuad(cx, cz + i * 1.5, RW - 1.4, 0.7, ROAD_Y + 0.06, dashMat);
  }
}
crosswalk(-6, 18, 'x');
crosswalk(22, -10, 'z');
crosswalk(8, 46, 'x');

