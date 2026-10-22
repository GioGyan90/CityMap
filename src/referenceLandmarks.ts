import {createVehicle} from './vehicles';
import * as THREE from 'three';
import {world} from './scene';
import {GROUND_Y} from './config';
import {kit,C,palm,garden} from './referenceArchitecture';
import {hotelPlazaOutline} from './hotelPlaza';
const rootAt=(name:string,x:number,z:number)=>{const g=new THREE.Group();g.name=name;g.position.set(x,GROUND_Y,z);world.add(g);return g;};
export function referenceHotel(cx:number,cz:number){
 const root=rootAt('reference-hotel',cx,cz),k=kit(root);root.userData.plazaOutline=hotelPlazaOutline;root.userData.referenceDetails='three blue domes, arched bays, balconies, entrance canopy, fountain';
 k.slab(hotelPlazaOutline,.55,0,C.stone).name='hotel-clipped-plaza';
 k.slab(hotelPlazaOutline.map(([x,z])=>[x*.98,z*.98]),.12,.55,C.cream);
 const arch=(x:number,y:number,z:number,w:number,h:number)=>{const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.closePath();const outer=k.mesh(new THREE.ShapeGeometry(s),C.gold,x,y,z);const glass=k.mesh(new THREE.ShapeGeometry(s),C.glass,x,y+.12,z+.035);glass.scale.set(.8,.91,1);k.box(.1,h-.3,.12,C.cream,x,y+h/2,z+.1);k.box(w*.8,.12,.14,C.cream,x,y+h*.45,z+.11);return outer;};
 const dome=(x:number,y:number,z:number,r:number)=>{k.mesh(new THREE.CylinderGeometry(r,r,.45,24),C.cream,x,y,z);k.mesh(new THREE.SphereGeometry(r,24,12,0,Math.PI*2,0,Math.PI/2),C.blue,x,y+.23,z);for(let i=0;i<8;i++){const a=i*Math.PI/4,pts=Array.from({length:17},(_,j)=>{const t=j/16*Math.PI/2;return new THREE.Vector3(x+Math.cos(a)*r*Math.sin(t),y+.25+r*Math.cos(t),z+Math.sin(a)*r*Math.sin(t));});k.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.035,5,false),C.gold);}k.ball(.27,C.gold,x,y+r+.5,z);k.mesh(new THREE.ConeGeometry(.15,.8,8),C.gold,x,y+r+1,z);};
 for(const [x,h,w,d,z] of [[-7,16,5.6,8,-2],[7,16,5.6,8,-2],[0,20,7.2,9,-2.5]]){
  k.rounded(w,d,h,x,.7,z,C.cream,.35);k.box(w+.65,.45,d+.6,C.white,x,h+.65,z);k.box(w+.45,.25,d+.4,C.gold,x,h+.3,z);
  for(const side of [-1,1]) k.box(.42,h,.45,C.stone,x+side*(w/2-.2),h/2+.7,z+d/2+.1);
  for(let floor=0;floor<3;floor++){const y=3.4+floor*4.2;arch(x,y,z+d/2+.08,2.25,3.5);for(const side of [-1,1]){
    k.box(.12,2.8,1.65,C.gold,x+side*(w/2+.06),y+1.4,z+.7);
    k.box(.14,2.5,1.35,C.glass,x+side*(w/2+.08),y+1.4,z+.7);
    k.box(.18,.12,1.5,C.cream,x+side*(w/2+.1),y+1.4,z+.7);
   }
   if(x===0){k.box(3.1,.23,1.25,C.white,x,y-.15,z+d/2+.62);k.box(3.05,.48,.18,C.green,x,y+.1,z+d/2+1.2);for(let n=-2;n<=2;n++)k.box(.07,.65,.08,C.gold,x+n*.65,y+.55,z+d/2+1.24);k.box(3.2,.1,.1,C.gold,x,y+.89,z+d/2+1.24);}}
  if(x===0)arch(0,16.2,z+d/2+.08,2.4,3.5);dome(x,h+1,z,w*.57);
 }
 k.box(3.6,3.1,.2,C.glass,0,2.25,2.12);k.box(.13,3,.24,C.gold,0,2.2,2.25);for(const x of [-1.1,1.1])k.box(.08,.55,.15,C.gold,x,2.1,2.34);
 for(const x of [-2.5,2.5])k.mesh(new THREE.CylinderGeometry(.15,.2,3.4,10),C.gold,x,2.4,4.9);
 const canopy=k.mesh(new THREE.SphereGeometry(3.25,24,12,0,Math.PI*2,0,Math.PI/2),C.blue,0,4.1,3.7);canopy.scale.z=.72;k.mesh(new THREE.CylinderGeometry(3.25,3.25,.18,24),C.gold,0,4.13,3.7).scale.z=.72;k.ball(.22,C.gold,0,7.5,3.7);
 for(let i=0;i<4;i++)k.box(5.8,.22,1.25,C.cream,0,.78-i*.12,5.6+i*.8);
 // Fountain and gardens stay within the clipped plaza, away from the corner surrendered to traffic.
 k.mesh(new THREE.CylinderGeometry(2.2,2.4,.45,24),C.cream,-5.4,.9,6.2);k.mesh(new THREE.CylinderGeometry(1.95,1.95,.15,24),0x36b7d1,-5.4,1.17,6.2);
 k.mesh(new THREE.CylinderGeometry(.27,.5,2.1,12),C.white,-5.4,2.1,6.2);k.mesh(new THREE.CylinderGeometry(1.15,.55,.35,20),C.white,-5.4,2.75,6.2);k.ball(.32,0x65d9ef,-5.4,3.55,6.2);
 garden(root,7.8,6.6,2.5);garden(root,-10,-6,1.7);palm(root,-11,-8);palm(root,11,-6);palm(root,10,3,5.8);
 return root;
}
export function referenceHospital(cx:number,cz:number){
 const root=rootAt('reference-hospital',cx,cz),k=kit(root);root.userData.referenceDetails='rounded white wings, blue window ribbons, roof medical pad, ambulance';
 k.rounded(25,24,.55,0,0,0,C.stone,3);k.rounded(24.6,23.6,.12,0,.55,0,C.cream,3);
 k.rounded(13,12,17,-3,.7,-2,C.white,1.2);k.rounded(8,11,13,6,.7,-3,C.cream,1);
 for(const [x,w,h,z,d] of [[-3,13,17,-2,12],[6,8,13,-3,11]]){
  for(let y=4;y<h-1;y+=3.6){k.box(w-.9,1.95,.12,C.glass,x,y,z+d/2+.04);for(let a=x-w/2+1.6;a<x+w/2;a+=2.5)k.box(.21,2,.18,C.white,a,y,z+d/2+.1);
   for(const side of [-1,1]){k.box(.12,1.95,d-1.8,C.glass,x+side*(w/2+.03),y,z);for(let a=z-d/2+1.5;a<z+d/2;a+=2.5)k.box(.18,2,.2,C.white,x+side*(w/2+.1),y,a);}}
  k.rounded(w+.3,d+.3,.35,x,h+.7,z,C.cream,1.1);k.rounded(w-.8,d-.8,.12,x,h+1.08,z,0xf4edd9,1);
 }
 const cross=(x:number,y:number,z:number,s:number)=>{k.box(s*.34,s,.22,0xf14523,x,y,z);k.box(s,s*.34,.24,0xf14523,x,y,z+.02);};
 k.box(5,4.8,.2,C.white,-3,13.9,4.15);cross(-3,14,4.32,3.2);
 // Main roof is a clear landing deck; the lower wing is an accessible terrace.
 k.rounded(11.6,10.6,.28,-3,17.85,-2,0x647e88,1).name='hospital-helipad';
 const ring=k.mesh(new THREE.RingGeometry(3.65,3.82,48),0xffe4a0,-3,18.145,-2);ring.rotation.x=-Math.PI/2;
 for(const x of [-4.15,-1.85])k.box(.42,.035,3.3,C.white,x,18.16,-2);
 k.box(2.3,.035,.42,C.white,-3,18.16,-2);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;k.ball(.12,0xffbc55,-3+Math.cos(a)*4.65,18.24,-2+Math.sin(a)*4.15);}
 k.rounded(7.4,10.4,.18,6,14.12,-3,0xd5dfd9,.65).name='hospital-roof-terrace';
 // Parapets stay below the landing surface, with a separate stair head on the terrace.
 for(const z of [-8.1,2.1])k.box(7.5,.8,.18,C.white,6,14.65,z);
 for(const x of [2.3,9.7])k.box(.18,.8,10.2,C.white,x,14.65,-3);
 k.rounded(2.5,2.6,2.3,6.8,14.3,-6.1,C.white,.2);
 k.box(1,1.85,.1,C.glass,6.8,15.23,-4.74);
 k.box(2.8,.18,2.9,C.blue,6.8,16.68,-6.1);
 for(const z of [-.5,1]){k.box(2,.4,.55,0xb88d59,6,14.65,z);for(const x of [5.3,6.7])k.box(.12,.4,.4,0x61717a,x,14.4,z);}
 k.box(1.2,.65,2.2,C.stone,8.5,14.6,-2);k.box(1,.4,2,C.green,8.5,15.1,-2);
 for(const z of [-7.75,3.75])k.box(12.6,.45,.18,C.white,-3,17.75,z);
 for(const x of [-9.25,3.25])k.box(.18,.45,11.4,C.white,x,17.75,-2);
 k.box(4.7,3,.2,C.glass,-3,2.2,4.18);for(const x of [-5.4,-3,-.6])k.box(.14,3.1,.3,C.cream,x,2.2,4.35);
 for(const x of [-3.9,-2.1])k.box(.1,.6,.2,C.gold,x,2.2,4.4);
 k.box(6.7,.32,3.5,C.blue,-3,4.2,5.5);for(let i=0;i<4;i++){k.box(1.6,.42,.25,C.blue,-5.5+i*1.65,3.9,7.15);k.box(.07,.06,3.5,C.white,-6.25+i*1.65,4.39,5.5);}
 for(let i=0;i<3;i++)k.box(6.8,.22,1.3,C.cream,-3,.7-i*.12,6.4+i*.9);
 garden(root,-9.7,4,2);garden(root,9.5,-7,1.7);palm(root,-10,-8);palm(root,10,2,6.5);
 const van=createVehicle('ambulance',C.white,undefined,true);van.name='hospital-ambulance';van.position.set(5.2,.7,7.2);van.scale.set(1.6,1.4,1.4);root.add(van);
 return root;
}
