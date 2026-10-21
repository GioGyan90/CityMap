import * as THREE from 'three';
import { TAU } from "./random";
import { toon } from "./materials";
import { GROUND_Y } from "./config";
import { world } from "./scene";
import { box } from "./buildings";

export const spinWheels: { rotor: THREE.Group; axis: "y" | "z"; speed: number; cabins: THREE.Group[] }[] = [];
export const movingCarts = [];

export function buildAmusement(cx, cz) {
  const g = new THREE.Group();
  g.position.set(cx, GROUND_Y, cz);
  world.add(g);

  /* 场地铺装 */
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 12.5, 0.1, 28), toon(0xf6e7c8));
  ground.position.y = 0.02;
  ground.receiveShadow = true;
  g.add(ground);

  /* ---- 摩天轮 ---- */
  const R = 7.5;
  const wheelG = new THREE.Group();
  wheelG.position.set(cx - 5.5, GROUND_Y + R + 3.2, cz - 5.5);
  world.add(wheelG);

  const frameMat = toon(0xf4f7ff);
  const strutMat = toon(0xff5d73);

  // Four stationary A-frame legs reach from the ground to either end of the axle.
  for (const side of [-1,1]) for (const foot of [-1,1]) {
    const top = new THREE.Vector3(0,0,side*1.5);
    const bottom = new THREE.Vector3(foot*4.5,-(R+3.2),side*3.2);
    const direction = top.clone().sub(bottom);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,direction.length(),6),frameMat);
    leg.position.copy(top).add(bottom).multiplyScalar(.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    leg.castShadow=true;
    wheelG.add(leg);
  }

  const rotor = new THREE.Group();
  wheelG.add(rotor);
  const cabins: THREE.Group[] = [];
  rotor.name = "ferris-rotor";
  spinWheels.push({ rotor, axis: "z", speed: 0.18, cabins });

  /* 双环 */
  for (const zz of [-0.9, 0.9]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.34, 6, 44), strutMat);
    ring.position.z = zz;
    ring.castShadow = true;
    rotor.add(ring);
  }
  /* 辐条 */
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, R * 2, 5), strutMat);
    sp.rotation.z = a;
    sp.castShadow = true;
    rotor.add(sp);
  }
  /* 吊舱以轮缘为支点，反向补偿轮盘角度，始终悬垂。 */
  const cabColors = [0xffd166, 0x06d6a0, 0xef476f, 0x118ab2, 0xff9f1c, 0x9b5de5];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const pivot = new THREE.Group();
    pivot.name = 'ferris-cabin';
    pivot.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.7), toon(cabColors[i % cabColors.length]));
    cab.position.y = -1;
    cab.castShadow = true;
    pivot.add(cab);
    const glazing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 1.5), toon(0x98daf0));
    glazing.position.y = -0.35;
    pivot.add(glazing);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 1.9), frameMat);
    roof.position.y = 0.08;
    pivot.add(roof);
    rotor.add(pivot);
    cabins.push(pivot);
  }
  /* 中心轴 */
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.6, 12), toon(0xffd166));
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);

  /* ---- 过山车 ---- */
  const pts = [
    [-8, 1.2, -7], [-1, 5.5, -9.5], [6, 2.5, -6.5], [9, 4.5, 1],
    [5, 8.5, 6], [-2, 3.5, 8], [-8, 6.5, 4], [-9, 1.5, -2]
  ].map(p => new THREE.Vector3(cx + p[0], GROUND_Y + p[1], cz + p[2]));

  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);

  const railOuter = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 220, 0.26, 6, true),
    toon(0xef476f)
  );
  railOuter.castShadow = true;
  world.add(railOuter);

  const curve2 = new THREE.CatmullRomCurve3(
    pts.map(p => new THREE.Vector3(p.x, p.y - 0.95, p.z)),
    true, 'catmullrom', 0.5
  );
  const railInner = new THREE.Mesh(
    new THREE.TubeGeometry(curve2, 220, 0.2, 6, true),
    toon(0xffd166)
  );
  railInner.castShadow = true;
  world.add(railInner);

  /* 支柱 */
  const supMat = toon(0xe9edf6);
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const p = curve.getPointAt(t);
    if (p.y - GROUND_Y < 1.6) continue;
    const hh = p.y - GROUND_Y;
    const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, hh, 5), supMat);
    sup.position.set(p.x, GROUND_Y + hh / 2, p.z);
    sup.castShadow = true;
    world.add(sup);
  }

  /* 小车 */
  const cart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.6), toon(0x118ab2));
  cart.castShadow = true;
  world.add(cart);
  movingCarts.push({ mesh: cart, curve, offset: 0, speed: 0.06 });

  /* ---- 旋转木马 ---- */
  const carousel = new THREE.Group();
  carousel.position.set(cx + 7.5, GROUND_Y, cz + 5.5);
  world.add(carousel);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 1.0, 14), toon(0xfff0d0));
  base.position.y = 0.5;
  base.castShadow = base.receiveShadow = true;
  carousel.add(base);

  const spinTop = new THREE.Group();
  spinTop.position.y = 1.0;
  carousel.add(spinTop);
  spinWheels.push({ rotor: spinTop, axis: "y", speed: 0.55, cabins: [] });

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.2, 12), toon(0xef476f));
  canopy.position.y = 4.2;
  canopy.castShadow = true;
  spinTop.add(canopy);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.2, 5), toon(0xf5e6c8));
    pole.position.set(Math.cos(a) * 2.6, 2.6, Math.sin(a) * 2.6);
    spinTop.add(pole);
    const horse = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.6), toon([0x06d6a0, 0xffd166, 0x9b5de5][i % 3]));
    horse.position.set(Math.cos(a) * 2.6, 1.5, Math.sin(a) * 2.6);
    horse.castShadow = true;
    spinTop.add(horse);
  }

  /* ---- 条纹帐篷 ---- */
  const tentColors = [[0xef476f, 0xfff3e0], [0x118ab2, 0xfff3e0], [0xffd166, 0xef476f]];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.6;
    const tx = cx + Math.cos(a) * 10.5;
    const tz = cz + Math.sin(a) * 10.5;
    box(3.4, 0.4, 3.4, 0xf7ecd5, tx, GROUND_Y + 0.2, tz, { outline: false });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.6, 8), toon(tentColors[i % 3][0]));
    cone.position.set(tx, GROUND_Y + 1.7, tz);
    cone.castShadow = true;
    world.add(cone);
  }

  /* ---- 入口拱门 ---- */
  const archMat = toon(0xef476f);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6.5, 8), archMat);
    p.position.set(cx + s * 4.2, GROUND_Y + 3.25, cz + 12.6);
    p.castShadow = true;
    world.add(p);
  }
  box(9.6, 1.2, 1.2, 0xffd166, cx, GROUND_Y + 7.0, cz + 12.6, { outline: true });
}

