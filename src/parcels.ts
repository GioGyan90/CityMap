import {buildResidentialCourtsSteps} from './residential';
import {buildParcelTerrace} from './parcelTerraces';
import {coastalPublicSpace,landmarkSetback,skylineHeight} from './urbanDesign';
import {nearestRoad} from './roadNetwork';
import {buildParkingLots,parkingAccessBlocked} from './parking';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import {type BuildingPlan} from './buildingPlans';
import { makeBuilding } from './buildings';
import { RES_BASES,ROOF_COLS } from './districts';
import {seededRandom} from './proceduralGeometry';
import { isLand,terrainHeight,reserved,roadDistance,railCorridor } from './layout';
import { toon } from './materials';
import { world } from './scene';

export const occupied:{x:number;z:number;w:number;d:number}[]=[];
const officeSites:{x:number;z:number;w:number;d:number;entrance:{x:number;z:number}}[]=[];
export function* buildParcelsSteps(){
 // Placement must not depend on whether facade textures were already cached.
 const rnd=seededRandom(20261021),rr=(a:number,b:number)=>a+rnd()*(b-a),pick=<T,>(items:readonly T[])=>items[Math.floor(rnd()*items.length)];
 const districts=[
  {name:'skyline',x:[3,123],z:[-150,-88],count:21},
  {name:'harbor',x:[192,220],z:[123,146],count:13}
 ];
 for(const district of districts){let made=0;for(let tries=0;tries<1500&&made<district.count;tries++){if(tries%8===0)yield;
  const x=rr(...district.x as [number,number]),z=rr(...district.z as [number,number]);
  const tower=district.name==='skyline',industrial=district.name==='harbor';
  const plan:BuildingPlan=industrial||tries%5===4?'rect':(['E','T','H','L','U','rect','rect','rect'] as const)[made%8];
  const compound=plan!=='rect';
  const w=compound?rr(13,20):rr(tower?10:6,tower?16:12),d=compound?rr(12,18):rr(6,tower?14:11);
  if([-.5,0,.5].some(a=>[-.5,0,.5].some(b=>parkingAccessBlocked(x+a*w,z+b*d)))||coastalPublicSpace(x,z,Math.max(w,d)/2)||landmarkSetback(x,z,w,d)||reserved(x,z,w,d)||[-.5,0,.5].some(dx=>[-.5,0,.5].some(dz=>railCorridor(x+dx*w,z+dz*d)))||roadDistance(x,z)<Math.max(w,d)*.5+2)continue;
  if(!isLand(x-w/2,z-d/2)||!isLand(x+w/2,z+d/2)||surfaceHeight(x,z)>24)continue;
  if(occupied.some(p=>Math.abs(x-p.x)<(w+p.w)/2+1.8&&Math.abs(z-p.z)<(d+p.d)/2+1.8))continue;
  occupied.push({x,z,w,d});made++;
  const heights=[-1,1].flatMap(a=>[-1,1].map(b=>surfaceHeight(x+a*w/2,z+b*d/2)));
  const base=Math.max(...heights);
  if(base-Math.min(...heights)>4){occupied.pop();made--;continue;}
  const h=tower?rr(skylineHeight(x,z)*.65,skylineHeight(x,z)):district.name==='civic'?rr(8,17):district.name==='hills'?rr(6,11):rr(5,12);
  const style=tower?pick(['glass','stepped','glass','stepped'] as const):industrial?'warehouse':district.name==='resort'||district.name==='hills'?'villa':pick(['arcade','apartment','pitched','flat'] as const);
  const frontage=nearestRoad(x,z);
  const group=makeBuilding({x,z,w,d,h,style,plan,frontage:[frontage.x,frontage.z],base:pick(district.name==='hills'?['#fff1cf','#ffe1b3','#ffedda']:RES_BASES),roof:pick(district.name==='hills'||district.name==='oldtown'?[0xcc724b,0xdd8b50,0xc46945]:ROOF_COLS),elevation:base});
  group.userData.district=district.name;world.userData.progressiveFacilityReady?.('ordinary:'+x+','+z,group);
  if(h>18){const wall=group.userData.entranceWall;officeSites.push({x,z,w,d,entrance:{x:x+wall.x,z:z+wall.z}});}
  // Solid foundations close the gap between a level building base and a sloping lot.
  const low=Math.min(...heights);
  if(district.name==='hills'||base-low>.6)buildParcelTerrace(group,w,d,group.userData.entranceWall,occupied);
  if(base-low>.12){const foundation=new THREE.Mesh(new THREE.BoxGeometry(w+.2,base-low+.3,d+.2),toon(0xc6b590));foundation.position.y=-(base-low)/2;group.add(foundation);}
  if(plan==='rect'&&tower&&rnd()>.5){
   if(style!=='glass'){const wing=new THREE.Mesh(new THREE.BoxGeometry(w*.38,h*.52,d*.7),toon(0x7babc1));wing.position.set(w*.22,h*.26,d*.16);group.add(wing);
   const bridge=new THREE.Mesh(new THREE.BoxGeometry(w*.8,1.2,2.2),toon(0xc5d6d8));bridge.position.set(0,h*.55,0);group.add(bridge);}
  }else if(plan==='rect'&&district.name==='civic'&&rnd()>.5){
   const glass=new THREE.Mesh(new THREE.CylinderGeometry(w*.36,w*.36,d*.7,12,1,false,0,Math.PI),toon(0x74a6b5));glass.rotation.z=Math.PI/2;glass.position.set(0,h+.7,0);group.add(glass);
  }
 }}
 const buildingCount=occupied.length;
 buildParkingLots(officeSites,occupied);
 yield* buildResidentialCourtsSteps(occupied);
 world.userData.parcels={count:buildingCount,districts:districts.map(d=>d.name)};
}

export function buildParcels(){for(const _ of buildParcelsSteps()){/* synchronous asset/headless API */}}
