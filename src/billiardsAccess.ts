import * as THREE from 'three';
import {world} from './scene';
import {kit} from './referenceArchitecture';
import {surfaceHeight} from './terrainSurface';
import {ZONES} from './layout';
import {nearestRoad} from './roadNetwork';
import {paintGroundPath} from './groundRoadMaterial';
import {parkingAccessPaths} from './parking';
export function buildBilliardsAccess(){
 const shore=ZONES.fishmarket,hall=ZONES.hall2,road=nearestRoad(shore.x+13.2,shore.z),edge=road.width/2;
 const a:[number,number]=[shore.x+13.2,shore.z],b:[number,number]=[hall.x-hall.w/2+1,shore.z];
 paintGroundPath([a,[road.x-edge,shore.z]],2.6,'walk');paintGroundPath([[road.x+edge,shore.z],b],2.6,'walk');
 for(let x=road.x-edge+.3;x<road.x+edge;x+=.8)paintGroundPath([[x,shore.z-1.2],[x,shore.z+1.2]],.32,'line');
 parkingAccessPaths.push({points:[a,b],width:2.6});

 for(const id of ['market','hall1','hall2','hall3','hall4','hall5']){
  const s=ZONES[id],front=s.z+Math.cos(s.ry??0)*(id==='market'?14:10.5)*s.sz,side=s.x+s.w/2+2,road=nearestRoad(side,front);
  const near=nearestRoad(s.x,front);
  const points:[number,number][]=id==='hall5'?[[s.x,front],[near.x,near.z]]:[[s.x,front],[side,front],[road.x,road.z]];
  paintGroundPath(points,2.4,'walk');
  for(let i=1;i<points.length;i++)parkingAccessPaths.push({points:[points[i-1],points[i]],width:2.4});
 }
}

/** Match the real tram curve; preserve two open wheel/rail channels. */
export function buildFishMarketTramCrossing(curve:THREE.CatmullRomCurve3){
 let lo=0,hi=1;for(let i=0;i<35;i++){const t=(lo+hi)/2;if(curve.getPoint(t).z<ZONES.fishmarket.z)lo=t;else hi=t;}
 const t=(lo+hi)/2,p=curve.getPoint(t),v=curve.getTangent(t),g=new THREE.Group();g.name='fish-market-tram-crossing';g.position.copy(p);g.rotation.y=Math.atan2(v.x,v.z);world.add(g);const k=kit(g);
 for(const [a,b] of [[-1.9,-.91],[-.69,.69],[.91,1.9]]){const m=k.box(b-a,.18,2.6,0xc8a374,(a+b)/2,.11,0);m.name='crossing-infill';}
 for(const side of [-1,1]){const end=new THREE.Vector3(side*4.4,0,0).applyEuler(g.rotation).add(p),h=surfaceHeight(end.x,end.z)-p.y+.025;const shape=new THREE.Shape([new THREE.Vector2(side*1.9,.2),new THREE.Vector2(side*4.4,h),new THREE.Vector2(side*4.4,h-.16),new THREE.Vector2(side*1.9,.02)]);k.mesh(new THREE.ExtrudeGeometry(shape,{depth:2.6,bevelEnabled:false}),0xc8a374,0,0,-1.3).name='crossing-approach-ramp';
  k.box(.1,1.7,.1,0xe8d5a4,side*4.3,h+.85,1.7);for(const angle of [-Math.PI/4,Math.PI/4])k.box(.65,.1,.09,0xf4ece0,side*4.3,h+1.6,1.7).rotation.z=angle;
 }
 return g;
}
