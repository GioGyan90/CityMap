import {surfaceHeight,terrainPositions,terrainRows,terrainCols} from '../src/terrainSurface';
import {roadProfiles} from '../src/roadNetwork';
import {entranceWall} from '../src/buildingAccess';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROAD_PATHS,terrainHeight} from '../src/layout';
import {makeTrafficRoute,poseAt,findJunctions,stepTraffic,vehiclesOverlap,type Vehicle} from '../src/trafficSimulation';
import {planGeometry,PLANS,createMassing,massingGeometry} from '../src/buildingPlans';
const source=(points:[number,number][])=>new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,terrainHeight(x,z)+.2,z)),false,'catmullrom',.16);
test('concave E/T/H/L/U roofs have the polygon area and upward normals',()=>{
 for(const plan of ['E','T','H','L','U'] as const){const g=planGeometry(plan,20,16,12),cap=g.groups[1],index=g.index!,pos=g.attributes.position;let area=0;
 for(let i=cap.start;i<cap.start+cap.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,index.getX(i)),b=new THREE.Vector3().fromBufferAttribute(pos,index.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(pos,index.getX(i+2));const cross=b.sub(a).cross(c.sub(a));assert.ok(cross.y>0);area+=cross.y/2;}
 const polygonArea=Math.abs(THREE.ShapeUtils.area(PLANS[plan].map(([x,z])=>new THREE.Vector2(x*20,z*16))));assert.ok(Math.abs(area-polygonArea)<.001);assert.ok(area<20*16*.85);g.dispose();
 }
});
test('varied wings remain connected in the lot and expose only exterior walls and roof terraces',()=>{
 for(const plan of ['E','T','H','L','U'] as const)for(const seed of [11,33,101]){
  const wings=createMassing(plan,seed),w=20,d=16,h=30,{geometry:g}=massingGeometry(wings,w,d,h),pos=g.attributes.position;
  assert.ok(new Set(wings.map(v=>v.height)).size>=2);assert.ok(Math.min(...wings.map(v=>v.height))<.85);assert.equal(Math.max(...wings.map(v=>v.height)),1);
  const reached=new Set([0]);for(let pass=0;pass<wings.length;pass++)for(let a=0;a<wings.length;a++)if(reached.has(a))for(let b=0;b<wings.length;b++){
   const p=wings[a],q=wings[b],overlapX=Math.min(p.x1,q.x1)-Math.max(p.x0,q.x0),overlapZ=Math.min(p.z1,q.z1)-Math.max(p.z0,q.z0);
   if((overlapX>0&&overlapZ>=-.000001)||(overlapZ>0&&overlapX>=-.000001))reached.add(b);
  }assert.equal(reached.size,wings.length,'all wings must join the building');
  const inside=(p:THREE.Vector3)=>wings.some(v=>p.x>v.x0*w&&p.x<v.x1*w&&p.z>v.z0*d&&p.z<v.z1*d&&p.y>0&&p.y<v.height*h);
  let roofArea=0;
  for(let i=0;i<pos.count;i+=3){
   const a=new THREE.Vector3().fromBufferAttribute(pos,i),b=new THREE.Vector3().fromBufferAttribute(pos,i+1),c=new THREE.Vector3().fromBufferAttribute(pos,i+2),cross=b.clone().sub(a).cross(c.clone().sub(a)),normal=cross.clone().normalize(),center=a.clone().add(b).add(c).divideScalar(3);
   assert.ok([a,b,c].every(p=>Math.abs(p.x)<=w/2+.0001&&Math.abs(p.z)<=d/2+.0001&&p.y<=h+.0001));
   assert.equal(inside(center.clone().addScaledVector(normal,.001)),false,'no wall hidden inside a neighbouring wing');
   assert.equal(inside(center.clone().addScaledVector(normal,-.001)),true,'surface must enclose a real volume');
   if(i>=g.groups[1].start){assert.ok(normal.y>.99);roofArea+=cross.length()/2;}
  }
  const area=wings.reduce((sum,v)=>sum+(v.x1-v.x0)*w*(v.z1-v.z0)*d,0);assert.ok(Math.abs(roofArea-area)<.001);g.dispose();
 }
});
test('full street network: safe spawning, five minutes without overlaps, and live traffic',()=>{
 const routes=ROAD_PATHS.map((road,i)=>makeTrafficRoute(source(road.points),i));const zones=findJunctions(routes),cars:Vehicle[]=[];
 for(let i=0;i<28;i++){const route=routes[i%routes.length],car:Vehicle={id:i,route,distance:0,length:i%7===0?5.7:3.2,width:i%7===0?2:1.6,desiredSpeed:5+i%4*.6,speed:0,waiting:0,pose:poseAt(route,0)};let placed=false;
 for(let n=0;n<160;n++){car.distance=((Math.floor(i/routes.length)+.2)*route.length/4+n*7.3)%route.length;car.pose=poseAt(route,car.distance);if(zones.some(z=>Math.hypot(car.pose.position.x-z.position.x,car.pose.position.z-z.position.z)<z.radius+car.length))continue;if(!cars.some(other=>vehiclesOverlap(car,other,3))){placed=true;break;}}
 if(placed)cars.push(car);
 }
 assert.ok(cars.length>=20);assert.ok(zones.length>=3);
 const travel=new Map(cars.map(c=>[c.id,0]));let stoppedMax=0;
 for(let frame=0;frame<3000;frame++){const before=cars.map(c=>c.distance);stepTraffic(cars,zones,.1);
 for(let i=0;i<cars.length;i++){const car=cars[i];travel.set(car.id,travel.get(car.id)!+(car.distance-before[i]+car.route.length)%car.route.length);stoppedMax=Math.max(stoppedMax,car.waiting);for(let j=i+1;j<cars.length;j++)assert.equal(vehiclesOverlap(car,cars[j],0),false,`overlap ${car.id}/${cars[j].id} at ${frame/10}s`);}
 }
 const distances=[...travel.values()];console.log(JSON.stringify({cars:cars.length,junctions:zones.length,minTravel:Math.min(...distances),maxWait:stoppedMax,lastWait:Math.max(...cars.map(c=>c.waiting))}));
 if(Math.max(...cars.map(c=>c.waiting))>40)console.log(JSON.stringify({zones:zones.map(z=>({p:z.position.toArray(),routes:[...z.routes],owner:z.owner})),cars:cars.map(c=>({id:c.id,route:c.route.id,wait:c.waiting,p:c.pose.position.toArray(),d:c.distance,heading:c.pose.heading}))}));
 assert.ok(Math.min(...distances)>30,'each car must move');assert.ok(Math.max(...cars.map(c=>c.waiting))<40,'no junction gridlock');
});
test('faster following car cannot pass through slower car, including lane reversal',()=>{
 const route=makeTrafficRoute(source([[0,0],[0,160]]),0);const cars=[0,1,2,3].map((id):Vehicle=>({id,route,distance:id*35,length:id===1?5.7:3.2,width:2,desiredSpeed:id%2?3:12,speed:0,waiting:0,pose:poseAt(route,id*35)}));
 for(let i=0;i<2400;i++){stepTraffic(cars,[],.05);for(let a=0;a<cars.length;a++)for(let b=a+1;b<cars.length;b++)assert.equal(vehiclesOverlap(cars[a],cars[b],0),false);}
});

