import * as THREE from 'three';
import {renderPlant,treeSamples,shrubSample} from './plantAssets';
import {surfaceHeight} from './terrainSurface';

// Reserve the old/new grove together so procedural trees cannot occupy the relocated hall.
export function inPunkGarden(x:number,z:number,radius=0){return x>79-radius&&x<125+radius&&z>153-radius&&z<182+radius;}
export function addPunkHallGarden(hall:THREE.Group){
 hall.updateWorldMatrix(true,false);const garden=new THREE.Group();garden.name='punk-hall-coastal-garden';hall.add(garden);
 for(const [i,[x,z]]of [[-7,15],[7,15],[12,0],[10,8]].entries()){
  const tree=renderPlant(treeSamples().get(i%2?'slender-0':'shade-0')!);tree.name='punk-garden-tree';tree.scale.setScalar(.68);
  const p=hall.localToWorld(new THREE.Vector3(x,0,z));p.y=surfaceHeight(p.x,p.z)-.035;tree.position.copy(hall.worldToLocal(p));garden.add(tree);
 }
 for(const [x,z]of [[-4,16],[4,16],[12,4],[11,10]]){const shrub=renderPlant(shrubSample);shrub.name='punk-garden-shrub';shrub.scale.setScalar(.8);const p=hall.localToWorld(new THREE.Vector3(x,0,z));p.y=surfaceHeight(p.x,p.z)-.035;shrub.position.copy(hall.worldToLocal(p));garden.add(shrub);}
 return garden;
}
