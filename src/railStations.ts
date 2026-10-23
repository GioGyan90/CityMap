import * as THREE from 'three';
import {world} from './scene';
import {surfaceHeight} from './terrainSurface';
import {railSpine,railSidePoint,type RailPlan} from './railNetworkPlan';
import {stationBox as box,stationBeam as beam,batchStationPart} from './coastalStationAssets';
import {sign} from './conceptDetails';
import {gridCell} from './mapCoordinates';
import {occupied} from './parcels';
import {buildingFootprints} from './config';
import {paintGroundPath} from './groundRoadMaterial';
import {nearestRoad} from './roadNetwork';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
export const railStationSites:{id:string;grid:string;position:number[];tracks:number;platformLength:number;access:string}[]=[];
/** Paired outside platforms with a grade-separated passenger connection. */
export function buildRailStations(plan:RailPlan,_circuit:THREE.CatmullRomCurve3,height:(x:number,z:number)=>number){
 const spine=railSpine(plan);
 for(const [index,t]of plan.stops.entries()){
  const p=spine.getPointAt(t),tan=spine.getTangentAt(t),angle=Math.atan2(tan.x,tan.z),root=new THREE.Group(),L=plan.elevated?24:17;p.y=height(p.x,p.z);root.position.copy(p);root.rotation.y=angle;root.name=plan.elevated?'elevated-rail-station':'coastal-paired-station';world.add(root);
  const trackDeltas=[0,plan.spacing].map(x=>{const q=new THREE.Vector3(x,0,0).applyAxisAngle(v(0,1,0),angle).add(p);return height(q.x,q.z)-p.y;});
  const toWorld=(x:number,z:number)=>v(x,0,z).applyAxisAngle(v(0,1,0),angle).add(p),platformY=.58;
  for(const [track,x]of [[0,-3.35],[1,plan.spacing+3.35]]){
   // Existing clock-tower station serves the inland platform at the south coast stop.
   if(plan.id==='coast'&&index===2&&track===1)continue;
   const part=new THREE.Group();part.name='platform-'+(track+1);part.position.y=trackDeltas[track];root.add(part);const qa=toWorld(track===0?0:plan.spacing,-L/2),qb=toWorld(track===0?0:plan.spacing,L/2);part.rotation.x=-Math.atan2(height(qb.x,qb.z)-height(qa.x,qa.z),L);
   box(part,2.8,.6,L,0xded4b9,x,.28,0,'boarding-platform');box(part,.2,.035,L-.5,0xf2c954,x+(track===0?1:-1)*1.15,platformY+.025,0,'tactile-platform-edge');
   box(part,3.2,.18,L+.4,0x367f9b,x,4.15,0,'independent-station-canopy');
   for(const z of [-L/2+1,0,L/2-1]){const outer=x+(track===0?-1:1)*.9;box(part,.15,3.5,.15,0x6c8a8c,outer,2.36,z,'canopy-support');beam(part,v(outer,3.3,z),v(x,4.06,z),.1,0x6c8a8c,'canopy-brace');}
   for(const z of [-L/2+1,L/2-1]){box(part,.1,1.05,.1,0x668888,x+(track===0?-1:1)*1.31,1.1,z,'outer-safety-rail-post');}
   box(part,.1,.08,L-.2,0x668888,x+(track===0?-1:1)*1.31,1.61,0,'outer-platform-railing');
   const board=sign((track===0?'1':'2')+' · '+(plan.id==='coast'?'COAST LINE':'HILL EXPRESS'),0,0,0,4,.65,'#245b73');part.add(board);board.position.set(x,3.45,1);board.rotation.y=Math.PI/2;board.name='platform-direction-board';
   for(const z of [-3,3]){box(part,.65,.14,1.7,0xb99460,x,1.08,z,'platform-seat');for(const dz of [-.6,.6])box(part,.5,.45,.1,0x6c8a8c,x,.79,z+dz,'seat-leg');}
   if(plan.elevated){for(const z of [-L/2+1,L/2-1]){const q=toWorld(x,z),drop=height(q.x,q.z)-surfaceHeight(q.x,q.z);box(root,1.25,drop-.5,1.5,0xaab9ad,x,height(q.x,q.z)-p.y-(drop+.5)/2,z,'grounded-platform-pier');}}
   else {const levels=[-L/2,L/2].map(z=>{const q=toWorld(x,z);return surfaceHeight(q.x,q.z)-p.y;}),low=Math.min(...levels)-.15;box(part,2.8,-low,L,0xc6b393,x,low/2,0,'solid-ground-platform-foundation');}
  }
  // Clear-span bridge is above the vehicle roof and canopy, no stairs across running rails.
  const z=-L/2+2,bridgeY=Math.max(...trackDeltas)+5.8,outer=[plan.elevated?-5.7:-3.9,plan.spacing+5.7];box(root,plan.spacing+11.4,.25,2.1,0xe5d9bd,plan.spacing/2,bridgeY,z,'passenger-footbridge-deck');
  for(const dz of [-1,1]){box(root,plan.spacing+11.4,.08,.08,0x5e8588,plan.spacing/2,bridgeY+1.15,z+dz,'footbridge-handrail');for(let x=-5.7;x<=plan.spacing+5.7;x+=2)box(root,.075,1.1,.075,0x5e8588,x,bridgeY+.57,z+dz,'footbridge-guard-post');}
  for(const [track,x]of outer.entries()){const q=toWorld(x,z),ground=surfaceHeight(q.x,q.z)-p.y,drop=bridgeY-ground;box(root,2.1,drop+2.4,2.5,0xd5dfd4,x,(bridgeY+2.4+ground)/2,z,'passenger-lift-shaft');box(root,2.45,.25,2.8,0x367f9b,x,bridgeY+2.55,z,'lift-roof');
   for(const [level,y]of [ground+.95,platformY+trackDeltas[track]+.95,bridgeY+1.05].entries()){box(root,.08,1.8,1.15,0x4c8698,x+(x<0?1:-1)*(level===0?-1:1)*1.08,y,z,'lift-landing-door');}
   const glassHeight=Math.max(.2,drop-1.9);box(root,1.6,glassHeight,.08,0x7cb1b8,x,ground+2+glassHeight/2,z+1.28,'lift-shaft-glazing');for(let y=ground+2;y<bridgeY;y+=3)box(root,1.8,.07,.1,0x95a99f,x,y,z+1.29,'shaft-transom');
   const trackX=x<0?-3.35:plan.spacing+3.35;box(root,Math.abs(x-trackX)+.3,.16,1.8,0xded4b9,(x+trackX)/2,platformY+trackDeltas[track]-.08,z,'lift-to-platform-link');
   const entry=toWorld(x+(x<0?-1.8:1.8),z),road=nearestRoad(entry.x,entry.z),dx=entry.x-road.x,dz=entry.z-road.z,l=Math.hypot(dx,dz),edge:[number,number]=[road.x+dx/l*(road.width/2+1),road.z+dz/l*(road.width/2+1)];
   // Only connect where a short ground walk stays on the same side of both tracks.
   if(Math.hypot(entry.x-edge[0],entry.z-edge[1])<12)paintGroundPath([[entry.x,entry.z],edge],1.8,'walk');
  }
  const id=plan.id+'-station-'+index;root.userData={id,grid:gridCell(p.x,p.z).id,tracks:2,platformLength:L,clearance:5.65};
  railStationSites.push({id,grid:root.userData.grid,position:p.toArray(),tracks:2,platformLength:L,access:'outside-platforms / lifts / overhead-footbridge'});
  root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),c=bounds.getCenter(v(0,0,0)),size=bounds.getSize(v(0,0,0));const footprint={x:c.x,z:c.z,w:size.x+1,d:size.z+1};occupied.push(footprint);buildingFootprints.push(footprint);
  batchStationPart(root);
 }
 world.userData.railStations=railStationSites;
}
