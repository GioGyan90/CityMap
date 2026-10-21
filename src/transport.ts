import * as THREE from 'three';
import { world } from './scene';
import { terrainHeight,westCoast,ZONES } from './layout';
import { roadRibbon,roadMat,walkMat } from './roads';
import { toon } from './materials';
import { sign } from './conceptDetails';
export let motorwayCurve:THREE.CatmullRomCurve3|null=null;
export const transit:{mesh:THREE.Group;curve:THREE.CatmullRomCurve3;offset:number;speed:number}[]=[];
function box(w:number,h:number,d:number,c:number,x:number,y:number,z:number,parent:THREE.Object3D=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function route(points:[number,number][],lift:number){return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,terrainHeight(x,z)+lift,z)),false,'catmullrom',.12);}
function railway(curve:THREE.CatmullRomCurve3,elevated:boolean){
 roadRibbon(curve,elevated?5.5:3.8,0,walkMat,true).name=elevated?'rail-viaduct':'coastal-tram-track';
 for(const side of [-1,1]){
  const points:THREE.Vector3[]=[];for(let i=0;i<=180;i++){const p=curve.getPointAt(i/180),t=curve.getTangentAt(i/180);p.x+=-t.z*side*.8;p.z+=t.x*side*.8;p.y+=.15;points.push(p);}
  const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),180,.07,5,false),toon(0x606c76));world.add(rail);
 }
 const count=Math.floor(curve.getLength()/3.4);
 for(let i=0;i<count;i++){const p=curve.getPointAt(i/count),t=curve.getTangentAt(i/count);const sleeper=box(2.6,.16,.3,0x806a55,p.x,p.y+.03,p.z);sleeper.rotation.y=Math.atan2(t.x,t.z);}
 if(elevated)for(let i=0;i<18;i++){const p=curve.getPointAt(i/17),base=terrainHeight(p.x,p.z);box(1.6,p.y-base,1.8,0xa6ada6,p.x,(p.y+base)/2,p.z);}
}
function train(curve:THREE.CatmullRomCurve3,color:number,offset:number){
 const g=new THREE.Group();g.name='moving-train';world.add(g);
 for(const z of [-4,4]){box(2.4,2.5,6.8,color,0,1.5,z,g);box(2.46,.85,5.6,0x254d65,0,1.95,z,g);box(2.5,.32,6.8,0xe9e6d7,0,2.85,z,g);for(const side of [-1,1])box(.16,.25,5.7,0xf3e2ab,side*1.22,.85,z,g);}
 transit.push({mesh:g,curve,offset,speed:.025});
}
export function buildTransport(){
 const coast=route(Array.from({length:17},(_,i)=>{const z=-150+i*14;return [westCoast(z)+20,z] as [number,number]}),.4);railway(coast,false);train(coast,0xe9b753,.25);
 const stop=coast.getPointAt(.6),direction=coast.getTangentAt(.6);
 const tramStop=new THREE.Group();tramStop.name='coastal-tram-stop';tramStop.position.copy(stop);tramStop.rotation.y=Math.atan2(direction.x,direction.z);world.add(tramStop);
 box(3,.55,16,0xd6c7a6,3.6,.5,0,tramStop);box(3.6,.25,17,0x347e98,3.6,3.6,0,tramStop);
 for(const z of [-6,0,6])box(.12,3,.12,0x6e858b,4.8,2,z,tramStop);
 const commuter=route([[4,-158],[83,-162],[172,-146],[208,-85],[208,-5],[199,68],[191,126]],10);railway(commuter,true);train(commuter,0x63aabc,.62);
 // Raised highway with a gentle approach, concrete piers and metal safety barriers.
 const highway=route([[192,-125],[225,-82],[235,-14],[226,57],[206,114]],7);
 motorwayCurve=highway;
 roadRibbon(highway,10,.1,roadMat,true).name='elevated-motorway';
 for(let i=0;i<14;i++){const p=highway.getPointAt(i/13),base=terrainHeight(p.x,p.z);box(1.6,p.y-base,2,0xa3aaa1,p.x,(p.y+base)/2,p.z);}
 for(const side of [-1,1]){const pts:THREE.Vector3[]=[];for(let i=0;i<=80;i++){const p=highway.getPointAt(i/80),t=highway.getTangentAt(i/80);p.x+=-t.z*side*4.8;p.z+=t.x*side*4.8;p.y+=.8;pts.push(p);}world.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),100,.13,5,false),toon(0xc8d1cf)));}
 for(const t of [.36,.73]){
  const p=commuter.getPointAt(t),tan=commuter.getTangentAt(t);const station=new THREE.Group();station.name='elevated-rail-station';station.position.copy(p);station.rotation.y=Math.atan2(tan.x,tan.z);world.add(station);
  box(8,.5,19,0xdedacc,0,.2,0,station);box(8.5,.4,20,0x3b7b9c,0,4.5,0,station);
  for(const x of [-3.5,3.5])for(const z of [-7,0,7])box(.2,4.2,.2,0x687d86,x,2.4,z,station);
  for(let i=0;i<15;i++)box(2.1,.72,1.1,0xc9c7b6,6,-i*.7,-7+i*.75,station);
 }
 world.userData.transport={tram:true,elevatedRail:true,elevatedHighway:true,stations:3};
}
export function updateTransport(dt:number){for(const vehicle of transit){vehicle.offset=(vehicle.offset+dt*vehicle.speed)%1;const t=vehicle.offset<.5?vehicle.offset*2:2-vehicle.offset*2;const p=vehicle.curve.getPointAt(Math.min(.999,Math.max(.001,t))),tangent=vehicle.curve.getTangentAt(t);vehicle.mesh.position.copy(p);vehicle.mesh.rotation.y=Math.atan2(tangent.x,tangent.z)+(vehicle.offset>.5?Math.PI:0);vehicle.mesh.rotation.x=-Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z));}}
export function buildStreetFurniture(){
 for(const [x,z,text,color] of [[42,-82,'LUCKY BREAK','#1e5579'],[89,-92,'CITY LEAGUE','#345c85'],[42,70,'CUE & BALL','#b74f51'],[105,101,'SEASIDE HOTEL','#247b93']] as const){
  const y=terrainHeight(x,z);for(const dx of [-4,4])box(.28,8,.28,0x61717a,x+dx,y+4,z);
  sign(text,x,y+8.3-1.06,z,11,3.5,color);box(12,.35,.6,0xe4c375,x,y+10.3,z);
 }
 for(const [x,z] of [[32,-45],[29,77],[185,-81],[179,118]]){
  const y=terrainHeight(x,z);box(6,.3,3,0x4589a3,x,y+3,z);for(const dx of [-2.6,2.6])box(.15,3,.15,0x5f7884,x+dx,y+1.5,z);box(4,.35,.9,0xcdb58d,x,y+.6,z+.6);
 }
 const quaySign=ZONES.port;sign('HARBOR TERMINAL',quaySign.x,6,quaySign.z+7,17,3,'#245875');
}
