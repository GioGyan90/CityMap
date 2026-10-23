import * as THREE from 'three';
import {createFleetVehicle} from './fleetAssets';
import {world} from './scene';
/** North of the sailboats' z=-60..180 lane, west of the cargo quay. */
export const speedboatRoute=new THREE.CatmullRomCurve3(Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2;return new THREE.Vector3(-168+27*Math.cos(a),.1,-140+38*Math.sin(a));}),true,'centripetal');
speedboatRoute.arcLengthDivisions=1600;speedboatRoute.updateArcLengths();
export const marineFleet:{mesh:THREE.Group;distance:number;phase:number}[]=[];
let seconds=0;
export function speedboatPose(distance:number){const t=((distance%speedboatRoute.getLength())+speedboatRoute.getLength())%speedboatRoute.getLength()/speedboatRoute.getLength(),position=speedboatRoute.getPointAt(t),v=speedboatRoute.getTangentAt(t);return {position,heading:Math.atan2(v.x,v.z)};}
export function buildMarineFleet(){if(marineFleet.length)return;for(let i=0;i<2;i++){const mesh=createFleetVehicle('speedboat',true);mesh.name='coastal-speedboat';world.add(mesh);marineFleet.push({mesh,distance:i*speedboatRoute.getLength()/2,phase:i*Math.PI});}world.userData.speedboats={route:speedboatRoute.getSpacedPoints(80).map(p=>p.toArray()),count:2,speed:8};updateMarineFleet(0);}
export function speedboatMotion(distance:number,phase:number,time:number){const pose=speedboatPose(distance);pose.position.y+=Math.sin(time*1.3+phase)*.035;return {...pose,pitch:-.018+Math.sin(time+phase)*.012,roll:Math.sin(time*.8+phase)*.02};}
export function updateMarineFleet(dt:number){seconds+=dt;for(const boat of marineFleet){boat.distance=(boat.distance+dt*8)%speedboatRoute.getLength();const pose=speedboatMotion(boat.distance,boat.phase,seconds);boat.mesh.position.copy(pose.position);boat.mesh.rotation.set(pose.pitch,pose.heading,pose.roll,'YXZ');}}
