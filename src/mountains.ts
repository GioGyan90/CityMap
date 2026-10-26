import {plantingBoxClear} from './plantPlacement';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import { world } from './scene';
import { toon } from './materials';
import { terrainHeight,eastCoast } from './layout';
export function buildMountains(){
 // The actual mountain ridges are part of the shared heightfield, not a row of cones.
 for(let z=-155;z<120;z+=19){const x=eastCoast(z)-4;const m=new THREE.Mesh(new THREE.DodecahedronGeometry(2.6,0),toon(0xc2b78c));m.position.set(x,surfaceHeight(x,z)+.5,z);m.scale.set(1.6,1.4,1);m.name='coastal-ridge-rock';m.receiveShadow=true;m.updateMatrixWorld(true);if(plantingBoxClear(new THREE.Box3().setFromObject(m,true),.5))world.add(m);}
}
