import * as THREE from 'three';
import {world} from './scene';
import {ZONES} from './layout';
import {surfaceHeight} from './terrainSurface';
import {nearestRoad} from './roadNetwork';
import {toon} from './materials';
import {parkingAccessPaths} from './parking';
import {gridCell} from './mapCoordinates';
/** Actual-height ribbons join the level precinct to the public road and hall forecourt. */
export function buildCommercialAccess(){
 const site=ZONES.commercial,hall=ZONES.hall3,root=new THREE.Group();root.name='commercial-ground-connections';world.add(root);
 const road=nearestRoad(site.x,site.z+site.d/2),base=site.level??surfaceHeight(site.x,site.z);
 const paths=[{id:'commercial-shared-street-access',width:6,points:[[site.x,base+.21,site.z+site.d/2],[road.x,surfaceHeight(road.x,road.z)+.025,road.z]]},
 {id:'commercial-hall-garden-walk',width:3,points:[[hall.x,surfaceHeight(hall.x,hall.z)+.05,hall.z+12],[hall.x,surfaceHeight(hall.x,-111)+.04,-111],[55,base+.16,-111]]}];
 for(const path of paths){const positions:number[]=[];for(let i=1;i<path.points.length;i++){const a=new THREE.Vector3(...path.points[i-1] as [number,number,number]),b=new THREE.Vector3(...path.points[i] as [number,number,number]),n=new THREE.Vector3(b.z-a.z,0,a.x-b.x).normalize().multiplyScalar(path.width/2),p=[a.clone().add(n),a.clone().sub(n),b.clone().add(n),b.clone().sub(n)];const steps=Math.ceil(a.distanceTo(b));for(let step=0;step<steps;step++){const corners=[p[0].clone().lerp(p[2],step/steps),p[1].clone().lerp(p[3],step/steps),p[0].clone().lerp(p[2],(step+1)/steps),p[1].clone().lerp(p[3],(step+1)/steps)];for(const point of corners)point.y=Math.max(point.y,surfaceHeight(point.x,point.z)+.025);for(const [j,k,l]of [[0,2,1],[1,2,3]])for(const id of [j,k,l])positions.push(...corners[id].toArray());}parkingAccessPaths.push({points:[[a.x,a.z],[b.x,b.z]],width:path.width});}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();const m=new THREE.Mesh(geo,toon(path.width===6?0x647782:0xf2e9d6));m.name=path.id;m.receiveShadow=true;root.add(m);}
 root.userData.paths=paths.map(p=>({...p,anchors:p.points.map(([x,y,z])=>({x,y,z,cell:gridCell(x,z).id}))}));
}
