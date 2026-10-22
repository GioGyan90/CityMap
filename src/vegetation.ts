import {bakePalm,palmSamples} from './palm';
import {coastalPublicSpace,groveDensity} from './urbanDesign';
import {parkingAccessBlocked} from './parking';
import {surfaceHeight} from './terrainSurface';
import { isLand,terrainHeight,roadDistance,reserved,railCorridor } from './layout';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd, rr, TAU } from "./random";
import { toon } from "./materials";
import { GROUND_Y, Z0, COAST, BEACH_W, Z1, buildingFootprints } from "./config";
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

export function palmGeometry() { return bakePalm(palmSamples()[0]); }

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
  if(coastalPublicSpace(x,z,2)||parkingAccessBlocked(x,z))return true;
  for (const b of buildingFootprints) if (Math.abs(x-b.x) < b.w/2+1.5 && Math.abs(z-b.z) < b.d/2+1.5) return true;
  if(roadDistance(x,z)<3||reserved(x,z,2,2)||railCorridor(x,z))return true;
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
    if(!blocked(cx,z)&&Math.abs(cx-COAST(z)-8)>3.4)palms.push([cx, z, rr(0.8, 1.1)]);
  }
  for (let z = Z0 + 6; z < Z1 - 6; z += 9) {
    const x=COAST(z)+rr(25,29);if(rnd()<.4&&!blocked(x,z))palms.push([x,z,rr(.8,1.1)]);
  }
  /* --- 内陆树 --- */
  const trees = [];
  let tries = 0;
  while (trees.length < 480 && tries < 7500) {
    tries++;
    const x = rr(-50, 274);
    const z = rr(Z0 + 6, Z1 - 6);
    if (!isLand(x,z) || x < COAST(z) + BEACH_W + 1) continue;
    if (blocked(x, z)||rnd()>groveDensity(x,z)) continue;
    trees.push([x, z, rr(0.75, 1.35)]);
  }

  const mkInstanced = (geo, list, material=treeMat, name='') => {
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
    mesh.name=name;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    list.forEach((p, i) => {
      v.set(p[0], surfaceHeight(p[0],p[1]), p[1]);
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

  const palmMaterial=toon(0xffffff,{vertexColors:true,side:THREE.DoubleSide});
  palmSamples().forEach((sample,i)=>mkInstanced(bakePalm(sample),palms.filter((_,index)=>index%3===i),palmMaterial,`vegetation-palm-${i}`));
  mkInstanced(roundTreeGeometry(0x77ad42), trees.slice(0, 70),treeMat,'vegetation-round-0');
  mkInstanced(roundTreeGeometry(0x9cc752), trees.slice(70, 135),treeMat,'vegetation-round-1');
  mkInstanced(roundTreeGeometry(0x508d43), trees.slice(135),treeMat,'vegetation-round-2');
}

