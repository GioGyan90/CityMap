import {buildCoastalStation} from './coastalStation';
import {buildBusStops} from './busStops';
import {COMMUTER_POINTS,trainProgress,advanceTrainPhase} from './transitDesign';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import { world } from './scene';
import { terrainHeight,westCoast,ZONES } from './layout';
import { roadRibbon,roadMat,walkMat } from './roads';
import { toon } from './materials';
import { sign } from './conceptDetails';
export let motorwayCurve:THREE.CatmullRomCurve3|null=null;
export const transit:{mesh:THREE.Group;curve:THREE.CatmullRomCurve3;offset:number;speed:number;terminalDwell:number;dwellRemaining:number}[]=[];
function box(w:number,h:number,d:number,c:number,x:number,y:number,z:number,parent:THREE.Object3D=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function route(points:[number,number][],lift:number){return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,surfaceHeight(x,z)+lift,z)),false,'catmullrom',.12);}
function railway(curve:THREE.CatmullRomCurve3,elevated:boolean){
 roadRibbon(curve,elevated?5.5:3.8,0,walkMat,true).name=elevated?'rail-viaduct':'coastal-tram-track';
 for(const side of [-1,1]){
  const points:THREE.Vector3[]=[];for(let i=0;i<=180;i++){const p=curve.getPointAt(i/180),t=curve.getTangentAt(i/180);p.x+=-t.z*side*.8;p.z+=t.x*side*.8;p.y+=.15;points.push(p);}
  const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),180,.07,5,false),toon(0x606c76));world.add(rail);
 }
 const count=Math.floor(curve.getLength()/3.4);
 for(let i=0;i<count;i++){const p=curve.getPointAt(i/count),t=curve.getTangentAt(i/count);const sleeper=box(2.6,.16,.3,0x806a55,p.x,p.y+.03,p.z);sleeper.rotation.y=Math.atan2(t.x,t.z);}
 if(elevated)for(let i=0;i<18;i++){const p=curve.getPointAt(i/17),base=surfaceHeight(p.x,p.z);box(1.6,p.y-base,1.8,0xa6ada6,p.x,(p.y+base)/2,p.z);}
}
function train(curve:THREE.CatmullRomCurve3,color:number,offset:number,dwell=0){
 const g=new THREE.Group();g.name='moving-train';world.add(g);
 for(const z of [-4,4]){box(2.4,2.5,6.8,color,0,1.5,z,g);box(2.46,.85,5.6,0x254d65,0,1.95,z,g);box(2.5,.32,6.8,0xe9e6d7,0,2.85,z,g);for(const side of [-1,1])box(.16,.25,5.7,0xf3e2ab,side*1.22,.85,z,g);}
 transit.push({mesh:g,curve,offset,speed:.025,terminalDwell:dwell,dwellRemaining:0});
}

function buildRailTerminus(curve:THREE.CatmullRomCurve3,end:number){
 const p=curve.getPointAt(end),t=curve.getTangentAt(end),root=new THREE.Group();
 root.name=end?'south-rail-terminus':'north-rail-terminus';root.position.copy(p);
 root.rotation.y=Math.atan2(t.x,t.z)+(end?Math.PI:0);root.rotation.x=-Math.atan2(t.y*(end?-1:1),Math.hypot(t.x,t.z));world.add(root);
 // The station runs inward from the end, with the buffers closing the track visibly.
 for(const side of [-1,1]){
  box(2.7,.6,22,0xded3b6,side*4.1,.4,11,root);
  box(3.2,.3,23,0x3a849d,side*4.1,4.7,11,root);
  for(const z of [2,10,20])box(.18,4.1,.18,0x71868b,side*5.3,2.5,z,root);
  box(.16,.05,21,0xeec653,side*2.85,.73,11,root);
 }
 box(10.9,.65,2.3,0xdbcfb3,0,.4,-1.2,root);
 box(1.3,1.1,.45,0xa34f39,0,.85,.3,root);
 box(2.8,.25,.35,0xf0c765,0,1.5,.3,root);
 for(const side of [-1,1])box(.22,1.35,.22,0x5e7076,side*.85,.7,.3,root);
 const base=surfaceHeight(p.x,p.z),drop=Math.max(.5,p.y-base);
 for(const side of [-1,1]){
  box(1.2,drop,1.6,0xa8b2a8,side*4,-drop/2,-1,root);
  box(2.1,drop+4.5,2.3,0xcbd9d4,side*6,(4.5-drop)/2,3,root);
  box(2.4,.25,2.6,0x3a849d,side*6,4.65,3,root);
 }
}

