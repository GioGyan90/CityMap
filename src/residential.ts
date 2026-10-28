import {buildingFootprints} from './config';
import * as THREE from 'three';
import {world} from './scene';
import {surfaceHeight} from './terrainSurface';
import {paintGroundPath} from './groundRoadMaterial';
import {parkingAccessPaths} from './parking';
import {createHome,batchResidentialGeometrySteps} from './residentialAssets';
import {planResidentialCourts,inside,edgeDistance,type CourtPlan,type Point} from './residentialPlan';
import {toon} from './materials';
import {createTree,createPlanter} from './plantAssets';
import {gridCell} from './mapCoordinates';
export const residentialCourts:CourtPlan[]=[];
export let courtSample:THREE.Group|undefined;
function box(root:THREE.Group,w:number,h:number,d:number,color:number,x:number,y:number,z:number,name:string){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(color));m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
function beam(root:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,width:number,color:number,name:string){const m=new THREE.Mesh(new THREE.BoxGeometry(width,a.distanceTo(b),width),toon(color));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());m.name=name;m.castShadow=true;root.add(m);}
function fence(root:THREE.Group,a:Point,b:Point){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length/2.3);let last:THREE.Vector3|undefined;for(let i=0;i<=count;i++){const t=i/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=surfaceHeight(x,z)-.08;box(root,.17,1.25,.17,0x91a69a,x,y+.625,z,'grounded-fence-post');const p=new THREE.Vector3(x,y,z);if(last)for(const h of [.45,1.05])beam(root,last.clone().add(new THREE.Vector3(0,h,0)),p.clone().add(new THREE.Vector3(0,h,0)),.09,0x608b83,'garden-fence-rail');last=p;}}
function path(a:Point,b:Point,width=1.45){paintGroundPath([a,b],width,'walk');parkingAccessPaths.push({points:[a,b],width});}
export function createResidentialCourt(plan:CourtPlan,preview=false){
 const root=new THREE.Group();root.name=plan.id;root.userData={court:true,grid:plan.grid,plan};
 for(const h of plan.homes){const style=(['balcony','bay','shutters'] as const)[h.seed%3],house=createHome(style,h.seed,h.w,h.d,h.floors),c=Math.cos(h.heading),s=Math.sin(h.heading),corners=[-1,1].flatMap(x=>[-1,1].map(z=>{const dx=x*h.w/2,dz=z*h.d/2;return [h.x+dx*c+dz*s,h.z-dx*s+dz*c] as Point;})),levels=corners.map(p=>surfaceHeight(...p)),base=Math.max(...levels)+.03,low=Math.min(...levels)-.12;
  house.position.set(h.x,base,h.z);house.rotation.y=h.heading;root.add(house);box(house,h.w,base-low+.1,h.d,0xc6b89f,0,-(base-low)/2,0,'terrain-fitted-footing');
 for(let i=0;i<3;i++){const t=(i+1)/3,x=h.x+Math.sin(h.heading)*(h.d/2+.3+i*.25),z=h.z+Math.cos(h.heading)*(h.d/2+.3+i*.25),ground=surfaceHeight(x,z),top=(base+.12)*(1-t)+(ground+.055)*t,step=box(root,1.55,Math.max(.1,top-ground+.08),.28,0xdfceb1,x,(top+ground-.08)/2,z,'entrance-terrain-step');step.rotation.y=h.heading;}
 }
 // Break only the boundary edge carrying the real road connection.
 let gateEdge=1,best=Infinity;
 for(let i=1;i<plan.ring.length;i++){const a=plan.ring[i-1],b=plan.ring[i],dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((plan.gate[0]-a[0])*dx+(plan.gate[1]-a[1])*dz)/(dx*dx+dz*dz),0,1),distance=Math.hypot(plan.gate[0]-a[0]-dx*t,plan.gate[1]-a[1]-dz*t);if(distance<best){best=distance;gateEdge=i;}}
 for(let i=1;i<plan.ring.length;i++){const a=plan.ring[i-1],b=plan.ring[i];if(i!==gateEdge){fence(root,a,b);continue;}const len=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/len,uz=(b[1]-a[1])/len,l:Point=[plan.gate[0]-ux*1.9,plan.gate[1]-uz*1.9],r:Point=[plan.gate[0]+ux*1.9,plan.gate[1]+uz*1.9];fence(root,a,l);fence(root,r,b);
  const ya=surfaceHeight(...l),yb=surfaceHeight(...r),top=Math.max(ya,yb)+2.8;for(const [p,y]of [[l,ya],[r,yb]] as [Point,number][]){box(root,.42,top-y,.42,0xe8d5b5,p[0],(top+y)/2,p[1],'entry-gate-pier');box(root,.58,.16,.58,0x5c9595,p[0],top+.08,p[1],'gate-pier-cap');}
  beam(root,new THREE.Vector3(l[0],top,l[1]),new THREE.Vector3(r[0],top,r[1]),.2,0x5c9595,'open-entry-gate-lintel');
 }
 if(!preview){path(plan.gate,plan.road,2.4);for(const walk of plan.walks)for(let i=1;i<walk.points.length;i++)path(walk.points[i-1],walk.points[i],walk.width);}
 const [gx,gz]=plan.garden,gy=surfaceHeight(gx,gz);const garden=new THREE.Group();garden.name='shared-courtyard-garden';root.add(garden);
 const walks:[Point,Point][]=plan.walks.flatMap(w=>w.points.slice(1).map((p,i)=>[w.points[i],p] as [Point,Point]));
 const pointPathDistance=(x:number,z:number)=>Math.min(...walks.map(([a,b])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}));
 const islands:Point[]=[],candidates:Point[]=[];for(let z=gz-12;z<=gz+12;z+=2.5)for(let x=gx-12;x<=gx+12;x+=2.5)candidates.push([x,z]);candidates.sort((a,b)=>Math.hypot(a[0]-gx,a[1]-gz)-Math.hypot(b[0]-gx,b[1]-gz));
 for(const [x,z] of candidates){if(islands.length>=6)break;if(!inside(plan.ring,x,z)||edgeDistance(plan.ring,x,z)<2.5||pointPathDistance(x,z)<2.3||plan.homes.some(h=>Math.abs(x-h.x)<5.3&&Math.abs(z-h.z)<5.3)||islands.some(p=>Math.hypot(x-p[0],z-p[1])<4.5))continue;
  const i=islands.length,y=surfaceHeight(x,z);islands.push([x,z]);
  if(i%2===0){box(garden,1.5,.3,1.5,0xcb9875,x,y+.14,z,'garden-tree-bed');const tree=createTree('shade',plan.homes[0].seed+i);tree.scale.setScalar(.35);tree.position.set(x,y+.28,z);garden.add(tree);}
  else{const flowers=createPlanter(plan.homes[0].seed+i,1.05);flowers.position.set(x,y,z);garden.add(flowers);}
 }
 // Grounded seating beside the garden, outside the direct entrance route.
 const seat=islands[0];if(seat){const x=seat[0]+1.6,z=seat[1];if([-0.35,0.35].every(dx=>[-.9,.9].every(dz=>inside(plan.ring,x+dx,z+dz)&&pointPathDistance(x+dx,z+dz)>1.15))&&!plan.homes.some(h=>Math.abs(x-h.x)<4.5&&Math.abs(z-h.z)<4.5)){const y=surfaceHeight(x,z);box(garden,.65,.14,1.7,0xc79c67,x,y+.6,z,'garden-bench');box(garden,.12,.55,1.7,0xc79c67,x+.27,y+.91,z,'garden-bench-back');for(const side of [-1,1])box(garden,.42,.58,.15,0x63897f,x,surfaceHeight(x,z+side*.6)+.29,z+side*.6,'bench-foot');}}
 root.userData.gardenIslands=islands;
 root.userData.homeCount=plan.homes.length;return root;
}
export function* buildResidentialCourtsSteps(occupied:{x:number;z:number;w:number;d:number}[]){
 const plans=planResidentialCourts(occupied),root=new THREE.Group();root.name='residential-neighbourhoods';world.add(root);residentialCourts.push(...plans);
 const pending=[...plans],built=new Map<string,THREE.Group>();
 while(pending.length){yield;
  const priority=world.userData.progressivePriority as ((x:number,z:number)=>number)|undefined;
  if(priority)pending.sort((a,b)=>priority(...a.garden)-priority(...b.garden));
  const plan=pending.shift()!;const court=createResidentialCourt(plan);root.add(court);built.set(plan.id,court);world.userData.progressiveFacilityReady?.(plan.id,court);if(plan===plans[0])courtSample=createCourtPreview(plan);
 }
 // Restore canonical order before batching and reservation insertion.
 for(const plan of plans){root.add(built.get(plan.id)!);
  const xs=plan.ring.map(p=>p[0]),zs=plan.ring.map(p=>p[1]);const footprint={x:(Math.max(...xs)+Math.min(...xs))/2,z:(Math.max(...zs)+Math.min(...zs))/2,w:Math.max(...xs)-Math.min(...xs),d:Math.max(...zs)-Math.min(...zs)};occupied.push(footprint);buildingFootprints.push(footprint);
 }
 yield;yield* batchResidentialGeometrySteps(root);world.userData.residential={version:'clipped-courtyards-v1',courts:plans,homes:plans.reduce((s,p)=>s+p.homes.length,0)};
}

