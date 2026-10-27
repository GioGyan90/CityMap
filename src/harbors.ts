import {parkingAccessPaths} from './parking';
import * as THREE from 'three';
import {world} from './scene';
import {GROUND_Y} from './config';
import {kit,C} from './referenceArchitecture';
import {ZONES} from './layout';
import {nearestRoad} from './roadNetwork';
import {surfaceHeight} from './terrainSurface';
import {HARBOR_DECK_Y} from './harborPlan';
export function buildCargoHarbor(){
 const root=new THREE.Group();root.name='cargo-harbor';root.position.y=GROUND_Y;world.add(root);const k=kit(root);
 k.box(56,.8,34,0xb8b8a3,0,.1,0);
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const x=-16+col*8,z=-10+row*7,h=row===1&&col%2===0?5.2:2.6;
  const c=k.box(6.6,h,3, [0x3795ab,0xd4894a,0xa6b5a2,0xc56c52][col],x,.5+h/2,z);c.name='freight-container';
  for(let a=-2.7;a<3;a+=.8)k.box(.1,h-.15,.06,0xe0d1b2,x+a,.5+h/2,z+1.54);
 }
 for(const x of [-22,-4]){
  k.box(.8,18,.8,0xe9b447,x,9.5,12);
  k.box(1,1,23,0xe9b447,x,18.5,8);
  for(const z of [3,14])k.box(6,.7,1.3,0xe9b447,x,1,z);
  k.rod(new THREE.Vector3(x,18.5,-2),new THREE.Vector3(x,8,-2),.07,0x66777b);
 }
 k.box(8,4.5,6,C.cream,21,2.75,-9);k.box(8.7,.3,6.6,C.blue,21,5.15,-9);
 // Small dispatch office: door and clerestory loading-side windows face the yard.
 k.box(1.5,2.65,.1,C.glass,19.1,1.83,-5.96).name='cargo-office-door';
 k.box(.08,.5,.12,C.gold,19.48,1.7,-5.88);
 for(const x of [21.4,23.3]){k.box(1.35,1.4,.1,C.glass,x,2.85,-5.96);k.box(.08,1.4,.14,C.cream,x,2.85,-5.87);k.box(1.5,.1,.25,C.stone,x,2.08,-5.87);}
 k.box(.1,1.1,1.8,C.glass,25.04,3.35,-9);

 for(const x of [-27,27])k.box(.35,1.1,32,0xf0d48c,x,1.1,0);
}
export function buildPassengerHarbor(){
 const root=new THREE.Group();root.name='passenger-harbor';root.position.y=GROUND_Y;world.add(root);const k=kit(root);
 k.box(66,.8,22,0xe2d2b2,0,.1,0);
 k.rounded(28,10,5,7,.5,-1,C.cream,.8);
 k.box(26,2.5,.14,C.glass,7,3.1,4.08);
 for(let x=-5;x<21;x+=4)k.box(.18,2.8,.2,C.white,x,3.1,4.2);
 k.rounded(30,12,.4,7,5.5,-1,C.blue,1);
 k.box(18,.22,4,C.blue,7,3.9,7);
 for(const x of [0,14])k.box(.15,3.3,.15,C.white,x,2.2,8.5);
 // Low pier and an enclosed gangway connect the passenger hall to the ship's north side.
 k.box(63,.6,6,0xcbb388,-10,.2,16);
 for(const x of [-30,-10,10]){
  k.box(.7,2.5,.7,0x8e9186,x,-.8,16);
  k.mesh(new THREE.CylinderGeometry(.22,.35,.6,8),0x55717b,x,.8,18);
 }
 // Passenger lift reaches the same elevation as the ship's promenade deck.
 k.box(2.8,4.1,3,C.white,-3,2.55,2.5);k.box(2.9,2.1,2.6,C.glass,-3,3.2,2.5);
 k.box(3,.18,19,C.white,-3,4.6,13.5);k.box(3.3,.2,19.3,C.blue,-3,6.85,13.5);
 for(const side of [-1,1]){
  k.box(.1,2.1,19,C.glass,-3+side*1.45,5.73,13.5);
  for(let z=4;z<=23;z+=3)k.box(.18,2.2,.18,C.white,-3+side*1.45,5.73,z);
 }
 for(const x of [-29,-21,27]){k.box(3,.5,1.3,0xb99b6c,x,.9,-7);k.box(1.5,.8,1.5,C.green,x,1.1,-9);}
}
export function buildHarborAccess(){
 const root=new THREE.Group();root.name='harbor-access-ramps';world.add(root);const k=kit(root);
 for(const id of ['cargo','passenger']){
  const zone=ZONES[id],start=new THREE.Vector3(zone.x+zone.w/2-1,HARBOR_DECK_Y-.1,zone.z),road=nearestRoad(start.x,start.z);
  parkingAccessPaths.push({points:[[start.x,start.z],[road.x,road.z]],width:5});
  const end=new THREE.Vector3(road.x,surfaceHeight(road.x,road.z)+.04,road.z),n=Math.ceil(start.distanceTo(end));
  for(let i=0;i<n;i++){
   const a=start.clone().lerp(end,i/n),b=start.clone().lerp(end,(i+1)/n),mid=a.clone().add(b).multiplyScalar(.5);
   const deck=k.box(5,.22,a.distanceTo(b)+.08,0xd2c3a3,mid.x,mid.y,mid.z);deck.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.sub(a).normalize());
  }
 }
}
