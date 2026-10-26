import * as THREE from 'three';
import {ZONES} from './layout';
import {nearestRoad} from './roadNetwork';
import {surfaceHeight} from './terrainSurface';
import {paintGroundPath} from './groundRoadMaterial';
import {parkingAccessPaths} from './parking';
import {world} from './scene';
import {toon} from './materials';
export function buildPoliceAccess(){const s=ZONES.police,root=new THREE.Group();root.name='police-station-driveway';world.add(root);const start=new THREE.Vector3(s.x+7.75,(s.level??surfaceHeight(s.x,s.z))+.3,s.z+10.5),road=nearestRoad(start.x,start.z),outward=new THREE.Vector3(start.x-road.x,0,start.z-road.z).normalize(),end=new THREE.Vector3(road.x,0,road.z).addScaledVector(outward,road.width/2+.05);end.y=surfaceHeight(end.x,end.z)+.025;const n=new THREE.Vector3(end.z-start.z,0,start.x-end.x).normalize().multiplyScalar(2.75),count=Math.ceil(start.distanceTo(end)),v:number[]=[];
 for(let i=0;i<count;i++){const at=(t:number,side:number)=>{const p=start.clone().lerp(end,t).addScaledVector(n,side);if(t===1)p.y=surfaceHeight(p.x,p.z)+.025;else if(t>0)p.y=Math.max(p.y,surfaceHeight(p.x,p.z)+.025);return p;},p=[at(i/count,1),at(i/count,-1),at((i+1)/count,1),at((i+1)/count,-1)];for(const [a,b,c]of [[0,1,2],[1,3,2]])for(const id of [a,b,c])v.push(...p[id].toArray());}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();const m=new THREE.Mesh(geo,toon(0x6f8186));m.receiveShadow=true;root.add(m);const points:[number,number][]=[[start.x,start.z],[end.x,end.z]];paintGroundPath(points,5.5,'asphalt');parkingAccessPaths.push({points,width:5.5});root.userData={points,width:5.5,start:start.toArray(),end:end.toArray(),publicRoad:road.road,roadWidth:road.width};
}
