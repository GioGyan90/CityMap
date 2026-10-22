import {renderPlant,shrubSample,createPlanter} from './plantAssets';
import * as THREE from 'three';
import {makeBuilding} from './buildings';
import {world} from './scene';
import {GROUND_Y} from './config';
import {toon} from './materials';
export function buildHillVilla(){
 const root=new THREE.Group();root.name='hill-villa-garden';root.position.y=GROUND_Y;world.add(root);
 const box=(w:number,h:number,d:number,color:number,x:number,y:number,z:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 box(19,.3,23,0xd9cfb3,0,.12,0);
 box(18,.12,21,0x9fc66c,0,.32,0);
 makeBuilding({x:-1,z:-3,w:12,d:10,h:8.6,style:'villa',base:'#fff1d6',win:'#66a6c3',roof:0xb56c4c,elevation:GROUND_Y+.4,frontage:[-1,18]});
 // Terrace, balcony and porch distinguish the house from long transit platforms.
 box(9,.35,3,0xeddcba,-1,.55,3.8);
 box(8,.25,2.3,0xead8b7,-1,4.8,3);
 for(const x of [-4.8,2.8])box(.22,4.6,.22,0xfaf1d9,x,2.6,3.9);
 for(let i=0;i<9;i++)box(.08,.9,.08,0xefe9d8,-4.8+i*.95,5.35,4.05);
 box(8,.12,.12,0xefe9d8,-1,5.82,4.05);
 box(2.5,.12,6.5,0xf0e2c5,-1,.45,8.1);
 for(let i=0;i<3;i++)box(3,.16,1.5,0xd8c7a5,-1,.12+i*.15,11-i*.6);
 for(const x of [-8.5,8.5]){
  box(.4,1,20,0xe5d6b3,x,.8,-1);
  for(const z of [-8,-3,2,7]){const shrub=renderPlant(shrubSample);shrub.position.set(x,.45,z);shrub.scale.set(.6,.7,1.1);root.add(shrub);}
 }
 box(3,.6,3,0xe7d7b7,5.5,.7,7);
 const bed=renderPlant(createPlanter(41,1.15));bed.position.set(5.5,1,7);root.add(bed);
}
