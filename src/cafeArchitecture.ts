import {renderPlant,createPlanter,createGrassClump,createFlower} from './plantAssets';
import * as THREE from 'three';
import {world} from './scene';
import {GROUND_Y} from './config';
import {kit,C} from './referenceArchitecture';

export function buildReferenceCafe(cx:number,cz:number){
 const root=new THREE.Group();root.name='old-town-cafe';root.position.set(cx,GROUND_Y,cz);world.add(root);const k=kit(root);
 const blue=0x246f9d,stone=0xffe5b3;
 k.rounded(12,10,11,-4,.15,-4,stone,.3);
 // Shallow masonry joints and corner quoins give the cream facade a human scale.
 for(let y=1;y<11;y+=1.1){
  k.box(11.8,.045,.035,0xd8bd91,-4,y,1.02);
  for(const x of [-9.85,1.85])k.box(.08,.045,9.7,0xd8bd91,x,y,-4);
 }
 for(const x of [-9.7,1.7])for(let y=.8;y<10.6;y+=1.1)k.box(.7,.88,.18,0xffedcc,x,y,1.13);
 k.rounded(12.6,10.6,.55,-4,11.15,-4,0xf6d69d,.4);
 k.box(11.4,.12,9.4,0xd1c6ab,-4,11.5,-4);
 // Solid parapet around a recessed flat roof; no window texture on the roof.
 for(const z of [-9.15,1.15])k.box(12.5,.55,.3,C.cream,-4,11.7,z);
 for(const x of [-10.15,2.15])k.box(.3,.55,10.4,C.cream,x,11.7,-4);
 // Warm shop glazing, blue door leaves, transom and raised frames.
 k.box(9.2,4.9,.2,blue,-4,2.65,1.18);
 for(const x of [-7,-4,-1]){
  k.box(2.65,3.8,.12,0xdba350,x,2.9,1.32);
  k.box(.15,4.8,.18,blue,x+1.4,2.65,1.43);
  k.box(2.7,.14,.15,blue,x,3.55,1.45);
  k.box(2.7,.16,.15,blue,x,1.65,1.45);
 }
 for(const x of [-4.8,-3.2])k.box(.09,.6,.14,C.gold,x,2.25,1.55);
 k.box(9.4,.22,.9,C.cream,-4,.26,1.55);
 // Upper window has separate shutters and a full flower box.
 k.box(5.8,2.9,.2,0xb4854e,-4,8.4,1.16);
 k.box(5.35,2.5,.12,0x376e84,-4,8.4,1.3);
 for(const x of [-6.55,-4,-1.45])k.box(.15,2.6,.15,0xbf8a49,x,8.4,1.42);
 k.box(5.5,.16,.15,0xbf8a49,-4,8.4,1.44);
 for(const x of [-7.5,-.5]){
  k.box(1.5,3.5,.3,blue,x,8.4,1.42);
  for(let y=7.1;y<10;y+=.4)k.box(1.17,.06,.12,0x448db3,x,y,1.61);
 }
 k.box(6.2,.75,1.2,0xb17b3f,-4,6.95,1.75);
 for(let i=0;i<8;i++){
  const x=-6.5+i*.7,grass=renderPlant(createGrassClump(71+i));grass.scale.set(.45,.6,.45);grass.position.set(x,7.33,1.85);root.add(grass);
  const flower=renderPlant(createFlower(31+i));flower.position.set(x,7.4,1.95);root.add(flower);
 }

 // Blue canvas slopes down from the wall; a scalloped valance closes its front edge.
 for(let i=0;i<8;i++){
  const x=-9.25+i*1.5,panel=k.box(1.48,.15,3.8,i%2?0x297ca8:blue,x,5.55,3.05);panel.rotation.x=.16;
  const scallop=k.mesh(new THREE.SphereGeometry(.74,12,8,0,Math.PI*2,Math.PI/2,Math.PI/2),i%2?0x297ca8:blue,x,5.24,4.91);scallop.scale.set(1,.7,.14);
 }
 // A compact cup sign beside the entrance, attached to a bracket rather than the roof.
 k.rod(new THREE.Vector3(1.8,6.3,1),new THREE.Vector3(3.1,6.3,1.8),.07,0x38484c);
 k.rod(new THREE.Vector3(3.1,6.3,1.8),new THREE.Vector3(3.1,6,1.8),.07,0x38484c);
 const badge=k.mesh(new THREE.CylinderGeometry(.95,.95,.18,24),0xe2b768,3.1,5.1,1.8);badge.rotation.x=Math.PI/2;
 const cup=k.mesh(new THREE.CylinderGeometry(.43,.32,.6,16),C.white,3.1,5.05,2);
 k.mesh(new THREE.CylinderGeometry(.35,.35,.04,16),0x654328,3.1,5.37,2);
 k.mesh(new THREE.TorusGeometry(.22,.07,6,12),C.white,3.58,5.07,2);
 // Street lamp and terracotta planting frame the frontage, leaving the door clear.
 for(const [x,z] of [[-11,2.8],[3.2,1.5]]){
  const planter=renderPlant(createPlanter(Math.round(x*11+z*19),.85));planter.position.set(x,.2,z);root.add(planter);
 }
 k.mesh(new THREE.CylinderGeometry(.16,.25,6,10),0x35474a,3.5,3.25,4.2);
 k.box(.85,1.35,.85,0xffce70,3.5,6.6,4.2);
 for(const x of [3.02,3.98])for(const z of [3.72,4.68])k.box(.09,1.5,.09,0x35474a,x,6.6,z);
 k.mesh(new THREE.ConeGeometry(.95,.8,4),0x35474a,3.5,7.7,4.2).rotation.y=Math.PI/4;
 return root;
}
