import * as THREE from 'three';
import { toon } from './materials';
import { ZONES,terrainHeight } from './layout';
import { specialBuildings } from './specialBuildings';
import { world } from './scene';

export function buildSiteDetails(){
 for(const entry of specialBuildings){
  if(['cruise','commercial','port'].includes(entry.id))continue;
  const zone=ZONES[entry.id],base=zone.level??terrainHeight(zone.x,zone.z);
  const add=(mesh:THREE.Mesh,x:number,y:number,z:number)=>{mesh.position.set(x,y,z);world.add(mesh);entry.group.attach(mesh);mesh.castShadow=mesh.receiveShadow=true;};
  // Perimeter gardens make facility boundaries legible without forcing square city blocks.
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const x=zone.x+side*(zone.w/2-1.8),z=zone.z-zone.d*.38+i*zone.d*.19;
   add(new THREE.Mesh(new THREE.BoxGeometry(1.4,.55,2),toon(0xc8bda2)),x,base+.3,z);
   const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1),toon(entry.id==='hospital'?0xe5b8ce:0x5a9a65));crown.scale.set(.8,1.3,.85);add(crown,x,base+2.3,z);
   add(new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,1.6,5),toon(0x90714c)),x,base+1,z);
  }
  if(entry.id==='park'||entry.id==='market'){
   const z=entry.id==='park'?zone.z+20:zone.z+26;
   for(const dx of [-12,12]){
    const x=zone.x+dx;
    add(new THREE.Mesh(new THREE.BoxGeometry(4.2,2.7,3.6),toon(0xf1d9b0)),x,base+1.35,z);
    add(new THREE.Mesh(new THREE.ConeGeometry(3.2,1.4,4),toon(dx<0?0xd8695d:0x3f8baf)),x,base+3.35,z);
   }
  }
  if(entry.id==='civic')for(const dx of [-15,15])for(const dz of [-13,13]){
   add(new THREE.Mesh(new THREE.BoxGeometry(3.5,.4,1),toon(0xa7895a)),zone.x+dx,base+.7,zone.z+dz);
  }
 }
}
