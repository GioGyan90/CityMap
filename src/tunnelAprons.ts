import * as THREE from 'three';
import {surfaceHeight} from './terrainSurface';
import {tunnelPortals} from './tunnelPlan';
type Portal=typeof tunnelPortals[number];
interface ApronProfile {positions:Float32Array;indices:number[]}
const profiles=new Map<string,ApronProfile>();
/** One triangulated profile drives both the rendered apron and vehicle contact. */
export function apronProfile(portal:Portal,width:number,offset:number):ApronProfile {
 const key=`${portal.t}:${width}:${offset}`,cached=profiles.get(key);if(cached)return cached;
 const vertices:number[]=[],indices:number[]=[],right=new THREE.Vector3(portal.into.z,0,-portal.into.x),columns=width>10?4:2;
 const road=columns===4?apronProfile(portal,portal.t===0?5:9,.025):undefined;
 for(let row=0;row<=12;row++){
  const z=-6+row*.5,t=(z+6)/6,w=THREE.MathUtils.lerp(width,width<9?9:width,t);
  if(road){
   // Shoulder edges follow terrain, but the middle of the foundation follows the road.
   // Interpolating only the two outer terrain edges can bury asphalt under a high slab.
   for(const [column,side]of [[0,-1],[1,-1],[2,1],[3,1]]){
    if(column===1||column===2){const i=row*6+(side<0?0:3);vertices.push(road.positions[i],road.positions[i+1]-.04,z);}
    else {const x=side*w/2,p=portal.p.clone().addScaledVector(right,x).addScaledVector(portal.into,z);vertices.push(x,THREE.MathUtils.lerp(surfaceHeight(p.x,p.z),portal.p.y,t)-portal.p.y+offset,z);}
   }
  }else for(const side of [-1,1]){const x=side*w/2,p=portal.p.clone().addScaledVector(right,x).addScaledVector(portal.into,z);
   vertices.push(x,THREE.MathUtils.lerp(surfaceHeight(p.x,p.z),portal.p.y,t)-portal.p.y+offset,z);
  }
 }
 for(let row=0;row<12;row++)for(let col=0;col<columns-1;col++){const a=row*columns+col;indices.push(a,a+columns,a+1,a+1,a+columns,a+columns+1);}
 const profile={positions:new Float32Array(vertices),indices};profiles.set(key,profile);return profile;
}
export function apronGeometry(portal:Portal,width:number,offset:number){
 const profile=apronProfile(portal,width,offset),geometry=new THREE.BufferGeometry();
 // Each assembly owns its buffer: slab closure must not mutate the cached contact profile.
 geometry.setAttribute('position',new THREE.BufferAttribute(profile.positions.slice(),3));geometry.setIndex(profile.indices);geometry.computeVertexNormals();return geometry;
}
export function apronRoadHeight(portal:Portal,x:number,z:number):number|undefined {
 const dx=x-portal.p.x,dz=z-portal.p.z,localX=dx*portal.into.z-dz*portal.into.x,localZ=dx*portal.into.x+dz*portal.into.z;
 if(localZ< -6-.00001||localZ>.00001)return undefined;
 const p=apronProfile(portal,portal.t===0?5:9,.025).positions,row=Math.min(11,Math.max(0,Math.floor((localZ+6)*2))),a=row*2;
 for(const [i,j,k] of [[a,a+2,a+1],[a+1,a+2,a+3]]){
  const ax=p[i*3],az=p[i*3+2],bx=p[j*3],bz=p[j*3+2],cx=p[k*3],cz=p[k*3+2],den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
  const u=((bz-cz)*(localX-cx)+(cx-bx)*(localZ-cz))/den,v=((cz-az)*(localX-cx)+(ax-cx)*(localZ-cz))/den;
  if(u>=-.00001&&v>=-.00001&&u+v<=1.00001)return portal.p.y+u*p[i*3+1]+v*p[j*3+1]+(1-u-v)*p[k*3+1];
 }
 return undefined;
}
