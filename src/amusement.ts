import * as THREE from 'three';
import { TAU } from './random';
import { toon } from './materials';
import { GROUND_Y } from './config';
import { world } from './scene';
import { surfaceHeight } from './terrainSurface';
import { RESORT_ACCENTS } from './visualStyle';
import { PARK_CENTER,PARK_RIDES,PARK_LOOP,PARK_LOOP_WIDTH } from './amusementPlan';

export const spinWheels:{rotor:THREE.Group;axis:'y'|'z';speed:number;cabins:THREE.Group[]}[]=[];
export const movingCarts:{mesh:THREE.Group;curve:THREE.CatmullRomCurve3;offset:number;speed:number}[]=[];
const cream=0xfff0d0,white=0xf7f6eb,blue=0x3987aa,gold=0xe9b753;
const group=(parent:THREE.Object3D,name:string)=>{const g=new THREE.Group();g.name=name;parent.add(g);return g;};
const mesh=(parent:THREE.Object3D,geometry:THREE.BufferGeometry,color:number,x=0,y=0,z=0,name='')=>{const m=new THREE.Mesh(geometry,toon(color));m.position.set(x,y,z);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
const box=(g:THREE.Object3D,w:number,h:number,d:number,c:number,x=0,y=0,z=0,name='')=>mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z,name);
const tube=(g:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,c:number,name='')=>{const v=b.clone().sub(a),m=mesh(g,new THREE.CylinderGeometry(r,r,v.length(),8),c,0,0,0,name);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;};
const cylinder=(g:THREE.Object3D,r:number,h:number,c:number,y:number,name='')=>mesh(g,new THREE.CylinderGeometry(r,r,h,32),c,0,y,0,name);
const offset=(p:{x:number;z:number})=>({x:p.x/PARK_CENTER.scale,z:p.z/PARK_CENTER.scale});
function rideRoot(cx:number,cz:number,p:{x:number;z:number},name:string){const g=new THREE.Group(),q=offset(p);g.name=name;g.position.set(cx+q.x,GROUND_Y,cz+q.z);world.add(g);return g;}

