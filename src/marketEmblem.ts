import * as THREE from 'three';
import {world} from './scene';
import {GROUND_Y} from './config';
import {toon} from './materials';
/** Sculptural rooftop wayfinding: plain billiard balls and real tapered cues, no lettering. */
export function billiardEmblem(x:number,y:number,z:number,scale=1){
 const group=new THREE.Group();group.name='market-billiard-emblem';group.position.set(x,GROUND_Y+y,z);group.scale.setScalar(scale);
 const gold=toon(0xdab562),navy=toon(0x245e76),wood=toon(0xb98745),ivory=toon(0xfff7df);
 const add=(geometry:THREE.BufferGeometry,material:THREE.Material,px:number,py:number,pz:number)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(px,py,pz);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
 const segment=(a:THREE.Vector3,b:THREE.Vector3,r1:number,r2:number,material:THREE.Material)=>{const m=add(new THREE.CylinderGeometry(r2,r1,a.distanceTo(b),8),material,0,0,0);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());};
 add(new THREE.BoxGeometry(6.5,.34,2.4),navy,0,.17,0);add(new THREE.BoxGeometry(6.7,.12,2.6),gold,0,.4,0);
 for(const side of [-1,1]){
  segment(new THREE.Vector3(side*2.5,.5,-.5),new THREE.Vector3(side*2.5,2.4,-.5),.09,.09,gold);
  const a=new THREE.Vector3(side*-3.5,.8,-.5),b=new THREE.Vector3(side*3.5,5.65,-.5),mix=(t:number)=>a.clone().lerp(b,t);
  segment(a,mix(.38),.17,.135,navy);segment(mix(.38),mix(.95),.135,.06,wood);segment(mix(.95),mix(.985),.065,.06,ivory);segment(mix(.985),b,.065,.065,toon(0x62b8cc));
  for(const t of [.06,.12,.37])segment(mix(t),mix(t+.015),.18-t*.12,.18-t*.12,gold);
 }
 const ball=add(new THREE.SphereGeometry(1.7,20,14),toon(0x17232f),0,2.4,.45);
 ball.name='market-black-ball';
 const spot=add(new THREE.SphereGeometry(.64,16,10),ivory,0,2.55,2.03);spot.scale.z=.18;
 for(const [px,color] of [[-2.25,0xe8b642],[2.25,0x3689ad]] as const)add(new THREE.SphereGeometry(.67,14,10),toon(color),px,1.12,.65);
 group.userData.symbolOnly=true;world.add(group);return group;
}
