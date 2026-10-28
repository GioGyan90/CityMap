import {motorwayProfile} from './motorwayPlan';
import {batchStationPart} from './coastalStationAssets';
import {roadEdgeDistance} from './roadNetwork';
import {railRoute} from './railNetwork';
import {buildCoastalStationSteps} from './coastalStation';
import {coastalRailCurve} from './coastalStationPlan';
import {buildBusStops} from './busStops';
import {RAIL_PLANS,railCircuit,railSpine,railSidePoint,type RailPlan} from './railNetworkPlan';
import {createRailTrain} from './railVehicles';
import {advanceRail,carPose,type RailStop,type RailState} from './railOperations';
import {buildRailStations} from './railStations';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import {world} from './scene';
import {ZONES} from './layout';
import {roadRibbon,roadMat,walkMat} from './roads';
import {toon} from './materials';
import {sign} from './conceptDetails';
import {createDockMarketSign} from './dockMarketSign';
import {GROUND_Y} from './config';
export let motorwayCurve:THREE.CatmullRomCurve3|null=null;
export interface RailVehicle {mesh:THREE.Group;curve:THREE.CatmullRomCurve3;plan:RailPlan;offset:number;speed:number;terminalDwell:number;dwellRemaining:number;state:RailState;stops:RailStop[]}
export const transit:RailVehicle[]=[];
export const railRoutes:{plan:RailPlan;curve:THREE.CatmullRomCurve3}[]=[];
function box(w:number,h:number,d:number,c:number,x:number,y:number,z:number,parent:THREE.Object3D=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function route(points:[number,number][],lift:number){return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,surfaceHeight(x,z)+lift,z)),false,'catmullrom',.12);}
function* railwaySteps(curve:THREE.CatmullRomCurve3,plan:RailPlan){
 const root=new THREE.Group();root.name=plan.id+'-double-track-circuit';world.add(root);root.userData.piers=[];
 const bed=roadRibbon(curve,plan.elevated?4.6:3.8,0,walkMat,true);bed.name=plan.elevated?'rail-viaduct':'coastal-tram-track';root.attach(bed);
 for(const side of [-1,1]){yield;const points=Array.from({length:1201},(_,i)=>{const p=curve.getPointAt(i/1200),t=curve.getTangentAt(i/1200),l=Math.hypot(t.x,t.z);p.x+=t.z/l*side*.8;p.z-=t.x/l*side*.8;p.y+=.15;return p;});const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),1800,.07,5,true),toon(0x606c76));rail.name='continuous-running-rail';root.add(rail);}
 const count=Math.floor(curve.getLength()/2.2);
 for(let i=0;i<count;i++){const p=curve.getPointAt(i/count),t=curve.getTangentAt(i/count),s=box(2.6,.16,.28,0x806a55,p.x,p.y+.03,p.z,root);s.name='rail-sleeper';s.rotation.y=Math.atan2(t.x,t.z);}
 // Closed, terrain-reaching bed skirts. Elevated loops have beams, edge guards and piers too.
 const steps=Math.ceil(curve.getLength()/3),v:number[]=[];
 for(let i=0;i<steps;i++){const a=curve.getPointAt(i/steps),b=curve.getPointAt((i+1)/steps),ta=curve.getTangentAt(i/steps),tb=curve.getTangentAt((i+1)/steps);for(const side of [-1,1]){const p=a.clone().add(new THREE.Vector3(ta.z,0,-ta.x).normalize().multiplyScalar(side*(plan.elevated?2.3:1.9))),q=b.clone().add(new THREE.Vector3(tb.z,0,-tb.x).normalize().multiplyScalar(side*(plan.elevated?2.3:1.9))),py=plan.elevated?p.y-.75:Math.min(p.y-.2,surfaceHeight(p.x,p.z)-.12),qy=plan.elevated?q.y-.75:Math.min(q.y-.2,surfaceHeight(q.x,q.z)-.12);v.push(p.x,p.y,p.z,p.x,py,p.z,q.x,q.y,q.z,q.x,q.y,q.z,p.x,py,p.z,q.x,qy,q.z);}
 const floor=[-1,1].flatMap(side=>[a.clone().add(new THREE.Vector3(ta.z,0,-ta.x).normalize().multiplyScalar(side*(plan.elevated?2.3:1.9))),b.clone().add(new THREE.Vector3(tb.z,0,-tb.x).normalize().multiplyScalar(side*(plan.elevated?2.3:1.9)))]);for(const p of floor)p.y=plan.elevated?p.y-.75:Math.min(p.y-.2,surfaceHeight(p.x,p.z)-.12);for(const k of [0,1,2,1,3,2])v.push(...floor[k].toArray());}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();const skirt=new THREE.Mesh(g,toon(plan.elevated?0xbec9c0:0xc6b393,{side:THREE.DoubleSide}));skirt.name='closed-rail-bed-sidewalls';root.add(skirt);
 if(plan.elevated){for(let d=0;d<curve.getLength();d+=17){const p=curve.getPointAt(d/curve.getLength()),base=surfaceHeight(p.x,p.z),h=p.y-base-.75;if(h>.1&&roadEdgeDistance(p.x,p.z)>1.7){root.userData.piers.push([p.x,base,p.z]);box(1.5,h,1.8,0xadb9ae,p.x,base+h/2,p.z,root).name='viaduct-grounded-pier';box(3.4,.45,1.4,0xbec9c0,p.x,p.y-.65,p.z,root);}}
 for(const side of [-1,1]){const pts=Array.from({length:900},(_,i)=>{const p=curve.getPointAt(i/899),t=curve.getTangentAt(i/899);return p.add(new THREE.Vector3(t.z,0,-t.x).normalize().multiplyScalar(side*2.15)).add(new THREE.Vector3(0,.42,0));});const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),1100,.1,5,true),toon(0x91aaa8));rail.name='viaduct-low-edge-guard';root.add(rail);}}
 yield;batchStationPart(root);
}
function makeStops(plan:RailPlan,curve:THREE.CatmullRomCurve3){const spine=railSpine(plan),stops:RailStop[]=[];for(const t of plan.stops)for(const side of [0,plan.spacing]){const p=railSidePoint(spine,t,side);let best=Infinity,at=0;for(let i=0;i<5000;i++){const q=curve.getPointAt(i/5000),d=Math.hypot(p.x-q.x,p.z-q.z);if(d<best){best=d;at=i/5000;}}stops.push({id:plan.id+'-'+t+'-'+side,distance:(at*curve.getLength()+(plan.cars-1)*plan.carPitch/2)%curve.getLength(),dwell:4});}return stops.sort((a,b)=>a.distance-b.distance);}
function train(curve:THREE.CatmullRomCurve3,plan:RailPlan,offset:number,stops:RailStop[]){const mesh=createRailTrain(plan);world.add(mesh);const distance=offset*curve.getLength(),nextStop=Math.max(0,stops.findIndex(s=>s.distance>distance));transit.push({mesh,curve,plan,offset,speed:plan.speed,terminalDwell:4,dwellRemaining:0,state:{distance,remaining:0,nextStop},stops});}
export function* buildTransportSteps(){
 for(const plan of RAIL_PLANS){yield;const height=plan.elevated?()=>40:(x:number,z:number)=>surfaceHeight(x,z)+.4,curve=railRoute(plan);railRoutes.push({plan,curve});yield* railwaySteps(curve,plan);yield;const stops=makeStops(plan,curve);yield;train(curve,plan,.12,stops);yield;train(curve,plan,.62,stops);yield;buildRailStations(plan,curve,(x,z)=>{let best=Infinity,y=0;for(let i=0;i<2500;i++){const p=curve.getPointAt(i/2500),d=Math.hypot(x-p.x,z-p.z);if(d<best){best=d;y=p.y;}}return y;});}
 yield* buildCoastalStationSteps(coastalRailCurve());
 // Raised highway with a gentle approach, concrete piers and metal safety barriers.
 const highway=motorwayProfile;
 motorwayCurve=highway;
 roadRibbon(highway,10,.1,roadMat,true).name='elevated-motorway';
 for(let i=0;i<14;i++){const p=highway.getPointAt(i/13),base=surfaceHeight(p.x,p.z);box(1.6,p.y-base,2,0xa3aaa1,p.x,(p.y+base)/2,p.z);}
 for(const side of [-1,1]){const pts:THREE.Vector3[]=[];for(let i=0;i<=80;i++){const p=highway.getPointAt(i/80),t=highway.getTangentAt(i/80);p.x+=-t.z*side*4.8;p.z+=t.x*side*4.8;p.y+=.8;pts.push(p);}world.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),100,.13,5,false),toon(0xc8d1cf)));}

 world.userData.transport={tram:true,elevatedRail:true,elevatedHighway:true,stations:7,tracksPerLine:2,circuits:railRoutes.map(({plan,curve})=>({id:plan.id,length:curve.getLength(),spacing:plan.spacing,turnDepth:plan.turnDepth,trains:2,stops:transit.find(t=>t.plan===plan)!.stops}))};updateTransport(0);
}
export function updateTransport(dt:number){for(const vehicle of transit){vehicle.state=advanceRail(vehicle.state,dt,vehicle.speed,vehicle.curve.getLength(),vehicle.stops);vehicle.offset=vehicle.state.distance/vehicle.curve.getLength();vehicle.dwellRemaining=vehicle.state.remaining;const cars=vehicle.mesh.children.filter(c=>c.userData.railCar);cars.forEach((car,i)=>{const pose=carPose(vehicle.curve,vehicle.state.distance-i*vehicle.plan.carPitch,vehicle.plan.carLength*.54);car.position.copy(pose.position).add(new THREE.Vector3(0,.22,0));car.rotation.set(pose.pitch,pose.heading,0,'YXZ');});const gangways=vehicle.mesh.children.filter(c=>c.name==='flexible-car-gangway');gangways.forEach((g,i)=>{const a=cars[i].localToWorld(new THREE.Vector3(0,1.6,-vehicle.plan.carLength/2)),b=cars[i+1].localToWorld(new THREE.Vector3(0,1.6,vehicle.plan.carLength/2)),p=a.clone().add(b).multiplyScalar(.5);g.position.copy(p);g.rotation.set(-Math.atan2(a.y-b.y,Math.hypot(a.x-b.x,a.z-b.z)),Math.atan2(a.x-b.x,a.z-b.z),0,'YXZ');g.scale.z=Math.max(.15,a.distanceTo(b))/.45;});vehicle.mesh.updateMatrixWorld(true);}}
export function buildStreetFurniture(){
 for(const [x,z,text,color] of [[42,-82,'LUCKY BREAK','#1e5579'],[89,-92,'CITY LEAGUE','#345c85'],[42,70,'CUE & BALL','#b74f51'],[105,101,'SEASIDE HOTEL','#247b93']] as const){
  const y=surfaceHeight(x,z);for(const dx of [-4,4])box(.28,8,.28,0x61717a,x+dx,y+4,z);
  sign(text,x,y+8.3-1.06,z,11,3.5,color);box(12,.35,.6,0xe4c375,x,y+10.3,z);
 }
 buildBusStops();
 const quaySign=ZONES.port,dockSign=createDockMarketSign();dockSign.scale.set(quaySign.sx,1,quaySign.sz);dockSign.position.set(quaySign.x,GROUND_Y+6,quaySign.z+7*quaySign.sz);world.add(dockSign);
}

export function buildTransport(){for(const _ of buildTransportSteps()){/* synchronous asset/headless API */}}
