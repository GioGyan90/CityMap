import * as THREE from 'three';
import {world} from './scene';
import {terrainHeight,ZONES} from './layout';
import {surfaceHeight} from './terrainSurface';
import {kit} from './referenceArchitecture';

// Local drives meet the east hill road and finish at the front garden / tower door.
export const HILL_ACCESS = [
 {id:'villa',points:[[237.5,22.5],[244,24],[244,37],[255,37],[255,34]]},
 {id:'lighthouse',points:[[232,48.8],[240,50],[244,58],[254,58],[254,52.5]]}
] as const;
export function buildHillAccess(){
 const root=new THREE.Group();root.name='hill-access-and-foundations';world.add(root);const k=kit(root);
 for(const site of HILL_ACCESS){
  const zone=ZONES[site.id],level=terrainHeight(zone.x,zone.z);
  const width=site.id==='villa'?3:2.2;
  const points:THREE.Vector3[]=[];
  for(let j=1;j<site.points.length;j++){
   const a=site.points[j-1],b=site.points[j],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
   for(let i= j===1?0:1;i<=n;i++){
    const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
    // Lift the narrow deck clear of the uphill edge, not only its centreline.
    const ground=Math.max(surfaceHeight(x,z),surfaceHeight(x-width/2,z),surfaceHeight(x+width/2,z),surfaceHeight(x,z-width/2),surfaceHeight(x,z+width/2));
    points.push(new THREE.Vector3(x,ground+.25,z));
   }
  }
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],length=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(.5);
   const deck=k.box(width,.22,length+.04,0xcabda1,mid.x,mid.y,mid.z);deck.name=site.id+'-access-deck';deck.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.clone().sub(a).normalize());
   if(i%3===0){const h=mid.y-surfaceHeight(mid.x,mid.z);if(h>.4)k.box(.38,h+.3,.38,0x9d9c8b,mid.x,mid.y-h/2-.11,mid.z);}
  }
  // Exposed foundation columns reach down into the actual slope around the flat summit.
  const halfX=site.id==='villa'?9.1:3.8,halfZ=site.id==='villa'?11:3.8;
  for(const x of [-halfX,0,halfX])for(const z of [-halfZ,halfZ]){
   const wx=zone.x+x,wz=zone.z+z;
   const ground=surfaceHeight(wx,wz);
   const h=Math.max(.7,level-ground+1.2);
   k.box(.65,h,.65,0xb2aa94,wx,level-h/2,wz);
   k.box(1.25,.4,1.25,0xc8bea6,wx,level-h+.15,wz);
  }
  if(site.id==='villa'){
   for(const z of [-11,11])k.box(18.8,.65,.4,0xb9ac90,zone.x,level-.2,zone.z+z);
   for(const x of [-9.2,9.2])k.box(.4,.65,22,0xb9ac90,zone.x+x,level-.2,zone.z);
  }
 }
}
