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
const routes=roadCurves.map((curve,id)=>makeTrafficRoute(curve,id));
let junctions:ReturnType<typeof findJunctions>=[];
export function buildCars(){
 if(motorwayCurve)routes.push(makeTrafficRoute(motorwayCurve,routes.length,true));
 junctions=findJunctions(routes);
 for(let i=0;i<28;i++){
  const bus=i%7===0,route=routes[i%routes.length],mesh=createVehicle(bus?'bus':'sedan',[0xe7b75d,0xf0eeee,0x5896ab,0xc96362][i%4],undefined,true);mesh.name=bus?'city-bus':'road-car';
  const car:typeof cars[number]={id:i,mesh,route,distance:0,length:bus?5.7:3.2,width:bus?2:1.6,desiredSpeed:route.elevated?10+(i%3):5+(i%4)*.6,speed:0,waiting:0,pose:poseAt(route,0)};
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
 if(dt>0)stepTraffic(cars,junctions,dt);
 for(const car of cars){const {position,heading,pitch}=car.pose;car.mesh.position.copy(position);car.mesh.position.y=car.route.elevated?position.y+.12:surfaceHeight(position.x,position.z)+.02;car.mesh.rotation.set(pitch,heading,0,'YXZ');}
}