export function buildTransport(){
 const coast=route(Array.from({length:17},(_,i)=>{const z=-150+i*14;return [westCoast(z)+20,z] as [number,number]}),.4);railway(coast,false);train(coast,0xe9b753,.25,4);
 buildCoastalStation(coast);
 const stop=coast.getPointAt(.6),direction=coast.getTangentAt(.6);
 const tramStop=new THREE.Group();tramStop.name='coastal-tram-stop';tramStop.position.copy(stop);tramStop.rotation.y=Math.atan2(direction.x,direction.z);world.add(tramStop);
 box(3,.55,16,0xd6c7a6,3.6,.5,0,tramStop);box(3.6,.25,17,0x347e98,3.6,3.6,0,tramStop);
 for(const z of [-6,0,6])box(.12,3,.12,0x6e858b,4.8,2,z,tramStop);
 const commuter=route(COMMUTER_POINTS,10);railway(commuter,true);train(commuter,0x63aabc,.62);
 for(const end of [0,1])buildRailTerminus(commuter,end);
 // Raised highway with a gentle approach, concrete piers and metal safety barriers.
 const highway=route([[192,-125],[225,-82],[235,-14],[226,57],[206,114]],7);
 motorwayCurve=highway;
 roadRibbon(highway,10,.1,roadMat,true).name='elevated-motorway';
 for(let i=0;i<14;i++){const p=highway.getPointAt(i/13),base=surfaceHeight(p.x,p.z);box(1.6,p.y-base,2,0xa3aaa1,p.x,(p.y+base)/2,p.z);}
 for(const side of [-1,1]){const pts:THREE.Vector3[]=[];for(let i=0;i<=80;i++){const p=highway.getPointAt(i/80),t=highway.getTangentAt(i/80);p.x+=-t.z*side*4.8;p.z+=t.x*side*4.8;p.y+=.8;pts.push(p);}world.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),100,.13,5,false),toon(0xc8d1cf)));}
 for(const t of [.36,.73]){
  const p=commuter.getPointAt(t),tan=commuter.getTangentAt(t);const station=new THREE.Group();station.name='elevated-rail-station';station.position.copy(p);station.rotation.y=Math.atan2(tan.x,tan.z);world.add(station);
  // Side platforms leave the central running envelope open, including its roof clearance.
  for(const side of [-1,1]){
   const x=side*4.35;
   box(2.8,.55,23,0xdedacc,x,.45,0,station);
   box(.18,.035,22,0xf0c75a,side*3.08,.745,0,station);
   box(3.2,.28,24,0x3b7b9c,x,4.7,0,station);
   for(const z of [-10,-3,4,10]){
    box(.16,4,.16,0x687d86,side*5.5,2.65,z,station);
    box(.12,.9,.12,0x647c88,side*5.72,1.15,z,station);
   }
   box(.12,.12,22,0x647c88,side*5.72,1.6,0,station);
   for(const z of [-5,5])box(1.1,.35,2,0xc5a273,side*4.8,1.05,z,station);
   // Enclosed lift at the outside edge: no staircase crossing the track or motorway.
   const local=new THREE.Vector3(side*7,0,7).applyAxisAngle(new THREE.Vector3(0,1,0),station.rotation.y).add(p);
   const drop=p.y-surfaceHeight(local.x,local.z);
   box(2.5,drop+4.7,3,0xc8d9d9,side*7,(4.7-drop)/2,7,station);
   box(2.8,.25,3.3,0x3b7b9c,side*7,4.8,7,station);
   box(2,.2,3,0xdedacc,side*5.9,.45,7,station);
  }
 }
 world.userData.transport={tram:true,elevatedRail:true,elevatedHighway:true,stations:4};
}
export function updateTransport(dt:number){for(const vehicle of transit){const state=advanceTrainPhase(vehicle.offset,vehicle.dwellRemaining,dt,vehicle.speed,vehicle.terminalDwell);vehicle.offset=state.offset;vehicle.dwellRemaining=state.remaining;const t=trainProgress(vehicle.curve,vehicle.offset);const p=vehicle.curve.getPointAt(Math.min(.999,Math.max(.001,t))),tangent=vehicle.curve.getTangentAt(t);vehicle.mesh.position.copy(p);vehicle.mesh.rotation.y=Math.atan2(tangent.x,tangent.z)+(vehicle.offset>.5?Math.PI:0);vehicle.mesh.rotation.x=-Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z));}}
export function buildStreetFurniture(){
 for(const [x,z,text,color] of [[42,-82,'LUCKY BREAK','#1e5579'],[89,-92,'CITY LEAGUE','#345c85'],[42,70,'CUE & BALL','#b74f51'],[105,101,'SEASIDE HOTEL','#247b93']] as const){
  const y=surfaceHeight(x,z);for(const dx of [-4,4])box(.28,8,.28,0x61717a,x+dx,y+4,z);
  sign(text,x,y+8.3-1.06,z,11,3.5,color);box(12,.35,.6,0xe4c375,x,y+10.3,z);
 }
 buildBusStops();
 const quaySign=ZONES.port;sign('码头市场 · DOCK MARKET',quaySign.x,6,quaySign.z+7,17,3,'#245875');
}
