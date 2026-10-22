import * as THREE from 'three';
import {world} from './scene';
import {GROUND_Y} from './config';
import {kit,C} from './referenceArchitecture';
import {cutFacade,roundPlan,extrudedPlan,insetRing,rackGeometry,polygonPlan,openPlanShell,polygonRing,insetLoft,type PlanPoint,archHole} from './carvedGeometry';
import {billiardEmblem} from './marketEmblem';
const wood=0x93602f,gold=0xe3b75e,green=0x397f3b;
function start(name:string,attach=true){const root=new THREE.Group();root.name=name;root.position.y=attach?GROUND_Y:0;if(attach)world.add(root);return {root,k:kit(root)};}
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
export const TABLE_POCKETS:[number,number][]=[[-2.85,-1.5],[0,-1.6],[2.85,-1.5],[-2.85,1.5],[0,1.6],[2.85,1.5]];
const POCKET_RADIUS=.3;
/** The playing-field cutout and pocket circles form a single opening in the wooden rail. */
function tableOpening(felt:boolean){
 const shape=new THREE.Shape(),steps=720;
 for(let i=0;i<steps;i++){
  const a=i*Math.PI*2/steps,dx=Math.cos(a),dz=Math.sin(a),edge=Math.min(2.76/Math.max(1e-9,Math.abs(dx)),1.4/Math.max(1e-9,Math.abs(dz)));
  let radius=edge;
  for(const [x,z] of TABLE_POCKETS){
   const along=x*dx+z*dz,disc=POCKET_RADIUS**2-(x*x+z*z-along*along);
   if(disc<0)continue;const near=along-Math.sqrt(disc),far=along+Math.sqrt(disc);
   if(near<=edge&&far>=edge)radius=felt?Math.min(radius,near):Math.max(radius,far);
  }
  if(i)shape.lineTo(dx*radius,dz*radius);else shape.moveTo(dx*radius,dz*radius);
 }
 shape.closePath();return shape;
}
export function outdoorTable(root:THREE.Group,x:number,z:number){
 const k=kit(root),body=roundPlan(6.5,3.85,.45);
 for(const [px,pz] of TABLE_POCKETS){const hole=new THREE.Path();hole.absarc(px,pz,POCKET_RADIUS,0,Math.PI*2,true);body.holes.push(hole);}
 k.mesh(extrudedPlan(body,.48),wood,x,1.05,z).name='carved-table-body';
 const rim=roundPlan(6.5,3.85,.45);rim.holes.push(new THREE.Path(tableOpening(false).getPoints()));
 k.mesh(extrudedPlan(rim,.22),gold,x,1.5,z).name='table-rail-ring';
 k.mesh(extrudedPlan(tableOpening(true),.14),0x3b9b4c,x,1.53,z).name='six-pocket-cloth';
 for(const [px,pz] of TABLE_POCKETS){
  const lining=k.mesh(new THREE.CylinderGeometry(.29,.18,.62,16,1,true),0x223e31,x+px,1.42,z+pz);lining.material.side=THREE.DoubleSide;
  k.mesh(new THREE.CylinderGeometry(.18,.18,.035,16),0x223e31,x+px,1.11,z+pz);
  const lip=k.mesh(new THREE.TorusGeometry(.3,.025,6,24),0x554332,x+px,1.725,z+pz);lip.rotation.x=Math.PI/2;lip.name='rail-pocket-mouth';
 }
 for(const px of [-2.45,2.45])for(const pz of [-1.15,1.15]){
  const points=[new THREE.Vector2(.28,0),new THREE.Vector2(.18,.22),new THREE.Vector2(.23,.65),new THREE.Vector2(.32,1)];
  k.mesh(new THREE.LatheGeometry(points,12),wood,x+px,.1,z+pz);
 }
 k.ball(.25,C.white,x-.85,1.92,z+.2);k.ball(.25,0x23313a,x+.65,1.92,z-.3);
 k.rod(new THREE.Vector3(x-3,1.92,z+1.6),new THREE.Vector3(x+3.3,1.92,z-.65),.045,0xd5a355);
}
function windowedShell(root:THREE.Group,points:PlanPoint[],height:number,thickness:number,name:string,y:number,wallColor:number){
 const group=new THREE.Group();group.name=name;group.position.y=y;root.add(group);const k=kit(group);
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx);
  const count=length>4.2?Math.min(4,Math.floor(length/4.2)):0;
  const windowHeight=height<4?2.1:2.7,bottom=height<4?.65:1.6;
  const holes=Array.from({length:count},(_,j)=>({x:-length/2+length*(j+1)/(count+1),y:bottom,w:Math.min(2.4,length/(count+1)*.55),h:windowHeight}));
  const wall=k.mesh(cutFacade(length,height,thickness,holes),wallColor,(a[0]+b[0])/2,0,(a[1]+b[1])/2);wall.name='structural-shell-panel';wall.rotation.y=angle;
  for(const hole of holes){
   const local=new THREE.Group();local.position.set((a[0]+b[0])/2,0,(a[1]+b[1])/2);local.rotation.y=angle;group.add(local);const d=kit(local);
   const panel=new THREE.Shape(archHole(hole.x,hole.y,hole.w,hole.h).getPoints(24));
   d.mesh(new THREE.ShapeGeometry(panel),C.glass,0,0,thickness+.12).material.side=THREE.DoubleSide;
   const frame=new THREE.Shape(archHole(hole.x,hole.y,hole.w+.28,hole.h+.2).getPoints(24));frame.holes.push(archHole(hole.x,hole.y+.1,hole.w,hole.h-.02));
   d.mesh(new THREE.ExtrudeGeometry(frame,{depth:.13,bevelEnabled:false,curveSegments:12}),C.stone,0,0,-.14);
  }
 }
 return group;
}
// Each footprint starts at the left front jamb and ends at the right jamb.
// The closing edge is the facade; the same outline also drives its floor and roof.
export const MARKET_PLAN:PlanPoint[]=[[-8.6,1.5],[-11.5,-1],[-11.5,-10.5],[9.5,-10.5],[11.5,-8.5],[11.5,-1],[8.6,1.5]];
export const UPPER_PLAN:PlanPoint[]=[[-7.5,-.4],[-9.5,-2.2],[-9.5,-8.7],[2.2,-8.7],[4.5,-6.5],[4.5,-2.2],[2.5,-.4]];
export const HALL_PLAN:PlanPoint[]=[[-4.6,-1],[-6.5,-3],[-6.5,-8],[4.5,-8],[6.5,-6],[6.5,-3],[4.6,-1]];
export function buildSuppliesMarket(){
 const {root,k}=start('billiards-supplies-market');
 k.mesh(extrudedPlan(roundPlan(28,28,1.4),.3),C.stone,0,.04,0);
 windowedShell(root,MARKET_PLAN,6.2,.55,'market-ground-shell',.35,C.cream);
 k.mesh(cutFacade(17.2,6.2,.55,[{x:-5.4,y:.45,w:3.3,h:4.5},{x:0,y:.35,w:3.1,h:4.8},{x:5.4,y:.45,w:3.3,h:4.5}]),C.cream,0,.35,.95).name='market-pierced-facade';
 for(const x of [-5.4,5.4])k.box(3.1,3.9,.14,C.glass,x,2.8,.65);
 k.box(2.95,4.1,.14,0x28596d,0,2.55,.65);
 for(const x of [-.8,.8])k.box(.08,.55,.16,gold,x,2.5,.85);
 k.mesh(extrudedPlan(roundPlan(4.4,1.2,.15),.18),C.stone,0,.34,2.6);
 k.mesh(extrudedPlan(roundPlan(4,.65,.12),.18),C.cream,0,.52,2.15);
 k.mesh(extrudedPlan(polygonPlan(MARKET_PLAN),.2),0xd7c5a3,0,6.55,0).name='market-ground-roof';
 // A stepped upper storey leaves an asymmetric terrace above the chamfered shop.
 k.mesh(polygonRing(MARKET_PLAN,.3,.5),gold,0,6.75,0).name='market-terrace-parapet';
 windowedShell(root,UPPER_PLAN,3.6,.45,'market-upper-shell',6.75,0xe6c89e);
 k.mesh(cutFacade(10,3.6,.45,[-3,0,3].map(x=>({x,y:.45,w:1.8,h:2.6}))),0xe6c89e,-2.5,6.75,-.85);
 for(const x of [-5.5,-2.5,.5])k.box(1.65,2.3,.12,C.glass,x,8.4,-.9);
 k.mesh(insetLoft(UPPER_PLAN,.24,.35),0x2f788c,0,10.35,0).name='market-upper-roof';
 for(const x of [6.3,8]){k.mesh(extrudedPlan(roundPlan(1.2,2.8,.2),.5),C.stone,x,6.75,-4);k.ball(.65,0x669b45,x,7.5,-4);}
 for(const x of [-5.4,5.4]){
  const display=new THREE.Group();display.name='wall-cue-display';display.position.set(x,0,2.5);root.add(display);cueDisplay(display,0,0);
 }
 billiardEmblem(-2.5,10.85,-5,.65);
 for(const x of [-7,7]){
  canopy(root,x,9.2,8,true);rack(root,x+1.55,1.35,8.6,3.3);
  for(const dx of [-1,1]){
   k.mesh(extrudedPlan(roundPlan(1.5,1.25,.15),.7),dx<0?0x3b94a3:0xd78c42,x+dx*1.1,.45,11.2);
   k.ball(.2,[0xf2c852,0xe5604c][dx<0?0:1],x+dx*1.1,1.35,11.2);
  }
  for(const side of [-1,1])for(const z of [7.6,10.7])k.rod(new THREE.Vector3(x+side*3.7,.35,z),new THREE.Vector3(x+side*3.7,z<9?4.6:4,z),.1,wood);
 }
 return root;
}
export function buildOutdoorHall(attach=true){
 const {root,k}=start('independent-outdoor-billiards-hall',attach);root.userData.hallNumber=2;
 k.mesh(extrudedPlan(roundPlan(17,21,1.5),.3),C.stone,0,.05,0);
 windowedShell(root,HALL_PLAN,6.8,.5,'hall-rear-shell',.35,0xb1814d);
 k.mesh(cutFacade(9.2,6.8,.5,[{x:0,y:.25,w:6,h:4.8}]),wood,0,.35,-1.5).name='hall-open-arch';
 k.mesh(insetLoft(HALL_PLAN,.65,.85),0x557e47,0,7.15,0).name='hall-inset-hip-roof';
 k.mesh(extrudedPlan(roundPlan(6.5,2,.18),.25),C.cream,0,.35,-.2);
 const sign=new THREE.Group();sign.name='rooftop-triangle-sign';sign.position.set(0,8.35,-4.5);root.add(sign);rack(sign,0,0,0,4.2);
 for(const x of [-1.6,1.6])k.rod(new THREE.Vector3(x,8,-4.5),new THREE.Vector3(x,8.35,-4.5),.1,gold);
 canopy(root,0,.8,13.5,false,6.1);
 // Freestanding front posts hold the canopy; nothing encloses the outdoor table.
 for(const x of [-6.1,6.1]){
  k.rod(new THREE.Vector3(x,.35,2.45),new THREE.Vector3(x,5.88,2.45),.14,wood);
  k.rod(new THREE.Vector3(x,4.9,2.45),new THREE.Vector3(x,6.1,1.1),.1,wood);
 }
 outdoorTable(root,0,5.8);
 for(const x of [-6.7,6.7]){
  k.mesh(new THREE.CylinderGeometry(.8,.55,1,14),0xb8813f,x,.85,1);
  for(let i=0;i<5;i++)k.ball(.6,0x639335,x+Math.cos(i*1.3)*.4,1.8+i*.12,1+Math.sin(i*1.3)*.4);
 }
 k.rod(new THREE.Vector3(0,6.1,-3),new THREE.Vector3(0,4.9,-3),.07,0x263b3e);
 k.mesh(new THREE.ConeGeometry(.75,.55,16,1,true),0x263b3e,0,4.7,-3);k.ball(.25,0xffd16c,0,4.5,-3);
 return root;
}