/** Standalone preview carries its own clipped terrain and paths when the city ground is hidden. */
export function createCourtPreview(plan:CourtPlan){
 const root=createResidentialCourt(plan,true),ring=plan.ring.slice(0,-1),triangles=THREE.ShapeUtils.triangulateShape(ring.map(p=>new THREE.Vector2(...p)),[]),vertices:number[]=[],bottom=Math.min(...ring.map(p=>surfaceHeight(...p)))-.5;
 const emit=(a:Point,b:Point,c:Point)=>{const edges=[Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1])];if(Math.max(...edges)>2){const i=edges.indexOf(Math.max(...edges)),p=[a,b,c][i],q=[b,c,a][i],r=[c,a,b][i],m:Point=[(p[0]+q[0])/2,(p[1]+q[1])/2];emit(p,m,r);emit(m,q,r);return;}for(const p of [a,c,b])vertices.push(p[0],surfaceHeight(...p)-.015,p[1]);};
 for(const [a,b,c]of triangles)emit(ring[a],ring[b],ring[c]);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const ground=new THREE.Mesh(geometry,toon(0x8cc75e,{side:THREE.DoubleSide}));ground.name='clipped-preview-terrain';root.add(ground);
 const soil:number[]=[];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],ay=surfaceHeight(...a)-.02,by=surfaceHeight(...b)-.02;soil.push(a[0],ay,a[1],b[0],by,b[1],a[0],bottom,a[1],b[0],by,b[1],b[0],bottom,b[1],a[0],bottom,a[1]);}for(const [a,b,c]of triangles)for(const i of [a,b,c])soil.push(ring[i][0],bottom,ring[i][1]);const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(soil,3));sg.computeVertexNormals();root.add(new THREE.Mesh(sg,toon(0xc5b38e,{side:THREE.DoubleSide})));
 const walks:[Point,Point,number][]=plan.walks.flatMap(w=>w.points.slice(1).map((p,i)=>[w.points[i],p,w.width] as [Point,Point,number]));
 for(const [a,b,width]of walks){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),n=Math.ceil(len/.7),nx=-dz/len*width/2,nz=dx/len*width/2,points:number[]=[],index:number[]=[];for(let i=0;i<=n;i++){const t=i/n;for(const side of [-1,1]){const x=a[0]+dx*t+nx*side,z=a[1]+dz*t+nz*side;points.push(x,surfaceHeight(x,z)+.035,z);}if(i<n){const k=i*2;index.push(k,k+1,k+2,k+1,k+3,k+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(index);g.computeVertexNormals();const m=new THREE.Mesh(g,toon(0xf3e7cc,{side:THREE.DoubleSide}));m.name='preview-garden-walk';root.add(m);}
 const bounds=new THREE.Box3().setFromObject(root);root.position.set(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,-(bounds.min.z+bounds.max.z)/2);return root;
}

export function buildResidentialCourts(occupied:{x:number;z:number;w:number;d:number}[]){for(const _ of buildResidentialCourtsSteps(occupied)){/* synchronous asset/headless API */}}
