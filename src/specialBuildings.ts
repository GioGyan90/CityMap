import * as THREE from 'three';
import { world } from './scene';
import { GROUND_Y } from './config';
import { finalizeOutlines } from './buildings';

export interface SpecialBuilding {
  id: string; name: string; description: string;
  group: THREE.Group; pick: THREE.Mesh; radius: number;
}
export const specialBuildings: SpecialBuilding[] = [];
export const pickTargets: THREE.Mesh[] = [];
export const backgroundBuildings = new THREE.Group();
backgroundBuildings.name = 'ordinary-buildings';
backgroundBuildings.position.y = GROUND_Y;
world.add(backgroundBuildings);
const pickMaterial = new THREE.MeshBasicMaterial({ visible: false });

export function registerSpecial(id: string, name: string, description: string,
  center: [number,number], size: [number,number,number], build: () => void) {
  const before = new Set(world.children);
  build();
  finalizeOutlines();
  const group = new THREE.Group();
  group.name = `special-${id}`;
  group.position.set(center[0],GROUND_Y,center[1]);
  world.add(group);
  for (const object of [...world.children]) {
    if (object !== group && !before.has(object) && !object.userData.ambient) group.attach(object);
  }
  return registerGroup(id,name,description,group,center,size);
}

export function registerGroup(id: string, name: string, description: string, group: THREE.Group,
  center: [number,number], size: [number,number,number]) {
  const pick = new THREE.Mesh(new THREE.BoxGeometry(...size),pickMaterial);
  pick.name = `pick-${id}`;
  pick.position.set(center[0],GROUND_Y+size[1]/2,center[1]);
  pick.userData.specialId=id;
  world.add(pick);
  pickTargets.push(pick);
  const entry={id,name,description,group,pick,radius:Math.max(size[0],size[2])*.56};
  specialBuildings.push(entry);
  world.userData.specialBuildings=specialBuildings.map(s=>({id:s.id,name:s.name}));
  return entry;
}

export function collectBackgroundBuildings() {
  for (const object of [...world.children]) {
    if (object.name==='city-building-batch' || object.name==='city-building-outlines') backgroundBuildings.attach(object);
  }
}
