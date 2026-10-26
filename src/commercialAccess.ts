import * as THREE from 'three';
import {world} from './scene';
import {surfaceHeight} from './terrainSurface';
import {nearestRoad} from './roadNetwork';
import {toon} from './materials';
import {parkingAccessPaths} from './parking';
import {gridCell} from './mapCoordinates';
import {COMMERCIAL_PLAN,commercialPoint} from './commercialPlan';
/** Only stair-foot sidewalk links. The carriageway is the real hospital-ring road. */
export function buildCommercialAccess(){
 const root=new THREE.Group();root.name='commercial-ground-connections';world.add(root);const paths=[];
 for(const side of [-1,1]){
  const foot=commercialPoint(side*27,side*13.6),road=nearestRoad(foot.x,foot.z),dx=foot.x-road.x,dz=foot.z-road.z,l=Math.hypot(dx,dz),edge={x:road.x+dx/l*(road.width/2+1),z:road.z+dz/l*(road.width/2+1)};
  const points=[[foot.x,COMMERCIAL_PLAN.y+.025,foot.z],[edge.x,surfaceHeight(edge.x,edge.z)+.025,edge.z]],positions:number[]=[];
  const a=new THREE.Vector3(...points[0] as [number,number,number]),b=new THREE.Vector3(...points[1] as [number,number,number]),n=new THREE.Vector3(b.z-a.z,0,a.x-b.x).normalize().multiplyScalar(1.5),count=Math.ceil(a.distanceTo(b));
  for(let i=0;i<count;i++){const at=(t:number,s:number)=>{const p=a.clone().lerp(b,t).addScaledVector(n,s);p.y=Math.max(p.y,surfaceHeight(p.x,p.z)+.025);return p;},p=[at(i/count,1),at(i/count,-1),at((i+1)/count,1),at((i+1)/count,-1)];for(const [j,k,l]of [[0,2,1],[1,2,3]])for(const id of [j,k,l])positions.push(...p[id].toArray());}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();const m=new THREE.Mesh(geo,toon(0xf2e9d6));m.name='commercial-stair-sidewalk-link';m.receiveShadow=true;root.add(m);
  parkingAccessPaths.push({points:[[foot.x,foot.z],[edge.x,edge.z]],width:3});paths.push({id:side<0?'west-stair':'east-stair',width:3,points,anchors:points.map(([x,y,z])=>({x,y,z,cell:gridCell(x,z).id}))});
 }
 root.userData.paths=paths;
}
