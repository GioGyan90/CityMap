import {railRoute,nearestRailPoint} from './railNetwork';
import {railSpine,railSidePoint,RAIL_PLANS} from './railNetworkPlan';
import * as THREE from 'three';
import {surfaceHeight} from './terrainSurface';
import {westCoast,ZONES} from './layout';
import {gridCell} from './mapCoordinates';
export const coastalRailCurve=()=>{const spine=railSpine(RAIL_PLANS[0]),points=Array.from({length:81},(_,i)=>{const p=railSidePoint(spine,i/80*.99,RAIL_PLANS[0].spacing);p.y=nearestRailPoint(railRoute(RAIL_PLANS[0]),p.x,p.z).point.y;return p;});return new THREE.CatmullRomCurve3(points,false,'catmullrom',.12);};
const curve=coastalRailCurve(),end=curve.getPointAt(1),tangent=curve.getTangentAt(1);
export const STATION_ORIGIN=end;
export const STATION_HEADING=Math.atan2(tangent.x,tangent.z);
export function stationWorld(x:number,y:number,z:number){return new THREE.Vector3(x,y,z).applyAxisAngle(new THREE.Vector3(0,1,0),STATION_HEADING).add(STATION_ORIGIN);}
export const STATION_PLAN={id:'coaststation',name:'海岸总站',grid:gridCell(end.x,end.z).id,origin:end.toArray(),heading:STATION_HEADING,platformLength:22,platformInner:2.05,platformOuter:5.8,platformTop:.55,canopyHeight:4.2,crossingClearZ:ZONES.fishmarket.z+1.5,building:{x:11.1,z:-2,w:8.8,d:14.4,h:5.1},forecourt:[[-2.4,5.5],[6.3,4.8],[16.8,4.8],[17,13.3],[-2.4,13.3]] as [number,number][]};
const points=[[-2,-16.5],[16,-11],[17,14],[-2,14]].map(([x,z])=>stationWorld(x,0,z));
export const STATION_RESERVATION={x:(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2,z:(Math.min(...points.map(p=>p.z))+Math.max(...points.map(p=>p.z)))/2,w:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))+1.5,d:Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z))+1.5};
/** Clip a world-space footprint away from the existing fish-market crossing path. */
export function clipStationRear(points:THREE.Vector3[],minZ=STATION_PLAN.crossingClearZ){const out:THREE.Vector3[]=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ai=a.z>=minZ,bi=b.z>=minZ;if(ai)out.push(a.clone());if(ai!==bi)out.push(a.clone().lerp(b,(minZ-a.z)/(b.z-a.z)));}return out;}
