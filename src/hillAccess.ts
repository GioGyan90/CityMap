import {nearestRoad} from './roadNetwork';
import * as THREE from 'three';
import {world} from './scene';
import {terrainHeight,ZONES} from './layout';
import {surfaceHeight} from './terrainSurface';
import {kit} from './referenceArchitecture';

export {hillApproaches as HILL_ACCESS} from './roadNetwork';
import {hillApproaches} from './roadNetwork';
export function hillRailClear(x:number,z:number,id:string){
 const main=nearestRoad(x,z);if(main.distance<main.width/2+.4)return false;
 for(const other of hillApproaches.filter(r=>r.id!==id))for(let i=1;i<other.points.length;i++){const a=other.points[i-1],b=other.points[i],dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);if(Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<other.width/2+.45)return false;}return true;
}
export function buildHillAccess(){
 const root=new THREE.Group();root.name='hill-access-and-foundations';world.add(root);const k=kit(root);
 for(const site of hillApproaches){
  const zone=ZONES[site.id],level=terrainHeight(zone.x,zone.z),width=site.width;
  // Surfacing is the shared graded terrain; continuous rails follow the same actual triangles.
  const count=Math.ceil(site.curve.getLength()/4);
  for(const side of [-1,1]){let previous:THREE.Vector3|undefined;for(let i=0;i<=count;i++){
   const p=site.curve.getPointAt(i/count),t=site.curve.getTangentAt(i/count),n=new THREE.Vector3(-t.z,0,t.x).normalize().multiplyScalar(side*(width/2+.35));p.add(n);p.y=surfaceHeight(p.x,p.z);
   if(!hillRailClear(p.x,p.z,site.id)){previous=undefined;continue;}
   k.rod(p,p.clone().add(new THREE.Vector3(0,.85,0)),.055,0xcabda1).name=site.id+'-grounded-rail-post';
   const top=p.clone().add(new THREE.Vector3(0,.8,0));if(previous&&hillRailClear((previous.x+top.x)/2,(previous.z+top.z)/2,site.id))k.rod(previous,top,.045,0xf0e8d5).name=site.id+'-open-guardrail';previous=top;
  }}
  root.userData[site.id]={width,length:site.curve.getLength(),maxGrade:site.maxGrade,points:site.points.map(p=>p.toArray())};
  // Exposed foundation columns reach down into the actual slope around the flat summit.
  const halfX=site.id==='villa'?zone.w*.455:3.8,halfZ=site.id==='villa'?11:3.8;
  for(const x of [-halfX,0,halfX])for(const z of [-halfZ,halfZ]){
   if(Math.abs(x)<2.2&&z>0)continue; // Keep the actual entry opening clear of foundation piers.
   const wx=zone.x+x,wz=zone.z+z;
   const ground=surfaceHeight(wx,wz);
   const h=Math.max(.7,level-ground+1.2);
   k.box(.65,h,.65,0xb2aa94,wx,level-h/2,wz);
   k.box(1.25,.4,1.25,0xc8bea6,wx,level-h+.15,wz);
  }
  if(site.id==='villa'){
   k.box(zone.w*.94,.65,.4,0xb9ac90,zone.x,level-.2,zone.z-11);
   const gate=4.6,wing=(zone.w*.94-gate)/2;for(const side of [-1,1])k.box(wing,.65,.4,0xb9ac90,zone.x+side*(gate/2+wing/2),level-.2,zone.z+11);
   for(const x of [-zone.w*.46,zone.w*.46])k.box(.4,.65,22,0xb9ac90,zone.x+x,level-.2,zone.z);
  }
 }
}
