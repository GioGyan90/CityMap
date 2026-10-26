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
 const p=[[-5,-5],[3,-5],[5,-3],[5,3],[2,5],[-5,5]];
 polygon(g,p,h,C.blue,x,6.1,z);
 // Recessed glazing bays and stone fins give all four elevations depth.
 for(const side of [-1,1])for(const dz of [-3,0,3]){box(g,.22,h-.6,1.6,C.glass,x+side*5.03,6.4+(h-.6)/2,z+dz);box(g,.45,h,.16,C.stone,x+side*5.12,6.1+h/2,z+dz+.9);}
 if(!hotel){for(const [dx,dh]of [[-1.8,18],[1,11]] ){box(g,4,dh,6,C.glass,x+dx,6.1+h+dh/2,z-1);box(g,4.4,.35,6.4,C.stone,x+dx,6.1+h+dh,z-1);for(let y=3;y<dh;y+=3){box(g,4.15,.12,6.15,C.trim,x+dx,6.1+h+y,z-1);}}}
 for(let y=9;y<6+h;y+=3){polygon(g,p.map(([a,b])=>[a*1.025,b*1.025]),.17,C.trim,x,y,z);if(hotel){for(const side of [-1,1]){box(g,3.6,.18,1.2,C.stone,x+side*2.3,y,z+5.3);box(g,3.6,.6,.12,C.glass,x+side*2.3,y+.35,z+5.85);}}}
 for(const dx of [-4.7,-2,1,3]){box(g,.16,h,.2,C.glass,x+dx,6.1+h/2,z+5.03);box(g,.16,h,.2,C.glass,x+dx,6.1+h/2,z-5.03);}
 polygon(g,p,.4,C.stone,x,6.1+h,z);planter(g,x,6.5+h,z+3.9,5);
 // Occupied setback crown, with an asymmetric blade rather than a tank/dome.
 if(hotel){box(g,5,3.8,6,C.glass,x-1,8.4+h,z);box(g,5.5,.3,6.5,C.trim,x-1,10.45+h,z);}
 if(!hotel){const blade=box(g,.4,9,6,C.stone,x-3.6,9+h,z);blade.rotation.z=-.16;}
}
/** Local metres; street X=0 is kept open below both supported bridges. */
export function createCommercialDistrict(optimized=false){
 const root=new THREE.Group();root.name='commercial-city-living';
 const ground=group(root,'01-street-and-mobility'),west=group(root,'02-dining-and-blue-hall-plaza'),east=group(root,'03-hotel-and-retail'),office=group(root,'04-technology-office'),bridges=group(root,'05-sky-garden-links');
 box(ground,44,.3,31,C.stone,0,0,0,'district-foundation');
 box(ground,6,.06,31,C.road,0,.18,0,'open-through-street');
 for(const x of [-3.2,3.2])box(ground,.22,.18,31,C.trim,x,.23,0);
 for(const z of [-12,-8,-4,0,4,8,12])box(ground,.12,.025,1.8,C.stone,0,.225,z);
 for(const z of [-12,12])for(const x of [-2,-1,0,1,2])box(ground,.48,.03,2,C.stone,x,.24,z,'crosswalk');
 shop(west,-12,-7,15,C.coral);shop(west,-14,4,11,C.blue);shop(east,12,-7,15,C.blue);shop(east,13,4,13,C.coral);
 tower(office,-12,-7,49);tower(east,13,-7,33,true);
 // Terraces stay in front of towers and are reached from the bridges and stairs.
 for(const x of [-12,12]){box(bridges,15,.3,7,C.wood,x,6.18,4);for(const z of [1,7]){box(bridges,15,.7,.12,C.glass,x,6.65,z);for(const dx of [-7,0,7])box(bridges,.12,.9,.12,C.stone,x+dx,6.6,z);}for(const dx of [-4,4])planter(bridges,x+dx,6.34,5);table(bridges,x,6.34,3);
 for(const dx of [-2,2])for(const z of [1.5,5.5])box(bridges,.16,2.6,.16,C.wood,x+dx,7.64,z);for(const dz of [-2,-1,0,1,2])box(bridges,4.5,.16,.12,C.wood,x,9,3.5+dz);}
 for(const z of [-3,4]){box(bridges,9,.4,2.6,C.stone,0,6.2,z,'bridge-deck');for(const side of [-1,1]){box(bridges,9,.9,.12,C.glass,0,6.85,z+side*1.25);box(bridges,9,.12,.16,C.gold,0,7.35,z+side*1.25);}for(const x of [-4.2,4.2])box(bridges,.4,6,.5,C.blue,x,3.1,z);}
 for(const side of [-1,1])for(let i=0;i<18;i++)box(bridges,1.8,(i+1)*.34,.38,C.stone,side*20.3,.15+(i+1)*.17,9-i*.38,'terrace-stair');
 for(const x of [-15,-10,10,15])table(ground,x,.15,11);
 for(const x of [-18,-6,6,18]){planter(ground,x,.15,13);planter(bridges,x,6.34,2);}
 // West pocket garden directly faces the existing Blue Order hall.
 for(const z of [-11,0,10]){planter(west,-21,.15,z);box(west,.22,2.2,.22,C.wood,-21,1.9,z);mesh(west,new THREE.IcosahedronGeometry(1.2,1),C.leaf,-21,3.3,z);}
 for(const x of [-7,7]){box(ground,2.7,.45,.65,C.wood,x,.6,10);for(const s of [-1,1])box(ground,.16,.5,.6,C.blue,x+s,.3,10);}
 // A waiting shelter is on the sidewalk, clear of the six-metre carriageway.
 for(const z of [7,10])box(ground,.14,2.8,.14,C.blue,4.6,1.6,z);box(ground,1.8,.18,4,C.glass,4.7,3.1,8.5);box(ground,.1,2.2,3,C.glass,5.45,1.5,8.5);box(ground,.65,.45,2,C.wood,4.8,.6,8.5);
 for(const x of [-7,7])for(const z of [-13,13]){box(ground,.12,3.6,.12,C.blue,x,1.95,z);const light=box(ground,.65,.15,.65,0xffe8ac,x,3.8,z);light.material=toon(0xffe8ac,{emissive:0xffc56c,emissiveIntensity:.5});light.material.userData.lightingRole='station-light';}
 // Café cup, menu boards, bicycle racks and visitors establish human scale.
 mesh(west,new THREE.CylinderGeometry(.6,.45,.9,12),C.stone,-14,6.55,5);
 const handle=mesh(west,new THREE.TorusGeometry(.35,.1,6,12),C.stone,-13.4,6.55,5);handle.rotation.y=Math.PI/2;
 for(const x of [-17,17]){box(ground,.8,1.1,.1,C.blue,x,.75,9);box(ground,.9,.12,.2,C.gold,x,1.35,9);}
 for(const z of [7,8.3,9.6]){const rack=mesh(ground,new THREE.TorusGeometry(.45,.065,5,12,Math.PI),C.blue,7,.3,z);rack.rotation.y=Math.PI/2;}
 for(const [x,z,color]of [[-9,10,C.coral],[9,9,C.blue],[-5,-5,C.gold],[6,0,C.coral]]){mesh(ground,new THREE.SphereGeometry(.22,8,6),0xe8b888,x,1.8,z);box(ground,.5,.75,.35,color,x,1.15,z);for(const side of [-1,1])box(ground,.16,.65,.2,C.blue,x+side*.14,.45,z);}
 root.userData.street={width:6,clearHeight:6,bounds:[-22,22,-15.5,15.5]};
 if(optimized)for(const part of root.children){part.updateMatrixWorld(true);const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();part.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!buckets.has(o.material as THREE.Material))buckets.set(o.material as THREE.Material,[]);buckets.get(o.material as THREE.Material)!.push(geo.index?geo.toNonIndexed():geo);});part.clear();for(const [mat,geos]of buckets){const geo=mergeGeometries(geos,false)!;geos.forEach(g=>g.dispose());const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;part.add(m);}}
 return root;
}
