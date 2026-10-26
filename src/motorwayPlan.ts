import * as THREE from 'three';
import {gradedTerrainHeight} from './roadNetwork';
/** Bridge geometry and the ground clearance cut share this one immutable profile. */
export const motorwayProfile=new THREE.CatmullRomCurve3([[192,-125],[225,-82],[235,-14],[226,57],[206,114]].map(([x,z])=>new THREE.Vector3(x,gradedTerrainHeight(x,z)+7,z)),false,'catmullrom',.12);
motorwayProfile.arcLengthDivisions=1200;motorwayProfile.updateArcLengths();
type Segment={a:THREE.Vector3;b:THREE.Vector3;l2:number};const cells=new Map<string,Segment[]>(),size=12,points=motorwayProfile.getSpacedPoints(Math.ceil(motorwayProfile.getLength()));
for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],s={a,b,l2:(b.x-a.x)**2+(b.z-a.z)**2};for(let x=Math.floor((Math.min(a.x,b.x)-9)/size);x<=Math.floor((Math.max(a.x,b.x)+9)/size);x++)for(let z=Math.floor((Math.min(a.z,b.z)-9)/size);z<=Math.floor((Math.max(a.z,b.z)+9)/size);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key)!.push(s);}}
export function motorwayGroundHeight(x:number,z:number,height:number){
 let distance=Infinity,ceiling=height;
 for(const s of cells.get(Math.floor(x/size)+','+Math.floor(z/size))??[]){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=THREE.MathUtils.clamp(((x-s.a.x)*dx+(z-s.a.z)*dz)/s.l2,0,1),d=Math.hypot(x-s.a.x-dx*t,z-s.a.z-dz*t);if(d<distance){distance=d;ceiling=s.a.y+(s.b.y-s.a.y)*t-.65;}}
 if(distance>8.5||height<=ceiling)return height;
 return THREE.MathUtils.lerp(ceiling,height,THREE.MathUtils.smoothstep(distance,5.5,8.5));
}
