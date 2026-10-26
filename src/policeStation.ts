import * as THREE from 'three';
import {kit} from './referenceArchitecture';
import {createPoliceBadge,createPoliceCar,policeSign} from './policeAssets';
import {mergeGeometryBatch,type GeometryBatchPart} from './geometryBatch';
export const POLICE_STATION_PARTS:Record<string,string>={'01-ground-and-parking':'场地、停车与公众步道','02-pierced-station-building':'三层警署与门窗','03-public-entrance-and-sign':'公众入口、招牌与盾徽','04-roof-and-radio':'独立屋顶与通信天线','05-police-vehicle-canopy':'双车位雨棚与支柱','06-short-and-long-police-cars':'长短两款警车组合'};
const C={wall:0xf7efdb,navy:0x244c74,glass:0x69aabb,trim:0xd6d9ce,gold:0xe2b95d,leaf:0x63995b};
function group(root:THREE.Group,name:string){const g=new THREE.Group();g.name=name;root.add(g);return g;}
function perforatedWall(w:number,h:number,holes:{x:number;y:number;w:number;h:number}[]){const s=new THREE.Shape([new THREE.Vector2(-w/2,0),new THREE.Vector2(w/2,0),new THREE.Vector2(w/2,h),new THREE.Vector2(-w/2,h)]);for(const o of holes)s.holes.push(new THREE.Path([new THREE.Vector2(o.x-o.w/2,o.y),new THREE.Vector2(o.x-o.w/2,o.y+o.h),new THREE.Vector2(o.x+o.w/2,o.y+o.h),new THREE.Vector2(o.x+o.w/2,o.y)]));return new THREE.ExtrudeGeometry(s,{depth:.25,bevelEnabled:false});}
export function createPoliceStation(optimized=false){
 const root=new THREE.Group();root.name='harbor-police-station';
 const base=group(root,'01-ground-and-parking'),building=group(root,'02-pierced-station-building'),entrance=group(root,'03-public-entrance-and-sign'),roof=group(root,'04-roof-and-radio'),garage=group(root,'05-police-vehicle-canopy'),fleet=group(root,'06-short-and-long-police-cars');
 const b=kit(base),k=kit(building),e=kit(entrance),r=kit(roof),g=kit(garage);
 b.rounded(15.5,28,.26,0,0,0,C.trim,.8).name='station-ground-platform';b.box(14.5,.04,15.5,0x6f8186,.5,.28,6.1).name='police-parking-apron';
 // Independent footpath on the west side, clear of both parking bays and the vehicle aisle.
 b.box(1.45,.08,14,C.wall,-6.7,.3,6.3).name='public-footpath';b.box(4.5,.08,1.8,C.wall,-4.65,.3,-.8).name='door-landing';
 for(const x of [-4.7,-.2,4.7])b.box(.09,.025,6.4,C.wall,x,.315,4.1);for(const x of [-2.5,2.5]){b.box(1.7,.14,.22,C.trim,x,.37,1.25);}
 for(const face of [0,1,2,3]){const span=face%2?9:12,wall=group(building,'wall-'+face);wall.position.set(face===1?6:face===3?-6:0,.3,face===0?-2:face===2?-11:-6.5);wall.rotation.y=face*Math.PI/2;
  const holes=[];for(let floor=0;floor<3;floor++)for(const x of face%2?[-2.3,2.3]:[-4.5,-1.5,1.5,4.5]){if(face===0&&floor===0&&x<0)continue;holes.push({x,y:floor*3.1+1.1,w:1.6,h:1.35});}
  if(face===0)holes.push({x:-3,y:0,w:2.8,h:2.7});const wk=kit(wall);wk.mesh(perforatedWall(span,9.6,holes),C.wall).name='genuinely-pierced-wall';for(const h of holes){if(face===0&&h.y===0)continue;const pane=wk.box(h.w-.1,h.h-.1,.08,C.glass,h.x,h.y+h.h/2,.11);pane.material.userData={lightingRole:'residential-glass',inhabited:true};wk.box(h.w+.12,.1,.35,C.navy,h.x,h.y-.02,.12);wk.box(.07,h.h,.16,C.trim,h.x,h.y+h.h/2,.17);}
 }
 for(const y of [.3,3.5,6.6,9.9])k.box(12.35,.2,9.35,C.wall,0,y,-6.5);
 e.box(2.55,2.55,.07,C.glass,-3,1.58,-2.1);for(const x of [-4.4,-1.6])e.box(.15,2.8,.35,C.navy,x,1.7,-1.7);e.box(3.4,.22,2.2,C.navy,-3,3.25,-1.1);for(const x of [-3.6,-2.4])e.box(.06,.5,.08,C.gold,x,1.5,-2.02);
 const sign=policeSign();sign.position.set(1,3.9,-1.65);entrance.add(sign);const badge=createPoliceBadge();badge.position.set(-3,5.1,-1.6);entrance.add(badge);
 r.box(12.7,.28,9.7,C.navy,0,10.15,-6.5);for(const side of [-1,1]){r.box(12.6,.6,.16,C.wall,0,10.6,-6.5+side*4.7);r.box(.16,.6,9.5,C.wall,side*6.2,10.6,-6.5);}r.box(2.4,1.5,2.6,C.wall,3,11.05,-8);r.box(2.7,.18,2.9,C.navy,3,11.89,-8);
 r.rod(new THREE.Vector3(3,11.98,-8),new THREE.Vector3(3,15.4,-8),.05,C.navy);for(const y of [13.1,14.1])r.rod(new THREE.Vector3(1.8,y,-8),new THREE.Vector3(4.2,y,-8),.035,C.trim);
 // Canopy is supported outside the bays; both cars can reverse into the clear front aisle.
 g.box(10.8,.22,7.3,C.navy,0,3.5,4.2);for(const x of [-5.25,5.25])for(const z of [.7,7.4])g.box(.18,3.2,.18,C.trim,x,1.9,z);
 for(const [kind,x]of [['short',-2.5],['long',2.5]] as const){const car=createPoliceCar(kind,optimized);car.position.set(x,.3,4.1);fleet.add(car);}
 for(const x of [-6.7,6.7]){b.box(.8,.6,1.5,C.wall,x,.56,-12.1);b.box(.65,.65,1.35,C.leaf,x,1.1,-12.1);}
 for(const x of [-7.55,-5.85]){b.box(.12,.85,.12,C.navy,x,.72,11.5);b.box(.14,.14,.14,C.gold,x,1.08,11.5);}
 root.userData={vehicleKinds:['short','long'],publicDoor:{x:-3,z:-2},vehicleExit:{x:7.75,z:10.5,width:5.5},clearAisle:{x:1.125,z:10.5,w:13.25,d:5.5},parts:6};
 if(optimized)for(const part of root.children){if(part===fleet)continue;part.updateMatrixWorld(true);const buckets=new Map<THREE.Material,GeometryBatchPart[]>();part.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material)!.push({mesh:o,matrix:o.matrixWorld.clone(),count:o.geometry.index?.count??o.geometry.attributes.position.count});});part.clear();for(const [material,parts]of buckets){const mesh=new THREE.Mesh(mergeGeometryBatch(parts),material);mesh.castShadow=mesh.receiveShadow=true;part.add(mesh);}}
 return root;
}