test('ground contact samples the exact rendered terrain triangles on road slopes',()=>{
 let sampled=0,maxError=0;
 for(let row=0;row<terrainRows;row+=3)for(let col=2;col<terrainCols-2;col+=5){
  const a=(row*(terrainCols+1)+col)*3,b=a+(terrainCols+1)*3,c=a+3,d=b+3;
  for(const triangle of [[a,b,c],[c,b,d]]){
   const weights=[.21,.37,.42],p=[0,0,0];triangle.forEach((i,j)=>{for(let k=0;k<3;k++)p[k]+=terrainPositions[i+k]*weights[j];});
   const error=Math.abs(surfaceHeight(p[0],p[2])-p[1]);maxError=Math.max(maxError,error);sampled++;assert.ok(error<.0001,`terrain contact error ${error}`);
  }
 }
 assert.ok(sampled>4000);console.log(JSON.stringify({terrainSamples:sampled,maxError}));
 for(const road of roadProfiles)for(const p of road.curve.getSpacedPoints(40))assert.ok(Number.isFinite(surfaceHeight(p.x,p.z)));
});
test('entrances attach to an exterior wall with enough width and headroom',()=>{
 for(const plan of ['E','T','H','L','U'] as const)for(const target of [{x:40,z:0},{x:-40,z:0},{x:0,z:40},{x:0,z:-40}]){
  const wings=createMassing(plan,47),wall=entranceWall(18,16,12,wings,target);
  const inside=(x:number,z:number)=>wings.some(v=>x>v.x0*18&&x<v.x1*18&&z>v.z0*16&&z<v.z1*16);
  assert.equal(inside(wall.x+wall.nx*.01,wall.z+wall.nz*.01),false);assert.equal(inside(wall.x-wall.nx*.01,wall.z-wall.nz*.01),true);assert.ok(wall.length>1.35&&wall.ceiling>2.7);
 }
});
