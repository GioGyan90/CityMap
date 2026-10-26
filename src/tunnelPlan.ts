import * as THREE from 'three';
/** Pure alignment data: no scene/terrain imports. West to east, +Z south. */
export const TUNNEL={width:9,innerRadius:5.2,spring:2.1,thickness:.65,cover:2.1};
export const tunnelCurve=new THREE.CubicBezierCurve3(
 new THREE.Vector3(-62.4074074074,2.2747466444,-160),new THREE.Vector3(-64,4,-184),
 new THREE.Vector3(-37,5.5,-190),new THREE.Vector3(-32,7,-165)
);
tunnelCurve.arcLengthDivisions=1500;tunnelCurve.updateArcLengths();
export const tunnelLength=tunnelCurve.getLength();
export function tunnelFrame(t:number){const p=tunnelCurve.getPointAt(t),forward=tunnelCurve.getTangentAt(t);forward.y=0;forward.normalize();return {p,forward,right:new THREE.Vector3(-forward.z,0,forward.x)};}
const samples=tunnelCurve.getSpacedPoints(Math.ceil(tunnelLength/.35));
const tunnelBounds={minX:Math.min(...samples.map(p=>p.x)),maxX:Math.max(...samples.map(p=>p.x)),minZ:Math.min(...samples.map(p=>p.z)),maxZ:Math.max(...samples.map(p=>p.z))};
const outsideTunnel=(x:number,z:number,reach:number)=>x<tunnelBounds.minX-reach||x>tunnelBounds.maxX+reach||z<tunnelBounds.minZ-reach||z>tunnelBounds.maxZ+reach;
export function tunnelLocation(x:number,z:number){
 let best={distance:Infinity,t:0,y:0,side:0};
 for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,u=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/l2,0,1),px=a.x+u*dx,pz=a.z+u*dz,distance=Math.hypot(x-px,z-pz);
 if(distance<best.distance)best={distance,t:(i-1+u)/(samples.length-1),y:a.y+(b.y-a.y)*u,side:((x-px)*-dz+(z-pz)*dx)/Math.sqrt(l2)};
 }return best;
}
export function inTunnelReservation(x:number,z:number,margin=0){if(outsideTunnel(x,z,9+margin))return false;const n=tunnelLocation(x,z);return n.distance<9+margin;}
/** Cut-and-cover at the thin coastal toe; retain the original ridge elsewhere. */
export function coveredTerrainHeight(x:number,z:number,base:number){
 if(outsideTunnel(x,z,13))return base;
 const n=tunnelLocation(x,z),s=n.t*tunnelLength;
 if(n.distance>13||s<.6||s>tunnelLength-.6)return base;
 const edge=THREE.MathUtils.smoothstep(n.distance,6.1,13),end=1;
 const roof=n.y+TUNNEL.spring+TUNNEL.innerRadius+TUNNEL.thickness+TUNNEL.cover;
 return Math.max(base,THREE.MathUtils.lerp(base,roof,(1-edge)*end));
}
export const tunnelPortals=[0,1].map(t=>{const f=tunnelFrame(t),into=f.forward.clone().multiplyScalar(t===0?1:-1);return {...f,into,t};});
/** Polygon to remove from the heightfield where it would otherwise seal the mouth. */
export const portalCuts=tunnelPortals.map(({p,into,right})=>[-6,3.6].flatMap((s,i)=>(i?[1,-1]:[-1,1]).map(side=>[p.x+into.x*s+right.x*7.1*side,p.z+into.z*s+right.z*7.1*side] as [number,number])));
