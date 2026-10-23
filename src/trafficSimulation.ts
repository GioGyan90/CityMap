import * as THREE from 'three';
export interface TrafficRoute {id:number;curve:THREE.CatmullRomCurve3;length:number;elevated:boolean;source:THREE.CatmullRomCurve3}
export interface VehiclePose {position:THREE.Vector3;heading:number;pitch:number}
export interface Vehicle {id:number;route:TrafficRoute;distance:number;length:number;width:number;desiredSpeed:number;speed:number;waiting:number;pose:VehiclePose}
export interface Junction {position:THREE.Vector3;routes:Set<number>;radius:number;owner:number|null}
const lane=1.65;
export function makeTrafficRoute(source:THREE.CatmullRomCurve3,id:number,elevated=false):TrafficRoute{
 const n=Math.max(32,Math.ceil(source.getLength()/3)),points:THREE.Vector3[]=[];
 const offset=(t:number,side:number)=>{const p=source.getPointAt(t),v=source.getTangentAt(t),l=Math.hypot(v.x,v.z);p.x-=v.z/l*lane*side;p.z+=v.x/l*lane*side;return p;};
 for(let i=0;i<=n;i++)points.push(offset(i/n,1));
 const cap=(t:number,sign:number)=>{const p=source.getPointAt(t),v=source.getTangentAt(t);v.y=0;v.normalize();const normal=new THREE.Vector3(-v.z,0,v.x);for(let i=1;i<=12;i++){const a=i*Math.PI/12;points.push(p.clone().addScaledVector(normal,sign*lane*Math.cos(a)).addScaledVector(v,sign*lane*Math.sin(a)));}};
 cap(1,1);for(let i=n-1;i>=0;i--)points.push(offset(i/n,-1));cap(0,-1);points.pop();
 const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');curve.arcLengthDivisions=Math.max(1000,points.length*8);curve.updateArcLengths();return {id,curve,length:curve.getLength(),elevated,source};
}
export function poseAt(route:TrafficRoute,distance:number):VehiclePose{
 const t=((distance%route.length)+route.length)%route.length/route.length,p=route.curve.getPointAt(t),v=route.curve.getTangentAt(t);
 return {position:p,heading:Math.atan2(v.x,v.z),pitch:-Math.atan2(v.y,Math.hypot(v.x,v.z))};
}
/** Separating-axis test in the road plane, with a vertical gate for bridges. */
export function vehiclesOverlap(a:Pick<Vehicle,'length'|'width'|'pose'>,b:Pick<Vehicle,'length'|'width'|'pose'>,margin=.35){
 if(Math.abs(a.pose.position.y-b.pose.position.y)>3.3)return false;
 const dx=b.pose.position.x-a.pose.position.x,dz=b.pose.position.z-a.pose.position.z;
 if(dx*dx+dz*dz>Math.pow((a.length+b.length)/2+margin+1,2))return false;
 const af=new THREE.Vector2(Math.sin(a.pose.heading),Math.cos(a.pose.heading)),ar=new THREE.Vector2(af.y,-af.x),bf=new THREE.Vector2(Math.sin(b.pose.heading),Math.cos(b.pose.heading)),br=new THREE.Vector2(bf.y,-bf.x);
 for(const axis of [af,ar,bf,br]){
  const ra=Math.abs(axis.dot(af))*a.length/2+Math.abs(axis.dot(ar))*a.width/2;
  const rb=Math.abs(axis.dot(bf))*b.length/2+Math.abs(axis.dot(br))*b.width/2;
  if(Math.abs(dx*axis.x+dz*axis.y)>ra+rb+margin)return false;
 }return true;
}
export function findJunctions(routes:TrafficRoute[]){
 const junctions:Junction[]=[];
 const paths=routes.map(r=>r.source.getSpacedPoints(Math.ceil(r.source.getLength()/5)));
 for(let a=0;a<routes.length;a++)for(let b=a+1;b<routes.length;b++){
  if(routes[a].elevated!==routes[b].elevated)continue;
  for(let i=1;i<paths[a].length;i++)for(let j=1;j<paths[b].length;j++){
   const p=paths[a][i-1],q=paths[b][j-1],u=paths[a][i].clone().sub(p),v=paths[b][j].clone().sub(q),den=u.x*v.z-u.z*v.x;
   if(Math.abs(den)<.001)continue;const dx=q.x-p.x,dz=q.z-p.z,t=(dx*v.z-dz*v.x)/den,s=(dx*u.z-dz*u.x)/den;
   if(t<0||t>1||s<0||s>1||Math.abs(p.y+u.y*t-q.y-v.y*s)>3)continue;
   const position=p.clone().addScaledVector(u,t);let zone=junctions.find(z=>z.position.distanceTo(position)<16);
   if(!zone){zone={position,routes:new Set(),radius:10,owner:null};junctions.push(zone);}zone.routes.add(routes[a].id);zone.routes.add(routes[b].id);
  }
 }
 // T-junctions often end beside another centreline, rather than crossing it.
 for(let a=0;a<routes.length;a++)for(let b=0;b<routes.length;b++){
  if(a===b||routes[a].elevated!==routes[b].elevated)continue;
  for(const end of [paths[a][0],paths[a][paths[a].length-1]])for(let j=1;j<paths[b].length;j++){
   const p=paths[b][j-1],v=paths[b][j].clone().sub(p),t=THREE.MathUtils.clamp(end.clone().sub(p).dot(v)/v.lengthSq(),0,1),near=p.clone().addScaledVector(v,t);
   if(end.distanceTo(near)>7)continue;
   let zone=junctions.find(z=>z.position.distanceTo(end)<16);
   if(!zone){zone={position:end.clone(),routes:new Set(),radius:12,owner:null};junctions.push(zone);}zone.routes.add(routes[a].id);zone.routes.add(routes[b].id);
  }
 }
 // Tight S-bends need exclusive clearance too: long buses sweep across the inside lane.
 // Append after real junctions so their stable placement IDs remain unchanged.
 for(const route of routes){if(route.elevated)continue;const length=route.source.getLength();
  for(let d=7;d<length-7;d+=2){const a=route.source.getPointAt((d-6)/length),p=route.source.getPointAt(d/length),b=route.source.getPointAt((d+6)/length),u=p.clone().sub(a).setY(0).normalize(),v=b.clone().sub(p).setY(0).normalize();
   if(u.dot(v)>.55||junctions.some(z=>z.routes.has(route.id)&&z.position.distanceTo(p)<20))continue;
   junctions.push({position:p,routes:new Set([route.id]),radius:12,owner:null});
  }
 }return junctions;
}
function inJunction(car:Vehicle,zone:Junction,pose=car.pose){return zone.routes.has(car.route.id)&&Math.hypot(pose.position.x-zone.position.x,pose.position.z-zone.position.z)<zone.radius+car.length/2+1;}
/** Metre-based following, exclusive junction reservations and swept small steps. */
export function stepTraffic(cars:Vehicle[],zones:Junction[],dt:number,permit:(car:Vehicle,next:VehiclePose)=>boolean=()=>true){
 const steps=Math.max(1,Math.ceil(dt/.025)),tick=dt/steps;
 for(let step=0;step<steps;step++){
  for(const zone of zones){if(zone.owner!==null){const owner=cars.find(c=>c.id===zone.owner);if(!owner||!inJunction(owner,zone))zone.owner=null;}}
  const order=[...cars].sort((a,b)=>b.waiting-a.waiting||a.id-b.id);
  for(const car of order){
   let advance=Math.min(car.desiredSpeed,car.speed+3*tick)*tick;
   for(const other of cars)if(other!==car&&other.route===car.route){const gap=(other.distance-car.distance+car.route.length)%car.route.length-(car.length+other.length)/2-2.4;advance=Math.min(advance,Math.max(0,gap));}
   if(advance<1e-6)advance=0;
   let next=poseAt(car.route,car.distance+advance);
   const entering=zones.filter(z=>inJunction(car,z,next));
   if(entering.some(z=>z.owner!==null&&z.owner!==car.id)||!permit(car,next))advance=0;
   if(advance>0&&cars.some(other=>other!==car&&vehiclesOverlap({...car,pose:next},other)))advance=0;
   if(advance>0){for(const zone of entering)zone.owner=car.id;car.distance=(car.distance+advance)%car.route.length;car.pose=next;car.waiting=0;car.speed=advance/tick;}
   else {car.speed=0;car.waiting+=tick;}
  }
 }
}
