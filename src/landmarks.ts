import * as THREE from 'three';
import { rr, pick, TAU } from "./random";
import { toon } from "./materials";
import { GROUND_Y } from "./config";
import { world } from "./scene";
import { makeBuilding, box, prism } from "./buildings";
import { flatQuad } from "./roads";

export function buildGovernment(cx, cz) {
  /* 广场 */
  flatQuad(cx, cz + 2, 27, 25, GROUND_Y + 0.06, toon(0xece5d2));

  /* 台基 */
  box(24, 2, 16, 0xe4dbc4, cx, GROUND_Y + 1.0, cz - 2);
  /* 台阶 */
  for (let i = 0; i < 3; i++) {
    box(14, 0.55, 6 - i * 1.6, 0xd8cfb6, cx, GROUND_Y + 0.28 + i * 0.55, cz + 7.4 - i * 0.5, { outline: false });
  }
  /* 主楼 */
  box(20, 8, 12, 0xfbf5e4, cx, GROUND_Y + 6, cz - 2);
  /* 柱廊 */
  const colMat = toon(0xfffbf0);
  for (let i = 0; i < 6; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.84, 8, 10), colMat);
    col.position.set(cx - 7.6 + i * 3.04, GROUND_Y + 6, cz + 4.8);
    col.castShadow = true;
    world.add(col);
  }
  /* 檐部 */
  box(21.4, 1.7, 6.4, 0xf3ead6, cx, GROUND_Y + 10.85, cz + 6.2);
  /* 山花 */
  prism(21.4, 3.6, 6.4, 0xf7efdd, cx, GROUND_Y + 11.7, cz + 6.2);

  /* 穹顶 */
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.4, 3.2, 16), toon(0xf2ead6));
  drum.position.set(cx, GROUND_Y + 11.6, cz - 2);
  drum.castShadow = true;
  world.add(drum);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(5.1, 20, 10, 0, TAU, 0, Math.PI / 2),
    toon(0x8dc2dc)
  );
  dome.position.set(cx, GROUND_Y + 13.2, cz - 2);
  dome.scale.y = 1.15;
  dome.castShadow = true;
  world.add(dome);

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 2.0, 8), toon(0xfff6e2));
  lantern.position.set(cx, GROUND_Y + 19.4, cz - 2);
  world.add(lantern);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.0, 8), toon(0xf0c860));
  spire.position.set(cx, GROUND_Y + 21.8, cz - 2);
  spire.castShadow = true;
  world.add(spire);

  /* 喷泉 */
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.0, 1.0, 18), toon(0xe6e9ef));
  basin.position.set(cx, GROUND_Y + 0.5, cz + 12);
  basin.castShadow = basin.receiveShadow = true;
  world.add(basin);

  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.16, 18), toon(0x59b7e8));
  water.position.set(cx, GROUND_Y + 1.02, cz + 12);
  world.add(water);

  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 2.6, 8), toon(0xcfefff));
  jet.position.set(cx, GROUND_Y + 2.3, cz + 12);
  world.add(jet);
}

/* ============================================================
   10. 地标：医院
   ============================================================ */
