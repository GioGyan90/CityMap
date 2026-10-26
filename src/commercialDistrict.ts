import {createThemedHall} from './themedHalls';
import {COMMERCIAL_PLAN} from './commercialPlan';
import * as THREE from 'three';
import {toon} from './materials';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const C={stone:0xf2e9d6,blue:0x277c9e,glass:0x56b5cb,trim:0xd6e8e5,gold:0xdab56c,wood:0xb47750,leaf:0x509a65,soil:0x675743,coral:0xd77b60,road:0x647782};
const mats=new Map<number,THREE.Material>();
function material(c:number){if(!mats.has(c))mats.set(c,toon(c));return mats.get(c)!;}
function mesh(g:THREE.Group,geo:THREE.BufferGeometry,c:number,x:number,y:number,z:number,name=''){const m=new THREE.Mesh(geo,material(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.name=name;g.add(m);return m;}
function box(g:THREE.Group,w:number,h:number,d:number,c:number,x:number,y:number,z:number,name=''){return mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z,name);}
function polygon(g:THREE.Group,points:number[][],h:number,c:number,x:number,y:number,z:number){const shape=new THREE.Shape();points.forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);return mesh(g,geo,c,x,y,z);}
function planter(g:THREE.Group,x:number,y:number,z:number,w=2.4){box(g,w,.65,1.3,C.stone,x,y+.325,z);box(g,w-.2,.08,1.1,C.soil,x,y+.68,z);for(let i=0;i<3;i++)mesh(g,new THREE.IcosahedronGeometry(.56,1),C.leaf,x+(i-1)*(w-.8)/3,y+1,z);}
function table(g:THREE.Group,x:number,y:number,z:number){mesh(g,new THREE.CylinderGeometry(.65,.65,.12,12),C.wood,x,y+1,z);box(g,.15,1,.15,C.blue,x,y+.5,z);for(const s of [-1,1]){box(g,.6,.12,.6,C.coral,x+s,y+.55,z);box(g,.6,.7,.12,C.coral,x+s,y+.85,z-.3);for(const dx of [-.2,.2])box(g,.08,.5,.45,C.blue,x+s+dx,y+.25,z);}}
function group(root:THREE.Group,name:string){const g=new THREE.Group();g.name=name;root.add(g);return g;}
function shop(g:THREE.Group,x:number,z:number,w:number,color:number){box(g,w,5.6,7,C.stone,x,3,z);box(g,w-.8,3,.18,C.glass,x,2.1,z+3.55);for(const dx of [-w/2+.5,0,w/2-.5])box(g,.18,3.2,.35,C.blue,x+dx,2,z+3.65);box(g,w+.5,.22,2,color,x,3.9,z+4);box(g,w-.6,.7,.25,color,x,4.65,z+3.6);box(g,w+.4,.25,7.4,C.trim,x,5.95,z);}
function tower(g:THREE.Group,x:number,z:number,h:number,hotel=false){
 const base=9,p=[[-5,-5],[3,-5],[5,-3],[5,3],[2,5],[-5,5]];
 const body=polygon(g,p,h,C.blue,x,base,z);body.name='single-continuous-tower-body';
 for(let y=3;y<h;y+=3){polygon(g,p.map(([a,b])=>[a*1.025,b*1.025]),.16,C.trim,x,base+y,z);if(hotel)for(const dx of [-2.3,2.3]){box(g,3.6,.18,1.2,C.stone,x+dx,base+y,z+5.3);box(g,3.6,.6,.12,C.glass,x+dx,base+y+.35,z+5.85);}}
 for(const side of [-1,1])for(const dz of [-1.8,0,1.8]){box(g,.18,h-.6,1.3,C.glass,x+side*5.02,base+h/2,z+dz);box(g,.3,h,.13,C.stone,x+side*5.1,base+h/2,z+dz+.9);}
 for(const dx of [-4.5,-2,0,1.6])for(const side of [-1,1])box(g,.14,h,.18,C.glass,x+dx,base+h/2,z+side*5.02);
 polygon(g,p,.3,C.stone,x,base+h,z);
 if(!hotel){
  // One closed stepped crown: tiers touch only at horizontal support planes.
  box(g,6,5,6,C.glass,x,base+h+2.8,z,'lower-crown-tier');box(g,6.3,.22,6.3,C.trim,x,base+h+5.41,z);
  for(let y=1;y<5;y+=2)box(g,6.12,.13,6.12,C.trim,x,base+h+.3+y,z);
  box(g,3.4,3,4,C.glass,x-1,base+h+7.02,z,'upper-crown-tier');box(g,3.7,.22,4.3,C.stone,x-1,base+h+8.63,z);
 }
}
function roofPavilion(g:THREE.Group,x:number,y:number,z:number){
 // The sun-facing ornate building now crowns the lower hotel, supported by its roof.
 const sizes=[[7,3.6],[5.8,3],[4.6,2.2]];let bottom=y;
 for(const [w,h]of sizes){box(g,w,h,w,C.stone,x,bottom+h/2,z,'pavilion-tier');for(const side of [-1,1])for(const dx of [-1.5,0,1.5]){box(g,.65,h*.65,.1,C.blue,x+dx,bottom+h*.5,z+side*(w/2+.02));box(g,.1,h*.65,.65,C.blue,x+side*(w/2+.02),bottom+h*.5,z+dx);}box(g,w+.3,.18,w+.3,C.gold,x,bottom+h+.09,z);bottom+=h+.18;}
 mesh(g,new THREE.SphereGeometry(2.3,20,10,0,Math.PI*2,0,Math.PI/2),C.coral,x,bottom,z,'sunlit-rooftop-dome');
}
/** Two occupied podiums straddle an EXISTING city road; no decorative road meshes. */
export function createCommercialDistrict(optimized=false,includeHall=false){
 const root=new THREE.Group();root.name='commercial-city-living';
 const ground=group(root,'01-street-and-mobility'),west=group(root,'02-dining-and-blue-hall-plaza'),east=group(root,'03-hotel-and-retail'),office=group(root,'04-technology-office'),bridges=group(root,'05-sky-garden-links');
 for(const side of [-1,1]){
  const z=side*17;
  box(ground,52,.3,16,C.stone,0,0,z,'separate-sidewalk-foundation');
  box(bridges,52,.7,16,C.stone,0,8.65,z,'occupied-second-floor-platform');
  for(const x of [-23,-8,8,23]){box(bridges,.8,8.2,.8,C.blue,x,4.1,side*10.8,'street-clear-support-column');box(bridges,1.5,.35,1.5,C.stone,x,.18,side*10.8);}
  // Railings leave the bridge mouths and stair landings open.
  box(bridges,52,.9,.12,C.glass,0,9.55,side*24.8);
  for(const x of [-17,17])box(bridges,18,.9,.12,C.glass,x,9.55,side*9.2);
  for(const x of [-23,-4,5,23])planter(bridges,x,9,side*23.3);
 }
 for(const side of [-1,1])for(const x of [-25.8,25.8])box(bridges,.12,.9,11,C.glass,x,9.55,side*15.2);
 for(const z of [-18,17]){box(bridges,5,.1,4,C.leaf,-2,9.05,z);planter(bridges,-2,9,z-2.8,5);}
 // The 14m-wide upper street crosses the complete public carriageway and sidewalks.
 box(bridges,14,.7,18,C.stone,0,8.65,0,'real-city-road-skywalk');
 for(const x of [-6.9,6.9]){box(bridges,.12,.9,18,C.glass,x,9.55,0);box(bridges,.18,.12,18,C.gold,x,10.06,0);}
 // Lower stores face the public road; shop roots carry their complete assemblies.
 for(const side of [-1,1])for(const x of [-16,15]){const bay=group(ground,'retail-bay');bay.position.set(x,0,side*18);bay.rotation.y=side<0?0:Math.PI;shop(bay,0,0,17,side<0?C.blue:C.coral);}
 tower(office,15,-18,42);tower(east,15,18,27,true);roofPavilion(east,15,36.3,18);
 // Café and garden stay on the open, south-facing upper terrace.
 for(const x of [-21,-16,-11])table(west,x,9,18);
 for(const dx of [-2.8,2.8])for(const dz of [-2.5,2.5])box(west,.18,3,.18,C.wood,-16+dx,10.5,18+dz);
 for(const dz of [-3,-2,-1,0,1,2,3])box(west,6.4,.18,.16,C.wood,-16,12.1,18+dz);
 // Stairs climb outside both street edges and connect directly to the upper podium.
 for(const side of [-1,1])for(let i=0;i<27;i++){const h=(i+1)/3;box(bridges,3,h,.4,C.stone,side*27,h/2,side*(13.8+i*.4),'second-floor-stair');}
 for(const x of [-21,21])for(const z of [-12,12]){box(ground,.14,3.4,.14,C.blue,x,1.7,z);const light=box(ground,.6,.16,.6,0xffe8ac,x,3.48,z);light.material=toon(0xffe8ac,{emissive:0xffc56c,emissiveIntensity:.5});light.material.userData.lightingRole='station-light';}
 // Waiting shelter, seating and racks sit on the south sidewalk, outside traffic.
 for(const x of [-4,0])box(ground,.14,2.8,.14,C.blue,x,1.55,10.5);
 box(ground,5,.2,2,C.glass,-2,3,10.5);box(ground,4,.5,.6,C.wood,-2,.5,11);
 for(const x of [-21,-12,10,23]){planter(ground,x,.15,23.5);table(ground,x,.15,13);}
 for(const x of [-4,0,4])planter(bridges,x,9,20);
 for(const [x,z,c]of [[-6,14,C.coral],[3,-14,C.blue],[-3,0,C.gold],[4,4,C.coral]]){mesh(bridges,new THREE.SphereGeometry(.22,8,6),0xe8b888,x,10.65,z);box(bridges,.5,.75,.35,c,x,10.1,z);for(const side of [-1,1])box(bridges,.16,.65,.2,C.blue,x+side*.14,9.4,z);}
 if(includeHall){const hall=createThemedHall('order');hall.position.set(COMMERCIAL_PLAN.hall.x,9,COMMERCIAL_PLAN.hall.z);hall.scale.setScalar(.62);west.add(hall);}
 root.userData.street={roadId:'hospital-ring',axis:'x',halfWidth:8.5,clearHeight:8.3,deckTop:9,bounds:[-28.5,28.5,-25,25]};
 if(optimized)for(const part of root.children){part.updateMatrixWorld(true);const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();part.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!buckets.has(o.material as THREE.Material))buckets.set(o.material as THREE.Material,[]);buckets.get(o.material as THREE.Material)!.push(geo.index?geo.toNonIndexed():geo);});part.clear();for(const [mat,geos]of buckets){const geo=mergeGeometries(geos,false)!;geos.forEach(g=>g.dispose());const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;part.add(m);}}
 return root;
}
