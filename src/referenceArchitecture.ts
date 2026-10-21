import * as THREE from 'three';
import {toon} from './materials';
/** Compact code-built details shared by the reference landmarks and ship. */
export function kit(root:THREE.Group){
 const materials=new Map<number,THREE.Material>();
 const mesh=(g:THREE.BufferGeometry,c:number,x=0,y=0,z=0)=>{if(!materials.has(c))materials.set(c,toon(c));const m=new THREE.Mesh(g,materials.get(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 const box=(w:number,h:number,d:number,c:number,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z);
 const ball=(r:number,c:number,x:number,y:number,z:number)=>mesh(new THREE.SphereGeometry(r,16,10),c,x,y,z);
 const rod=(a:THREE.Vector3,b:THREE.Vector3,r:number,c:number)=>{const m=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),7),c);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return m;};
 const slab=(points:number[][],height:number,y:number,c:number)=>{const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z)));const m=mesh(new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:12}),c,0,y);m.rotation.x=-Math.PI/2;return m;};
 const rounded=(w:number,d:number,h:number,x:number,y:number,z:number,c:number,r=.8)=>{const s=new THREE.Shape(),a=w/2,b=d/2;r=Math.min(r,a,b);s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);const m=mesh(new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:6}),c,x,y,z);m.rotation.x=-Math.PI/2;return m;};
 return {mesh,box,ball,rod,slab,rounded};
}
export const C={cream:0xffe6b0,stone:0xe8d0a1,white:0xfffbef,blue:0x1684c0,glass:0x3987aa,gold:0xefb43b,green:0x589b36};
export function palm(root:THREE.Group,x:number,z:number,h=7){const k=kit(root);k.rod(new THREE.Vector3(x,.6,z),new THREE.Vector3(x+.4,h,z),.22,0xa57c45);for(let i=0;i<7;i++){const a=i*Math.PI*2/7,m=k.mesh(new THREE.SphereGeometry(1,10,6),0x64a72e,x+Math.cos(a)*1.4,h-.1,z+Math.sin(a)*1.4);m.scale.set(2.2,.28,.65);m.rotation.y=-a;m.rotation.z=.22;}}
export function garden(root:THREE.Group,x:number,z:number,r=2){const k=kit(root);k.mesh(new THREE.CylinderGeometry(r,r,.35,20),C.stone,x,.65,z);const bush=k.ball(r*.85,C.green,x,1.15,z);bush.scale.y=.65;for(let i=0;i<7;i++){const a=i*2.4;k.ball(.22,i%2?0xffbd3d:0xee807c,x+Math.cos(a)*r*.65,1.75,z+Math.sin(a)*r*.65);}}
