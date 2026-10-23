import {RAIL_PLANS,railCircuit} from './railNetworkPlan';
import {STATION_RESERVATION} from './coastalStationPlan';
import polygonClipping from 'polygon-clipping';
import * as THREE from 'three';
import {roadProfiles,roadEdgeDistance} from './roadNetwork';
import {ZONES,isLand,westCoast,railCorridor} from './layout';
import {surfaceHeight} from './terrainSurface';
import {gridCell} from './mapCoordinates';
import {parkingAccessPaths} from './parking';
export type Point=[number,number];
type Poly=Point[][];
export interface HomePlan {id:string;grid:string;x:number;z:number;w:number;d:number;floors:number;heading:number;seed:number}
export interface CourtPlan {id:string;grid:string;ring:Point[];garden:Point;gate:Point;road:Point;homes:HomePlan[];walks:{points:Point[];width:number;owner?:string}[];area:number}
export const rectangle=(x:number,z:number,w:number,d:number):Poly=>[[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2],[x-w/2,z-d/2]]];
export function polygonArea(ring:Point[]){return Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);}
export function inside(ring:Point[],x:number,z:number){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function edgeDistance(ring:Point[],x:number,z:number){let best=Infinity;for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));}return best;}
function strip(curve:THREE.Curve<THREE.Vector3>,width:number):Poly{const n=Math.ceil(curve.getLength()/2),sides=[-1,1].map(side=>Array.from({length:n+1},(_,i)=>{const p=curve.getPointAt(i/n),v=curve.getTangentAt(i/n),l=Math.hypot(v.x,v.z);return [p.x-v.z/l*width/2*side,p.z+v.x/l*width/2*side] as Point;}));const ring=[...sides[0],...sides[1].reverse()];ring.push(ring[0]);return [ring];}
function roadConnection(gate:Point,ring:Point[],occupied:Poly[]){let best:{road:Point;distance:number}|undefined;
 for(const r of roadProfiles){for(const p of r.curve.getSpacedPoints(Math.ceil(r.curve.getLength()/2))){const distance=Math.hypot(p.x-gate[0],p.z-gate[1]);if(distance>12||distance<r.width/2+1||best&&distance>=best.distance)continue;
  const dx=(p.x-gate[0])/distance,dz=(p.z-gate[1])/distance,end:Point=[p.x-dx*(r.width/2+.7),p.z-dz*(r.width/2+.7)];let clear=true;
  for(let k=1;k<=12;k++){const t=k/12,x=gate[0]+(end[0]-gate[0])*t,z=gate[1]+(end[1]-gate[1])*t;if(!isLand(x,z)||railCorridor(x,z)||occupied.some(poly=>inside(poly[0],x,z))||Object.values(ZONES).some(s=>Math.abs(x-s.x)<s.w/2+1&&Math.abs(z-s.z)<s.d/2+1)){clear=false;break;}}
  if(clear&&Math.abs(surfaceHeight(...gate)-surfaceHeight(...end))<1.2)best={road:end,distance};
 }}return best?.road;
}
export function planResidentialCourts(occupied:{x:number;z:number;w:number;d:number}[]){
 const obstacles:Poly[]=[rectangle(STATION_RESERVATION.x,STATION_RESERVATION.z,STATION_RESERVATION.w,STATION_RESERVATION.d),...roadProfiles.map(r=>strip(r.curve,r.width+4.8)),...Object.values(ZONES).map(s=>rectangle(s.x,s.z,s.w+6,s.d+6)),...occupied.map(s=>rectangle(s.x,s.z,s.w+3,s.d+3))];
 for(const plan of RAIL_PLANS)obstacles.push(strip(railCircuit(plan),10));
 for(const path of parkingAccessPaths){const [a,b]=path.points;obstacles.push(strip(new THREE.LineCurve3(new THREE.Vector3(a[0],0,a[1]),new THREE.Vector3(b[0],0,b[1])),path.width+3));}
 for(const [x,z] of [[42,-82],[89,-92],[42,70],[105,101]])obstacles.push(rectangle(x,z,14,5));
 const results:CourtPlan[]=[],used:Poly[]=[];
 // Forty-metre neighbourhood cells align with the existing twenty-metre planning grid.
 const candidates:Point[]=[];for(let z=-120;z<=180;z+=20)for(let x=-20;x<=220;x+=20)candidates.push([x,z]);
 for(const [cx,cz] of candidates){if(results.length>=22)break;
  const clips=polygonClipping.difference(rectangle(cx,cz,42,40) as any,...[...obstacles,...used].map(p=>p as any));
  for(const polygon of clips){if(polygon.length!==1)continue;const ring=polygon[0] as Point[],area=polygonArea(ring);if(area<290||ring.some(([x,z])=>!isLand(x,z)))continue;
   const minX=Math.min(...ring.map(p=>p[0])),maxX=Math.max(...ring.map(p=>p[0])),minZ=Math.min(...ring.map(p=>p[1])),maxZ=Math.max(...ring.map(p=>p[1]));
   const open:Point[]=[];for(let z=minZ+3;z<maxZ-3;z+=2)for(let x=minX+3;x<maxX-3;x+=2)if(inside(ring,x,z)&&edgeDistance(ring,x,z)>3.4)open.push([x,z]);
   if(!open.length)continue;let twiceArea=0,mx=0,mz=0;for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],cross=a[0]*b[1]-b[0]*a[1];twiceArea+=cross;mx+=(a[0]+b[0])*cross;mz+=(a[1]+b[1])*cross;}const centroid:Point=[mx/(3*twiceArea),mz/(3*twiceArea)];open.sort((a,b)=>Math.hypot(a[0]-centroid[0],a[1]-centroid[1])-Math.hypot(b[0]-centroid[0],b[1]-centroid[1]));let garden=open[0];
   let gate:Point|undefined,road:Point|undefined,best=Infinity;
   for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<4.6)continue;
    for(const t of [.3,.5,.7]){const p:Point=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],q=roadConnection(p,ring,[...used,...occupied.map(s=>rectangle(s.x,s.z,s.w+2,s.d+2))]);if(!q)continue;const cost=Math.hypot(q[0]-p[0],q[1]-p[1])+Math.hypot(p[0]-garden[0],p[1]-garden[1])*.15;
     if(cost<best){best=cost;gate=p;road=q;}
    }
   }if(!gate||!road)continue;
   const clearPath=(p:Point)=>{for(let k=0;k<=15;k++)if(!inside(ring,p[0]+(garden[0]-p[0])*k/16,p[1]+(garden[1]-p[1])*k/16))return false;return true;};
   const placeHomes=()=>{const homes:HomePlan[]=[],slots:Point[]=[];for(let z=minZ+4.7;z<maxZ-4;z+=9.5)for(let x=minX+4.7;x<maxX-4;x+=9.5)slots.push([x,z]);slots.sort((a,b)=>Math.hypot(b[0]-garden[0],b[1]-garden[1])-Math.hypot(a[0]-garden[0],a[1]-garden[1]));
   for(const [x,z] of slots){if(homes.length>=5)break;if(Math.hypot(x-garden[0],z-garden[1])<6.2||!clearPath([x,z]))continue;
    const dx=garden[0]-gate[0],dz=garden[1]-gate[1],t=THREE.MathUtils.clamp(((x-gate[0])*dx+(z-gate[1])*dz)/(dx*dx+dz*dz),0,1);if(Math.hypot(x-gate[0]-dx*t,z-gate[1]-dz*t)<5)continue;
    const corners=[-4,0,4].flatMap(a=>[-4,0,4].map(b=>[x+a,z+b] as Point));if(corners.some(([x,z])=>!inside(ring,x,z)||railCorridor(x,z)||edgeDistance(ring,x,z)<.6||roadEdgeDistance(x,z)<2.1))continue;
    const heights=corners.map(p=>surfaceHeight(...p));if(Math.max(...heights)-Math.min(...heights)>2.0)continue;
    const heading=Math.round(Math.atan2(garden[0]-x,garden[1]-z)/(Math.PI/2))*Math.PI/2,seed=23001+results.length*131+homes.length*17;
    homes.push({id:'home-'+gridCell(x,z).id+'-'+seed,grid:gridCell(x,z).id,x,z,w:6.2+(seed%3)*.3,d:5.5+(seed%2)*.4,floors:2+seed%2,heading,seed});
   }return homes;};
   let homes:HomePlan[]=[],chosenGarden=garden;const gardenChoices:Point[]=[];for(const p of open)if(gardenChoices.length<24&&gardenChoices.every(q=>Math.hypot(q[0]-p[0],q[1]-p[1])>=3))gardenChoices.push(p);
   for(const candidate of gardenChoices){garden=candidate;const entryClear=Array.from({length:17},(_,k)=>k/17).every(t=>inside(ring,gate![0]+(garden[0]-gate![0])*Math.max(.001,t),gate![1]+(garden[1]-gate![1])*Math.max(.001,t)));if(!entryClear)continue;const option=placeHomes();if(option.length>homes.length){homes=option;chosenGarden=candidate;}if(homes.length===5)break;}garden=chosenGarden;
   if(homes.length<3)continue;
   let walks=routeCourtWalks(ring,garden,gate,homes);while(!walks&&homes.length>3){homes.pop();walks=routeCourtWalks(ring,garden,gate,homes);}if(!walks)continue;
   const id='court-'+gridCell(cx,cz).id+'-'+String(results.length+1).padStart(2,'0');results.push({id,grid:gridCell(cx,cz).id,ring,garden,gate,road,homes,walks,area});used.push([ring]);
  }
 }return results;
}

