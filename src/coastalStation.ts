import * as THREE from 'three';
import {world} from './scene';
import {surfaceHeight} from './terrainSurface';
import {nearestRoad} from './roadNetwork';
import {paintGroundPath,paintGroundPolygon} from './groundRoadMaterial';
import {parkingAccessPaths} from './parking';
import {buildingFootprints} from './config';
import {occupied} from './parcels';
import {registerGroup} from './specialBuildings';
import {gridCell} from './mapCoordinates';
import {createTree,createPlanter} from './plantAssets';
import {toon} from './materials';
import {STATION_PLAN as P,STATION_ORIGIN,STATION_HEADING,STATION_RESERVATION,stationWorld,clipStationRear} from './coastalStationPlan';
import {createStationHouse,createBufferStop,batchStationPart,stationBox as box,stationBeam as beam} from './coastalStationAssets';
export let coastalStation:THREE.Group|undefined;
export let coastalStationPreview:THREE.Group|undefined;
const local=(p:THREE.Vector3)=>p.clone().sub(STATION_ORIGIN).applyAxisAngle(new THREE.Vector3(0,1,0),-STATION_HEADING);
function point(x:number,y:number,z:number){return new THREE.Vector3(x,y,z);}
function solidDeck(root:THREE.Group,polygon:THREE.Vector3[],height:number,name:string,color=0xdac6a2){
 if(polygon.length<3)return;const ring=polygon.map(local),triangles=THREE.ShapeUtils.triangulateShape(ring.map(p=>new THREE.Vector2(p.x,p.z)),[]),v:number[]=[];
 for(const [a,b,c]of triangles){for(const i of [a,c,b])v.push(ring[i].x,height,ring[i].z);for(const i of [a,b,c])v.push(ring[i].x,surfaceHeight(polygon[i].x,polygon[i].z)-STATION_ORIGIN.y-.08,ring[i].z);}
 for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],ga=surfaceHeight(polygon[i].x,polygon[i].z)-STATION_ORIGIN.y-.08,gb=surfaceHeight(polygon[(i+1)%ring.length].x,polygon[(i+1)%ring.length].z)-STATION_ORIGIN.y-.08;v.push(a.x,height,a.z,a.x,ga,a.z,b.x,height,b.z,b.x,height,b.z,a.x,ga,a.z,b.x,gb,b.z);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,toon(color,{side:THREE.DoubleSide}));mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
}
function ramp(root:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,width:number){const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len*width/2,nz=dx/len*width/2,pts=[point(a.x-nx,a.y,a.z-nz),point(a.x+nx,a.y,a.z+nz),point(b.x+nx,b.y,b.z+nz),point(b.x-nx,b.y,b.z-nz)],v:number[]=[];
 for(const i of [0,1,2,0,2,3])v.push(...pts[i].toArray());for(const i of [0,2,1,0,3,2]){const p=pts[i],w=stationWorld(p.x,0,p.z);v.push(p.x,surfaceHeight(w.x,w.z)-STATION_ORIGIN.y-.05,p.z);}for(let i=0;i<4;i++){const p=pts[i],q=pts[(i+1)%4],pw=stationWorld(p.x,0,p.z),qw=stationWorld(q.x,0,q.z),py=surfaceHeight(pw.x,pw.z)-STATION_ORIGIN.y-.05,qy=surfaceHeight(qw.x,qw.z)-STATION_ORIGIN.y-.05;v.push(p.x,p.y,p.z,q.x,q.y,q.z,p.x,py,p.z,q.x,q.y,q.z,q.x,qy,q.z,p.x,py,p.z);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();const m=new THREE.Mesh(g,toon(0xe9d8b7,{side:THREE.DoubleSide}));m.name='accessible-platform-ramp';m.receiveShadow=true;root.add(m);
 for(const side of [-1,1]){const count=Math.ceil(len/2);for(let i=0;i<=count;i++){const t=i/count,x=a.x+dx*t+nx*side,z=a.z+dz*t+nz*side,y=a.y+(b.y-a.y)*t;box(root,.09,.95,.09,0x688b8b,x,y+.475,z,'ramp-handrail-post');}beam(root,point(a.x+nx*side,a.y+.93,a.z+nz*side),point(b.x+nx*side,b.y+.93,b.z+nz*side),.075,0x688b8b,'ramp-handrail');}
}
function path(points:THREE.Vector3[],width:number){const p=points.map(v=>[v.x,v.z] as [number,number]);paintGroundPath(p,width,'walk');for(let i=1;i<p.length;i++)parkingAccessPaths.push({points:[p[i-1],p[i]],width});}
export function buildCoastalStation(curve:THREE.CatmullRomCurve3){
 if(coastalStation)return coastalStation;const root=new THREE.Group();root.name='coastal-railway-terminus';root.position.copy(STATION_ORIGIN);root.rotation.y=STATION_HEADING;world.add(root);coastalStation=root;
 const platform=new THREE.Group();platform.name='curved-terminal-platform';root.add(platform);const span=curve.getLength(),sample=(distance:number,offset:number,height:number)=>{const p=curve.getPointAt(Math.max(0,Math.min(1,1-distance/span))),v=curve.getTangentAt(Math.max(0,Math.min(1,1-distance/span))),l=Math.hypot(v.x,v.z);p.x+=v.z/l*offset;p.z-=v.x/l*offset;p.y=STATION_ORIGIN.y+height;return p;};
 const inner:THREE.Vector3[]=[],outer:THREE.Vector3[]=[];for(let i=0;i<=32;i++){const d=P.platformLength*(1-i/32);inner.push(sample(d,P.platformInner,P.platformTop));outer.push(sample(d,P.platformOuter,P.platformTop));}
 solidDeck(platform,clipStationRear([...inner,...outer.reverse()]),P.platformTop,'terrain-supported-platform');
 solidDeck(platform,[[2.05,0],[5.8,0],[5.8,2],[2.05,2]].map(([x,z])=>stationWorld(x,0,z)),P.platformTop,'platform-end-landing');
 // A continuous canopy follows the real rail curve; no overlapping repeated roof slabs.
 const canopy=new THREE.Group();canopy.name='curved-platform-canopy';root.add(canopy);
 for(let i=0;i<24;i++){const a=15.8*(1-i/24),b=15.8*(1-(i+1)/24);for(const side of [-1,1]){const edge=side<0?1.8:6.05,quad=clipStationRear([sample(a,edge,4.2),sample(b,edge,4.2),sample(b,3.9,4.58),sample(a,3.9,4.58)],P.crossingClearZ+.5);if(quad.length<3)continue;const vs:number[]=[];for(let k=1;k<quad.length-1;k++)for(const p of side<0?[quad[0],quad[k],quad[k+1]]:[quad[0],quad[k+1],quad[k]])vs.push(...local(p).toArray());const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));g.computeVertexNormals();const m=new THREE.Mesh(g,toon(0x367f9b,{side:THREE.DoubleSide}));m.name='continuous-canopy-roof';m.castShadow=true;canopy.add(m);}}
 for(const d of [2,6,10,13]){const p=local(sample(d,5.35,P.platformTop)),roof=local(sample(d,5.35,4.34)),mid=local(sample(d,3.8,4.58));box(canopy,.16,roof.y-p.y,.16,0x577e86,p.x,(p.y+roof.y)/2,p.z,'platform-canopy-column');beam(canopy,point(p.x,3.25,p.z),mid,.12,0x577e86,'canopy-cantilever-brace');beam(canopy,local(sample(d,1.85,4.25)),local(sample(d,3.9,4.63)),.055,0x80b4bd,'canopy-seam');beam(canopy,local(sample(d,3.9,4.63)),local(sample(d,6.02,4.25)),.055,0x80b4bd,'canopy-seam');}
 // Contrasting tactile strip is part of the platform assembly, never the running envelope.
 for(let i=0;i<30;i++){const a=P.platformLength*(1-i/30),b=P.platformLength*(1-(i+1)/30),poly=clipStationRear([sample(a,2.18,.566),sample(b,2.18,.566),sample(b,2.36,.566),sample(a,2.36,.566)]);if(poly.length<3)continue;const v:number[]=[];for(let j=1;j<poly.length-1;j++)for(const p of [poly[0],poly[j],poly[j+1]])v.push(...local(p).toArray());const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();const m=new THREE.Mesh(g,toon(0xefc65a,{side:THREE.DoubleSide}));m.name='platform-tactile-strip';platform.add(m);}
 const b=P.building,house=createStationHouse();house.position.set(b.x,.45,b.z);root.add(house);solidDeck(root,[[b.x-b.w/2,b.z-b.d/2],[b.x+b.w/2,b.z-b.d/2],[b.x+b.w/2,b.z+b.d/2],[b.x-b.w/2,b.z+b.d/2]].map(([x,z])=>stationWorld(x,0,z)),.45,'solid-station-foundation',0xc7b28e);
 solidDeck(root,[[5.6,b.z-1.5],[7,b.z-1.5],[7,b.z+1.5],[5.6,b.z+1.5]].map(([x,z])=>stationWorld(x,0,z)),.56,'platform-to-hall-link');
 const stop=createBufferStop();stop.position.z=.15;root.add(stop);
 for(const x of [-1.75,1.75]){const w=stationWorld(x,0,1.6),y=surfaceHeight(w.x,w.z)-STATION_ORIGIN.y;box(root,.13,1.15,.13,0x688b8b,x,y+.575,1.6,'terminal-safety-post');}beam(root,point(-1.75,.7,1.6),point(1.75,.7,1.6),.1,0x688b8b,'terminal-end-fence');
 const entryZ=b.z+b.d/2;for(let i=0;i<5;i++){const z=entryZ+(i+.5)*.36,w=stationWorld(b.x,0,z),ground=surfaceHeight(w.x,w.z)-STATION_ORIGIN.y,top=.6*(1-(i+1)/5)+(ground+.055)*(i+1)/5;box(root,3.8,top-ground+.08,.37,0xe0cfb1,b.x,(top+ground-.08)/2,z,'station-entrance-stair');}
 const rampEnd=stationWorld(-1.25,0,9.7),endY=surfaceHeight(rampEnd.x,rampEnd.z)-STATION_ORIGIN.y+.045,total=6.8+4.25,cornerY=.55+((endY-.55)*6.8/total);
 rampEnd.y=STATION_ORIGIN.y+endY;
 ramp(root,point(3.9,.55,2),point(3.9,cornerY,8.8),1.8);ramp(root,point(3,cornerY,9.7),point(-1.25,endY,9.7),1.8);
 solidDeck(root,[[3,8.8],[4.8,8.8],[4.8,10.6],[3,10.6]].map(([x,z])=>stationWorld(x,0,z)),cornerY,'flat-ramp-turn-landing',0xe9d8b7);
 for(const [a,b]of [[point(4.8,cornerY,8.8),point(4.8,cornerY,10.6)],[point(4.8,cornerY,10.6),point(3,cornerY,10.6)]]){for(const p of [a,b])box(root,.09,.95,.09,0x688b8b,p.x,p.y+.475,p.z,'landing-guard-post');beam(root,a.clone().add(point(0,.93,0)),b.clone().add(point(0,.93,0)),.075,0x688b8b,'outer-landing-guard');}

 const plazaLocal=P.forecourt,plaza=plazaLocal.map(([x,z])=>stationWorld(x,0,z));paintGroundPolygon(plaza.map(p=>[p.x,p.z]),'walk');
 const access=[stationWorld(b.x,0,entryZ+1.9),stationWorld(b.x,0,11.8),stationWorld(-2,0,11.8)],near=nearestRoad(access[2].x,access[2].z),dx=access[2].x-near.x,dz=access[2].z-near.z,l=Math.hypot(dx,dz),edge=new THREE.Vector3(near.x+dx/l*(near.width/2+1),0,near.z+dz/l*(near.width/2+1));access.push(edge);path(access,2.1);path([rampEnd,stationWorld(-2,0,11.8),edge],1.8);
 const garden=new THREE.Group();garden.name='station-forecourt-garden';root.add(garden);const gp=stationWorld(15.1,0,8.4),gy=surfaceHeight(gp.x,gp.z)-STATION_ORIGIN.y;box(garden,1.5,.35,1.5,0xc99d77,15.1,gy+.16,8.4,'station-tree-bed');const tree=createTree('shade',60731);tree.scale.setScalar(.4);tree.position.set(15.1,gy+.32,8.4);garden.add(tree);for(const [x,z]of [[7.7,8.5],[14.8,5.8]]){const p=stationWorld(x,0,z),flowers=createPlanter(60731+Math.round(x),.65);flowers.position.set(x,surfaceHeight(p.x,p.z)-STATION_ORIGIN.y,z);garden.add(flowers);}
 const seat=stationWorld(14.8,0,6.1),seatY=surfaceHeight(seat.x,seat.z)-STATION_ORIGIN.y;box(garden,.7,.14,1.8,0xbb955e,14.8,seatY+.62,6.1,'station-garden-bench');for(const z of [5.5,6.7])box(garden,.5,.58,.12,0x688b8b,14.8,seatY+.29,z,'garden-bench-leg');
 buildingFootprints.push(STATION_RESERVATION);occupied.push(STATION_RESERVATION);
 root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),entry=registerGroup('coaststation','海岸总站','青蓝坡顶钟塔、拱券站房、沿轨雨棚与站前花园',root,[center.x,center.z],[size.x+1,size.y+1,size.z+1]);entry.pick.position.copy(center);
 const parts=root.children.filter(o=>o!==entry.pick).map((o,index)=>{const p=new THREE.Vector3();o.getWorldPosition(p);return {id:o.name+'-'+String(index+1).padStart(2,'0'),grid:gridCell(p.x,p.z).id,position:p.toArray()};});coastalStationPreview=createStationPreview(root,curve);for(const part of [house,platform,canopy,garden])batchStationPart(part);
 const anchors=[['站房',stationWorld(b.x,.45,b.z)],['主入口',stationWorld(b.x,.6,entryZ)],['钟面',stationWorld(b.x,8.3,b.z+6.78)],['站台',sample(8,3.9,.55)],['止冲器',stationWorld(0,1.2,.15)],['坡道出口',rampEnd]].map(([name,p]:[string,THREE.Vector3])=>({name,grid:gridCell(p.x,p.z).id,position:p.toArray()}));
 world.userData.coastalStation={...P,anchors,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},parts,access:access.map(p=>[p.x,surfaceHeight(p.x,p.z),p.z]),plaza:plaza.map(p=>[p.x,p.z]),ramp:{run:total,rise:.55-endY}};return root;
}

