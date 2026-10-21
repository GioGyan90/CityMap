import * as THREE from 'three';
import {surfaceHeight} from './terrainSurface';
import {nearestRoad} from './roadNetwork';
import {railCorridor,reserved} from './layout';
import {kit} from './referenceArchitecture';
import type {EntranceWall} from './buildingAccess';

/** Short retaining panels follow the actual rendered slope instead of a floating box. */
export function buildParcelTerrace(root:THREE.Group,w:number,d:number,wall:EntranceWall,occupied:{x:number;z:number;w:number;d:number}[]){
 const k=kit(root),base=root.position.y,cx=root.position.x,cz=root.position.z;
 for(const side of [-1,1])for(const axis of ['x','z']){
  const span=axis==='x'?d:w,n=Math.ceil(span/2);
  for(let i=0;i<n;i++){
   const along=-span/2+span*(i+.5)/n,x=axis==='x'?side*(w/2+.12):along,z=axis==='z'?side*(d/2+.12):along;
   const low=surfaceHeight(cx+x,cz+z)-base-.15,h=.12-low;
   if(h>.22){
    k.box(axis==='x'?.22:span/n+.03,h,axis==='z'?.22:span/n+.03,0xcbb990,x,low+h/2,z);
    k.box(axis==='x'?.4:span/n+.04,.16,axis==='z'?.4:span/n+.04,0xe6d2aa,x,.14,z);
   }
  }
 }
 const start={x:cx+wall.x+wall.nx*1.15,z:cz+wall.z+wall.nz*1.15},road=nearestRoad(start.x,start.z);
 if(road.distance>20||(road.x-start.x)*wall.nx+(road.z-start.z)*wall.nz<-.5)return;
 const reach=Math.hypot(road.x-start.x,road.z-start.z),length=reach-road.width/2-1;
 if(length<.5)return;
 const dx=(road.x-start.x)*length/reach,dz=(road.z-start.z)*length/reach,n=Math.max(2,Math.ceil(length/.65));
 const samples=Array.from({length:n+1},(_,i)=>({x:start.x+dx*i/n,z:start.z+dz*i/n}));
 // Do not make shortcuts through another lot, a landmark or transit corridor.
 if(samples.some(p=>railCorridor(p.x,p.z)||reserved(p.x,p.z,1.2,1.2)||occupied.some(b=>Math.abs(b.x-cx)>.01&&Math.abs(p.x-b.x)<b.w/2+.6&&Math.abs(p.z-b.z)<b.d/2+.6)))return;
 const rotation=Math.atan2(dx,dz);
 samples.slice(0,-1).forEach((p,i)=>{
  const t=(i+.5)/n,x=p.x+dx/n/2,z=p.z+dz/n/2;
  const ground=surfaceHeight(x,z),y=Math.max(ground+.08,base*(1-t)+road.y*t+.08);
  const step=k.box(1.7,Math.max(.15,y-ground+.15),length/n+.025,0xe4ceaa,x-cx,(y+ground)/2-base,z-cz);step.rotation.y=rotation;step.name='terrace-entry-path';
 });
}
