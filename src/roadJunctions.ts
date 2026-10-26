import * as THREE from 'three';
import {toon} from './materials';
export type JunctionArm={x:number;z:number;width:number};
export type JunctionPoint=[number,number];
/** Bounded corner fillets: no roundabout disc or widening of the through carriageway. */
export function junctionOutline(input:JunctionArm[],sidewalk=0,fillet=.65,length=10):JunctionPoint[]{
 const arms=input.map(a=>{const l=Math.hypot(a.x,a.z);return {x:a.x/l,z:a.z/l,h:a.width/2+sidewalk};}).sort((a,b)=>Math.atan2(a.z,a.x)-Math.atan2(b.z,b.x)),out:JunctionPoint[]=[];
 for(let i=0;i<arms.length;i++){
  const a=arms[i],b=arms[(i+1)%arms.length],n=[-a.z,a.x],m=[-b.z,b.x],start:JunctionPoint=[a.x*length-n[0]*a.h,a.z*length-n[1]*a.h],end:JunctionPoint=[a.x*length+n[0]*a.h,a.z*length+n[1]*a.h];out.push(start,end);
  const determinant=a.x*b.z-a.z*b.x,angle=((Math.atan2(b.z,b.x)-Math.atan2(a.z,a.x))+Math.PI*2)%(Math.PI*2);
  if(Math.abs(angle-Math.PI)>.1&&Math.abs(determinant)>.12){
   const px=n[0]*a.h,pz=n[1]*a.h,qx=-m[0]*b.h,qz=-m[1]*b.h,t=((qx-px)*b.z-(qz-pz)*b.x)/determinant,c:JunctionPoint=[px+a.x*t,pz+a.z*t];
   if(Math.hypot(...c)<length-1){const r=Math.min(fillet,1),u:JunctionPoint=[c[0]+a.x*r,c[1]+a.z*r],v:JunctionPoint=[c[0]+b.x*r,c[1]+b.z*r];out.push(u);for(let j=1;j<=6;j++){const s=j/6;out.push([(1-s)**2*u[0]+2*s*(1-s)*c[0]+s*s*v[0],(1-s)**2*u[1]+2*s*(1-s)*c[1]+s*s*v[1]]);}}
  }
 }
 return out;
}
export function junctionArms(node:{x:number;z:number;roads:string[]},roads:{id:string;width:number;points:[number,number][];curve:THREE.Curve<THREE.Vector3>}[]){
 const arms:JunctionArm[]=[];
 for(const r of roads.filter(r=>node.roads.includes(r.id))){const i=r.points.findIndex(p=>Math.hypot(p[0]-node.x,p[1]-node.z)<.1),t=i/(r.points.length-1);for(const sign of [-1,1]){if(sign<0&&i===0||sign>0&&i===r.points.length-1)continue;const p=r.curve.getPoint(THREE.MathUtils.clamp(t+sign*.01,0,1)),v=new THREE.Vector2(p.x-node.x,p.z-node.z).normalize();const existing=arms.find(a=>a.x*v.x+a.z*v.y>.985);if(existing)existing.width=Math.max(existing.width,r.width);else arms.push({x:v.x,z:v.y,width:r.width});}}
 return arms;
}
function slab(points:JunctionPoint[],y:number,color:number){const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))),g=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,y,0);return new THREE.Mesh(g,toon(color));}
export function createJunctionSample(kind:'tee'|'cross'|'gateway'|'hill-fork'){
 const root=new THREE.Group();root.name='junction-sample-'+kind;
 const arms:JunctionArm[]=kind==='tee'?[{x:-1,z:0,width:8},{x:1,z:0,width:8},{x:0,z:1,width:6}]:kind==='cross'?[{x:-1,z:0,width:8},{x:1,z:0,width:8},{x:0,z:1,width:6},{x:0,z:-1,width:6}]:kind==='hill-fork'?[{x:0,z:-1,width:3.6},{x:.75,z:.66,width:3.6},{x:-.45,z:.89,width:2.4}]:[{x:-1,z:0,width:7},{x:1,z:0,width:7},{x:0,z:1,width:2.4}];
 const walk=slab(junctionOutline(arms,kind==='hill-fork'?.35:1.8),0,0xf3e7cc);walk.name='continuous-sidewalk-and-corner';root.add(walk);
 const roadArms=kind==='gateway'||kind==='hill-fork'?arms.slice(0,2):arms;const asphalt=slab(junctionOutline(roadArms,0),.02,0x526d87);asphalt.name='bounded-carriageway-fillets';root.add(asphalt);
 root.userData.arms=arms;return root;
}

/** Only the tiny corner infill is added to existing curved strokes; no straight arm overlays. */
export function junctionFilletPatches(input:JunctionArm[],sidewalk=0,fillet=.65):JunctionPoint[][]{
 const arms=input.map(a=>{const l=Math.hypot(a.x,a.z);return {x:a.x/l,z:a.z/l,h:a.width/2+sidewalk};}).sort((a,b)=>Math.atan2(a.z,a.x)-Math.atan2(b.z,b.x)),patches:JunctionPoint[][]=[];
 for(let i=0;i<arms.length;i++){const a=arms[i],b=arms[(i+1)%arms.length],det=a.x*b.z-a.z*b.x,angle=(Math.atan2(b.z,b.x)-Math.atan2(a.z,a.x)+Math.PI*2)%(Math.PI*2);if(angle>=Math.PI-.1||Math.abs(det)<.12)continue;
  const p=[-a.z*a.h,a.x*a.h],q=[b.z*b.h,-b.x*b.h],t=((q[0]-p[0])*b.z-(q[1]-p[1])*b.x)/det,c:JunctionPoint=[p[0]+a.x*t,p[1]+a.z*t];if(Math.hypot(...c)>10)continue;
  const u:JunctionPoint=[c[0]+a.x*fillet,c[1]+a.z*fillet],v:JunctionPoint=[c[0]+b.x*fillet,c[1]+b.z*fillet],patch:JunctionPoint[]=[c,u];for(let j=1;j<=10;j++){const s=j/10;patch.push([(1-s)**2*u[0]+2*s*(1-s)*c[0]+s*s*v[0],(1-s)**2*u[1]+2*s*(1-s)*c[1]+s*s*v[1]]);}patches.push(patch);
 }return patches;
}
