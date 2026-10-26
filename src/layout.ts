import {COMMERCIAL_PLAN,COMMERCIAL_HALL} from './commercialPlan';
import {inTunnelReservation} from './tunnelPlan';
import {inRailReservation} from './railNetworkPlan';
import {residentialCliffLift} from './residentialCliffPlan';
import {HARBOR_SITES} from './harborPlan';
/** Geography and zoning shared by terrain, parcels, roads, picking and labels. */
export const SHORE_Z=[-200,-180,-150,-120,-90,-50,0,40,80,120,160,202];
export const WEST_X=[-30,-69,-79,-76,-84,-69,-71,-83,-70,-60,-55,0];
export const EAST_X=[130,255,298,303,295,288,280,270,254,230,185,0];
function shore(z:number,values:number[]){for(let i=0;i<SHORE_Z.length-1;i++)if(z<=SHORE_Z[i+1]){const t=Math.max(0,(z-SHORE_Z[i])/(SHORE_Z[i+1]-SHORE_Z[i]));const k=t*t*(3-2*t);return values[i]+(values[i+1]-values[i])*k;}return values[values.length-1];}
export const westCoast=(z:number)=>shore(z,WEST_X);
export const eastCoast=(z:number)=>shore(z,EAST_X);
export function isLand(x:number,z:number){return z>=-200&&z<=202&&x>=westCoast(z)&&x<=eastCoast(z)||x>=120&&x<=190&&z>=145&&z<=181;}
export interface Zone {x:number;z:number;w:number;d:number;sx:number;sz:number;level?:number;ry?:number}
export const ZONES:Record<string,Zone>={
 cargo:{...HARBOR_SITES.cargo,sx:1,sz:1,level:1.06},passenger:{...HARBOR_SITES.passenger,sx:1,sz:1,level:1.06},
 villa:{x:254.5,z:25,w:17,d:24,sx:.85,sz:1},lighthouse:{x:254,z:50,w:16,d:16,sx:1,sz:1},
 park:{x:-13,z:-91.4,w:36,d:36,sx:1.15,sz:1.15,level:3.5974665423},market:{x:-9,z:15,w:45,d:42,sx:1.4,sz:1.25},hall2:{x:-13,z:57,w:24,d:28,sx:1.25,sz:1.25},
 fishmarket:{x:-82,z:57,w:20,d:24,sx:1,sz:1,level:.51,ry:Math.PI/2},
 hall1:{x:-16,z:-20,w:24,d:24,sx:1,sz:1},hall3:{...COMMERCIAL_HALL,w:12,d:14,sx:.62,sz:.62,level:COMMERCIAL_PLAN.y+COMMERCIAL_PLAN.deck,ry:COMMERCIAL_PLAN.rotation},
 hall4:{x:174,z:-32,w:20,d:24,sx:1,sz:1},hall5:{x:112,z:167,w:21,d:24,sx:1,sz:1,level:1.06,ry:Math.PI},
 hotel:{x:-12,z:140,w:51,d:45,sx:1.8,sz:1.7},civic:{x:60,z:16,w:48,d:47,sx:1.75,sz:1.7},
 hospital:{x:138,z:-40,w:45,d:74,sx:1.65,sz:1.35},campus:{x:156,z:48,w:36,d:68,sx:1.25,sz:1.15},
 cafe:{x:93,z:125,w:31,d:29,sx:1.2,sz:1.2},restaurant:{x:141,z:137,w:35,d:36,sx:1.3,sz:1.3},
 promenade:{x:westCoast(98)-1,z:98,w:22,d:20,sx:1,sz:1,level:1.06},
 port:{x:156,z:167,w:50,d:38,sx:1.15,sz:1.15,level:1.06},
 commercial:{x:77,z:-102,w:64,d:58,sx:1,sz:1,level:COMMERCIAL_PLAN.y,ry:COMMERCIAL_PLAN.rotation},cruise:{x:-106,z:180,w:75,d:25,sx:1,sz:1,level:0}
};
function smooth(a:number,b:number,v:number){const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);}
function rawHeight(x:number,z:number){
 const inland=smooth(8,35,x-westCoast(z));
 const terraces=3.2*smooth(-20,160,x)+3.1*smooth(100,-110,z)+1.4*Math.sin(x*.022)*Math.cos(z*.019);
 const hills=12*smooth(165,220,x);
 const north=smooth(-143,-194,z)*(31+12*Math.sin(x*.039)+6*Math.sin(x*.11));
 const east=smooth(208,282,x)*(30+12*Math.sin(z*.028)+8*Math.cos(z*.061));
 const base=1.06+Math.max(0,terraces+hills+north+east)*inland;
 return base+Math.min(residentialCliffLift(x,z,eastCoast),Math.max(0,6-base));
}
const terrainZones=Object.entries(ZONES).filter(([id])=>!['cruise','port','cargo','passenger','fishmarket','hall3'].includes(id)).map(([,s])=>({...s,level:s.level??rawHeight(s.x,s.z)}));
export function terrainHeight(x:number,z:number){
 let h=rawHeight(x,z);
 const quayDistance=Math.max(120-x,x-190,145-z,z-181);
 if(quayDistance<=0)return 1.06;
 if(quayDistance<10)h=1.06+(h-1.06)*smooth(0,10,quayDistance);
 for(const s of terrainZones){
  const distance=Math.max(Math.abs(x-s.x)-s.w/2,Math.abs(z-s.z)-s.d/2);
  if(distance<5){const level=s.level;h=h+(level-h)*(1-smooth(0,5,distance));}
 }
 return h;
}
export interface Road {id:string;width:number;points:[number,number][]}
export const ROAD_PATHS:Road[]=[
 {id:'central-boulevard',width:9,points:[[-32,-165],[-29,-148],[-7,-123],[20,-95],[28,-50],[25,-15],[22,40],[25,95],[26,163]]},
 {id:'hospital-ring',width:8,points:[[-7,-123],[30,-109],[94,-99],[177,-99],[197,-70],[196,-7],[195,65],[186,121],[167,148]]},
 {id:'civic-approach',width:7,points:[[25,-15],[60,-16],[95,-16],[108,-35],[108,-64],[94,-99]]},
 {id:'harbor-avenue',width:8,points:[[22,40],[62,46],[106,46],[123,79],[119,105],[119,150],[165,150]]},
 {id:'hotel-drive',width:6,points:[[26,95],[55,104],[62,155],[26,163],[-12,169],[-40,155]]},
 {id:'old-town-lane',width:5,points:[[20,-95],[55,-76],[83,-64],[108,-64]]},
 {id:'hill-neighborhood',width:5,points:[[177,-99],[178,-127],[150,-149],[117,-151],[94,-99]]},
 {id:'garden-lane',width:5,points:[[106,46],[104,5],[113,-1],[108,-35]]},
 {id:'east-hill-road',width:6,points:[[195,65],[224,68],[239,32],[230,-25],[214,-70],[197,-70]]},
 {id:'seafront-road',width:5,points:Array.from({length:18},(_,i)=>{const z=-160+i*19;return [westCoast(z)+14,z] as [number,number]})}
];
export function roadDistance(x:number,z:number){let best=Infinity;for(const road of ROAD_PATHS)for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i];const vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz)));best=Math.min(best,Math.hypot(x-a[0]-t*vx,z-a[1]-t*vz)-road.width/2);}return best;}
export function reserved(x:number,z:number,w:number,d:number){return inTunnelReservation(x,z,Math.max(w,d)/2)||(x>230&&x<260&&z>19&&z<62)||Object.entries(ZONES).some(([id,s])=>id!=='cruise'&&Math.abs(x-s.x)<(s.w+w)/2+3&&Math.abs(z-s.z)<(s.d+d)/2+3);}
function pathDistance(x:number,z:number,points:number[][]){let best=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz)));best=Math.min(best,Math.hypot(x-a[0]-vx*t,z-a[1]-vz*t));}return best;}
export function railCorridor(x:number,z:number){return inRailReservation(x,z)||pathDistance(x,z,[[192,-125],[225,-82],[235,-14],[226,57],[206,114]])<14;}
