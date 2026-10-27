import {renderPlant,treeSamples} from './plantAssets';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import { GROUND_Y } from './config';
import { world } from './scene';
import { toon } from './materials';
import { makeBuilding, box } from './buildings';
import { flatQuad } from './roads';
import {createCampusRoof} from './campusRoof';

export function buildUrbanDetails() {
  // Open squares break up the building density and keep a readable civic axis.
  for (const [x,z] of [[8,-24],[62,4],[88,32],[88,60],[116,116],[62,88]]) {
    flatQuad(x,z,19,19,GROUND_Y+.08,toon(0xddd5b9));
    flatQuad(x,z,13,13,GROUND_Y+.12,toon(0x7dbd7c));
    flatQuad(x,z,2,19,GROUND_Y+.19,toon(0xf1e4ca));
    flatQuad(x,z,19,2,GROUND_Y+.19,toon(0xf1e4ca));
    const fountain=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.3,.5,16),toon(0xefeadb));
    fountain.position.set(x,GROUND_Y+.4,z);world.add(fountain);
    const water=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,.08,16),toon(0x63c6e5));
    water.position.set(x,GROUND_Y+.69,z);world.add(water);
    for (const dx of [-6,6]) for (const dz of [-6,6]) {
      const tree=renderPlant(treeSamples().get('shade-0')!);tree.scale.setScalar(.72);tree.position.set(x+dx,surfaceHeight(x+dx,z+dz),z+dz);world.add(tree);
    }
  }
}

export function buildCampus() {
  // Low-rise blue-roofed academy plus a sports ground, a distinct landmark in the east.
  for (const x of [136,152]) makeBuilding({x,z:24,w:7,d:16,h:12,style:'arcade',base:'#ecdcbc',roof:0x355a7a});
  const tower=makeBuilding({x:144,z:19,w:11,d:7,h:17,style:'artdeco',base:'#f2e3c8',roof:0x355a7a,omitArtdecoCrown:true});
  const crown=createCampusRoof();crown.position.y=17;tower.add(crown);
  flatQuad(144,60,19,21,GROUND_Y+.1,toon(0xb46e64));
  flatQuad(144,60,12,15,GROUND_Y+.16,toon(0x88b568));
  const lines=new THREE.Group();
  for (const z of [53,60,67]) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(11,.04,.14),new THREE.MeshBasicMaterial({color:0xf7efd7}));
    m.position.set(144,GROUND_Y+.22,z);lines.add(m);
  }
  for (const x of [138.5,149.5]) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(.14,.04,14),new THREE.MeshBasicMaterial({color:0xf7efd7}));
    m.position.set(x,GROUND_Y+.22,60);lines.add(m);
  }
  world.add(lines);
}
