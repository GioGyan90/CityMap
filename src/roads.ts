import * as THREE from 'three';
import { toon } from "./materials";
import { GROUND_Y, COAST, Z0, Z1 } from "./config";
import { world } from "./scene";

export const ROAD_X = [-34, -6, 22, 50, 74, 102, 130, 158, 186];
export const ROAD_Z = [-150, -122, -94, -66, -38, -10, 18, 46, 74, 102, 130, 158];
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

  // Main avenues span the city; outer roads terminate at gardens and larger blocks.
  for(const x of ROAD_X) {
    const start=x===130?-94:zA,end=x===158?102:zB;
    const width=x===22?9:RW;
    flatQuad(x,(start+end)/2,width+3.4,end-start+3.4,ROAD_Y-.04,walkMat);
    flatQuad(x,(start+end)/2,width,end-start,ROAD_Y,roadMat);
    for(let z=start+2;z<end-1;z+=6)flatQuad(x,z,.32,2.6,ROAD_Y+.04,dashMat);
  }
  for(const z of ROAD_Z) {
    const end=[-122,-38,18,130].includes(z)?102:xB;
    const width=z===-66||z===74?9:RW;
    flatQuad((xA+end)/2,z,end-xA+3.4,width+3.4,ROAD_Y-.04,walkMat);
    flatQuad((xA+end)/2,z,end-xA,width,ROAD_Y,roadMat);
    for(let x=xA+2;x<end-1;x+=6)flatQuad(x,z,2.6,.32,ROAD_Y+.04,dashMat);
  }
  // Narrow, curved promenade follows the shoreline instead of another rectangular road.
  const positions:number[]=[];
  for(let z=Z0+4;z<Z1-4;z+=3) {
    const a=COAST(z)+15.5,b=COAST(z+3)+15.5;
    positions.push(a-1.2,GROUND_Y+.13,z,a+1.2,GROUND_Y+.13,z,b+1.2,GROUND_Y+.13,z+3,
      a-1.2,GROUND_Y+.13,z,b+1.2,GROUND_Y+.13,z+3,b-1.2,GROUND_Y+.13,z+3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const promenade=new THREE.Mesh(geometry,walkMat);promenade.name='curved-coastal-promenade';promenade.receiveShadow=true;world.add(promenade);

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

