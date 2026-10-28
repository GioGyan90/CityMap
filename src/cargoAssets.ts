import * as THREE from 'three';
import {checkpoint} from './loadingScheduler';
import {toon} from './materials';
import {batchStationPart} from './coastalStationAssets';
import {CARGO_PLAN,CARGO_STACKS} from './cargoPlan';
const P={cream:0xfff2d9,concrete:0xcccbb8,edge:0xe8d7ad,blue:0x3987aa,navy:0x365d70,steel:0x667f84,gold:0xefb43b,dark:0x344d59,white:0xfff9eb,coral:0xdc8065};
const BOX_COLORS=[0x439eac,0xe4a15b,0x88a697,0xcf7966];
function part(parent:THREE.Group,name:string){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
function kit(root:THREE.Group){
 const mats=new Map<number,THREE.MeshToonMaterial>();
 const mesh=(geo:THREE.BufferGeometry,c:number,name:string,x=0,y=0,z=0)=>{if(!mats.has(c))mats.set(c,toon(c));const m=new THREE.Mesh(geo,mats.get(c));m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 const box=(w:number,h:number,d:number,c:number,name:string,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),c,name,x,y,z);
 const rod=(a:number[],b:number[],r:number,c:number,name:string)=>{const av=new THREE.Vector3(...a as [number,number,number]),bv=new THREE.Vector3(...b as [number,number,number]),m=mesh(new THREE.CylinderGeometry(r,r,av.distanceTo(bv),7),c,name);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return m;};
 return {mesh,box,rod};
}
/** Actual separate boxes stack on their corner castings, never stretched double-height. */
export function createFreightContainer(color=BOX_COLORS[0]){
 const root=new THREE.Group();root.name='freight-container';root.userData={width:6.4,height:2.7,depth:2.6};const k=kit(root),rib=new THREE.Color(color).multiplyScalar(.86).getHex();
 k.box(6.3,2.57,2.5,color,'container-shell',0,1.35,0);
 for(const x of [-3.11,3.11])for(const z of [-1.21,1.21])for(const y of [.09,2.61])k.box(.18,.18,.18,P.edge,'corner-casting',x,y,z);
 for(const side of [-1,1]){
  for(let x=-2.75;x<2.9;x+=.5)k.box(.07,2.32,.06,rib,'side-corrugation',x,1.35,side*1.28);
  k.box(6.05,.09,.06,P.edge,'lower-side-rail',0,.16,side*1.28);k.box(6.05,.09,.06,P.edge,'upper-side-rail',0,2.54,side*1.28);
 }
 for(let x=-2.8;x<3;x+=.55)k.box(.065,.04,2.35,rib,'roof-corrugation',x,2.655,0);
 for(const z of [-.62,.62]){
  k.box(.06,2.25,1.16,rib,'container-door',3.185,1.35,z);
  for(const dz of [-.34,.34]){k.rod([3.235,.35,z+dz],[3.235,2.37,z+dz],.026,P.edge,'door-lock-rod');k.box(.07,.06,.22,P.edge,'door-lock-handle',3.25,1.15,z+dz+.07);}
  for(const y of [.6,2.05])k.box(.1,.16,.14,P.edge,'door-hinge',3.23,y,z+Math.sign(z)*.5);
 }
 k.box(.08,2.38,2.4,color,'closed-rear-panel',-3.17,1.35,0);
 return root;
}
export function createCargoSpreader(){
 const root=new THREE.Group();root.name='cargo-spreader';const k=kit(root);
 k.box(1.4,.36,1.8,P.gold,'spreader-headblock');
 for(const x of [-1.2,1.2])k.box(.16,.24,6.1,P.gold,'spreader-side',x,0,0);
 for(const z of [-2.95,0,2.95])k.box(2.5,.24,.18,P.gold,'spreader-crossmember',0,0,z);
 for(const x of [-1.2,1.2])for(const z of [-2.95,2.95])k.box(.22,.18,.22,P.dark,'twist-lock',x,-.2,z);
 return root;
}
/** Four grounded bogies, open truck portal, two-sided truss boom and suspended spreader. */
export function createCargoCrane(){
 const root=new THREE.Group();root.name='ship-to-shore-crane';const k=kit(root);
 for(const x of [-5.1,5.1])for(const z of [-1.65,1.65]){
  k.box(1.25,.5,1.8,P.gold,'rail-bogie',x,.8,z);
  for(const dz of [-.5,.5]){const w=k.mesh(new THREE.CylinderGeometry(.22,.22,.22,10),P.dark,'crane-wheel',x,.72,z+dz);w.rotation.z=Math.PI/2;}
  k.box(.55,13.8,.55,P.gold,'portal-leg',x,7.95,z);
 }
 for(const z of [-1.65,1.65])k.box(11.1,.8,.6,P.gold,'portal-header',0,14.65,z);
 for(const x of [-5.1,5.1]){k.box(.65,.65,4.2,P.gold,'portal-side-tie',x,12.8,0);k.rod([x,1.1,-1.65],[x,12.8,1.65],.12,P.gold,'portal-side-brace');k.rod([x,1.1,1.65],[x,12.8,-1.65],.12,P.gold,'portal-side-brace');}
 for(const side of [-1,1]){
  k.box(26,.28,.28,P.gold,'boom-lower-chord',-2.5,16.1,side*.85);k.box(26,.25,.25,P.gold,'boom-upper-chord',-2.5,17.6,side*.85);
  for(let bay=0;bay<10;bay++){const x=-15.5+bay*2.6;k.rod([x,16.1,side*.85],[x+2.6,17.6,side*.85],.085,P.gold,'boom-diagonal');k.rod([x,17.6,side*.85],[x+2.6,16.1,side*.85],.085,P.gold,'boom-diagonal');}
 }
 for(const x of [-14,-8,-2,4,10])k.box(.18,.18,2,P.gold,'boom-cross-tie',x,16.1,0);
 for(const x of [-4,4])for(const z of [-1.4,1.4])k.rod([x,14.9,z],[x,16.1,z*.5],.15,P.gold,'boom-bearing-strut');
 k.box(3.6,.3,4.8,P.gold,'machinery-bearing-platform',4,16,2.3);
 k.box(3,2,2.8,P.cream,'crane-machinery-house',4,17.15,3.2);k.box(3.3,.18,3,P.blue,'machinery-roof',4,18.24,3.2);
 k.box(1.65,1.45,1.9,P.cream,'operator-cab',-4.5,14.725,3.15);k.box(1.45,.95,.08,P.blue,'operator-front-glass',-4.5,14.875,4.14);
 k.box(1.9,.25,3,P.gold,'operator-cab-support',-4.5,13.9,2.55);k.box(1.85,.12,2.1,P.blue,'operator-cab-roof',-4.5,15.51,3.15);
 const trolleyX=-13.5;k.box(1.6,.5,2.2,P.navy,'hoist-trolley',trolleyX,16.35,0);
 for(const x of [trolleyX-.55,trolleyX+.55])for(const z of [-.7,.7])k.rod([x,16.1,z],[x,8.9,z],.026,P.steel,'hoist-cable');
 const spreader=createCargoSpreader();spreader.position.set(trolleyX,8.72,0);root.add(spreader);
 // Ladder stays outside the portal, rungs physically connect both stiles.
 for(const z of [1.35,1.95])k.rod([5.48,1,z],[5.48,14.5,z],.04,P.steel,'ladder-stile');
 for(let y=1.2;y<14.5;y+=.55)k.rod([5.48,y,1.35],[5.48,y,1.95],.035,P.steel,'ladder-rung');
 const groups=new Map<string,THREE.Group>();
 for(const node of [...root.children]){const name=node.name,id=name==='rail-bogie'||name==='crane-wheel'?'crane-running-gear':name.startsWith('portal-')?'crane-portal':name.startsWith('boom-')?'crane-boom':name.startsWith('ladder-')?'crane-access':name.startsWith('hoist-')||name==='cargo-spreader'?'crane-hoist':'crane-machinery';if(!groups.has(id))groups.set(id,part(root,id));groups.get(id)!.add(node);}
 return root;
}
export function createCargoFender(){const root=new THREE.Group();root.name='quay-fender';const k=kit(root);k.box(.34,1.6,1.1,P.navy,'rubber-fender');k.box(.18,1.4,.7,P.steel,'fender-backing',.23,0,0);for(const y of [-.55,.55])k.rod([.23,y,0],[.46,y,0],.08,P.edge,'fender-anchor');return root;}
export function createYardTractor(){
 const root=new THREE.Group();root.name='yard-terminal-tractor';const k=kit(root);
 k.box(1.9,.3,3.6,P.steel,'tractor-chassis',0,.65,0);k.box(1.8,1.5,1.6,P.cream,'tractor-cab',0,1.55,1);
 k.box(1.6,.75,.08,P.blue,'tractor-windshield',0,1.75,1.84);k.box(1.95,.15,1.8,P.blue,'tractor-cab-roof',0,2.37,1);
 for(const x of [-.94,.94]){k.box(.08,.75,1.05,P.blue,'tractor-side-glass',x,1.8,1.1);k.box(.1,.08,.25,P.steel,'tractor-door-handle',x,1.25,.8);}
 for(const z of [-1.1,1.25])k.rod([-1,.47,z],[1,.47,z],.12,P.steel,'tractor-axle');
 for(const x of [-.98,.98])for(const z of [-1.1,1.25]){const m=k.mesh(new THREE.CylinderGeometry(.47,.47,.24,10),P.dark,'tractor-tyre',x,.47,z);m.rotation.z=Math.PI/2;}
 k.box(.9,.12,.9,P.dark,'tractor-fifth-wheel',0,.88,-.9);k.box(.35,.15,.25,P.gold,'tractor-beacon',0,2.52,1);
 k.box(.45,.18,1.25,P.steel,'trailer-coupling-neck',0,.9,-1.4);
 k.box(2.25,.26,7.5,P.steel,'trailer-frame',0,.8,-5.4);for(const x of [-1.08,1.08])for(const z of [-7.8,-6.9]){const m=k.mesh(new THREE.CylinderGeometry(.4,.4,.22,10),P.dark,'trailer-tyre',x,.4,z);m.rotation.z=Math.PI/2;}
 for(const x of [-1,1])k.box(.16,.7,.16,P.steel,'trailer-coupling-support',x,.42,-2.2);
 return root;
}
export function createCargoFeeder(){
 const root=new THREE.Group();root.name='container-feeder';const k=kit(root),positions:number[]=[],indices:number[]=[];
 const stations=[[-16,.04],[-14,.65],[-11,1],[9,1],[14,.65],[16,.04]];
 const section=[[-.48,.95],[-.5,.05],[-.34,-.65],[0,-.9],[.34,-.65],[.5,.05],[.48,.95]];
 for(const [z,taper] of stations)for(const [x,y] of section)positions.push(x*6.8*taper,y,z);
 for(let r=0;r<stations.length-1;r++)for(let j=0;j<section.length;j++){const a=r*7+j,b=r*7+(j+1)%7,c=a+7,d=b+7;indices.push(a,b,c,b,d,c);}
 for(const r of [0,stations.length-1])for(let j=1;j<6;j++)indices.push(...(r?[r*7,r*7+j,r*7+j+1]:[0,j+1,j]));
 const hull=new THREE.BufferGeometry();hull.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));hull.setIndex(indices);hull.computeVertexNormals();k.mesh(hull,P.navy,'closed-feeder-hull');
 // Small deck ribs respect the taper; no rectangular deck protrudes through bow plating.
 for(let i=0;i<stations.length-1;i++){const [z,a]=stations[i],[zz,b]=stations[i+1];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-3.264*a,.97,z,3.264*a,.97,z,-3.264*b,.97,zz,3.264*b,.97,zz],3));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();k.mesh(g,P.edge,'feeder-weather-deck');}
 for(const z of [-8,-1,6]){const box=createFreightContainer(BOX_COLORS[(z+8)%4]);box.rotation.y=Math.PI/2;box.position.set(0,.97,z);root.add(box);}
 k.box(4.4,2.7,3.2,P.cream,'feeder-bridge',0,2.32,11.2);k.box(4.8,.2,3.6,P.blue,'feeder-bridge-roof',0,3.77,11.2);
 for(const z of [9.55,12.85])k.box(3.8,.85,.1,P.blue,'bridge-window-band',0,2.9,z);
 for(const x of [-2.25,2.25])k.box(.1,.85,2.6,P.blue,'bridge-side-window',x,2.9,11.2);
 k.box(1.1,2,1,P.gold,'feeder-funnel',1.3,4.8,11.5);k.box(1.18,.25,1.08,P.navy,'funnel-cap',1.3,5.92,11.5);
 k.rod([0,3.9,10.3],[0,6.8,10.3],.05,P.white,'feeder-mast');k.rod([-1,6.1,10.3],[1,6.1,10.3],.04,P.white,'feeder-mast-crossbar');
 for(const z of [-13,14])for(const x of [-1.2,1.2]){k.box(.4,.12,.6,P.steel,'deck-cleat-base',x,1.05,z);k.box(.7,.12,.16,P.steel,'deck-cleat',x,1.2,z);}
 return root;
}
function createDispatch(){
 const root=new THREE.Group();root.name='cargo-dispatch';const k=kit(root),x=21,z=-10;
 // Independent slab, solid walls, inset glazing, supported canopy and flat roof.
 k.box(8.2,.24,7.2,P.edge,'office-plinth',x,.62,z);k.box(7.6,4,6.4,P.cream,'dispatch-building',x,2.72,z);
 k.box(8.2,.25,7,P.blue,'dispatch-flat-roof',x,4.85,z);
 for(const dx of [-2,0,2])k.box(1.45,1.1,.1,P.blue,'office-front-window',x+dx,3.45,z+3.24);
 for(const dx of [-2,0,2])k.box(1.45,1.1,.1,P.blue,'office-rear-window',x+dx,3.45,z-3.24);
 for(const side of [-1,1])k.box(.1,1.1,3.5,P.blue,'office-side-window',x+side*3.84,3.45,z);
 k.box(1.45,2.35,.12,P.navy,'cargo-office-door',x,1.92,z+3.25);k.box(.08,.45,.15,P.gold,'office-door-handle',x+.5,1.85,z+3.36);
 k.box(4.1,.18,2,P.blue,'dispatch-entry-canopy',x,3.1,z+4);for(const dx of [-1.8,1.8])k.box(.14,2.3,.14,P.steel,'office-canopy-post',x+dx,1.89,z+4.8);
 k.box(4.2,.15,2.2,P.edge,'office-threshold',x,.77,z+4.1);
 // A clear six-metre road opening; no barrier or fence across the active entrance.
 for(const zz of [-4.1,4.1]){k.box(.4,5.4,.4,P.steel,'gateway-post',26.4,3.2,zz);k.box(.75,.15,.75,P.edge,'gateway-foot',26.4,.575,zz);}
 k.box(.6,.5,8.8,P.blue,'cargo-gateway-header',26.4,6.15,0);
 k.box(.62,.25,5.8,P.edge,'gateway-name-inlay',26.4,6.16,0);
 // Separate pedestrian strip hugs the office, avoiding the truck corridor.
 k.box(5,.035,2,P.edge,'office-pedestrian-apron',21,.527,-5.1);
 for(const xx of [18.8,23.2])k.box(.15,.8,.15,P.gold,'pedestrian-bollard',xx,.9,-4.1);
 for(const zz of [-15.8,6.6,10.2,14.5]){k.box(.18,1.1,2.4,P.steel,'east-safety-fence',26.5,1.05,zz);}
 return root;
}
export function* createCargoHarborSteps(optimized=false){
 const root=new THREE.Group();root.name='cargo-harbor';
 const quay=part(root,'cargo-quay'),q=kit(quay);
 q.box(56,.5,34,P.concrete,'cargo-deck',0,.25,0);
 q.box(.8,2.5,34,P.edge,'working-quay-wall',-27.6,-.75,0);
 for(const z of [-14,-7,0,7,14]){q.box(2.2,4,2.2,P.concrete,'quay-foundation-pile',-26.5,-2,z);const f=createCargoFender();f.position.set(-28.25,-.25,z);quay.add(f);q.box(.7,.16,.8,P.steel,'bollard-base',-26.8,.58,z+1.5);q.rod([-26.8,.66,z+1.5],[-26.8,1.2,z+1.5],.13,P.steel,'mooring-bollard');q.box(.6,.12,.18,P.steel,'bollard-crossbar',-26.8,1.22,z+1.5);}
 for(const x of [-22,-12,-2])for(const z of [-13,0,13])q.box(1.5,4,1.5,P.concrete,'deck-support-pile',x,-2,z);
 for(const z of [-13,0,13])q.box(53,.4,1.2,P.edge,'underdeck-support-beam',0,-.2,z);
 for(const z of [-16.6,16.6])q.box(55,.1,.25,P.edge,'quay-edge-curb',0,.55,z);
 // Edge hatching is geometry, visible from every angle without coplanar surfaces.
 for(let z=-15;z<16;z+=2){q.box(.65,.025,.75,z%4<1?P.gold:P.navy,'berth-warning-mark',-27,.515,z);}
 yield;const cranes=part(root,'cargo-cranes'),c=kit(cranes);
 for(const x of [-25.6,-15.4]){c.box(.14,.08,31,P.steel,'crane-running-rail',x,.54,0);for(let z=-14;z<=14;z+=2)c.box(.75,.04,.45,P.navy,'rail-seat',x,.52,z);}
 for(const p of CARGO_PLAN.cranes){yield;const crane=createCargoCrane();crane.position.set(p.x,.08,p.z);cranes.add(crane);}
 yield;const stacks=part(root,'cargo-stacks'),s=kit(stacks);
 for(const slot of CARGO_STACKS){yield;
  s.box(7.1,.025,3.05,P.navy,'container-slot-outline',slot.x,.514,slot.z);s.box(6.9,.03,2.85,P.concrete,'slot-infill',slot.x,.518,slot.z);
  for(let level=0;level<slot.levels;level++){const container=createFreightContainer(BOX_COLORS[(slot.color+level)%4]);container.position.set(slot.x,.5+level*2.7,slot.z);stacks.add(container);}
 }
 yield;const circulation=part(root,'cargo-circulation'),r=kit(circulation);
 r.box(39,.018,6.2,0x6e858b,'yard-transfer-road',8.5,.512,0);
 for(const z of [-3.1,3.1])r.box(38,.025,.12,P.edge,'truck-lane-edge',8.5,.527,z);
 for(let x=-9;x<27;x+=4)r.box(1.8,.025,.1,P.edge,'yard-center-dash',x,.529,0);
 for(const [x,z,direction]of [[-4,-1.55,-1],[14,-1.55,-1],[4,1.55,1],[22,1.55,1]]){
  r.box(1.8,.03,.12,P.white,'truck-route-arrow-stem',x,.53,z);
  for(const side of [-1,1]){const a=r.box(.9,.03,.12,P.white,'truck-route-arrow-tip',x+direction*.65,.53,z+side*.26);a.rotation.y=side*direction*Math.PI/4;}
 }
 const tractor=createYardTractor();tractor.position.set(-20.5,.5,3.3);circulation.add(tractor);
 yield;root.add(createDispatch());yield;
 const feeder=createCargoFeeder();feeder.position.set(CARGO_PLAN.ship.x,-1.06,CARGO_PLAN.ship.z);feeder.name='cargo-feeder';root.add(feeder);
 // Mooring ropes terminate at real deck cleats and quay bollards.
 for(const [z,quayZ] of [[-13,-12.5],[14,15.5]])q.rod([-26.8,1.15,quayZ],[-32.8,.14,z],.045,P.edge,'mooring-rope');
 root.userData={version:'cargo-terminal-v2',deck:CARGO_PLAN.deck,stacks:CARGO_STACKS,parts:root.children.map(g=>g.name),gate:CARGO_PLAN.gate};
 if(optimized)for(const group of root.children){yield;batchStationPart(group as THREE.Group);}
 root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root);root.userData.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
 return root;
}

export function createCargoHarbor(optimized=false){const steps=createCargoHarborSteps(optimized);let r=steps.next();while(!r.done)r=steps.next();return r.value;}
export async function createCargoHarborProgressive(){const steps=createCargoHarborSteps(true);let r=steps.next();while(!r.done){await checkpoint('货运码头');r=steps.next();}return r.value;}
