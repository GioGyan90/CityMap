import * as THREE from 'three';
import {world} from './scene';
import {kit,C} from './referenceArchitecture';

/** Bow is +X; all decks, glazing, rails and boats share the same local profile. */
export function buildCruiseShip(){
 const ship=new THREE.Group();ship.name='cruise-ship';ship.position.set(-101,0,72);world.add(ship);const k=kit(ship);
 ship.userData.referenceDetails={lifeboats:6,radomes:2,decks:4,curvedBowWindows:true,rakedFunnel:true};
 const outline=(length:number,width:number)=>{const s=new THREE.Shape(),l=length/2,w=width/2;s.moveTo(-l+3,-w);s.lineTo(l-w,-w);s.absarc(l-w,0,w,-Math.PI/2,Math.PI/2,false);s.lineTo(-l+3,w);s.quadraticCurveTo(-l,w,-l,w-3);s.lineTo(-l,-w+3);s.quadraticCurveTo(-l,-w,-l+3,-w);return s;};
 const deck=(l:number,w:number,h:number,y:number,c:number,x=0)=>{const m=k.mesh(new THREE.ExtrudeGeometry(outline(l,w),{depth:h,bevelEnabled:false,curveSegments:18}),c,x,y);m.rotation.x=-Math.PI/2;return m;};
 const rail=(l:number,w:number,y:number,x=0)=>{const pts=outline(l,w).getSpacedPoints(100).map(p=>new THREE.Vector3(p.x+x,y,-p.y));k.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),120,.065,5,true),C.white);for(let i=0;i<pts.length;i+=3){const p=pts[i];k.rod(p.clone().add(new THREE.Vector3(0,-.75,0)),p,.045,C.white);}};
 deck(69,17,2.2,.15,0x17659a);deck(69.1,17.1,.18,2.35,C.gold);deck(69,17,3.2,2.53,C.white);
 // Separate side windows below the promenade deck.
 for(const side of [-1,1])for(let x=-28;x<26;x+=3.3){k.box(1.25,.75,.12,C.glass,x,4.25,side*8.57);k.box(.85,.35,.12,C.glass,x+.3,2.95,side*8.57);}
 deck(67,16.5,.25,5.75,0xe6bd7c);rail(66.5,16,6.75);
 for(let level=0;level<4;level++){
  const y=6.05+level*3.25,l=58-level*5,w=15-level*.85,x=-1-level*.6;
  // Continuous blue profile under cream mullions gives the bow its wraparound glazing.
  deck(l,w,2.8,y,C.glass,x);deck(l+.6,w+.5,.48,y,C.white,x);deck(l+.9,w+.7,.48,y+2.7,C.white,x);
  for(const side of [-1,1]){
   k.box(l-w-3,.28,.15,C.white,x-w/2+.5,y+1.55,side*(w/2+.07));
   for(let a=-l/2+1;a<l/2-w/2;a+=2.8)k.box(.32,2.3,.24,C.white,a+x,y+1.6,side*(w/2+.08));
  }
  const radius=w/2,center=x+l/2-radius;
  for(let a=-Math.PI/2;a<=Math.PI/2+.01;a+=Math.PI/9){const bar=k.box(.16,2.3,.22,C.white,center+radius*Math.cos(a),y+1.6,radius*Math.sin(a));bar.rotation.y=-a;}
  deck(l+.6,w+.5,.13,y+3.18,0xe6bd7c,x);rail(l+.2,w+.15,y+3.95,x);
 }
 for(const side of [-1,1])for(const x of [-21,-10,1]){
  const boat=new THREE.Group();boat.name='orange-lifeboat';boat.position.set(x,9.5,side*8.7);ship.add(boat);const b=kit(boat);
  const hull=b.mesh(new THREE.CapsuleGeometry(.95,5.3,6,12),0xf57822);hull.rotation.z=Math.PI/2;hull.scale.z=.8;b.box(4.8,.55,1.35,0xffb24c,0,.7,0);for(const dx of [-1.9,1.9]){const band=b.mesh(new THREE.TorusGeometry(.98,.065,6,16),C.gold,dx,0,0);band.rotation.y=Math.PI/2;band.scale.y=.9;}
  for(const dx of [-3.2,3.2]){k.rod(new THREE.Vector3(x+dx,8.4,side*7.9),new THREE.Vector3(x+dx,11.8,side*7.9),.16,C.white);k.rod(new THREE.Vector3(x+dx,11.8,side*7.9),new THREE.Vector3(x+dx,11.8,side*9),.16,C.white);k.rod(new THREE.Vector3(x+dx,11.8,side*9),new THREE.Vector3(x+dx,10.1,side*9),.055,0xb9c6c7);}
 }
 // Bridge and two radar domes above the forward observation deck.
 const bridge=deck(13,7,1.6,19.3,C.glass,10);bridge.name='panoramic-bridge';deck(13.5,7.5,.5,20.9,C.white,10);
 for(let x=5;x<16;x+=2)for(const side of [-1,1])k.box(.18,1.6,.18,C.white,x,20.1,side*3.52);
 for(const x of [7,15]){k.mesh(new THREE.CylinderGeometry(.4,.55,1,10),C.cream,x,22,0);k.ball(1.2,C.white,x,23.1,0);}
 const funnel=new THREE.Group();funnel.name='raked-striped-funnel';funnel.position.set(-12,19.3,0);funnel.rotation.z=-.2;ship.add(funnel);const f=kit(funnel);
 for(let i=0;i<5;i++){const m=f.mesh(new THREE.CylinderGeometry(2.2-i*.14,2.4-i*.14,1.3,24,1,true),i%2?C.white:C.blue,0,.65+i*1.3,0);m.scale.z=.67;}
 const rim=f.mesh(new THREE.TorusGeometry(1.72,.18,8,28),0x344455,0,6.55,0);rim.rotation.x=Math.PI/2;rim.scale.y=.67;
 f.mesh(new THREE.CylinderGeometry(1.6,1.5,.16,24),0x172a39,0,6.15,0).scale.z=.67;
 const mastX=28;k.rod(new THREE.Vector3(mastX,6,0),new THREE.Vector3(mastX,11.4,0),.11,C.white);k.box(.2,.15,3,C.white,mastX,10.6,0);
 for(let i=0;i<5;i++)for(const side of [-1,1]){const chair=k.box(1.8,.2,.7,C.cream,-21+i*4.3,19.4,side*3.5);chair.rotation.y=.18;}
 return ship;
}
