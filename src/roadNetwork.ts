import {createHillApproaches} from './hillAccessPlan';
import * as THREE from 'three';
import {ROAD_PATHS,terrainHeight,westCoast} from './layout';
// Shared nearby anchors eliminate one-metre end gaps without shifting established road corridors.
const controls=ROAD_PATHS.map(r=>r.points.map(p=>[...p] as [number,number]));
for(let r=0;r<controls.length;r++)for(const end of [0,controls[r].length-1]){
 const p=controls[r][end];let candidate=p,distance=2.1;
 for(let q=0;q<r;q++)for(const a of controls[q]){const d=Math.hypot(a[0]-p[0],a[1]-p[1]);if(d<distance){candidate=a;distance=d;}}
 controls[r][end]=[...candidate];
}
class GradedRoad extends THREE.Curve<THREE.Vector3>{
 constructor(readonly planar:THREE.CatmullRomCurve3,readonly heights:number[]){super();this.arcLengthDivisions=1200;}
 getPoint(t:number,target=new THREE.Vector3()){const p=this.planar.getPoint(t,target),f=t*(this.heights.length-1),i=Math.min(this.heights.length-2,Math.floor(f));p.y=THREE.MathUtils.lerp(this.heights[i],this.heights[i+1],f-i);return p;}
}
export const roadProfiles=ROAD_PATHS.map((road,r)=>{
 const points=controls[r].map(([x,z])=>new THREE.Vector3(x,terrainHeight(x,z)+.2,z));if(road.id==='central-boulevard'){points[0].y=7.2;points[1].y=8.3;}
 const planar=new THREE.CatmullRomCurve3(points,false,'catmullrom',.16),n=Math.ceil(planar.getLength()),p=Array.from({length:n+1},(_,i)=>planar.getPoint(i/n)),height=p.map(v=>v.y),limit=.095;
 // Remove sharp terrain peaks with forward/backward grade envelopes, then smooth grade changes.
 for(let pass=0;pass<3;pass++){
  for(let i=1;i<=n;i++)height[i]=Math.min(height[i],height[i-1]+limit*Math.hypot(p[i].x-p[i-1].x,p[i].z-p[i-1].z));
  for(let i=n-1;i>=0;i--)height[i]=Math.min(height[i],height[i+1]+limit*Math.hypot(p[i].x-p[i+1].x,p[i].z-p[i+1].z));
 }
 for(let pass=0;pass<8;pass++){const prior=height.slice();for(let i=1;i<n;i++)height[i]=(prior[i-1]+2*prior[i]+prior[i+1])/4;}
 return {...road,points:controls[r],curve:new GradedRoad(planar,height)};
});
export const junctionAnchors=(()=>{const anchors:{x:number;z:number;radius:number;roads:string[]}[]=[];for(let a=0;a<controls.length;a++)for(let b=a+1;b<controls.length;b++)for(const p of controls[a])for(const q of controls[b])if(Math.hypot(p[0]-q[0],p[1]-q[1])<.1){let node=anchors.find(n=>Math.hypot(n.x-p[0],n.z-p[1])<.2);const radius=Math.hypot(ROAD_PATHS[a].width,ROAD_PATHS[b].width)/2+.65;if(node){node.radius=Math.max(node.radius,radius);node.roads=[...new Set([...node.roads,ROAD_PATHS[a].id,ROAD_PATHS[b].id])];}else anchors.push({x:p[0],z:p[1],radius,roads:[ROAD_PATHS[a].id,ROAD_PATHS[b].id]});}return anchors;})();
// Relax shared junction elevations through grade cones, rather than averaging mismatched road heights.
for(let pass=0;pass<8;pass++)for(const node of junctionAnchors){
 const members=roadProfiles.filter(r=>node.roads.includes(r.id)),height=Math.min(...members.map(r=>r.curve.getPoint(r.points.findIndex(p=>Math.hypot(p[0]-node.x,p[1]-node.z)<.1)/(r.points.length-1)).y));
 for(const r of members){const n=r.curve.heights.length-1,points=Array.from({length:n+1},(_,i)=>r.curve.planar.getPoint(i/n)),station=[0];for(let i=1;i<=n;i++)station.push(station[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));const t=r.points.findIndex(p=>Math.hypot(p[0]-node.x,p[1]-node.z)<.1)/(r.points.length-1),f=t*n,j=Math.min(n-1,Math.floor(f)),join=THREE.MathUtils.lerp(station[j],station[j+1],f-j);for(let i=0;i<=n;i++)r.curve.heights[i]=Math.min(r.curve.heights[i],height+.075*Math.max(0,Math.abs(station[i]-join)-1.5));}
}
for(const r of roadProfiles)r.curve.updateArcLengths();
export const hillApproaches=createHillApproaches(roadProfiles.find(r=>r.id==='east-hill-road')!.curve);
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
const accessCells=new Map<string,Segment[]>();
for(let road=0;road<hillApproaches.length;road++){
 const profile=hillApproaches[road];for(let i=1;i<profile.points.length;i++){
  const a=profile.points[i-1],b=profile.points[i],segment:Segment={ax:a.x,az:a.z,ay:a.y,dx:b.x-a.x,dz:b.z-a.z,dy:b.y-a.y,l2:(b.x-a.x)**2+(b.z-a.z)**2,road,width:profile.width};
  for(let x=Math.floor((Math.min(a.x,b.x)-8)/cellSize);x<=Math.floor((Math.max(a.x,b.x)+8)/cellSize);x++)for(let z=Math.floor((Math.min(a.z,b.z)-8)/cellSize);z<=Math.floor((Math.max(a.z,b.z)+8)/cellSize);z++){const key=x+','+z;if(!accessCells.has(key))accessCells.set(key,[]);accessCells.get(key)!.push(segment);}
 }
}
export function nearestHillAccess(x:number,z:number){let best={distance:Infinity,y:0,width:0,road:-1};for(const s of accessCells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))??[]){const t=THREE.MathUtils.clamp(((x-s.ax)*s.dx+(z-s.az)*s.dz)/s.l2,0,1),d=Math.hypot(x-s.ax-s.dx*t,z-s.az-s.dz*t);if(d<best.distance)best={distance:d,y:s.ay+s.dy*t,width:s.width,road:s.road};}return best;}
function nearby(x:number,z:number){
 const best=new Map<number,{distance:number;x:number;z:number;y:number;width:number;road:number}>();
 for(const s of cells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))??[]){
  const t=THREE.MathUtils.clamp(((x-s.ax)*s.dx+(z-s.az)*s.dz)/s.l2,0,1),px=s.ax+s.dx*t,pz=s.az+s.dz*t,distance=Math.hypot(x-px,z-pz);
  if(!best.has(s.road)||best.get(s.road)!.distance>distance)best.set(s.road,{distance,x:px,z:pz,y:s.ay+s.dy*t,width:s.width,road:s.road});
 }return [...best.values()];
}
const fallbackSamples=roadProfiles.map(r=>r.curve.getSpacedPoints(160));
export function nearestRoad(x:number,z:number){
 const near=nearby(x,z);if(near.length)return near.sort((a,b)=>a.distance-b.distance)[0];
 let best={distance:Infinity,x,z,y:terrainHeight(x,z),width:7,road:0};
 roadProfiles.forEach((road,id)=>{for(const p of fallbackSamples[id]){const distance=Math.hypot(p.x-x,p.z-z);if(distance<best.distance)best={distance,x:p.x,z:p.z,y:p.y-.2,width:road.width,road:id};}});return best;
}
/** Distance to the actual curved road edge, rather than the control-point polyline. */
export function roadEdgeDistance(x:number,z:number){const a=nearestHillAccess(x,z);return Math.min(a.distance-a.width/2,Infinity,...nearby(x,z).map(r=>r.distance-r.width/2));}
export function gradedTerrainHeight(x:number,z:number){
 const base=terrainHeight(x,z);let total=0,weighted=0,coverage=0;
 for(const road of nearby(x,z)){
  const distance=road.distance-road.width/2-1.8,t=THREE.MathUtils.clamp(1-distance/4,0,1),weight=t*t*(3-2*t);
  total+=weight;weighted+=road.y*weight;coverage=Math.max(coverage,weight);
 }const main=total?THREE.MathUtils.lerp(base,weighted/total,coverage):base;if(nearby(x,z).some(r=>r.distance<r.width/2+.7))return main;const a=nearestHillAccess(x,z),u=THREE.MathUtils.clamp(1-(a.distance-a.width/2-2)/6,0,1);const edge=Math.min(Infinity,...nearby(x,z).map(r=>r.distance-r.width/2)),publicFade=THREE.MathUtils.clamp((edge-.7)/2,0,1);const hill=THREE.MathUtils.lerp(main,a.y,u*u*(3-2*u)*publicFade),j=hillApproaches[1].junction;if(!j)return hill;const d=Math.hypot(x-j.x,z-j.z),blend=THREE.MathUtils.smoothstep(d,2.5,7),plane=j.y+j.slope*((x-j.x)*j.dx+(z-j.z)*j.dz);return THREE.MathUtils.lerp(plane,hill,blend);
}
export const promenadeCurve=new THREE.CatmullRomCurve3(Array.from({length:28},(_,i)=>{const z=-172+i*13;return new THREE.Vector3(westCoast(z)+8,terrainHeight(westCoast(z)+8,z),z)}),false,'catmullrom',.16);
