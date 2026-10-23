import {createFleetVehicle,type FleetKind} from './fleetAssets';
import {tunnelTrafficSources,tunnelDrivingHeight} from './tunnelTraffic';
import {signalAllows} from './trafficPlan';
import {trafficSeconds} from './trafficInfrastructure';
import {createVehicle} from './vehicles';
import {surfaceHeight} from './terrainSurface';
import { motorwayCurve } from './transport';
import * as THREE from 'three';
import { world } from './scene';
import { terrainHeight } from './layout';
import { roadCurves } from './roads';
import { toon } from './materials';
import { makeTrafficRoute,poseAt,findJunctions,stepTraffic,vehiclesOverlap,type Vehicle } from './trafficSimulation';
export const cars:(Vehicle&{mesh:THREE.Group})[]=[];
const routes=tunnelTrafficSources().map(({curve,id})=>makeTrafficRoute(curve,id));
let junctions:ReturnType<typeof findJunctions>=[];
export function buildCars(){
 if(motorwayCurve)routes.push(makeTrafficRoute(motorwayCurve,roadCurves.length,true));
 junctions=findJunctions(routes);
 for(let i=0;i<28;i++){
  const bus=i%7===0,kind:FleetKind|undefined=[1,13].includes(i)?'truck':[2,8,12,24].includes(i)?'taxi':[4,18].includes(i)?'police':undefined,route=routes[i%routes.length],mesh=kind?createFleetVehicle(kind,true):createVehicle(bus?'bus':'sedan',[0xe7b75d,0xf0eeee,0x5896ab,0xc96362][i%4],undefined,true);mesh.name=kind?'road-'+kind:bus?'city-bus':'road-car';
  const size=kind?mesh.userData.nominalSize:{length:bus?5.7:3.2,width:bus?2:1.6};
  const car:typeof cars[number]={id:i,mesh,route,distance:0,length:size.length,width:size.width,desiredSpeed:route.elevated?10+(i%3):5+(i%4)*.6,speed:0,waiting:0,pose:poseAt(route,0)};
  // Allocate actual free space, including other roads at intersections, before spawning.
  let placed=false;
  for(let attempt=0;attempt<160;attempt++){
   car.distance=((Math.floor(i/routes.length)+.2)*route.length/4+attempt*7.3)%route.length;car.pose=poseAt(route,car.distance);
   if(junctions.some(z=>Math.hypot(car.pose.position.x-z.position.x,car.pose.position.z-z.position.z)<z.radius+car.length))continue;
   if(!cars.some(other=>vehiclesOverlap(car,other,3))){placed=true;break;}
  }
  if(!placed)continue;
  mesh.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true;});world.add(mesh);cars.push(car);
 }
 world.userData.traffic={version:'separated-lanes-reservations-v1',vehicles:cars,junctions};updateTraffic(0);
}
export function updateTraffic(dt:number){
 if(dt>0)stepTraffic(cars,junctions,dt,(car,next)=>signalAllows(car,next,trafficSeconds));
 for(const car of cars){const {position,heading,pitch}=car.pose;car.mesh.position.copy(position);const underground=car.route.id===0?tunnelDrivingHeight(position.x,position.z):undefined;
  car.mesh.position.y=car.route.elevated?position.y+.12:underground!==undefined?underground+.015:surfaceHeight(position.x,position.z)+.02;
  if(underground!==undefined){const dx=Math.sin(heading)*.5,dz=Math.cos(heading)*.5,a=tunnelDrivingHeight(position.x-dx,position.z-dz)??surfaceHeight(position.x-dx,position.z-dz),b=tunnelDrivingHeight(position.x+dx,position.z+dz)??surfaceHeight(position.x+dx,position.z+dz);car.pose.pitch=-Math.atan2(b-a,1);}
  car.mesh.rotation.set(underground!==undefined?car.pose.pitch:pitch,heading,0,'YXZ');}
}
