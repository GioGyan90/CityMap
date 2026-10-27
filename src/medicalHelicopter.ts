import * as THREE from 'three';
import {toon} from './materials';

export const HELICOPTER_PARTS:Record<string,string>={fuselage:'机身',cockpit:'驾驶舱与舷窗',tail:'尾梁与尾翼',rotors:'主旋翼与尾旋翼',landing:'起落架',medical:'急救标识'};
/** Local origin is the underside of the skids; the nose points toward +Z. */
export function createMedicalHelicopter(){
 const root=new THREE.Group();root.name='medical-helicopter';
 const white=toon(0xf6f6ee),red=toon(0xe7524d),blue=toon(0x337b9f),glass=toon(0x326b87),dark=toon(0x344959),metal=toon(0xbacbd0);
 const part=(name:string)=>{const p=new THREE.Group();p.name=name;root.add(p);return p;};
 const mesh=(g:THREE.Group,geo:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 const box=(g:THREE.Group,w:number,h:number,d:number,material:THREE.Material,x:number,y:number,z:number)=>mesh(g,new THREE.BoxGeometry(w,h,d),material,x,y,z);
 const fuselage=part('fuselage');const body=mesh(fuselage,new THREE.SphereGeometry(1,16,10),white,0,1.32,.15);body.scale.set(1.15,1,2.05);
 for(const side of [-1,1]){const stripe=box(fuselage,.045,.16,1.25,red,side*1.08,1.12,-.35);stripe.name='rescue-red-stripe';}
 const cockpit=part('cockpit');
 // Match the fuselage sphere's 16 longitude and 10 latitude segments exactly.
 // Each pane uses the same triangles, offset slightly to avoid z-fighting.
 const pane=(name:string,phi:number,width:number)=>{const m=mesh(cockpit,new THREE.SphereGeometry(1.004,width,2,phi,width*Math.PI/8,3*Math.PI/10,2*Math.PI/10),glass,0,1.32,.15);m.scale.set(1.15,1,2.05);m.name=name;};
 pane('curved-windscreen',2*Math.PI/8,4);
 pane('curved-side-window-left',-Math.PI/8,3);pane('curved-side-window-right',7*Math.PI/8,3);
 const tail=part('tail');const boom=mesh(tail,new THREE.CylinderGeometry(.22,.52,3.1,10),white,0,1.5,-2.8);boom.rotation.x=-Math.PI/2;
 box(tail,.18,1.08,.8,blue,0,2,-4.13);box(tail,2.15,.12,.5,white,0,1.62,-3.72);
 const rotors=part('rotors');mesh(rotors,new THREE.CylinderGeometry(.10,.13,.65,10),metal,0,2.46,-.05);
 mesh(rotors,new THREE.CylinderGeometry(.3,.3,.15,12),dark,0,2.82,-.05);
 for(let i=0;i<4;i++){const blade=box(rotors,.31,.07,2.55,dark,0,2.85,1.3);blade.geometry.translate(0,0,1.35);blade.position.set(0,2.85,-.05);blade.rotation.y=i*Math.PI/2;}
 const hub=mesh(rotors,new THREE.CylinderGeometry(.12,.12,.15,10),metal,.18,2,-4.16);hub.rotation.z=Math.PI/2;
 for(const a of [0,Math.PI/2]){const blade=box(rotors,.08,1.15,.12,dark,.28,2,-4.16);blade.rotation.x=a;}
 const landing=part('landing');for(const s of [-1,1]){box(landing,.16,.16,3.6,dark,s*.86,.08,.08);for(const z of [-1,1]){const strut=box(landing,.12,.75,.12,metal,s*.77,.49,z);strut.rotation.z=s*.18;}}
 const medical=part('medical');for(const s of [-1,1]){box(medical,.045,.58,.2,red,s*1.13,1.65,.44);box(medical,.05,.2,.58,red,s*1.14,1.65,.44);}
 return root;
}
/** Thin raised marking stays above the roof surface without z-fighting. */
export function createHospitalHelipadMark(){
 const root=new THREE.Group();root.name='hospital-helipad-marking';const mat=toon(0xfff3d1);
 const ring=new THREE.Mesh(new THREE.RingGeometry(3.65,3.83,48),mat);ring.rotation.x=-Math.PI/2;ring.position.y=.022;root.add(ring);
 for(const x of [-1.15,1.15]){const b=new THREE.Mesh(new THREE.BoxGeometry(.44,.035,3.3),mat);b.position.set(x,.04,0);root.add(b);}
 const bar=new THREE.Mesh(new THREE.BoxGeometry(2.3,.035,.44),mat);bar.position.y=.04;root.add(bar);return root;
}