function createWheel(cx:number,cz:number){
 const root=rideRoot(cx,cz,PARK_RIDES.wheel,'park-ferris-wheel');root.scale.y=PARK_CENTER.scale/PARK_CENTER.verticalScale;const R=5.2,hubY=7.8;
 const platform=group(root,'wheel-platform');cylinder(platform,5.9,.24,cream,.12);box(platform,2.5,.18,1.3,blue,0,.33,4.7,'wheel-entry-platform');
 const support=group(root,'wheel-support');for(const side of [-1,1])for(const foot of [-1,1])tube(support,new THREE.Vector3(foot*3.6,.25,side*2.4),new THREE.Vector3(0,hubY,side*.8),.19,white,'wheel-leg');
 const rotor=group(root,'ferris-rotor');rotor.position.y=hubY;const cabins:THREE.Group[]=[];spinWheels.push({rotor,axis:'z',speed:.18,cabins});
 for(const z of [-.65,.65])mesh(rotor,new THREE.TorusGeometry(R,.19,8,48),RESORT_ACCENTS.lavender,0,0,z,'wheel-rim');
 for(let i=0;i<8;i++){const a=i*TAU/8,x=Math.cos(a)*R,y=Math.sin(a)*R;tube(rotor,new THREE.Vector3(0,0,0),new THREE.Vector3(x,y,0),.09,white,'wheel-spoke');
  const pivot=group(rotor,'ferris-cabin');pivot.position.set(x,y,0);const c=[RESORT_ACCENTS.magenta,RESORT_ACCENTS.seafoam,RESORT_ACCENTS.apricot,RESORT_ACCENTS.cobalt][i%4];
  box(pivot,1.3,.75,1.25,c,0,-.76,0,'cabin-body');box(pivot,1.18,.46,1.12,0x91d4e7,0,-.17,0,'cabin-glazing');box(pivot,1.42,.13,1.4,white,0,.11,0,'cabin-roof');for(const sx of [-1,1])box(pivot,.08,.48,.08,white,sx*.55,-.18,.55,'cabin-frame');cabins.push(pivot);
 }
 const hub=mesh(rotor,new THREE.CylinderGeometry(.65,.65,1.7,16),gold);hub.rotation.x=Math.PI/2;return root;
}
class RailOffset extends THREE.Curve<THREE.Vector3>{constructor(private curve:THREE.CatmullRomCurve3,private side:number){super();}getPoint(t:number){const p=this.curve.getPointAt(t),v=this.curve.getTangentAt(t),n=new THREE.Vector3(v.z,0,-v.x).normalize();return p.addScaledVector(n,this.side);}}
function createCoaster(cx:number,cz:number){
 const root=rideRoot(cx,cz,PARK_RIDES.coaster,'park-roller-coaster'),base=group(root,'coaster-foundation');cylinder(base,6.05,.2,0xf4e8cf,.1);
 const pts=[[-4.2,2.15,-3.3],[0,3.7,-4.1],[4.1,2.5,-3.1],[4.9,3.3,.1],[3.4,5,3.4],[-.6,3.1,4.1],[-4.4,4,2.7],[-4.8,2.25,0]].map(([x,y,z])=>new THREE.Vector3(cx+offset(PARK_RIDES.coaster).x+x,GROUND_Y+y,cz+offset(PARK_RIDES.coaster).z+z));
 const curve=new THREE.CatmullRomCurve3(pts,true,'centripetal');const rails=group(root,'coaster-rails');
 for(const side of [-.52,.52]){const local=new RailOffset(curve,side),geometry=new THREE.TubeGeometry(local,192,.13,6,true);geometry.translate(-root.position.x,-root.position.y,-root.position.z);mesh(rails,geometry,RESORT_ACCENTS.magenta,0,0,0,'coaster-rail');}
 const support=group(root,'coaster-supports');for(let i=0;i<24;i++){const t=i/24,p=curve.getPointAt(t),tan=curve.getTangentAt(t),normal=new THREE.Vector3(tan.z,0,-tan.x).normalize(),local=p.clone().sub(root.position);const a=local.clone().addScaledVector(normal,-.52),b=local.clone().addScaledVector(normal,.52);tube(support,a,b,.075,gold,'coaster-tie');
  if(i%2===0)for(const s of [-1,1]){const q=local.clone().addScaledVector(normal,s*.52);tube(support,new THREE.Vector3(q.x,.2,q.z),q,.10,white,'coaster-column');}}
 const cart=new THREE.Group();cart.name='coaster-cart';const chassis=group(cart,'cart-chassis');box(chassis,1.15,.45,1.75,RESORT_ACCENTS.cobalt,0,.43,0);for(const s of [-1,1])for(const z of [-.4,.4]){const wheel=mesh(chassis,new THREE.CylinderGeometry(.18,.18,.16,10),0x465465,s*.52,.31,z,'coaster-cart-wheel');wheel.rotation.z=Math.PI/2;}
 const seats=group(cart,'cart-seats');for(const z of [-.45,.4]){box(seats,.8,.18,.55,RESORT_ACCENTS.apricot,0,.76,z);box(seats,.8,.55,.12,RESORT_ACCENTS.apricot,0,1.0,z-.2);}root.userData.sourceCenter=root.position.toArray();cart.position.copy(curve.getPointAt(0)).sub(root.position);const initial=curve.getTangentAt(0);cart.rotation.set(-Math.atan2(initial.y,Math.hypot(initial.x,initial.z)),Math.atan2(initial.x,initial.z),0,'YXZ');root.add(cart);movingCarts.push({mesh:cart,curve,offset:0,speed:.06});return root;
}
function createCarousel(cx:number,cz:number){
 const root=rideRoot(cx,cz,PARK_RIDES.carousel,'park-carousel'),base=group(root,'carousel-base');cylinder(base,3.45,.35,cream,.175);cylinder(base,3.18,.35,gold,.52);
 const rotor=group(root,'carousel-rotor');rotor.position.y=.7;spinWheels.push({rotor,axis:'y',speed:.55,cabins:[]});const canopy=group(rotor,'carousel-canopy');const roof=mesh(canopy,new THREE.ConeGeometry(3.25,1.55,12),RESORT_ACCENTS.magenta,0,3.8,0,'carousel-roof');roof.castShadow=true;cylinder(canopy,3.1,.25,white,3.1);cylinder(rotor,.25,3.1,gold,1.55);
 const horses=group(rotor,'carousel-horses');for(let i=0;i<8;i++){const a=TAU*i/8,p=group(horses,'carousel-horse');p.position.set(Math.cos(a)*2.25,0,Math.sin(a)*2.25);p.rotation.y=-a;const color=[white,RESORT_ACCENTS.apricot,RESORT_ACCENTS.lavender,RESORT_ACCENTS.seafoam][i%4];
  cylinder(p,.06,2.8,gold,1.7);box(p,.45,.53,.9,color,0,1.1,0,'horse-body');box(p,.3,.65,.3,color,0,1.43,.38,'horse-neck');box(p,.35,.3,.5,color,0,1.72,.56,'horse-head');for(const x of [-.14,.14])for(const z of [-.28,.28])box(p,.1,.45,.1,color,x,.68,z,'horse-leg');box(p,.48,.12,.32,RESORT_ACCENTS.cobalt,0,1.4,-.03,'horse-saddle');}
 return root;
}
function createParkPerimeter(cx:number,cz:number){
 const root=new THREE.Group();root.name='park-perimeter';root.position.set(cx,GROUND_Y,cz);world.add(root);const scale=PARK_CENTER.scale,ys=PARK_CENTER.verticalScale;
 const points=PARK_LOOP.map(([x,z])=>new THREE.Vector3((x-PARK_CENTER.x)/scale,0,(z-PARK_CENTER.z)/scale));const curve=new THREE.CatmullRomCurve3(points,true,'centripetal'),count=160,v:number[]=[],ids:number[]=[];
 const at=(p:THREE.Vector3)=>{const x=PARK_CENTER.x+p.x*scale,z=PARK_CENTER.z+p.z*scale;return (surfaceHeight(x,z)-PARK_CENTER.level)/ys+.045;};
 for(let i=0;i<=count;i++){const t=i/count,p=curve.getPointAt(t),d=curve.getTangentAt(t),n=new THREE.Vector3(d.z,0,-d.x).normalize();for(const s of [-1,1]){const q=p.clone().addScaledVector(n,s*PARK_LOOP_WIDTH/(2*scale));v.push(q.x,at(q),q.z);}if(i<count){const k=2*i;ids.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geom.setIndex(ids);geom.computeVertexNormals();mesh(root,geom,0xd98271,0,0,0,'park-running-loop');
 const marks=new THREE.InstancedMesh(new THREE.BoxGeometry(.08,.025,.65),toon(white),40);marks.name='loop-lane-marks';const transform=new THREE.Object3D();for(let i=0;i<40;i++){const p=curve.getPointAt(i/40),d=curve.getTangentAt(i/40);transform.position.set(p.x,at(p)+.025,p.z);transform.rotation.y=Math.atan2(d.x,d.z);transform.updateMatrix();marks.setMatrixAt(i,transform.matrix);}marks.instanceMatrix.needsUpdate=true;root.add(marks);
 const planting=group(root,'park-landscaping');for(const [wx,wz] of [[-32,-101],[-31,-80],[-22,-78],[-25,-83],[-19,-106]]){const x=(wx-PARK_CENTER.x)/scale,z=(wz-PARK_CENTER.z)/scale,p=new THREE.Vector3(x,0,z),y=at(p)-.06;mesh(planting,new THREE.CylinderGeometry(.15,.2,1.2,7),0x9d7659,x,y+.6,z);mesh(planting,new THREE.IcosahedronGeometry(.9,1),0x62ac6f,x,y+1.8,z,'park-tree-crown');for(const s of [-1,1]){const flower=group(planting,'park-flower');const fx=x+s*.7,fz=z+.35,fy=at(new THREE.Vector3(fx,0,fz))-.06;mesh(flower,new THREE.CylinderGeometry(.035,.045,.32,6),0x4a9955,fx,fy+.16,fz);mesh(flower,new THREE.IcosahedronGeometry(.14,1),s<0?RESORT_ACCENTS.apricot:RESORT_ACCENTS.magenta,fx,fy+.35,fz,'flower-head');}}
 const entrance=group(root,'park-entrance');const entranceWorld={x:-18,z:-76.5},ex=(entranceWorld.x-PARK_CENTER.x)/scale,ez=(entranceWorld.z-PARK_CENTER.z)/scale,ey=at(new THREE.Vector3(ex,0,ez))-.045;
 for(const side of [-1,1])box(entrance,.32,2.8,.32,RESORT_ACCENTS.coral,ex+side*2.0,ey+1.4,ez,'entrance-post');
 box(entrance,4.35,.4,.35,gold,ex,ey+2.8,ez,'entrance-beam');
 return root;
}
export function buildAmusement(cx:number,cz:number){createParkPerimeter(cx,cz);createWheel(cx,cz);createCoaster(cx,cz);createCarousel(cx,cz);}
