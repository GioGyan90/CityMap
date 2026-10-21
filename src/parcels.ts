import {nearestRoad} from './roadNetwork';
import {buildParkingLots} from './parking';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import {type BuildingPlan} from './buildingPlans';
import { makeBuilding } from './buildings';
import { RES_BASES,ROOF_COLS } from './districts';
import { rr,pick,rnd } from './random';
import { isLand,terrainHeight,reserved,roadDistance,railCorridor } from './layout';
import { toon } from './materials';
import { world } from './scene';

export const occupied:{x:number;z:number;w:number;d:number}[]=[];
const officeSites:{x:number;z:number;w:number;d:number;entrance:{x:number;z:number}}[]=[];
export function buildParcels(){
 const districts=[
  {name:'skyline',x:[3,123],z:[-150,-88],count:27},
  {name:'oldtown',x:[5,104],z:[-94,-24],count:31},
  {name:'civic',x:[8,125],z:[39,109],count:28},
  {name:'hills',x:[109,226],z:[-132,108],count:52},
  {name:'resort',x:[16,112],z:[112,183],count:20},
  {name:'harbor',x:[192,220],z:[123,146],count:13}
 ];
 for(const district of districts){let made=0;for(let tries=0;tries<1500&&made<district.count;tries++){
  const x=rr(...district.x as [number,number]),z=rr(...district.z as [number,number]);
  const tower=district.name==='skyline',industrial=district.name==='harbor';
  const plan:BuildingPlan=industrial||tries%5===4?'rect':(['E','T','H','L','U','rect','rect','rect'] as const)[made%8];
  const compound=plan!=='rect';
  const w=compound?rr(13,20):rr(tower?10:6,tower?16:12),d=compound?rr(12,18):rr(6,tower?14:11);
  if(reserved(x,z,w,d)||railCorridor(x,z)||roadDistance(x,z)<Math.max(w,d)*.5+2)continue;
  if(!isLand(x-w/2,z-d/2)||!isLand(x+w/2,z+d/2)||surfaceHeight(x,z)>24)continue;
  if(occupied.some(p=>Math.abs(x-p.x)<(w+p.w)/2+1.8&&Math.abs(z-p.z)<(d+p.d)/2+1.8))continue;
  occupied.push({x,z,w,d});made++;
  const base=Math.max(...[-1,1].flatMap(a=>[-1,1].map(b=>surfaceHeight(x+a*w/2,z+b*d/2))));
  const h=tower?rr(29,66):district.name==='civic'?rr(9,23):district.name==='hills'?rr(6,15):rr(5,12);
  const style=tower?pick(['glass','stepped','round','artdeco'] as const):industrial?'warehouse':district.name==='resort'?'villa':pick(['arcade','apartment','pitched','flat'] as const);
  const frontage=nearestRoad(x,z);
  const group=makeBuilding({x,z,w,d,h,style,plan,frontage:[frontage.x,frontage.z],base:pick(RES_BASES),roof:pick(ROOF_COLS),elevation:base});
  group.userData.district=district.name;
  if(h>18){const wall=group.userData.entranceWall;officeSites.push({x,z,w,d,entrance:{x:x+wall.x,z:z+wall.z}});}
  // Solid foundations close the gap between a level building base and a sloping lot.
  const low=Math.min(surfaceHeight(x-w/2,z-d/2),surfaceHeight(x+w/2,z+d/2));
  if(base-low>.12){const foundation=new THREE.Mesh(new THREE.BoxGeometry(w+.2,base-low+.3,d+.2),toon(0xacae9e));foundation.position.y=-(base-low)/2;group.add(foundation);}
  if(plan==='rect'&&tower&&rnd()>.5){
   const wing=new THREE.Mesh(new THREE.BoxGeometry(w*.38,h*.52,d*.7),toon(0x7babc1));wing.position.set(w*.22,h*.26,d*.16);group.add(wing);
   const bridge=new THREE.Mesh(new THREE.BoxGeometry(w*.8,1.2,2.2),toon(0xc5d6d8));bridge.position.set(0,h*.55,0);group.add(bridge);
  }else if(plan==='rect'&&district.name==='civic'&&rnd()>.5){
   const glass=new THREE.Mesh(new THREE.CylinderGeometry(w*.36,w*.36,d*.7,12,1,false,0,Math.PI),toon(0x74a6b5));glass.rotation.z=Math.PI/2;glass.position.set(0,h+.7,0);group.add(glass);
  }
 }}
 const buildingCount=occupied.length;
 buildParkingLots(officeSites,occupied);
 world.userData.parcels={count:buildingCount,districts:districts.map(d=>d.name)};
}
