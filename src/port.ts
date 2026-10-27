import {plantingBoxClear} from './plantPlacement';
import {ZONES} from './layout';
import {createWorkboat,WORKBOAT_KINDS} from './workboats';
import {kit} from './referenceArchitecture';
import * as THREE from 'three';
import { rnd, rr, TAU } from "./random";
import { toon } from "./materials";
import { GROUND_Y } from "./config";
import { world } from "./scene";

export const boats = [];

export function buildPort() {
 const root=new THREE.Group();root.name='fish-market-wharf';root.position.y=GROUND_Y;world.add(root);const k=kit(root);
 k.box(42,.4,28,0xe6d3aa,0,.3,0).name='dock-market-plaza';
 // A pedestrian market has small pitched stalls, fish counters and working boats.
 for(const x of [-13,-4,5])for(const z of [-7,3]){
  k.box(7,3.4,5,0xffedc7,x,2.2,z);
  const roof=k.mesh(new THREE.ConeGeometry(1,1,4),z<0?0x2d92ac:0xd67e50,x,4.6,z);roof.rotation.y=Math.PI/4;roof.scale.set(5.5,1.5,4.1);
  // A serving counter is paired with a broad glazed opening under the awning.
  k.box(1.15,2.2,.08,0x487d87,x-1.75,1.65,z-2.55).name='stall-staff-door';
  k.box(1.45,1,.08,0x6599a1,x+1.1,2.35,z-2.55).name='stall-rear-window';
  k.box(4.8,1.35,.08,0x4d8793,x,2.3,z+2.55);
  for(const dx of [-2.42,0,2.42])k.box(.09,1.45,.12,0xe8d7ad,x+dx,2.3,z+2.61);
  k.box(4.95,.09,.14,0xe8d7ad,x,3.01,z+2.61);
  k.box(6.4,.16,1.8,0x3d94a7,x,3.2,z+3);
  k.box(5.5,.85,1.2,0xb4cbd0,x,1.05,z+2.7);
  for(let i=-1;i<=1;i++){
   k.box(1.3,.16,.8,0x4d8d9b,x+i*1.65,1.55,z+2.7);
   const fish=k.mesh(new THREE.SphereGeometry(.35,8,5),0xbcdce3,x+i*1.65,1.8,z+2.7);fish.scale.set(1.6,.4,.6);
  }
 }
 for(const x of [-12,5]){
  // Separate the timber from the plaza top (.5); keep its underside supported.
  k.box(4,.48,15,0xbf9d6a,x,.34,20).name='dock-market-timber-pier';
  const rampGeometry=new THREE.BufferGeometry();
  rampGeometry.setAttribute('position',new THREE.Float32BufferAttribute([x-2,.502,12,x-2,.58,12.5,x+2,.502,12,x+2,.502,12,x-2,.58,12.5,x+2,.58,12.5],3));rampGeometry.computeVertexNormals();
  k.mesh(rampGeometry,0xbf9d6a).name='dock-market-pier-threshold';
  for(const z of [15,24])k.box(.6,2,.6,0x876e4f,x,-.6,z);
  const boat=makeWorkboat(x+4.8,22,'fishing');boat.userData.ambient=false;boat.name='market-fishing-boat';
  root.attach(boat);boat.position.set(x+4.8,-.8,22);boat.scale.set(.65,.65,.65);boat.rotation.y=Math.PI/2;
 }
 for(const x of [-19,19])for(const z of [-10,10])k.mesh(new THREE.CylinderGeometry(.18,.3,.65,8),0x547680,x,.8,z);
 for(let i=0;i<6;i++){
  const b=makeWorkboat(-165-rnd()*50,-45+i*40,WORKBOAT_KINDS[i%3]);
  boats.push({mesh:b,phase:rnd()*TAU,speed:rr(.08,.22),dir:rnd()>.5?1:-1});
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
    rock.castShadow = rock.receiveShadow = true;rock.name='lighthouse-ground-rock';rock.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(rock,true).translate(new THREE.Vector3(ZONES.lighthouse.x,0,ZONES.lighthouse.z));
    if(plantingBoxClear(bounds,.5))world.add(rock);
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
  // Narrow stairwell slits follow the tapered tower wall, away from the entry.
  for(const [baseY,radius] of [[5.4,1.9],[8.9,1.64],[12.1,1.42]])for(const angle of [-1.05,0,1.05,Math.PI]){
    const slit=new THREE.Mesh(new THREE.BoxGeometry(.32,1.05,.08),toon(0x38788d));
    slit.name='lighthouse-stair-window';slit.position.set(Math.sin(angle)*(radius+.045),GROUND_Y+baseY,Math.cos(angle)*(radius+.045));slit.rotation.y=angle;world.add(slit);
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

function makeWorkboat(x:number,z:number,kind:typeof WORKBOAT_KINDS[number]){
 const g=createWorkboat(kind,true);g.position.set(x,.12,z);g.userData.ambient=true;world.add(g);return g;
}
