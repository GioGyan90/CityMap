import polygonClipping from 'polygon-clipping';
import {railRoute,nearestRailPoint} from './railNetwork';
import {RAIL_PLANS,railSpine} from './railNetworkPlan';
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

/** Horizontal fish-market walk intersects both real rail curves, with four open flange channels. */
export function buildFishMarketTramCrossing(_curve:THREE.CatmullRomCurve3){
 const curve=railRoute(RAIL_PLANS[0]),z=ZONES.fishmarket.z,crossings:{p:THREE.Vector3;t:THREE.Vector3;at:number}[]=[];
 for(let i=0;i<5000;i++){const a=curve.getPointAt(i/5000),b=curve.getPointAt((i+1)/5000);if((a.z-z)*(b.z-z)>0||Math.abs(b.z-a.z)<1e-8)continue;const f=(z-a.z)/(b.z-a.z),at=(i+f)/5000,p=curve.getPointAt(at);if(crossings.some(c=>c.p.distanceTo(p)<1))continue;crossings.push({p,t:curve.getTangentAt(at),at});}crossings.sort((a,b)=>a.p.x-b.p.x);
 const left=crossings[0],right=crossings[1],origin=left.p.clone();origin.z=z;const width=right.p.x-left.p.x,g=new THREE.Group();g.name='fish-market-tram-crossing';g.position.copy(origin);g.userData={trackSpacing:width,crossings:crossings.map(c=>c.at),railSlots:crossings.flatMap(c=>[-1,1].map(side=>c.p.clone().addScaledVector(new THREE.Vector3(c.t.z,0,-c.t.x).normalize(),side*.8).toArray()))};world.add(g);
 const floor=(x:number)=>left.p.y+(right.p.y-left.p.y)*THREE.MathUtils.clamp(x/width,0,1)+.15,outer=1.9;
 const rectangle=(x0:number,x1:number,z0:number,z1:number)=>[[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]]] as [number,number][][];
 const channels:[number,number][][][]=[];
 for(const c of crossings){const t=new THREE.Vector3(c.t.x,0,c.t.z).normalize(),normal=new THREE.Vector3(t.z,0,-t.x);for(const side of [-1,1]){const p=c.p.clone().addScaledVector(normal,side*.8).sub(origin),poly=[[-.115,-5],[.115,-5],[.115,5],[-.115,5]].map(([x,z])=>[p.x+normal.x*x+t.x*z,p.z+normal.z*x+t.z*z] as [number,number]);poly.push(poly[0]);channels.push([poly]);}}
 const panels=polygonClipping.difference(rectangle(-outer,width+outer,-1.3,1.3) as any,...channels as any),k=kit(g);
 for(const polygon of panels){const shape=new THREE.Shape(polygon[0].map(([x,z])=>new THREE.Vector2(x,z)));for(const hole of polygon.slice(1))shape.holes.push(new THREE.Path(hole.map(([x,z])=>new THREE.Vector2(x,z))));const geo=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false});const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i),h=p.getZ(i);p.setXYZ(i,x,floor(x)-h,z);}geo.computeVertexNormals();const m=k.mesh(geo,0xc8a374,0,0,0);m.name='crossing-infill';}
 for(let x=2.8;x<width-2.5;x+=2.8){const deck=floor(x)-.16;for(const z0 of [-.95,.95]){const ground=surfaceHeight(origin.x+x,z+z0)-origin.y,h=deck-ground;k.box(.17,h,.17,0x9f7b53,x,ground+h/2,z0).name='boardwalk-grounded-pile';}k.box(.24,.16,2.15,0x9f7b53,x,deck-.08,0).name='boardwalk-cross-beam';}
 for(const side of [-1,1]){const x=side<0?-outer:width+outer,end=side<0?-4.4:width+4.4,w=origin.x+end,ground=surfaceHeight(w,z)-origin.y+.025,shape=new THREE.Shape([new THREE.Vector2(x,floor(x)),new THREE.Vector2(end,ground),new THREE.Vector2(end,ground-.16),new THREE.Vector2(x,floor(x)-.16)]);k.mesh(new THREE.ExtrudeGeometry(shape,{depth:2.6,bevelEnabled:false}),0xc8a374,0,0,-1.3).name='crossing-approach-ramp';}
 return g;
}
