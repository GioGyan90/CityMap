import { buildCruiseShip } from './cruiseShip';
import * as THREE from 'three';
import { rnd, rr, TAU } from "./random";
import { gradientMap, toon } from "./materials";
import { GROUND_Y } from "./config";
import { world } from "./scene";
import { addOutline, makeBuilding, box } from "./buildings";

export const boats = [];

export function buildPort() {
  /* ---------- 栈桥 ---------- */
  const pierX = -74, pierZ = 86, pierL = 54, pierW = 11;
  box(pierL, 1.4, pierW, 0xc9a373, pierX, 0.6, pierZ);
  /* 木桩 */
  const pilMat = toon(0x8a6b4a);
  for (let i = 0; i < 9; i++) {
    const px = pierX - pierL / 2 + 3 + i * 6;
    for (const pz of [pierZ - 4.6, pierZ + 4.6]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.4, 6), pilMat);
      c.position.set(px, -0.4, pz);
      world.add(c);
    }
  }

  /* ---------- 候船楼 ---------- */
  makeBuilding({
    x: -60, z: 96, w: 14, d: 9, h: 8,
    base: '#fdf1dc', win: '#3f7c9c', roof: 0x2f7fa8, style: 'pitched', lit: 0.55
  });

  /* 集装箱 */
  const boxCols = [0xef476f, 0x118ab2, 0x06d6a0, 0xffd166, 0x9b5de5];
  for (let i = 0; i < 7; i++) {
    const cxr = -58 - (i % 3) * 7 + rr(-1, 1);
    const czr = 80 + Math.floor(i / 3) * 5 + rr(-1, 1);
    const c = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.6), toon(boxCols[i % 5]));
    c.position.set(cxr, GROUND_Y + 1.3 + (i > 4 ? 2.7 : 0), czr);
    c.castShadow = true;
    world.add(c);
    addOutline(new THREE.BoxGeometry(6, 2.6, 2.6), cxr, GROUND_Y + 1.3 + (i > 4 ? 2.7 : 0), czr);
  }

  /* 吊机 */
  const craneMat = toon(0xf0b429);
  const mastH = 16;
  box(1.4, mastH, 1.4, 0xf0b429, -66, GROUND_Y + mastH / 2, 82);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(16, 1.0, 1.0), craneMat);
  jib.position.set(-72, GROUND_Y + mastH, 82);
  jib.castShadow = true;
  world.add(jib);

  buildCruiseShip();

  /* ---------- 帆船 ---------- */
  for (let i = 0; i < 6; i++) {
    const b = makeSailboat(
      -120 - rnd() * 60,
      -60 + rnd() * 240
    );
    boats.push({ mesh: b, phase: rnd() * TAU, speed: rr(0.08, 0.22), dir: rnd() > 0.5 ? 1 : -1 });
  }
}

export function buildLighthouse() {
  // The dedicated coastal hill has a flat summit; rocks blend its plinth into the slope.
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(4,5,.6,20),toon(0xe4d8bd));
  plinth.position.y=GROUND_Y+.25;plinth.receiveShadow=true;world.add(plinth);
  /* ---------- 灯塔 ---------- */
  const lx = 0, lz = 0;
  /* 礁石基座 */
  for (let i = 0; i < 7; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rr(1.2, 2.6), 0), toon(0x9aa4b4));
    rock.position.set(lx + rr(-5, 5), 0.6, lz + rr(-5, 5));
    rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    rock.castShadow = rock.receiveShadow = true;
    world.add(rock);
  }

  const towerSegs = [
    { r0: 2.4, r1: 2.0, h: 4.0, c: 0xffffff, y: 0 },
    { r0: 2.0, r1: 1.75, h: 3.4, c: 0xe8423c, y: 4.0 },
    { r0: 1.75, r1: 1.5, h: 3.4, c: 0xffffff, y: 7.4 },
    { r0: 1.5, r1: 1.3, h: 3.0, c: 0xe8423c, y: 10.8 }
  ];
  for (const s of towerSegs) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(s.r1, s.r0, s.h, 14), toon(s.c));
    seg.position.set(lx, GROUND_Y + s.y + s.h / 2, lz);
    seg.castShadow = true;
    world.add(seg);
  }
  /* 灯室 */
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.8, 10), toon(0xffe066));
  lamp.position.set(lx, GROUND_Y + 15.2, lz);
  world.add(lamp);
  const roofTop = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.0, 10), toon(0xe8423c));
  roofTop.position.set(lx, GROUND_Y + 17.1, lz);
  roofTop.castShadow = true;
  world.add(roofTop);

  /* 引导灯点光 */
  const beacon = new THREE.PointLight(0xffe066, 6, 40, 2);
  beacon.name = "lighthouse-beacon";
  beacon.position.set(lx, GROUND_Y + 15.4, lz);
  world.add(beacon);


  const door=new THREE.Mesh(new THREE.BoxGeometry(1.1,2,.18),toon(0x326d89));
  door.position.set(0,GROUND_Y+1.05,2.35);world.add(door);
  const balcony=new THREE.Mesh(new THREE.TorusGeometry(1.85,.12,5,20),toon(0xf7ead1));
  balcony.rotation.x=Math.PI/2;balcony.position.y=GROUND_Y+14.1;world.add(balcony);
  for(let i=0;i<12;i++){
    const angle=i*TAU/12;
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.8,5),toon(0xf7ead1));
    post.position.set(Math.sin(angle)*1.85,GROUND_Y+14.5,Math.cos(angle)*1.85);world.add(post);
  }
}

export function makeSailboat(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.userData.ambient = true;

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.0, 8, 1), toon(0xfbfdff));
  hull.scale.set(1, 1, 3.4);
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.55;
  hull.castShadow = true;
  g.add(hull);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7, 5), toon(0xe4d6bd));
  mast.position.y = 4.0;
  g.add(mast);

  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 1.2, 0,  0, 7.2, 0,  2.9, 1.2, 0
  ], 3));
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, new THREE.MeshToonMaterial({
    color: 0xffffff, gradientMap, side: THREE.DoubleSide
  }));
  sail.position.set(0.1, 0, 0);
  sail.castShadow = true;
  g.add(sail);

  world.add(g);
  return g;
}

