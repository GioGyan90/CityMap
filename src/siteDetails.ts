import {renderPlant,createPlanter,treeSamples} from './plantAssets';
import * as THREE from 'three';
import { toon } from './materials';
import { ZONES,terrainHeight } from './layout';
import { specialBuildings } from './specialBuildings';
import { world } from './scene';

export function buildSiteDetails(){
 for(const entry of specialBuildings){
  if(['police','cruise','commercial','port','promenade','villa','lighthouse','cargo','passenger','fishmarket','hall1','hall2','hall3','hall4','hall5','market'].includes(entry.id))continue;
  const zone=ZONES[entry.id],base=zone.level??terrainHeight(zone.x,zone.z);
  const add=(mesh:THREE.Mesh,x:number,y:number,z:number)=>{mesh.position.set(x,y,z);world.add(mesh);entry.group.attach(mesh);mesh.castShadow=mesh.receiveShadow=true;};
  // Perimeter gardens make facility boundaries legible without forcing square city blocks.
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const x=zone.x+side*(zone.w/2-1.8),z=zone.z-zone.d*.38+i*zone.d*.19;
   const planter=renderPlant(createPlanter(Math.abs(Math.round(x*19+z*11)),.7));add(planter,x,base,z);
   if(i%2===0){const tree=renderPlant(treeSamples().get((entry.id==='hospital'?'flowering':'slender')+'-'+(i%3))!);tree.scale.setScalar(.32);add(tree,x,base+.37,z);}

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
