import {hotelPlazaOutline} from '../src/hotelPlaza';
import {nearestRoad} from '../src/roadNetwork';
import {ZONES,isLand,railCorridor} from '../src/layout';
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

test('clipped hotel plaza clears the road and sidewalk along every boundary edge',()=>{
 const zone=ZONES.hotel;let minimum=Infinity;
 for(let i=0;i<hotelPlazaOutline.length;i++){
  const a=hotelPlazaOutline[i],b=hotelPlazaOutline[(i+1)%hotelPlazaOutline.length];
  for(let j=0;j<=100;j++){
   const x=zone.x+(a[0]+(b[0]-a[0])*j/100)*zone.sx,z=zone.z+(a[1]+(b[1]-a[1])*j/100)*zone.sz;
   const road=nearestRoad(x,z),clearance=road.distance-road.width/2;minimum=Math.min(minimum,clearance);
   assert.ok(clearance>1.2,`hotel plaza intrudes into road/sidewalk at ${x},${z}: ${clearance}`);
  }
 }console.log({hotelRoadClearance:minimum});
});


test('villa and coastal lighthouse sites stay on land and clear transit and roads',()=>{
 for(const id of ['villa','lighthouse']){
  const zone=ZONES[id];let minimum=Infinity;
  for(let ix=0;ix<=10;ix++)for(let iz=0;iz<=10;iz++){
   const x=zone.x-zone.w/2+zone.w*ix/10,z=zone.z-zone.d/2+zone.d*iz/10;
   assert.ok(isLand(x,z),`${id} site outside coastline at ${x},${z}`);
   assert.equal(railCorridor(x,z),false,`${id} site intrudes into transit corridor`);
   const road=nearestRoad(x,z);minimum=Math.min(minimum,road.distance-road.width/2);
  }
  assert.ok(minimum>1.8,`${id} site intrudes into sidewalk: ${minimum}`);
  console.log({site:id,roadClearance:minimum,summit:surfaceHeight(zone.x,zone.z)});
 }
 const a=ZONES.lighthouse,b=ZONES.port;
 assert.ok(Math.abs(a.x-b.x)>(a.w+b.w)/2+5||Math.abs(a.z-b.z)>(a.d+b.d)/2+5);
});

test('beach rest areas stay on land, outside landmark lots and clear of driving lanes',async()=>{
 const {BEACH_ENTRIES}=await import('../src/urbanDesign');
 const {westCoast,roadDistance,reserved}=await import('../src/layout');
 for(const z of BEACH_ENTRIES){
  const x=westCoast(z)+6;
  for(const dx of [-4,4])for(const dz of [-5.5,5.5]){
   assert.ok(isLand(x+dx,z+dz),'plaza remains on land');
   assert.ok(roadDistance(x+dx,z+dz)>0,'plaza does not obstruct the road');
   assert.equal(reserved(x+dx,z+dz,0,0),false,'plaza avoids landmark sites');
  }
 }
});

test('local street junctions meet the same road centreline instead of nearly touching',()=>{
 const joins:[string,number,string][]=[['harbor-avenue',0,'central-boulevard'],['old-town-lane',0,'central-boulevard'],['old-town-lane',1,'civic-approach'],['civic-approach',1,'hospital-ring'],['hill-neighborhood',1,'hospital-ring'],['garden-lane',1,'civic-approach']];
 for(const [id,end,target] of joins){
  const route=roadProfiles.find(r=>r.id===id)!,other=roadProfiles.find(r=>r.id===target)!,p=route.curve.getPointAt(end);
  const distance=Math.min(...other.curve.getSpacedPoints(5000).map(q=>Math.hypot(q.x-p.x,q.z-p.z)));
  assert.ok(distance<.1,`${id} misses ${target} by ${distance}`);
 }
});
test('map grid coordinates and saved placement validation round trip at cell boundaries',async()=>{
 const {gridCell,MAP_GRID,columnLabel,validatePositions}=await import('../src/mapCoordinates');
 assert.equal(gridCell(MAP_GRID.originX,MAP_GRID.originZ).id,'A01');
 assert.equal(gridCell(MAP_GRID.originX+19.999,MAP_GRID.originZ+19.999).id,'A01');
 assert.equal(gridCell(MAP_GRID.originX+20,MAP_GRID.originZ+20).id,'B02');
 assert.equal(columnLabel(26),'AA');assert.equal(gridCell(10000,0).id,'OUT');
 const p=[{id:'market',x:-18,y:1.06,z:15}];assert.deepEqual(validatePositions(JSON.parse(JSON.stringify(p)),new Set(['market'])),p);
 for(const value of [[{id:'other',x:0,y:0,z:0}],[{id:'market',x:NaN,y:0,z:0}],[...p,...p]])assert.throws(()=>validatePositions(value,new Set(['market'])));
});

test('planning-grid samples remain finite at the collapsed coastal tip',()=>{
 assert.ok(Number.isFinite(surfaceHeight(0,202)));
 for(let x=-260;x<=340;x+=20)for(let z=-220;z<=240;z+=2)assert.ok(Number.isFinite(surfaceHeight(x,z)),`finite sample ${x},${z}`);
});

