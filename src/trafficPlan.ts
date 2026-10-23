import * as THREE from 'three';
import {roadProfiles,roadEdgeDistance,nearestRoad} from './roadNetwork';
import {isLand,ZONES,westCoast} from './layout';
import {surfaceHeight} from './terrainSurface';
import {gridCell} from './mapCoordinates';
import {findJunctions,makeTrafficRoute,type Vehicle,type VehiclePose} from './trafficSimulation';
import type {SignalColor} from './trafficAssets';
export interface FixtureSite {id:string;kind:'lamp'|'signal';x:number;y:number;z:number;heading:number;grid:string;road:number;junction?:number;curbSide?:number}
export const junctionPlan=findJunctions(roadProfiles.map((r,i)=>makeTrafficRoute(r.curve,i)));
// Complex arterial junctions first; small residential T-junctions retain reservations.
export const controlledJunctions=[1,2,3,7,13];
export function signalColor(seconds:number,junction:number,road:number):SignalColor{
 const zone=junctionPlan[junction],primary=[...zone.routes].sort((a,b)=>roadProfiles[b].width-roadProfiles[a].width||a-b)[0];
 const t=((seconds+junction*7)%52+52)%52;
 return road===primary?(t<22?'green':t<25?'amber':'red'):(t>=28&&t<47?'green':t>=47&&t<50?'amber':'red');
}
let installedSignals:FixtureSite[]=[];
export function registerSignalStops(sites:FixtureSite[]){installedSignals=sites.filter(s=>s.kind==='signal');}
export function signalAllows(car:Vehicle,next:VehiclePose,seconds:number){
 if(car.route.id===0&&car.pose.position.z< -154)return true;
 const roadId=car.route.id===0?nearestRoad(car.pose.position.x,car.pose.position.z).road:car.route.id;
 if(installedSignals.length&&!car.route.elevated){
  for(const s of installedSignals){if(s.road!==roadId||signalColor(seconds,s.junction!,s.road)==='green')continue;
   const fx=-Math.sin(s.heading),fz=-Math.cos(s.heading);if(fx*Math.sin(car.pose.heading)+fz*Math.cos(car.pose.heading)<.65)continue;
   const current=(car.pose.position.x-s.x)*fx+(car.pose.position.z-s.z)*fz+car.length/2+2;
   const future=(next.position.x-s.x)*fx+(next.position.z-s.z)*fz+car.length/2+2;
   const lateral=Math.abs((car.pose.position.x-s.x)*fz-(car.pose.position.z-s.z)*fx);
   if(lateral<roadProfiles[s.road].width+2&&current<=.04&&future>0)return false;
  }return true;
 }
 if(car.route.elevated)return true;
 for(const i of controlledJunctions){const j=junctionPlan[i];if(!j.routes.has(roadId)||signalColor(seconds,i,roadId)==='green')continue;
  const dx=j.position.x-car.pose.position.x,dz=j.position.z-car.pose.position.z;
  // A committed vehicle clears the intersection even after its phase changes.
  const stop=j.radius+car.length/2+2.5,current=Math.hypot(dx,dz),future=Math.hypot(next.position.x-j.position.x,next.position.z-j.position.z);
  if(current>=stop-.12&&future<stop&&dx*Math.sin(car.pose.heading)+dz*Math.cos(car.pose.heading)>0)return false;
 }return true;
}
/** Complete foundation footprint, every curved road and the at-grade tram envelope. */
export function baseClear(x:number,z:number,r=.4){
 for(const dx of [-r,0,r])for(const dz of [-r,0,r]){const px=x+dx,pz=z+dz;
  if(!isLand(px,pz)||roadEdgeDistance(px,pz)<.65)return false;
  if(pz>=-154&&pz<=78&&Math.abs(px-(westCoast(pz)+20))<3.35)return false;
  if(Object.entries(ZONES).some(([id,s])=>id!=='cruise'&&Math.abs(px-s.x)<s.w/2+.5&&Math.abs(pz-s.z)<s.d/2+.5))return false;
 }return true;
}
export function planTrafficFixtures(blocked:(x:number,z:number)=>boolean=()=>false){
 const sites:FixtureSite[]=[];
 const add=(kind:FixtureSite['kind'],road:number,p:THREE.Vector3,heading:number,junction?:number)=>{sites.push({id:kind+'-'+String(sites.filter(s=>s.kind===kind).length+1).padStart(3,'0'),kind,x:p.x,y:surfaceHeight(p.x,p.z)-.03,z:p.z,heading,grid:gridCell(p.x,p.z).id,road,junction});};
 const clear=(p:THREE.Vector3)=>baseClear(p.x,p.z)&&!blocked(p.x,p.z);
 for(const ji of controlledJunctions){const j=junctionPlan[ji];for(const ri of j.routes){const r=roadProfiles[ri],n=Math.ceil(r.curve.getLength());let nearest=0,dist=Infinity;for(let k=0;k<=n;k++){const p=r.curve.getPointAt(k/n),d=p.distanceTo(j.position);if(d<dist){dist=d;nearest=k/n;}}
  for(const approach of [-1,1]){for(const setback of [0,5,10]){const distance=j.radius+4.2+setback,u=nearest+approach*distance/r.curve.getLength();if(u<.012||u>.988)continue;
   const p=r.curve.getPointAt(u),v=r.curve.getTangentAt(u).multiplyScalar(-approach);v.y=0;v.normalize();const normal=new THREE.Vector3(-v.z,0,v.x);
   // Incoming lane is the left offset of its heading in the existing traffic model.
   for(const curbSide of [1,-1]){for(const extra of [1.25,1.9,2.5]){const q=p.clone().addScaledVector(normal,curbSide*(r.width/2+extra));if(clear(q)&&sites.every(s=>Math.hypot(q.x-s.x,q.z-s.z)>3)){add('signal',ri,q,Math.atan2(-v.x,-v.z),ji);sites[sites.length-1].curbSide=curbSide;break;}}
   if(sites.some(s=>s.kind==='signal'&&s.junction===ji&&s.road===ri&&Math.sin(s.heading)*(-v.x)+Math.cos(s.heading)*(-v.z)>.8))break;}
   if(sites.some(s=>s.kind==='signal'&&s.junction===ji&&s.road===ri&&Math.sin(s.heading)*(-v.x)+Math.cos(s.heading)*(-v.z)>.8))break;
  }}
 }}
 roadProfiles.forEach((r,ri)=>{const length=r.curve.getLength(),spacing=r.width>=8?36:43;for(let distance=15,index=0;distance<length-12;distance+=spacing,index++){
  for(const shift of [0,6,-6]){const u=THREE.MathUtils.clamp((distance+shift)/length,0,1),p=r.curve.getPointAt(u),t=r.curve.getTangentAt(u),normal=new THREE.Vector3(-t.z,0,t.x).normalize();let placed=false;
   for(const side of ri===9?[1,-1]:[index%2?1:-1,index%2?-1:1]){const q=p.clone().addScaledVector(normal,side*(r.width/2+1.4));
    if(!clear(q)||junctionPlan.some(j=>Math.hypot(q.x-j.position.x,q.z-j.position.z)<j.radius+8)||sites.some(s=>Math.hypot(q.x-s.x,q.z-s.z)<(s.kind==='lamp'?25:7)))continue;
    add('lamp',ri,q,Math.atan2(p.x-q.x,p.z-q.z));placed=true;break;
   }if(placed)break;
  }
 }});return sites;
}
