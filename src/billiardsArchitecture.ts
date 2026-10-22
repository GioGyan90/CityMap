import * as THREE from 'three';
import {world} from './scene';
import {GROUND_Y} from './config';
import {kit,C} from './referenceArchitecture';
import {cutFacade,roundPlan,extrudedPlan,insetRing,rackGeometry} from './carvedGeometry';
import {billiardEmblem} from './marketEmblem';
const wood=0x93602f,gold=0xe3b75e,green=0x397f3b;
function start(name:string){const root=new THREE.Group();root.name=name;root.position.y=GROUND_Y;world.add(root);return {root,k:kit(root)};}
function canopy(root:THREE.Group,x:number,z:number,w:number,blue:boolean,y=4.3){
 const k=kit(root),n=8;
 for(let i=0;i<n;i++){
  const px=x-w/2+(i+.5)*w/n,c=blue?(i%2?C.white:C.blue):green;
  const s=new THREE.Shape();s.moveTo(-w/n/2,0);s.lineTo(w/n/2,0);s.lineTo(w/n/2,-.32);s.quadraticCurveTo(0,-.95,-w/n/2,-.32);s.closePath();
  k.mesh(new THREE.ExtrudeGeometry(s,{depth:.12,bevelEnabled:false}),c,px,y-.36,z+1.88).name='scalloped-canopy-edge';
  const roof=k.box(w/n-.025,.13,3.8,c,px,y,z);roof.rotation.x=.18;
 }
}
function cueDisplay(root:THREE.Group,x:number,z:number){
 const k=kit(root);k.mesh(insetRing(3,1.8,.25,.16,.28),wood,x,.35,z);
 for(let i=0;i<5;i++){
  const a=new THREE.Vector3(x-1.05+i*.5,.62,z+.28),b=new THREE.Vector3(x-.6+i*.5,4.4+i*.11,z-.1),v=a.clone().lerp(b,.37);
  k.rod(a,v,.085,0x2e3c3c);k.rod(v,b,.045,0xc8944c);k.ball(.075,C.cream,b.x,b.y,b.z);
 }
}
function rack(root:THREE.Group,x:number,y:number,z:number,size=3.1){
 const k=kit(root);k.mesh(rackGeometry(size),gold,x,y,z).name='hollow-triangle-rack';
 let n=0;for(let row=0;row<3;row++)for(let col=0;col<3-row;col++){
  const r=size*.105;k.ball(r,[0xf3c447,0x2e99b0,0xdf654b,0xf8f1d0,0x74559b,0x5daa50][n++],x+(col-(2-row)/2)*r*2.05,y+size*.22+row*r*1.8,z+.23);
 }
}
export function outdoorTable(root:THREE.Group,x:number,z:number){
 const k=kit(root),shape=roundPlan(6.3,3.65,.4);
 for(const px of [-2.45,0,2.45])for(const pz of [-1.2,1.2]){const hole=new THREE.Path();hole.absarc(px,pz,.22,0,Math.PI*2,true);shape.holes.push(hole);}
 k.mesh(extrudedPlan(shape,.48),wood,x,1.05,z).name='carved-table-body';
 k.mesh(insetRing(6.5,3.85,.45,.38,.22),gold,x,1.5,z).name='table-rail-ring';
 const felt=roundPlan(5.75,3.1,.2);
 for(const px of [-2.45,0,2.45])for(const pz of [-1.2,1.2]){const hole=new THREE.Path();hole.absarc(px,pz,.22,0,Math.PI*2,true);felt.holes.push(hole);}
 const bed=k.mesh(extrudedPlan(felt,.14),0x3b9b4c,x,1.53,z);bed.name='six-pocket-cloth';
 for(const px of [-2.45,0,2.45])for(const pz of [-1.2,1.2]){
  k.mesh(new THREE.CylinderGeometry(.215,.15,.57,12,1,true),0x223e31,x+px,1.385,z-pz);
  k.mesh(new THREE.CylinderGeometry(.15,.15,.035,12),0x223e31,x+px,1.1,z-pz);
 }
 for(const px of [-2.45,2.45])for(const pz of [-1.15,1.15]){
  const points=[new THREE.Vector2(.28,0),new THREE.Vector2(.18,.22),new THREE.Vector2(.23,.65),new THREE.Vector2(.32,1)];
  k.mesh(new THREE.LatheGeometry(points,12),wood,x+px,.1,z+pz);
 }
 k.ball(.25,C.white,x-.85,1.92,z+.2);k.ball(.25,0x23313a,x+.65,1.92,z-.3);
 k.rod(new THREE.Vector3(x-3,1.92,z+1.6),new THREE.Vector3(x+3.3,1.92,z-.65),.045,0xd5a355);
}
export function buildSuppliesMarket(){
 const {root,k}=start('billiards-supplies-market');
 k.mesh(extrudedPlan(roundPlan(28,28,1.4),.3),C.stone,0,.04,0);
 // Hollow U-shaped shell, plus a pierced front wall; windows and doorways have real depth.
 const openings=[{x:-7,y:.45,w:4.4,h:4.7},{x:0,y:.35,w:3.3,h:4.8},{x:7,y:.45,w:4.4,h:4.7},...[-7,0,7].map(x=>({x,y:7,w:3.5,h:2.5}))];
 k.mesh(cutFacade(23,10.5,.55,openings),C.cream,0,.35,1.45).name='market-pierced-facade';
 // Remaining walls form one U section, leaving the room visibly recessed behind the arches.
 const u=new THREE.Shape();u.moveTo(-11.5,-6);u.lineTo(11.5,-6);u.lineTo(11.5,6);u.lineTo(10.95,6);u.lineTo(10.95,-5.45);u.lineTo(-10.95,-5.45);u.lineTo(-10.95,6);u.lineTo(-11.5,6);u.closePath();
 k.mesh(extrudedPlan(u,10.5),C.cream,0,.35,-4.5);
 k.box(22,.3,11,C.stone,0,6.6,-4.2);
 for(const x of [-7,7]){
  k.box(4.15,4.3,.14,C.glass,x,2.8,.6);k.box(3.25,2.2,.14,C.glass,x,8.7,.6);
 }
 k.box(3.1,4.1,.14,0x28596d,0,2.55,.6);k.box(3.2,2.2,.14,C.glass,0,8.7,.6);
 k.mesh(extrudedPlan(roundPlan(4.4,1.2,.15),.18),C.stone,0,.34,2.6);
 k.mesh(extrudedPlan(roundPlan(4,.65,.12),.18),C.cream,0,.52,2.15);
 for(const x of [-.8,.8])k.box(.08,.55,.16,gold,x,2.5,.8);
 k.mesh(extrudedPlan(roundPlan(23.1,12.1,.3),.18),0xcdbd9e,0,10.75,-4.5);
 k.mesh(insetRing(23.8,12.8,.65,.36,.8),0xe3c38d,0,10.9,-4.5).name='market-recessed-parapet';
 canopy(root,0,3.4,23,true,5.9);
 billiardEmblem(0,11.6,-4.5,.7);
 for(const x of [-7,7]){
  canopy(root,x,9.2,8,true);cueDisplay(root,x-2.25,9.5);rack(root,x+1.55,1.35,8.6,3.3);
  for(const dx of [-1,1]){
   k.mesh(extrudedPlan(roundPlan(1.5,1.25,.15),.7),dx<0?0x3b94a3:0xd78c42,x+dx*1.1,.45,11.2);
   k.ball(.2,[0xf2c852,0xe5604c][dx<0?0:1],x+dx*1.1,1.35,11.2);
  }
  for(const side of [-1,1])k.mesh(new THREE.CylinderGeometry(.1,.14,4,8),wood,x+side*3.7,2.3,10.7);
 }
 return root;
}
export function buildOutdoorHall(){
 const {root,k}=start('independent-outdoor-billiards-hall');root.userData.hallNumber=2;
 k.mesh(extrudedPlan(roundPlan(17,21,1.5),.3),C.stone,0,.05,0);
 k.mesh(cutFacade(13,7.8,.5,[{x:0,y:.25,w:7.6,h:5.3}]),wood,0,.35,-1).name='hall-open-arch';
 const u=new THREE.Shape();u.moveTo(-6.5,-8);u.lineTo(6.5,-8);u.lineTo(6.5,0);u.lineTo(6,0);u.lineTo(6,-7.5);u.lineTo(-6,-7.5);u.lineTo(-6,0);u.lineTo(-6.5,0);u.closePath();
 k.mesh(extrudedPlan(u,7.8),0xb1814d,0,.35,-1);
 k.mesh(extrudedPlan(roundPlan(13.2,8.4,.3),.18),0xcdbd9e,0,8,-5);
 k.mesh(insetRing(13.8,9,.4,.35,.65),0xd8ad69,0,8.15,-5);
 k.mesh(extrudedPlan(roundPlan(8.2,1.2,.18),.25),C.cream,0,.35,.1);
 rack(root,0,2.1,-8.43,4.2);
 canopy(root,0,1,14,false,6.4);
 outdoorTable(root,0,5.8);
 for(const x of [-6.7,6.7]){
  k.mesh(new THREE.CylinderGeometry(.8,.55,1,14),0xb8813f,x,.85,3);
  for(let i=0;i<5;i++)k.ball(.6,0x639335,x+Math.cos(i*1.3)*.4,1.8+i*.12,3+Math.sin(i*1.3)*.4);
 }
 k.rod(new THREE.Vector3(0,6.2,-2),new THREE.Vector3(0,4.9,-2),.07,0x263b3e);
 k.mesh(new THREE.ConeGeometry(.75,.55,16,1,true),0x263b3e,0,4.7,-2);k.ball(.25,0xffd16c,0,4.5,-2);
 return root;
}
