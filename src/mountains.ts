import * as THREE from 'three';
import { world } from './scene';
import { toon } from './materials';
import { terrainHeight,eastCoast } from './layout';
export function buildMountains(){
 // The actual mountain ridges are part of the shared heightfield, not a row of cones.
 for(let z=-155;z<120;z+=19){const x=eastCoast(z)-4;const m=new THREE.Mesh(new THREE.DodecahedronGeometry(2.6,0),toon(0x999d88));m.position.set(x,terrainHeight(x,z)+.5,z);m.scale.set(1.6,1.4,1);m.receiveShadow=true;world.add(m);}
}
