import {createCargoHarbor} from './cargoAssets';
import {parkingAccessPaths} from './parking';
import * as THREE from 'three';
import {world} from './scene';
import {GROUND_Y} from './config';
import {kit,C} from './referenceArchitecture';
import {ZONES} from './layout';
import {nearestRoad} from './roadNetwork';
import {surfaceHeight} from './terrainSurface';
import {HARBOR_DECK_Y} from './harborPlan';
export function buildCargoHarbor(){const root=createCargoHarbor(true);root.position.y=GROUND_Y;world.add(root);}
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
