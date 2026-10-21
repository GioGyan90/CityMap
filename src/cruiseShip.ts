import * as THREE from 'three';
import { world } from './scene';
import { toon } from './materials';

/** Every deck uses ship-local coordinates, so hull, windows and lifeboats align. */
export function buildCruiseShip() {
  const ship=new THREE.Group();ship.name='cruise-ship';ship.position.set(-101,0,72);world.add(ship);
  const mesh=(geo:THREE.BufferGeometry,color:number,x:number,y:number,z:number)=>{
    const m=new THREE.Mesh(geo,toon(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;ship.add(m);return m;
  };
  const block=(w:number,h:number,d:number,c:number,x:number,y:number,z:number)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z);
  const profile=(length:number,width:number,depth:number,y:number,color:number)=>{
    const shape=new THREE.Shape();const l=length/2,w=width/2;
    shape.moveTo(-l, -w*.7);shape.lineTo(-l+3,-w);shape.lineTo(l-7,-w);
    shape.quadraticCurveTo(l,-w*.6,l,0);shape.quadraticCurveTo(l,w*.6,l-7,w);
    shape.lineTo(-l+3,w);shape.lineTo(-l,w*.7);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:6});
    const m=mesh(geo,color,0,y,0);m.rotation.x=-Math.PI/2;return m;
  };
  profile(69,16,5.5,.2,0xf7f7ee);
  profile(69.2,16.1,.65,.2,0x254a6c);
  for(let level=0;level<5;level++) {
    const y=6+level*2.6,length=61-level*4,width=15-level*.8;
    profile(length,width,2.5,y,0xf7fbff);
    for(const side of [-1,1]) {
      block(length-9,1.25,.14,0x306c94,-2,y+1.1,side*(width/2+.06));
      for(let x=-(length/2)+3;x<length/2-7;x+=2.8) block(.13,1.45,.2,0xe9f4f6,x,y+1.1,side*(width/2+.12));
      block(length-8,.16,.22,0xe5e1d3,-2,y+2.48,side*(width/2+.06));
    }
  }
  for(const side of [-1,1]) for(let i=0;i<7;i++) {
    const boat=mesh(new THREE.CapsuleGeometry(.6,2.7,3,8),0xf2853f,-24+i*6,9.1,side*8.4);
    boat.rotation.z=Math.PI/2;
  }
  block(13,.3,5,0xe7c48e,-3,19.15,0);
  block(9,.35,3.7,0x44bad6,-3,19.4,0);
  mesh(new THREE.CylinderGeometry(2,2.9,5,12),0x1f6e9e,-12,22,0);
  mesh(new THREE.CylinderGeometry(2.15,2.15,.7,12),0x293e4a,-12,24.7,0);
  for(const x of [5,14]) mesh(new THREE.SphereGeometry(1.1,10,8),0xf1f6f5,x,20.4,0);
  mesh(new THREE.CylinderGeometry(.12,.2,9,6),0xe2e9e8,20,20,0);
  block(5,.2,.25,0xe2e9e8,20,23,0);
  for(let i=0;i<10;i++) for(const side of [-1,1]) block(1.1,.23,.8,0xefcb79,-20+i*3.5,19.6,side*4.2);
  return ship;
}
