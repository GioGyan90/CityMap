import * as THREE from 'three';
import {kit} from './referenceArchitecture';
import {createPlanter,renderPlant,treeSamples} from './plantAssets';
import {ZONES,terrainHeight} from './layout';
import {world} from './scene';
import {specialBuildings} from './specialBuildings';
import {gridCell} from './mapCoordinates';
const C={paving:0xe7d9b9,edge:0xc6b38e,blue:0x39899d,wood:0xb88650,metal:0x526b73,green:0x6eab59,cream:0xf5edda};
function part(root:THREE.Group,name:string){const p=new THREE.Group();p.name=name;root.add(p);return p;}
/** World-metre local coordinates; attached after landmark scaling to preserve usable clearances. */
export function createFacilityCourtyard(kind:'hospital'|'campus'){
 const root=new THREE.Group();root.name=kind+'-courtyard';
 const surface=.18;
 const paving=part(root,'walkways'),k=kit(paving);
 const walk=(x:number,z:number,w:number,d:number)=>k.box(w,.24,d,C.paving,x,surface-.12,z);
 const bench=(x:number,z:number,angle=0)=>{const g=part(root,'bench');g.position.set(x,surface,z);g.rotation.y=angle;const b=kit(g);
  for(const dx of [-.95,.95]){b.box(.12,.52,.6,C.metal,dx,.26,0);b.box(.12,.95,.1,C.metal,dx,.475,-.28);}
  for(const dz of [-.24,0,.24])b.box(2.5,.1,.19,C.wood,0,.56,dz);
  for(const y of [.83,1.06])b.box(2.5,.16,.09,C.wood,0,y,-.3);
  for(const dx of [-1.13,1.13]){b.box(.08,.32,.08,C.metal,dx,.75,.13);b.box(.12,.08,.65,C.metal,dx,.95,0);}
  return g;
 };
 const bed=(x:number,z:number,w:number,d:number,tree=false)=>{const g=part(root,'planted-bed'),b=kit(g);g.position.set(x,surface,z);
  b.rounded(w,d,.42,0,0,0,C.edge,.45);b.rounded(w-.25,d-.25,.12,0,.42,0,C.green,.35);
  if(tree){const t=renderPlant(treeSamples().get('shade-0')!);t.scale.setScalar(.45);t.position.set(0,.54,0);g.add(t);}
  else for(const dx of [-w*.28,0,w*.28]){const plant=renderPlant(createPlanter(Math.round((x+25)*13+z),.48));plant.position.set(dx,.54,0);g.add(plant);}
  return g;
 };
 const pergola=(x:number,z:number,w:number,d:number)=>{const g=part(root,'pergola');g.position.set(x,surface,z);const b=kit(g);
  b.box(w+.5,.2,d+.5,C.paving,0,-.1,0);
  for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2]){b.box(.34,.12,.34,C.edge,dx,.06,dz);b.box(.18,2.95,.18,C.wood,dx,1.57,dz);}
  for(const dx of [-w/2,w/2])b.box(.22,.24,d+.5,C.wood,dx,3.15,0);
  for(let dz=-d/2-.15;dz<=d/2+.2;dz+=.55)b.box(w+.6,.14,.16,C.cream,0,3.34,dz);
  return g;
 };
 const board=(x:number,z:number,medical=false)=>{const g=part(root,'wayfinding');g.position.set(x,surface,z);const b=kit(g);
  for(const dx of [-.75,.75])b.box(.13,1.9,.13,C.metal,dx,.95,0);
  b.box(2.1,1.25,.16,C.cream,0,1.65,0);b.box(1.95,.22,.18,C.blue,0,2.12,.02);
  if(medical){b.box(.16,.65,.06,0xe65d43,-.5,1.55,.12);b.box(.6,.17,.07,0xe65d43,-.5,1.55,.13);}
  for(const y of [1.4,1.65,1.9])b.box(medical?.65:1.4,.07,.04,C.blue,medical?.45:0,y,.12);
  b.box(2.35,.12,.55,C.blue,0,2.35,0);return g;
 };
 if(kind==='hospital'){
  // Central pedestrian spine remains unobstructed; right-hand apron retains the ambulance approach.
  walk(-5,14,4,38);walk(-1,30,36,3);walk(-12,3,18,3);walk(-12,24,16,3);
  walk(-17,13,3,20);walk(2,13,3,20);
  const apron=part(root,'ambulance-apron'),a=kit(apron);
  a.box(9.2,.2,35,0x91a9ac,10.1,.08,9.5);
  for(const z of [-3,2,7,12,17,22])a.box(.14,.025,2,C.cream,10.1,.195,z);
  // One sheltered waiting bay, a quiet planted loop and wheelchair turning space beside benches.
  pergola(-12,13,6,5);bench(-13.3,11.4);bench(-13.3,14.6,Math.PI);
  bed(-12,21,5.8,2.5);bed(-12,6,5.8,2.5);
  bed(-.8,9,1.8,5);bed(-.8,20,1.8,5);
  bed(-16.2,28.6,4,2,true);bed(15.7,29,3,2,true);
  board(-9,30,true);bench(-11,28.8);bench(0,27.3);
  // Two solid sloped approaches meet the actual scaled plinth top (.67 * 1.15).
  const ramp=part(root,'entrance-ramp'),r=kit(ramp);
  const slope=(x:number,w:number,end:number)=>{const shape=new THREE.Shape();shape.moveTo(-2.7,0);shape.lineTo(-2.7,.7705);shape.lineTo(end,.18);shape.lineTo(end,0);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:w,bevelEnabled:false});g.rotateY(-Math.PI/2);r.mesh(g,C.paving,x+w/2,0,0);};
  slope(-5,4,3.5);slope(10.1,9.2,5);
  root.userData.clearRoutes=[{x:-5,z:16,w:3,d:33},{x:10.1,z:9.5,w:8.8,d:34}];
 }else{
  // Existing teaching blocks end near z=-11.5; sports pitch begins at z=8.6.
  walk(0,-3.25,5,16.5);walk(0,2,31,3);walk(-14,18.75,3,30.5);walk(0,31,30,3);
  pergola(-9,-3.5,5,5);bench(-9,-5);bench(-9,-2,Math.PI);
  bed(-9,3.9,5.2,1.4);bed(8,-6.5,6,2,true);
  const monument=part(root,'academy-emblem'),m=kit(monument);monument.position.set(8,surface,-.3);
  m.box(3.7,.25,3,C.edge,0,.125,0);m.box(2.5,.4,2,C.cream,0,.45,0);m.box(.75,1.25,.75,C.edge,0,1.25,0);
  // Open book, two sloped pages supported by the central lectern.
  for(const side of [-1,1]){const page=m.box(1.2,.14,1.5,C.cream,side*.52,2,0);page.rotation.z=side*.3;for(const z of [-.4,0,.4]){const line=m.box(.75,.025,.045,C.blue,side*.55,2.11,z);line.rotation.z=side*.3;}}
  board(12,3);bench(7,4.1);bench(11,4.1);
  const bikes=part(root,'cycle-parking'),b=kit(bikes);b.box(5.8,.16,3,C.paving,9,surface-.08,29);
  for(const x of [7,8.3,9.6,10.9]){b.rod(new THREE.Vector3(x,.18,28.4),new THREE.Vector3(x,1.05,28.4),.045,C.metal);b.rod(new THREE.Vector3(x,.18,29.6),new THREE.Vector3(x,1.05,29.6),.045,C.metal);b.rod(new THREE.Vector3(x,1.05,28.4),new THREE.Vector3(x,1.05,29.6),.045,C.metal);}
  // Small stepped spectator stand outside the existing playing surface.
  const stand=part(root,'pitch-seating'),s=kit(stand);for(let row=0;row<2;row++){
   s.box(2,.25+row*.35,11,C.edge,13+row*.8,(.25+row*.35)/2,19);
   for(const z of [15,18.5,22])s.box(.55,.14,2.4,0x438f9b,13+row*.8,.36+row*.35,z);
  }
  bed(-9,29.5,4,2,true);board(-10.5,33);
  root.userData.clearRoutes=[{x:0,z:-3.25,w:4,d:16.5},{x:-14,z:18.75,w:2.5,d:30.5}];
 }
 root.userData.facility=kind;return root;
}
export function buildFacilityCourtyards(){
 for(const kind of ['hospital','campus'] as const){const entry=specialBuildings.find(s=>s.id===kind)!,zone=ZONES[kind],root=createFacilityCourtyard(kind);
  root.position.set(zone.x,zone.level??terrainHeight(zone.x,zone.z),zone.z);world.add(root);entry.group.attach(root);
  root.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(root,true);
  root.userData.siteRecord={anchor:gridCell(zone.x,zone.z).id,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
 }
}