export function buildHospital(cx, cz) {
  flatQuad(cx, cz, 26, 24, GROUND_Y + 0.06, toon(0xe8e6de));

  /* 主楼 */
  box(15, 17, 13, 0xf7fbff, cx - 1, GROUND_Y + 8.5, cz - 1);
  /* 裙楼 */
  box(7, 9, 8, 0xeaf3fb, cx + 7, GROUND_Y + 4.5, cz + 2);
  /* 屋顶红十字 */
  box(6.2, 0.5, 1.7, 0xe8423c, cx - 1, GROUND_Y + 17.3, cz - 1, { outline: false });
  box(1.7, 0.5, 6.2, 0xe8423c, cx - 1, GROUND_Y + 17.3, cz - 1, { outline: false });

  /* 停机坪 */
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.3, 18), toon(0x9aa7b8));
  pad.position.set(cx + 7, GROUND_Y + 9.15, cz + 2);
  world.add(pad);
  const hMark = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.12, 18), toon(0xfdfbf2));
  hMark.position.set(cx + 7, GROUND_Y + 9.32, cz + 2);
  world.add(hMark);

  /* 救护车 */
  const amb = new THREE.Group();
  amb.position.set(cx - 8, GROUND_Y, cz + 8);
  world.add(amb);
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 2.0), toon(0xffffff));
  body.position.y = 1.3; body.castShadow = true; amb.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 1.9), toon(0xf2f6fb));
  cab.position.set(1.7, 1.1, 0); cab.castShadow = true; amb.add(cab);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 2.05), toon(0xe8423c));
  stripe.position.y = 1.9; amb.add(stripe);
}

/* ============================================================
   11. 地标：高档酒店（含泳池）
   ============================================================ */
export function buildHotel(cx, cz) {
  flatQuad(cx, cz, 27, 25, GROUND_Y + 0.06, toon(0xf2eadb));

  /* White seaside wings and a central blue-roofed belvedere. */
  makeBuilding({x:cx,z:cz-4,w:12,d:9,h:17,base:'#fff8ed',win:'#4d90b4',roof:0x2c78a6,style:'pitched'});
  for (const dx of [-8,8]) makeBuilding({x:cx+dx,z:cz-3,w:5,d:9,h:12,base:'#fff7e6',win:'#4d90b4',roof:0x2c78a6,style:'pitched'});
  makeBuilding({x:cx,z:cz-5,w:5,d:5,h:23,base:'#fff8e6',win:'#4d90b4',roof:0x246997,style:'pitched'});

  /* 泳池 */
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 8), toon(0xf5ecd8));
  deck.position.set(cx + 3, GROUND_Y + 0.12, cz + 7);
  deck.receiveShadow = true;
  world.add(deck);

  const pool = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 5.6), toon(0x4fc3e8));
  pool.position.set(cx + 3, GROUND_Y + 0.2, cz + 7);
  world.add(pool);

  /* 遮阳伞 */
  for (let i = 0; i < 5; i++) {
    const ux = cx - 2 + i * 2.6;
    const uz = cz + 11.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 5), toon(0xf3e9d6));
    pole.position.set(ux, GROUND_Y + 1.1, uz);
    world.add(pole);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.8, 8), toon(i % 2 ? 0xef476f : 0xffd166));
    umb.position.set(ux, GROUND_Y + 2.4, uz);
    umb.castShadow = true;
    world.add(umb);
  }
}

/* ============================================================
   12. 地标：市场
   ============================================================ */
export function buildMarket(cx, cz) {
  flatQuad(cx, cz, 26, 24, GROUND_Y + 0.06, toon(0xe8dcc2));

  const stallCols = [0xef476f, 0x118ab2, 0xffd166, 0x06d6a0, 0x9b5de5];

  for (let i=0;i<4;i++) {
    const sx=cx-8.1+i*5.4,sz=cz+6.5;
    box(4.6,1.1,3.2,0xc9a06a,sx,GROUND_Y+.55,sz,{outline:true});
    for(let stripe=0;stripe<8;stripe++){
      const canopy=new THREE.Mesh(new THREE.BoxGeometry(5.1/8,.22,3.8),toon(stripe%2?0xffefd6:stallCols[i]));
      canopy.position.set(sx-2.55+(stripe+.5)*5.1/8,GROUND_Y+3,sz);canopy.rotation.x=.1;canopy.castShadow=true;world.add(canopy);
    }
    for(const dx of [-2.2,2.2])for(const dz of [-1.5,1.5]){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,3,5),toon(0xf0e6d2));pole.position.set(sx+dx,GROUND_Y+1.5,sz+dz);world.add(pole);
    }
    for(let k=0;k<3;k++){
      const crate=new THREE.Mesh(new THREE.BoxGeometry(.9,.7,.9),toon(pick([0xd9a441,0xc47d4a,0x8fc46b])));crate.position.set(sx-1.6+k*1.6,GROUND_Y+1.45,sz+rr(-.5,.5));crate.castShadow=true;world.add(crate);
    }
  }
  /* 中央小喷泉 */
  const f = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.8, 12), toon(0xe0e4ea));
  f.position.set(cx, GROUND_Y + 0.4, cz);
  world.add(f);
}

