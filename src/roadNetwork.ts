import * as THREE from 'three';
import {ROAD_PATHS,terrainHeight,westCoast} from './layout';
export const roadProfiles=ROAD_PATHS.map(road=>({...road,curve:new THREE.CatmullRomCurve3(road.points.map(([x,z])=>new THREE.Vector3(x,terrainHeight(x,z)+.2,z)),false,'catmullrom',.16)}));
interface Segment {ax:number;az:number;ay:number;dx:number;dz:number;dy:number;l2:number;road:number;width:number}
const cells=new Map<string,Segment[]>(),cellSize=12;
for(let road=0;road<roadProfiles.length;road++){
 const profile=roadProfiles[road],points=profile.curve.getSpacedPoints(Math.ceil(profile.curve.getLength()/1.5));
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],segment:Segment={ax:a.x,az:a.z,ay:a.y-.2,dx:b.x-a.x,dz:b.z-a.z,dy:b.y-a.y,l2:(b.x-a.x)**2+(b.z-a.z)**2,road,width:profile.width};
  const reach=profile.width/2+6;
  for(let x=Math.floor((Math.min(a.x,b.x)-reach)/cellSize);x<=Math.floor((Math.max(a.x,b.x)+reach)/cellSize);x++)for(let z=Math.floor((Math.min(a.z,b.z)-reach)/cellSize);z<=Math.floor((Math.max(a.z,b.z)+reach)/cellSize);z++){
   const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key)!.push(segment);
  }
 }
}
function nearby(x:number,z:number){
 const best=new Map<number,{distance:number;x:number;z:number;y:number;width:number;road:number}>();
 for(const s of cells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))??[]){
  const t=THREE.MathUtils.clamp(((x-s.ax)*s.dx+(z-s.az)*s.dz)/s.l2,0,1),px=s.ax+s.dx*t,pz=s.az+s.dz*t,distance=Math.hypot(x-px,z-pz);
  if(!best.has(s.road)||best.get(s.road)!.distance>distance)best.set(s.road,{distance,x:px,z:pz,y:s.ay+s.dy*t,width:s.width,road:s.road});
 }return [...best.values()];
}
export function nearestRoad(x:number,z:number){
 const near=nearby(x,z);if(near.length)return near.sort((a,b)=>a.distance-b.distance)[0];
 let best={distance:Infinity,x,z,y:terrainHeight(x,z),width:7,road:0};
 roadProfiles.forEach((road,id)=>{for(const p of road.curve.getSpacedPoints(80)){const distance=Math.hypot(p.x-x,p.z-z);if(distance<best.distance)best={distance,x:p.x,z:p.z,y:p.y-.2,width:road.width,road:id};}});return best;
}
/** Distance to the actual curved road edge, rather than the control-point polyline. */
export function roadEdgeDistance(x:number,z:number){return Math.min(Infinity,...nearby(x,z).map(r=>r.distance-r.width/2));}
export function gradedTerrainHeight(x:number,z:number){
 const base=terrainHeight(x,z);let total=0,weighted=0,coverage=0;
 for(const road of nearby(x,z)){
  const distance=road.distance-road.width/2-1.8,t=THREE.MathUtils.clamp(1-distance/4,0,1),weight=t*t*(3-2*t);
  total+=weight;weighted+=road.y*weight;coverage=Math.max(coverage,weight);
 }return total?THREE.MathUtils.lerp(base,weighted/total,coverage):base;
}
export const promenadeCurve=new THREE.CatmullRomCurve3(Array.from({length:28},(_,i)=>{const z=-172+i*13;return new THREE.Vector3(westCoast(z)+8,terrainHeight(westCoast(z)+8,z),z)}),false,'catmullrom',.16);
