import * as THREE from 'three';
import {railCircuit,type RailPlan} from './railNetworkPlan';
import {surfaceHeight} from './terrainSurface';
const cache=new Map<string,THREE.CatmullRomCurve3>();
/** A graded embankment, rather than rails copied onto every terrain triangle. */
export function railRoute(plan:RailPlan){
 if(cache.has(plan.id))return cache.get(plan.id)!;
 const base=railCircuit(plan),pts=base.getSpacedPoints(Math.ceil(base.getLength()/1.5));pts.pop();const n=pts.length,step=base.getLength()/n;
 const ground=pts.map((p,i)=>{const t=base.getTangentAt(i/n),normal=new THREE.Vector3(t.z,0,-t.x).normalize(),width=plan.elevated?2.3:1.9;return Math.max(...[-width,0,width].map(s=>surfaceHeight(p.x+normal.x*s,p.z+normal.z*s)))+(plan.elevated?9:.42);});const grade=plan.elevated?.045:.1,graded=ground.map((h,i)=>Math.max(...ground.map((g,j)=>g-Math.min(Math.abs(j-i),n-Math.abs(j-i))*step*grade))),r=6,smoothed=graded.map((_,i)=>{let sum=0,weight=0;for(let j=-r;j<=r;j++){const w=r+1-Math.abs(j);sum+=graded[(i+j+n)%n]*w;weight+=w;}return sum/weight;}),lift=Math.max(0,...ground.map((g,i)=>g-smoothed[i]));pts.forEach((p,i)=>p.y=smoothed[i]+lift);

 const curve=new THREE.CatmullRomCurve3(pts,true,'centripetal');curve.arcLengthDivisions=5000;curve.updateArcLengths();cache.set(plan.id,curve);return curve;
}
const samples=new WeakMap<THREE.Curve<THREE.Vector3>,{points:THREE.Vector3[];cells:Map<string,number[]>}>();
export function nearestRailPoint(curve:THREE.Curve<THREE.Vector3>,x:number,z:number){let data=samples.get(curve);if(!data){const points=Array.from({length:3500},(_,i)=>curve.getPointAt(i/3500)),cells=new Map<string,number[]>();points.forEach((p,i)=>{const key=Math.floor(p.x/20)+':'+Math.floor(p.z/20);if(!cells.has(key))cells.set(key,[]);cells.get(key)!.push(i);});data={points,cells};samples.set(curve,data);}const nearby:number[]=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)nearby.push(...(data.cells.get((Math.floor(x/20)+dx)+':'+(Math.floor(z/20)+dz))??[]));let best=Infinity,index=0;for(const i of nearby.length?nearby:data.points.map((_,i)=>i)){const p=data.points[i],d=Math.hypot(p.x-x,p.z-z);if(d<best){best=d;index=i;}}return {point:data.points[index].clone(),at:index/3500,distance:best};}