/* ============================================================
   13. 地标：咖啡馆 & 餐厅
   ============================================================ */
export function buildCafe(cx, cz) {
  flatQuad(cx, cz, 25, 23, GROUND_Y + 0.06, toon(0xf0e8d6));

  makeBuilding({
    x: cx - 4, z: cz - 4, w: 12, d: 10, h: 9,
    base: '#fff2d9', win: '#5a7fa0', roof: 0x356b93, style: 'pitched', lit: 0.6
  });

  /* 条纹遮阳棚 */
  const awn = new THREE.Mesh(new THREE.BoxGeometry(13, 0.25, 4.2), toon(0xef476f));
  awn.position.set(cx - 4, GROUND_Y + 4.6, cz + 3.4);
  awn.rotation.x = -0.16;
  awn.castShadow = true;
  // Replaced by striped awnings in conceptDetails.ts.

  /* 户外咖啡座 */
  for (let i = 0; i < 5; i++) {
    const tx = cx + 1 + (i % 3) * 4.2 - 4;
    const tz = cz + 7 + Math.floor(i / 3) * 4;
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.16, 10), toon(0xf7f0e2));
    table.position.set(tx, GROUND_Y + 0.95, tz);
    table.castShadow = true;
    world.add(table);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 5), toon(0xb9ae9a));
    leg.position.set(tx, GROUND_Y + 0.45, tz);
    world.add(leg);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.75, 8), toon(i % 2 ? 0x06d6a0 : 0xffd166));
    umb.position.set(tx, GROUND_Y + 3.1, tz);
    umb.castShadow = true;
    world.add(umb);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 5), toon(0xf3e9d6));
    up.position.set(tx, GROUND_Y + 2.0, tz);
    world.add(up);
  }
}

export function buildRestaurant(cx, cz) {
  /* 面向海的木平台 */
  const deck = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 18), toon(0xd3a675));
  deck.position.set(cx, GROUND_Y + 0.14, cz);
  deck.receiveShadow = true;
  world.add(deck);

  makeBuilding({
    x: cx - 2, z: cz - 4, w: 14, d: 10, h: 8,
    base: '#fff4e2', win: '#3f7c9c', roof: 0x2f7fa8, style: 'pitched', lit: 0.7
  });

  /* 遮阳棚 */
  const awn = new THREE.Mesh(new THREE.BoxGeometry(15, 0.25, 4.5), toon(0x06d6a0));
  awn.position.set(cx - 2, GROUND_Y + 4.2, cz + 3.2);
  awn.rotation.x = -0.14;
  awn.castShadow = true;
  // Replaced by striped awnings in conceptDetails.ts.

  /* 海边桌椅 */
  for (let i = 0; i < 6; i++) {
    const tx = cx - 8 + (i % 3) * 6;
    const tz = cz + 8 + Math.floor(i / 3) * 4.5;
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.16, 10), toon(0xfaf3e6));
    table.position.set(tx, GROUND_Y + 0.95, tz);
    world.add(table);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.75, 8), toon(i % 2 ? 0xef476f : 0x118ab2));
    umb.position.set(tx, GROUND_Y + 3.2, tz);
    umb.castShadow = true;
    world.add(umb);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 5), toon(0xf3e9d6));
    up.position.set(tx, GROUND_Y + 2.05, tz);
    world.add(up);
  }
}