/** Route paths through remaining garden land instead of drawing straight through neighbouring houses. */
export function routeCourtWalks(ring:Point[],garden:Point,gate:Point,homes:HomePlan[]){
 const step=.75,minX=Math.min(...ring.map(p=>p[0])),minZ=Math.min(...ring.map(p=>p[1])),cols=Math.ceil((Math.max(...ring.map(p=>p[0]))-minX)/step)+1,rows=Math.ceil((Math.max(...ring.map(p=>p[1]))-minZ)/step)+1;
 const xy=(id:number):Point=>[minX+(id%cols)*step,minZ+Math.floor(id/cols)*step];
 const route=(from:Point,to:Point,width:number,gatePath=false)=>{const margin=width/2+.08,clear=(p:Point)=>inside(ring,...p)&&edgeDistance(ring,...p)>margin&&homes.every(h=>{const dx=p[0]-h.x,dz=p[1]-h.z,c=Math.cos(h.heading),s=Math.sin(h.heading);return Math.abs(dx*c-dz*s)>h.w/2+margin||Math.abs(dx*s+dz*c)>h.d/2+margin;});
  const valid=new Uint8Array(cols*rows),starts:{id:number;distance:number}[]=[],goals:{id:number;distance:number}[]=[];
  for(let id=0;id<valid.length;id++){const p=xy(id);if(!clear(p))continue;valid[id]=1;const a=Math.hypot(p[0]-from[0],p[1]-from[1]),b=Math.hypot(p[0]-to[0],p[1]-to[1]);if(a<(gatePath?2.5:1.5))starts.push({id,distance:a});if(b<1.5)goals.push({id,distance:b});}
  starts.sort((a,b)=>a.distance-b.distance);goals.sort((a,b)=>a.distance-b.distance);if(!starts.length||!goals.length)return;
  const end=goals[0].id,start=starts[0].id,queue=[start],previous=new Int32Array(valid.length).fill(-1);previous[start]=start;let found=false;
  for(let head=0;head<queue.length;head++){const id=queue[head];if(id===end){found=true;break;}const x=id%cols,z=Math.floor(id/cols);for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){const nx=x+dx,nz=z+dz,next=nz*cols+nx;if(nx<0||nz<0||nx>=cols||nz>=rows||!valid[next]||previous[next]!==-1)continue;const a=xy(id),b=xy(next);if(!clear([(a[0]+b[0])/2,(a[1]+b[1])/2]))continue;previous[next]=id;queue.push(next);}}
  if(!found)return;const ids=[end];while(ids[ids.length-1]!==start)ids.push(previous[ids[ids.length-1]]);ids.reverse();const raw=[from,...ids.map(xy),to],points=[raw[0]];
  for(let i=1;i<raw.length-1;i++){const a=raw[i-1],b=raw[i],c=raw[i+1],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(cross)>.001)points.push(b);}points.push(to);return {points,width};
 };
 const entry=route(gate,garden,2.1,true);if(!entry)return;const walks:{points:Point[];width:number;owner?:string}[]=[entry];
 for(const h of homes){const start:Point=[h.x+Math.sin(h.heading)*(h.d/2+.95),h.z+Math.cos(h.heading)*(h.d/2+.95)],walk=route(start,garden,1.45);if(!walk)return;walks.push({...walk,owner:h.id});}return walks;
}
