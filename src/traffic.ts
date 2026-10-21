import { motorwayCurve } from './transport';
import * as THREE from 'three';
import { world } from './scene';
import { terrainHeight } from './layout';
import { roadCurves } from './roads';
import { toon } from './materials';
export const cars:{mesh:THREE.Group;curve:THREE.CatmullRomCurve3;offset:number;speed:number;direction:number;elevated:boolean}[]=[];
export function buildCars(){
 for(let i=0;i<24;i++){const mesh=new THREE.Group();mesh.name=i%6===0?'city-bus':'road-car';world.add(mesh);const bus=i%6===0;
  const body=new THREE.Mesh(new THREE.BoxGeometry(bus?2:1.6,bus?2.5:1.25,bus?5.7:3.2),toon([0xe7b75d,0xf0eeee,0x5896ab,0xc96362][i%4]));body.position.y=bus?1.5:1;mesh.add(body);
  const window=new THREE.Mesh(new THREE.BoxGeometry(bus?2.03:1.5,bus?1:.7,bus?4.8:1.8),toon(0x355b73));window.position.y=bus?2.1:1.65;mesh.add(window);
  cars.push({mesh,curve:i>=20&&motorwayCurve?motorwayCurve:roadCurves[i%roadCurves.length],elevated:i>=20&&!!motorwayCurve,offset:(i*.173)%1,speed:.015+(i%4)*.003,direction:i%2?1:-1});
 }
}
export function updateTraffic(dt:number){for(const car of cars){car.offset=(car.offset+dt*car.speed)%1;const t=car.offset<.5?car.offset*2:2-car.offset*2;const p=car.curve.getPointAt(Math.max(.001,Math.min(.999,t))),tan=car.curve.getTangentAt(t);p.x+=-tan.z*car.direction*1.25;p.z+=tan.x*car.direction*1.25;p.y=car.elevated?p.y+.22:terrainHeight(p.x,p.z)+.22;car.mesh.position.copy(p);car.mesh.rotation.y=Math.atan2(tan.x,tan.z)+(car.offset>.5?Math.PI:0);car.mesh.rotation.x=-Math.atan2(tan.y,Math.hypot(tan.x,tan.z));}}