test('signal-controlled network remains collision-free and live for five minutes',async()=>{
 const {planTrafficFixtures,registerSignalStops,signalAllows}=await import('../src/trafficPlan');registerSignalStops(planTrafficFixtures());
 const routes=ROAD_PATHS.map((road,i)=>makeTrafficRoute(source(road.points),i));const zones=findJunctions(routes),cars:Vehicle[]=[];
 for(let i=0;i<28;i++){const route=routes[i%routes.length],car:Vehicle={id:i,route,distance:0,length:i%7===0?5.7:3.2,width:i%7===0?2:1.6,desiredSpeed:5+i%4*.6,speed:0,waiting:0,pose:poseAt(route,0)};let placed=false;
 for(let n=0;n<160;n++){car.distance=((Math.floor(i/routes.length)+.2)*route.length/4+n*7.3)%route.length;car.pose=poseAt(route,car.distance);if(zones.some(z=>Math.hypot(car.pose.position.x-z.position.x,car.pose.position.z-z.position.z)<z.radius+car.length))continue;if(!cars.some(other=>vehiclesOverlap(car,other,3))){placed=true;break;}}
 if(placed)cars.push(car);
 }
 assert.ok(cars.length>=20);assert.ok(zones.length>=3);
 const travel=new Map(cars.map(c=>[c.id,0]));let stoppedMax=0;
 for(let frame=0;frame<3000;frame++){const before=cars.map(c=>c.distance);stepTraffic(cars,zones,.1,(car,next)=>signalAllows(car,next,frame*.1));
 for(let i=0;i<cars.length;i++){const car=cars[i];travel.set(car.id,travel.get(car.id)!+(car.distance-before[i]+car.route.length)%car.route.length);stoppedMax=Math.max(stoppedMax,car.waiting);for(let j=i+1;j<cars.length;j++)assert.equal(vehiclesOverlap(car,cars[j],0),false,`overlap ${car.id}/${cars[j].id} at ${frame/10}s`);}
 }
 const distances=[...travel.values()];console.log(JSON.stringify({cars:cars.length,junctions:zones.length,minTravel:Math.min(...distances),maxWait:stoppedMax,lastWait:Math.max(...cars.map(c=>c.waiting))}));
 if(Math.max(...cars.map(c=>c.waiting))>85)console.log(JSON.stringify({zones:zones.map(z=>({p:z.position.toArray(),routes:[...z.routes],owner:z.owner})),cars:cars.map(c=>({id:c.id,route:c.route.id,wait:c.waiting,p:c.pose.position.toArray(),d:c.distance,heading:c.pose.heading}))}));
 assert.ok(Math.min(...distances)>30,'each car must move');assert.ok(Math.max(...cars.map(c=>c.waiting))<85,'no junction gridlock');registerSignalStops([]);
});

test('long buses reserve the full garden S-bend before entering opposite lanes',()=>{
 const route=makeTrafficRoute(roadProfiles[7].curve,7),zones=findJunctions([route]);assert.ok(zones.some(z=>z.position.distanceTo(new THREE.Vector3(113,terrainHeight(113,-1)+.2,-1))<10));
 const cars:Vehicle[]=[0,1].map(id=>({id,route,distance:id*route.length/2,length:5.7,width:2,desiredSpeed:6.5,speed:0,waiting:0,pose:poseAt(route,id*route.length/2)}));const travel=[0,0];
 for(let frame=0;frame<12000;frame++){const before=cars.map(c=>c.distance);stepTraffic(cars,zones,.05);cars.forEach((c,i)=>travel[i]+=(c.distance-before[i]+route.length)%route.length);assert.equal(vehiclesOverlap(cars[0],cars[1],0),false);assert.ok(cars.every(c=>c.waiting<45),'no opposing bus deadlock at bend');}
 assert.ok(travel.every(d=>d>1000));
});

test('closed rail operations dwell without reversing and preserve large-frame elapsed time',async()=>{
 const {advanceRail}=await import('../src/railOperations');const stops=[{id:'A',distance:40,dwell:4},{id:'B',distance:180,dwell:4}],initial={distance:39,remaining:0,nextStop:0};let a=advanceRail(initial,1,5,300,stops);assert.equal(a.distance,40);assert.ok(Math.abs(a.remaining-3.2)<1e-8);assert.deepEqual(advanceRail(a,0,5,300,stops),a);a=advanceRail(a,4,5,300,stops);assert.ok(a.distance>40);
 let small={...initial};for(let i=0;i<10000;i++)small=advanceRail(small,.05,5,300,stops);const large=advanceRail(initial,500,5,300,stops);assert.ok(Math.abs(small.distance-large.distance)<1e-7&&Math.abs(small.remaining-large.remaining)<1e-7);assert.equal(small.nextStop,large.nextStop);
});

test('rail circuits join tangentially, preserve gauge and have usable compact turn radii',async()=>{
 const {RAIL_PLANS,railCircuit}=await import('../src/railNetworkPlan');for(const plan of RAIL_PLANS){const curve=railCircuit(plan);assert.ok(curve.getPointAt(0).distanceTo(curve.getPointAt(1))<1e-8);assert.ok(curve.getTangentAt(.00001).dot(curve.getTangentAt(.99999))>.999);
 let minRadius=Infinity;for(let i=0;i<2000;i++){const t=i/2000,a=curve.getTangentAt(t),b=curve.getTangentAt((t+.0005)%1),angle=Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1));minRadius=Math.min(minRadius,curve.getLength()*.0005/(angle||1e-9));}assert.ok(minRadius>(plan.elevated?8:3.5),plan.id+' turn radius '+minRadius);
 }
});
