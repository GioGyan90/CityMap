import {addBuildingEntrance} from './buildingAccess';
import * as THREE from 'three';
import { rr, pick, TAU } from "./random";
import { toon } from "./materials";
import { GROUND_Y } from "./config";
import { world } from "./scene";
import { makeBuilding, box, prism } from "./buildings";
import { flatQuad } from "./roads";

export function buildGovernment(cx, cz) {
  // Keep the fountain, stair foot and portico in separate depth bands.
  flatQuad(cx, cz + .5, 27, 27, GROUND_Y + .08, toon(0xece5d2));
  const block=(w,h,d,color,x,y,z)=>box(w,h,d,color,cx+x,GROUND_Y+y,cz+z,{outline:false});
  const mesh=(geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number)=>{
    const m=new THREE.Mesh(geometry,toon(color));m.position.set(cx+x,GROUND_Y+y,cz+z);
    m.castShadow=m.receiveShadow=true;world.add(m);return m;
  };
  block(24,2,16,0xe4dbc4,0,1,-4.5);
  block(24.4,.24,16.4,0xf8efdb,0,2.08,-4.5);
  block(20,8,12,0xfbf5e4,0,6,-4.5);
  // Broad landing and shallow, evenly rising steps finish before the basin.
  for(let i=0;i<5;i++)block(13,.4,3.8-i*.6,0xd8cfb6,0,.28+i*.4,5-i*.3);
  for(const x of [-7.6,-4.56,-1.52,1.52,4.56,7.6]){
    mesh(new THREE.CylinderGeometry(.58,.68,7.3,12),0xfffbf0,x,6.1,2.4);
    block(1.7,.35,1.7,0xe5d6b5,x,2.4,2.4);
    block(1.6,.4,1.6,0xf8edcf,x,9.7,2.4);
  }
  block(21.4,1.2,4.4,0xf3ead6,0,10.4,3);
  block(21.8,.22,4.8,0xd9bc79,0,11.1,3);
  prism(21.4,3.2,4.4,0xf7efdd,cx,GROUND_Y+11.2,cz+3);
  const entranceRoot=new THREE.Group();entranceRoot.position.set(cx,GROUND_Y,cz);world.add(entranceRoot);
  addBuildingEntrance(entranceRoot,{x:0,z:1.54,nx:0,nz:1,length:6,ceiling:8},true,'office',2.2,false);
  // Rear and side elevations have the same two-storey window rhythm.
  for(const x of [-7.5,-3.75,0,3.75,7.5])for(const y of [4.3,7.5]){
    block(2.25,2.3,.22,0xd8c69e,x,y,-10.58);
    block(1.85,1.92,.12,0x62a6c4,x,y,-10.73);
    block(2.5,.16,.48,0xf1e0bc,x,y-1.23,-10.7);
  }
  for(const side of [-1,1])for(const z of [-8,-4.5,-1])for(const y of [4.3,7.5]){
    block(.22,2.3,2.1,0xd8c69e,side*10.08,y,z);
    block(.12,1.92,1.7,0x62a6c4,side*10.23,y,z);
    block(.46,.16,2.35,0xf1e0bc,side*10.2,y-1.23,z);
  }
  block(20.6,.28,12.6,0xd8bd80,0,9.95,-4.5);
  mesh(new THREE.CylinderGeometry(4.6,5,3,20),0xf2ead6,0,11.55,-4.5);
  for(let i=0;i<12;i++){
    const angle=i*TAU/12;
    const window=mesh(new THREE.BoxGeometry(.68,1.3,.12),0x599bbc,Math.sin(angle)*4.82,11.6,-4.5+Math.cos(angle)*4.82);
    window.rotation.y=angle;
  }
  mesh(new THREE.CylinderGeometry(4.98,4.98,.22,24),0xe4c572,0,13.1,-4.5);
  const dome=mesh(new THREE.SphereGeometry(4.9,24,12,0,TAU,0,Math.PI/2),0x78badb,0,13.2,-4.5);dome.scale.y=1.1;
  mesh(new THREE.CylinderGeometry(.95,1.15,1.7,10),0xfff6e2,0,19.25,-4.5);
  mesh(new THREE.ConeGeometry(.9,2.3,10),0xf0c860,0,21.2,-4.5);
  // Open basin: a real rim surrounds a visible water surface instead of a solid cap.
  const fountainZ=10.5;
  mesh(new THREE.CylinderGeometry(2.7,2.85,.32,24),0xd3c7b0,0,.26,fountainZ);
  const rim=mesh(new THREE.TorusGeometry(2.43,.22,6,32),0xf6eddb,0,.83,fountainZ);rim.rotation.x=Math.PI/2;
  mesh(new THREE.CylinderGeometry(2.4,2.4,.1,24),0x4cc5e6,0,.64,fountainZ);
  mesh(new THREE.CylinderGeometry(.36,.55,.7,10),0xf4e5c6,0,1,fountainZ);
  mesh(new THREE.CylinderGeometry(1, .55,.22,16),0xf6eddb,0,1.48,fountainZ);
  mesh(new THREE.CylinderGeometry(.13,.24,1.55,8),0xc4f4ff,0,2.28,fountainZ);
  for(let i=0;i<8;i++){
    const angle=i*TAU/8;
    mesh(new THREE.SphereGeometry(.12,6,4),0xd9f9ff,Math.sin(angle)*.65,1.9,fountainZ+Math.cos(angle)*.65);
  }
  // Side paths remain open between planting beds, flagpoles and the entrance.
  for(const side of [-1,1]){
    block(2.6,.45,3.4,0xd8c9a8,side*10, .35,8.8);
    mesh(new THREE.BoxGeometry(2.3,.65,3.1),0x76a551,side*10,.9,8.8);
    for(const z of [7.8,8.8,9.8])mesh(new THREE.IcosahedronGeometry(.28,0),0xf1bc75,side*10,1.35,z);
    mesh(new THREE.CylinderGeometry(.07,.1,6,6),0xd8be7b,side*10.3,3.2,4.8);
    block(1.5,.9,.07,0x4296bd,side*10.3+side*.75,5.4,4.8);
    mesh(new THREE.SphereGeometry(.16,8,6),0xf4d480,side*10.3,6.3,4.8);
  }
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

  const hospitalEntry=new THREE.Group();hospitalEntry.position.set(cx,GROUND_Y,cz);world.add(hospitalEntry);
  addBuildingEntrance(hospitalEntry,{x:-1,z:5.56,nx:0,nz:1,length:7,ceiling:17},true,'office',0,false);

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