function createStationPreview(source:THREE.Group,curve:THREE.CatmullRomCurve3){
 const root=source.clone(true);root.position.set(0,0,0);root.rotation.set(0,0,0);root.name='coastal-terminal-preview';
 const groundPoints:[number,number][]=[[-2.5,-17],[17.3,-12],[18,14],[-2.5,14]],points=groundPoints.map(([x,z])=>{const w=stationWorld(x,0,z);return point(x,surfaceHeight(w.x,w.z)-STATION_ORIGIN.y-.015,z);}),tri=THREE.ShapeUtils.triangulateShape(groundPoints.map(p=>new THREE.Vector2(...p)),[]),pos:number[]=[];
 for(const [a,b,c]of tri)for(const i of [a,c,b])pos.push(...points[i].toArray());const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();const ground=new THREE.Mesh(g,toon(0x91c66a,{side:THREE.DoubleSide}));ground.name='preview-station-ground';root.add(ground);const base:number[]=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];base.push(a.x,a.y,a.z,b.x,b.y,b.z,a.x,-.95,a.z,b.x,b.y,b.z,b.x,-.95,b.z,a.x,-.95,a.z);}for(const [a,b,c]of tri)for(const i of [a,b,c])base.push(points[i].x,-.95,points[i].z);const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(base,3));bg.computeVertexNormals();const soil=new THREE.Mesh(bg,toon(0xc4ad87,{side:THREE.DoubleSide}));soil.name='closed-preview-ground-base';root.add(soil);
 const plaza=world.userData.coastalStation?.plaza??[[-2.4,5.5],[6.3,4.8],[16.8,4.8],[17,13.3],[-2.4,13.3]].map(([x,z])=>{const p=stationWorld(x,0,z);return [p.x,p.z];}),verts=plaza.map(([x,z])=>local(new THREE.Vector3(x,surfaceHeight(x,z)+.02,z))),indexes=THREE.ShapeUtils.triangulateShape(verts.map(p=>new THREE.Vector2(p.x,p.z)),[]),pv:number[]=[];
 for(const [a,b,c]of indexes)for(const i of [a,c,b])pv.push(...verts[i].toArray());const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pv,3));pg.computeVertexNormals();const paving=new THREE.Mesh(pg,toon(0xf3e7cc,{side:THREE.DoubleSide}));paving.name='preview-station-forecourt';root.add(paving);
 const span=curve.getLength(),sides=[-1,1].map(side=>Array.from({length:21},(_,i)=>{const t=1-(20-i)/span,p=curve.getPointAt(t),v=curve.getTangentAt(t),l=Math.hypot(v.x,v.z);p.x+=v.z/l*side*1.9;p.z-=v.x/l*side*1.9;return p;}));solidDeck(root,[...sides[0],...sides[1].reverse()],0,'preview-tram-track-bed',0xcbb58f);
 for(const side of [-1,1]){const points=Array.from({length:50},(_,i)=>{const t=1-(20-20*i/49)/span,p=curve.getPointAt(t),v=curve.getTangentAt(t),l=Math.hypot(v.x,v.z);p.x+=v.z/l*side*.8;p.z-=v.x/l*side*.8;p.y+=.15;return local(p);});const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),60,.07,6,false),toon(0x606c76));rail.name='preview-running-rail';root.add(rail);}
 for(let d=1;d<20;d+=2){const p=local(curve.getPointAt(1-d/span)),v=curve.getTangentAt(1-d/span),m=box(root,2.6,.16,.3,0x806a55,p.x,p.y+.03,p.z,'preview-rail-sleeper');m.rotation.y=Math.atan2(v.x,v.z)-STATION_HEADING;}
 return root;
}
