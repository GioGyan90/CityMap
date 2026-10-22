import {createVehicle} from './vehicles';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {world} from './scene';
import {toon} from './materials';
import {surfaceHeight} from './terrainSurface';
import {nearestRoad} from './roadNetwork';
import {paintGroundRect,paintGroundPath} from './groundRoadMaterial';
import {isLand,reserved,railCorridor,ZONES} from './layout';
import {buildingFootprints} from './config';
interface Rect {x:number;z:number;w:number;d:number}
interface Office extends Rect {entrance:{x:number;z:number}}
export const parkingAccessPaths:{points:[number,number][];width:number}[]=[];
export function parkingAccessBlocked(x:number,z:number){return parkingAccessPaths.some(path=>{const [a,b]=path.points,vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz)));return Math.hypot(x-a[0]-vx*t,z-a[1]-vz*t)<path.width/2+1.4;});}
export function buildParkingLots(offices:Office[],occupied:Rect[]){
 const lots:{x:number;z:number;w:number;d:number;spaces:number;parked:number;serves:[number,number];driveway:[number,number][]}[]=[];
 const group=new THREE.Group();group.name='parking-details';world.add(group);
 const buckets=new Map<number,THREE.BufferGeometry[]>();
 const box=(w:number,h:number,d:number,color:number,x:number,y:number,z:number,rotation?:THREE.Quaternion)=>{
  const geometry=new THREE.BoxGeometry(w,h,d);if(rotation)geometry.applyQuaternion(rotation);geometry.translate(x,y,z);if(!buckets.has(color))buckets.set(color,[]);buckets.get(color)!.push(geometry);
 };
 const clear=(x:number,z:number,w:number,d:number)=>!occupied.some(p=>Math.abs(x-p.x)<(w+p.w)/2+1&&Math.abs(z-p.z)<(d+p.d)/2+1);
 const drivewayClear=(points:[number,number][])=>{const [a,b]=points;for(let i=0;i<=20;i++){const t=i/20,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;if(occupied.some(p=>Math.abs(x-p.x)<p.w/2+1.8&&Math.abs(z-p.z)<p.d/2+1.8))return false;}return true;};
 const rejected={occupied:0,reserved:0,edges:0,slope:0,distance:0,driveway:0};
 const sites=[...offices,...['commercial','hospital'].map(id=>{const z=ZONES[id];return {...z,entrance:{x:z.x,z:z.z+z.d/2}};})];
 for(const office of sites){
  if(lots.length>=8)break;
  const candidates=[-9,-4.5,0,4.5,9].flatMap(offset=>[{x:office.x+office.w/2+7.4,z:office.z+offset},{x:office.x-office.w/2-7.4,z:office.z+offset},{x:office.x+offset,z:office.z+office.d/2+7.6},{x:office.x+offset,z:office.z-office.d/2-7.6}]);
  for(const candidate of candidates){
   const w=10.6,d=10.8,{x,z}=candidate;if(!clear(x,z,w,d)){rejected.occupied++;continue;}if(reserved(x,z,w,d)){rejected.reserved++;continue;}
   const corners=[[-w/2,-d/2],[-w/2,d/2],[w/2,-d/2],[w/2,d/2]].map(([dx,dz])=>({x:x+dx,z:z+dz}));
   if(corners.some(p=>!isLand(p.x,p.z)||railCorridor(p.x,p.z)||nearestRoad(p.x,p.z).distance<nearestRoad(p.x,p.z).width/2+1.6)){rejected.edges++;continue;}
   const heights=corners.map(p=>surfaceHeight(p.x,p.z));if(Math.max(...heights)-Math.min(...heights)>.65){rejected.slope++;continue;}
   const road=nearestRoad(x,z);if(road.distance>24){rejected.distance++;continue;}
   const aisle=road.z>=z?1:-1;
   const entry: [number,number]=Math.abs(road.x-x)>Math.abs(road.z-z)?[x+Math.sign(road.x-x)*w/2,z+aisle*2.4]:[x,z+aisle*d/2];
   const connection=nearestRoad(...entry),driveway:[number,number][]=[entry,[connection.x,connection.z]];
   if(!drivewayClear(driveway)){rejected.driveway++;continue;}
   paintGroundRect(x,z,w+.7,d+.7,'walk');paintGroundRect(x,z,w,d,'asphalt');paintGroundPath(driveway,3.4,'asphalt');parkingAccessPaths.push({points:driveway,width:3.4});
   let parked=0;
   const rowZ=z-aisle*2.5;
   for(let i=0;i<=4;i++)paintGroundRect(x-w/2+.25+i*2.52,rowZ,.12,4.9,'line');
   paintGroundRect(x,rowZ-aisle*2.45,w-.5,.12,'line');
   for(let i=0;i<4;i++){
    const px=x-w/2+1.5+i*2.52,pz=rowZ,y=surfaceHeight(px,pz);
    box(1.5,.14,.24,0xe5d6b8,px,surfaceHeight(px,pz-aisle*1.9)+.07,pz-aisle*1.9);
    if((i+lots.length)%3!==0){
     parked++;
     const normal=new THREE.Vector3(surfaceHeight(px-.5,pz)-surfaceHeight(px+.5,pz),1,surfaceHeight(px,pz-.5)-surfaceHeight(px,pz+.5)).normalize();
     const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
     const car=createVehicle('sedan',[0xdaaa51,0xf3eee0,0x4d91ab,0xc66e58][(i+lots.length)%4],{width:1.65,length:3.45},true);car.name='parked-car';car.position.set(px,y,pz);car.quaternion.copy(rotation);group.add(car);
    }
   }
   // Foot access stays separate from the parking aisle when it is clear of buildings.
   const footStart:[number,number]=[x+(office.x<x?-1:1)*(w/2+.45),z];
   const path:[number,number][]=[footStart,[office.entrance.x,office.entrance.z]];
   let footClear=true;for(let i=0;i<20;i++){const t=i/20,px=path[0][0]+(path[1][0]-path[0][0])*t,pz=path[0][1]+(path[1][1]-path[0][1])*t;if(occupied.some(p=>p!==office&&Math.abs(p.x-office.x)+Math.abs(p.z-office.z)>.01&&Math.abs(px-p.x)<p.w/2+.2&&Math.abs(pz-p.z)<p.d/2+.2))footClear=false;}
   if(footClear){paintGroundPath(path,1.15,'walk');parkingAccessPaths.push({points:path,width:1.15});}
   for(const side of [-1,1]){const bx=entry[0]+side*2.1,bz=entry[1],by=surfaceHeight(bx,bz);box(.16,.8,.16,0x436a7d,bx,by+.4,bz);box(.18,.10,.18,0xeec870,bx,by+.75,bz);}
   lots.push({x,z,w,d,spaces:4,parked,serves:[office.x,office.z],driveway});occupied.push({x,z,w:w+1,d:d+1});buildingFootprints.push({x,z,w:w+1,d:d+1});break;
  }
 }
 for(const [color,parts] of buckets){const geometry=mergeGeometries(parts,false)!;parts.forEach(p=>p.dispose());const mesh=new THREE.Mesh(geometry,toon(color));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
 world.userData.streetLife={planning:{offices:offices.length,rejected},parkingLots:lots,spaces:lots.length*4,parkedCars:lots.reduce((s,l)=>s+l.parked,0)};
}
