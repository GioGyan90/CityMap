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

  /* ---------- 邮轮 ---------- */
  const ship = new THREE.Group();
  ship.position.set(-96, 0, 73);
  world.add(ship);

  /* 船体（俯视轮廓挤出） */
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-28, 0);
  hullShape.lineTo(-22, 7);
  hullShape.lineTo(12, 7);
  hullShape.lineTo(28, 0);
  hullShape.lineTo(12, -7);
  hullShape.lineTo(-22, -7);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 6, bevelEnabled: false, curveSegments: 2 });
  const hull = new THREE.Mesh(hullGeo, toon(0xf6f9ff));
  hull.rotation.x = -Math.PI / 2;
  hull.position.y = 5.2;
  hull.castShadow = true;
  hull.receiveShadow = true;
  ship.add(hull);

  /* 吃水线 */
  const waterline = new THREE.Mesh(new THREE.BoxGeometry(52, 0.6, 13.4), toon(0x1e3d63));
  waterline.position.y = 1.6;
  ship.add(waterline);

  /* 甲板层 */
  box(46, 2.0, 12.4, 0xeaf0fa, -96, 12.2, 73);
  box(42, 4.0, 11.6, 0xfbfdff, -96, 15.2, 73);
  box(36, 3.6, 10.6, 0xf5f9ff, -97, 19.0, 73);
  box(28, 3.2, 9.4, 0xfbfdff, -98, 22.4, 73);

  /* 蓝色窗带 */
  for (const [yy, ww] of [[15.4, 41], [19.2, 35], [22.6, 27]]) {
    for (const s of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(ww, 1.0, 0.3), toon(0x2f6f9e));
      band.position.set(-96, yy, 73 + s * (5.6 + (ww === 41 ? 0 : ww === 35 ? -0.4 : -1)));
      ship.add(band);
    }
  }

  /* 救生艇 */
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      const life = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 1.6), toon(0xff8c42));
      life.position.set(-114 + i * 7, 17.9, 73 + s * 6.6);
      life.castShadow = true;
      ship.add(life);
    }
  }

  /* 烟囱 */
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.3, 6.0, 12), toon(0xfbfdff));
  funnel.position.set(-96, 27.0, 73);
  funnel.castShadow = true;
  ship.add(funnel);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 1.2, 12), toon(0x2f7fa8));
  cap.position.set(-96, 30.4, 73);
  ship.add(cap);

  /* 船头桅杆 */
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 8, 6), toon(0xdfe7f5));
  mast.position.set(-72, 12, 73);
  ship.add(mast);

  /* ---------- 灯塔 ---------- */
  const lx = -56, lz = 100;
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
  beacon.position.set(lx, GROUND_Y + 15.4, lz);
  world.add(beacon);

  /* ---------- 帆船 ---------- */
  for (let i = 0; i < 6; i++) {
    const b = makeSailboat(
      -120 - rnd() * 60,
      -60 + rnd() * 240
    );
    boats.push({ mesh: b, phase: rnd() * TAU, speed: rr(0.08, 0.22), dir: rnd() > 0.5 ? 1 : -1 });
  }
}

export function makeSailboat(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

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

