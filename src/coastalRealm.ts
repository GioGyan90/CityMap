import {renderPlant,createPlanter} from './plantAssets';
import * as THREE from 'three';
import {world} from './scene';
import {westCoast,ZONES} from './layout';
import {surfaceHeight} from './terrainSurface';
import {paintGroundPath,paintGroundRect} from './groundRoadMaterial';
import {kit,palm} from './referenceArchitecture';
import {BEACH_ENTRIES} from './urbanDesign';
import {beachExtension} from './visualStyle';

export function buildCoastalRealm(){
 const root=new THREE.Group();root.name='continuous-coastal-public-realm';world.add(root);const k=kit(root);
 for(const z of BEACH_ENTRIES){
  const edge=westCoast(z),x=edge+6,y=surfaceHeight(x,z);
  // One shared ground layer for the plaza, promenade and road connection.
  paintGroundRect(x,z,8,11,'walk');paintGroundPath([[edge+8,z],[edge+14,z]],2.8,'walk');
  // Furniture stays on the seaward margin, away from through circulation.
  for(const dz of [-3.5,3.5]){
   const bx=edge+3,bz=z+dz,by=surfaceHeight(bx,bz);
   k.box(.8,.22,2.5,0xb88650,bx,by+.65,bz);
   k.box(.15,.75,2.5,0xb88650,bx-.32,by+1,bz);
   for(const zz of [-.85,.85])k.box(.45,.6,.15,0x768b8b,bx,by+.3,bz+zz);
  }
  // Open pergola frames the beach entrance without hiding the sea.
  for(const dx of [-1.7,1.7])for(const dz of [-2,2])k.box(.16,3,.16,0xf8e6bf,x+dx,y+1.5,z+dz);
  for(let i=0;i<7;i++)k.box(3.9,.14,.14,0xd7b27b,x,y+3.1,z-2.1+i*.7);
  for(const dz of [-5,5]){
   const px=edge+5,pz=z+dz,py=surfaceHeight(px,pz);const bed=renderPlant(createPlanter(53+z,.65));bed.position.set(px,py,pz);root.add(bed);
  }
  // Short stair flights bridge the sand edge; actual sand height matches environment.ts.
  const end=edge-Math.min(3,beachExtension(z)*.65),start=edge+2,n=8;
  for(let i=0;i<n;i++){
   const sx=start+(end-start)*(i+.5)/n,t=Math.max(0,Math.min(1,(sx-edge+beachExtension(z))/(beachExtension(z)+.35)));
   const sy=sx>=edge?surfaceHeight(sx,z):-.24+1.305*t;
   k.box(Math.abs(end-start)/n+.04,.18,2.4,0xe8ce9c,sx,sy+.16,z);
  }
 }
 // Rhythmic palms establish a boulevard, with gaps at plazas and the restaurant.
 for(let z=-158;z<164;z+=15){
  if(Math.abs(z-98)<24||BEACH_ENTRIES.some(v=>Math.abs(v-z)<9))continue;
  const site=ZONES.fishmarket;if(Math.abs(z-site.z)<site.d/2+4)continue;
  const x=westCoast(z)+4,tree=new THREE.Group();tree.position.set(x,surfaceHeight(x,z),z);root.add(tree);palm(tree,0,0,5.6);
 }
 world.userData.publicRealm={beachEntries:BEACH_ENTRIES.length,continuousPromenade:true};
}
