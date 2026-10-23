import {buildingFootprints} from './config';
import {RAIL_PLANS,railCircuit,inRailReservation} from './railNetworkPlan';
import * as THREE from 'three';
import {world} from './scene';
import {roadProfiles,roadEdgeDistance} from './roadNetwork';
import {surfaceHeight} from './terrainSurface';
import {isLand,ZONES,westCoast} from './layout';
import {occupied} from './parcels';
import {parkingAccessBlocked} from './parking';
import {gridCell} from './mapCoordinates';
import {createBusShelter} from './residentialAssets';
export interface BusStopSite {id:string;x:number;y:number;z:number;heading:number;grid:string;road:string;scaleX:number;footprint:[number,number][]}
export const busStopSites:BusStopSite[]=[];
export function planBusStops(blocks=occupied){const sites:BusStopSite[]=[];
 const curve=(points:readonly (readonly number[])[])=>new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'catmullrom',.12),rail=railCircuit(RAIL_PLANS[1]),highway=curve([[192,-125],[225,-82],[235,-14],[226,57],[206,114]]),supports=[...Array.from({length:18},(_,i)=>rail.getPointAt(i/17)),...Array.from({length:14},(_,i)=>highway.getPointAt(i/13))];
 const stations=world.children.filter(o=>o.name==='elevated-rail-station').map(o=>new THREE.Box3().setFromObject(o));
 for(const [id,[tx,tz]]of [[32,-45],[29,77],[185,-81],[179,118]].entries()){
  const candidates:{x:number;z:number;heading:number;road:string;cost:number}[]=[];
  for(const r of roadProfiles)for(let i=0,n=Math.ceil(r.curve.getLength()/2);i<=n;i++){const p=r.curve.getPointAt(i/n);if(Math.hypot(p.x-tx,p.z-tz)>80)continue;const t=r.curve.getTangentAt(i/n),normal=new THREE.Vector3(-t.z,0,t.x).normalize();
   for(const side of [-1,1]){const x=p.x+normal.x*side*(r.width/2+2),z=p.z+normal.z*side*(r.width/2+2);candidates.push({x,z,heading:Math.atan2(-normal.x*side,-normal.z*side),road:r.id,cost:Math.hypot(x-tx,z-tz)});}
  }candidates.sort((a,b)=>a.cost-b.cost);
  search:for(const scaleX of [1,.75,.6])for(const c of candidates){const footprint:[number,number][]=[],levels:number[]=[];let valid=true;
   for(const dx of [-3.2*scaleX,0,3.2*scaleX])for(const dz of [-1.3,0,1.3]){const x=c.x+dx*Math.cos(c.heading)+dz*Math.sin(c.heading),z=c.z-dx*Math.sin(c.heading)+dz*Math.cos(c.heading);footprint.push([x,z]);levels.push(surfaceHeight(x,z));
    if(!isLand(x,z)||inRailReservation(x,z,2.6)||supports.some(p=>Math.hypot(p.x-x,p.z-z)<2)||stations.some(b=>x>b.min.x-.5&&x<b.max.x+.5&&z>b.min.z-.5&&z<b.max.z+.5)||roadEdgeDistance(x,z)<.6||parkingAccessBlocked(x,z)||blocks.some(b=>Math.abs(x-b.x)<b.w/2+.6&&Math.abs(z-b.z)<b.d/2+.6)||Object.values(ZONES).some(b=>Math.abs(x-b.x)<b.w/2+.8&&Math.abs(z-b.z)<b.d/2+.8))valid=false;
   }if(!valid||Math.max(...levels)-Math.min(...levels)>(scaleX===1?.5:.65))continue;if(sites.some(s=>Math.hypot(s.x-c.x,s.z-c.z)<10))continue;
   sites.push({id:'bus-stop-'+(id+1),x:c.x,y:Math.max(...levels)+.015,z:c.z,heading:c.heading,grid:gridCell(c.x,c.z).id,road:c.road,scaleX,footprint});break search;
  }
 }return sites;}
export function buildBusStops(){
 const root=new THREE.Group();root.name='curb-bus-stops';world.add(root);busStopSites.push(...planBusStops());
 for(const site of busStopSites){const g=createBusShelter();g.name=site.id;g.position.set(site.x,site.y,site.z);g.rotation.y=site.heading;g.scale.x=site.scaleX;g.userData=site;g.updateMatrixWorld(true);
  g.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const platform=o.name==='shelter-platform',support=['shelter-column','bench-support','bus-stop-post'].includes(o.name);if(!platform&&!support)return;const attr=o.geometry.attributes.position;for(let i=0;i<attr.count;i++){const original=attr.getY(i),p=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld),ground=surfaceHeight(p.x,p.z)-site.y;if(platform)attr.setY(i,ground+(original>0?.12:-.06)-o.position.y);else if(original<0)attr.setY(i,ground+.12-o.position.y);}attr.needsUpdate=true;o.geometry.computeVertexNormals();});root.add(g);const xs=site.footprint.map(p=>p[0]),zs=site.footprint.map(p=>p[1]);buildingFootprints.push({x:site.x,z:site.z,w:Math.max(...xs)-Math.min(...xs),d:Math.max(...zs)-Math.min(...zs)});
 }world.userData.busStops=busStopSites;
}
