import {roadProfiles} from './roadNetwork';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import { toon } from './materials';
import { world } from './scene';
import { terrainHeight,westCoast,ROAD_PATHS } from './layout';
export const ROAD_X=[-34,-6,22,50,74,102,130,158,186];
export const ROAD_Z=[-150,-122,-94,-66,-38,-10,18,46,74,102,130,158];
export const RW=7,ROAD_Y=1.08;
export const roadMat=toon(0x758c9d),walkMat=toon(0xf0dbac),dashMat=toon(0xf6eed6);
export const roadCurves=roadProfiles.map(p=>p.curve);
export function flatQuad(cx,cz,w,d,y,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,.06,d),mat);m.position.set(cx,y,cz);m.receiveShadow=true;world.add(m);return m;}
export function roadCurve(points:[number,number][]){return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,terrainHeight(x,z)+.2,z)),false,'catmullrom',.16);}
export function roadRibbon(curve:THREE.Curve<THREE.Vector3>,width:number,offset:number,material:THREE.Material,elevated=false){
 const vertices:number[]=[],indices:number[]=[];const n=Math.max(24,Math.ceil(curve.getLength()/2));
 for(let i=0;i<=n;i++){const p=curve.getPointAt(i/n),t=curve.getTangentAt(i/n);const length=Math.hypot(t.x,t.z);const nx=-t.z/length*width/2,nz=t.x/length*width/2;
  for(const side of [-1,1]){const x=p.x+nx*side,z=p.z+nz*side;vertices.push(x,(elevated?p.y:surfaceHeight(x,z))+offset,z);}}
 for(let i=0;i<n;i++){const a=i*2,b=a+2;indices.push(a,a+1,b,a+1,b+1,b);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;world.add(mesh);return mesh;
}
export function buildRoads(){
 // Ground roads, sidewalks and markings are painted once on the terrain material.
 world.userData.roadNetwork={roads:roadProfiles.length,sharedSurface:true};
}
buildRoads();
