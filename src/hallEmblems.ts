import * as THREE from 'three';
import {kit,C} from './referenceArchitecture';
import type {HallTheme} from './themedHalls';
const colors={fire:0xd84f2d,elegance:0x397f4d,order:0x327fa9,science:0xc7e5df,punk:0x37414a};
function part(root:THREE.Group,name:string){const g=new THREE.Group();g.name=name;root.add(g);return g;}
function plate(root:THREE.Group,shape:THREE.Shape,color:number,depth:number,z:number,name:string){const m=kit(root).mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:2,curveSegments:14}),color,0,0,z);m.name=name;return m;}
function polygon(points:number[][]){return new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));}
function cue(root:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,color:number){const g=part(root,'sculpture-cue'),k=kit(g),join=a.clone().lerp(b,.32),tip=b.clone().lerp(a,.025);k.rod(a,join,.13,color);k.rod(join,tip,.075,0xe9c98e);k.rod(tip,b,.085,0x83c4cc);const mount=k.rod(new THREE.Vector3(a.x*.65,.34,0),a.clone().lerp(b,.2),.075,0x687479);mount.name='cue-mount-brace';return g;}
function eight(root:THREE.Group,x:number,y:number,z:number,r=1.12){const g=part(root,'sculpture-black-eight'),k=kit(g);g.position.set(x,y,z);k.ball(r,0x202b32,0,0,0).name='eight-sphere';
 for(const side of [-1,1]){const cap=k.mesh(new THREE.SphereGeometry(r+.015,24,8,0,Math.PI*2,0,.48),C.white);cap.rotation.x=side*Math.PI/2;const label=part(g,'raised-eight-number');label.position.z=side*(r+.025);label.rotation.y=side<0?Math.PI:0;for(const h of [-.15,.15])kit(label).mesh(new THREE.TorusGeometry(.145,.047,7,20),0x202b32,0,h,0);}
 k.rod(new THREE.Vector3(0,-y+.25,0),new THREE.Vector3(0,-r+.08,0),.2,0x48565a).name='eight-support';return g;
}
export function createEmotionEmblem(theme:HallTheme){const root=new THREE.Group();root.name='hall-module-emblem';root.userData={theme,sculpture:true};const base=part(root,'sculpture-foundation'),k=kit(base),accent=colors[theme];
 k.mesh(new THREE.CylinderGeometry(2.5,2.7,.28,32),accent,0,.14,0);k.box(4.8,.14,1.9,0xb8975f,0,.34,0);
 const motif=part(root,'sculpture-motif-'+theme),m=kit(motif);
 if(theme==='fire'){
  const flame=new THREE.Shape();flame.moveTo(-1.9,.4);flame.bezierCurveTo(-3,1.5,-2.4,3,-1.9,3.65);flame.bezierCurveTo(-2,2.6,-.9,2.5,-1,3.55);flame.bezierCurveTo(-1.15,4.35,.4,4.9,.15,5.6);flame.bezierCurveTo(1.5,4.85,1.3,3.6,1.05,3.05);flame.bezierCurveTo(2.05,3.2,2.4,4.1,2.45,4.45);flame.bezierCurveTo(3.1,2.65,2.7,1.2,1.7,.4);flame.closePath();
  const cut=new THREE.Path();cut.moveTo(-.25,2.65);cut.bezierCurveTo(-.65,3.3,.35,3.75,.3,4.3);cut.bezierCurveTo(1.2,3.55,.8,2.9,.3,2.6);cut.closePath();flame.holes.push(cut);
  plate(motif,flame,0xc63c24,.5,-.65,'pierced-flame-silhouette');
  plate(motif,polygon([[-1.6,.45],[-1.8,1.5],[-1.05,2.7],[-.85,1.95],[.05,3.1],[.8,2.0],[1.6,2.6],[1.9,1.25],[1.35,.45]]),0xf7a334,.25,-.06,'golden-inner-flame');
  cue(motif,new THREE.Vector3(-3.3,.5,-.95),new THREE.Vector3(3.3,4.7,-.95),0x81372a);m.rod(new THREE.Vector3(-1,.4,-.75),new THREE.Vector3(-1,1.9,-.95),.09,accent);
  eight(root,0,1.7,.9,1.25);
 }else if(theme==='elegance'){
  // Laurel leaves follow two curved branches; each leaf stem overlaps its branch.
  for(const side of [-1,1]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(side*.5,.4,-.3),new THREE.Vector3(side*3.5,1.5,-.3),new THREE.Vector3(side*1.65,4.25,-.3));m.mesh(new THREE.TubeGeometry(curve,22,.08,7,false),0xb2924e);
   for(let i=0;i<7;i++){const u=.12+i*.125,p=curve.getPoint(u),leaf=polygon([[0,0],[side*.38,.12],[side*.8,.65],[side*.16,.55]]);const l=plate(motif,leaf,i%2?0x57945d:0x2f6545,.13,p.z-.04,'laurel-leaf');l.position.set(p.x,p.y,p.z);}}
  cue(motif,new THREE.Vector3(-2.7,.45,-.6),new THREE.Vector3(2.25,3.85,-.6),0x8d6537);eight(root,0,1.75,.45);m.mesh(new THREE.TorusGeometry(1.45,.09,8,40),0xc9aa61,0,1.8,.1);
 }else if(theme==='order'){
  const frame=polygon([[-2.7,.4],[-2.7,4.3],[2.7,4.3],[2.7,.4],[2.35,.4],[2.35,3.95],[-2.35,3.95],[-2.35,.4]]);plate(motif,frame,accent,.45,-.55,'precision-gate');
  for(const x of [-1.8,0,1.8]){m.rod(new THREE.Vector3(x,.4,-.1),new THREE.Vector3(x,1.15,-.1),.09,0xa2c5ca);m.ball(.4,x===0?C.white:0x79b7c9,x,1.35,-.1);}
  eight(root,0,2.75,.25,.95);for(const side of [-1,1])cue(motif,new THREE.Vector3(side*2.45,.45,.2),new THREE.Vector3(side*2.45,3.85,.2),accent);
 }else if(theme==='science'){
  eight(root,0,2.2,0,1.1);
  for(let i=0;i<3;i++){const ring=m.mesh(new THREE.TorusGeometry(2,.075,8,64),i%2?0x78b4bf:0xb8d5ce,0,2.2,0);ring.rotation.set(i*.65,.35+i*.85,.3+i*.7);ring.name='orbital-ring';const satellite=new THREE.Vector3(2,0,0).applyEuler(ring.rotation).add(ring.position);m.ball(.24,0xe2b455,satellite.x,satellite.y,satellite.z);}
  for(const side of [-1,1])m.rod(new THREE.Vector3(side*1.25,.4,0),new THREE.Vector3(side*1.25,1.0,0),.1,0xa6c9c8);
 }else{
  plate(motif,polygon([[-2.5,.4],[-1.9,2],[-3.1,2.55],[-1.3,2.9],[-1.45,4.8],[0,3.6],[1.7,5.05],[1.5,3.3],[3.1,3.6],[2.4,2.15],[3.25,1.25],[1.75,.4]]),0x697477,.36,-.6,'jagged-metal-burst');
  const bolt=polygon([[.1,.45],[1.3,2.55],[.45,2.55],[1.5,4.95],[-1.4,2.05],[-.35,2.05],[-.8,.45]]);plate(motif,bolt,0xd9b54c,.3,-.05,'cut-lightning-bolt');
  for(const side of [-1,1])cue(motif,new THREE.Vector3(side*-2.8,.45,-.95),new THREE.Vector3(side*2.8,4.25,-.95),side<0?0x94653c:0x385a60);
  eight(root,-.45,1.7,.9,1.18);for(const x of [-2,-1,0,1,2])m.ball(.1,0xc6c9be,x,.4,.8);
 }
 return root;
}
