import {nearestRoad} from './roadNetwork';
import * as THREE from 'three';
import {world} from './scene';
import {terrainHeight,ZONES} from './layout';
import {surfaceHeight} from './terrainSurface';
import {kit} from './referenceArchitecture';

export {hillApproaches as HILL_ACCESS} from './roadNetwork';
import {hillApproaches} from './roadNetwork';
export function buildHillAccess(){
 const root=new THREE.Group();root.name='hill-access-and-foundations';world.add(root);const k=kit(root);
 for(const site of hillApproaches){
  const zone=ZONES[site.id],level=terrainHeight(zone.x,zone.z),width=site.width;
  // Surfacing is the shared graded terrain; continuous rails follow the same actual triangles.
  const count=Math.ceil(site.curve.getLength()/4);
  for(const side of [-1,1]){let previous:THREE.Vector3|undefined;for(let i=0;i<=count;i++){
   const p=site.curve.getPointAt(i/count),t=site.curve.getTangentAt(i/count),n=new THREE.Vector3(-t.z,0,t.x).normalize().multiplyScalar(side*(width/2+.35));p.add(n);p.y=surfaceHeight(p.x,p.z);
   k.rod(p,p.clone().add(new THREE.Vector3(0,.85,0)),.055,0xcabda1).name=site.id+'-grounded-rail-post';
   const top=p.clone().add(new THREE.Vector3(0,.8,0));if(previous)k.rod(previous,top,.045,0xf0e8d5);previous=top;
  }}
  root.userData[site.id]={width,length:site.curve.getLength(),maxGrade:site.maxGrade,points:site.points.map(p=>p.toArray())};
  // Exposed foundation columns reach down into the actual slope around the flat summit.
  const halfX=site.id==='villa'?zone.w*.455:3.8,halfZ=site.id==='villa'?11:3.8;
  for(const x of [-halfX,0,halfX])for(const z of [-halfZ,halfZ]){
   const wx=zone.x+x,wz=zone.z+z;
   const ground=surfaceHeight(wx,wz);
   const h=Math.max(.7,level-ground+1.2);
   k.box(.65,h,.65,0xb2aa94,wx,level-h/2,wz);
   k.box(1.25,.4,1.25,0xc8bea6,wx,level-h+.15,wz);
  }
  if(site.id==='villa'){
   for(const z of [-11,11])k.box(zone.w*.94,.65,.4,0xb9ac90,zone.x,level-.2,zone.z+z);
   for(const x of [-zone.w*.46,zone.w*.46])k.box(.4,.65,22,0xb9ac90,zone.x+x,level-.2,zone.z);
  }
 }
}
