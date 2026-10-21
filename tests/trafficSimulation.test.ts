import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROAD_PATHS,terrainHeight} from '../src/layout';
import {makeTrafficRoute,poseAt,findJunctions,stepTraffic,vehiclesOverlap,type Vehicle} from '../src/trafficSimulation';
import {planGeometry,PLANS} from '../src/buildingPlans';
const source=(points:[number,number][])=>new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,terrainHeight(x,z)+.2,z)),false,'catmullrom',.16);
test('concave E/T/H/L/U roofs have the polygon area and upward normals',()=>{
 for(const plan of ['E','T','H','L','U'] as const){const g=planGeometry(plan,20,16,12),cap=g.groups[1],index=g.index!,pos=g.attributes.position;let area=0;
 for(let i=cap.start;i<cap.start+cap.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,index.getX(i)),b=new THREE.Vector3().fromBufferAttribute(pos,index.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(pos,index.getX(i+2));const cross=b.sub(a).cross(c.sub(a));assert.ok(cross.y>0);area+=cross.y/2;}
 const polygonArea=Math.abs(THREE.ShapeUtils.area(PLANS[plan].map(([x,z])=>new THREE.Vector2(x*20,z*16))));assert.ok(Math.abs(area-polygonArea)<.001);assert.ok(area<20*16*.85);g.dispose();
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
