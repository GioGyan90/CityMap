import {billiardEmblem} from './marketEmblem';
import * as THREE from 'three';
import { world } from './scene';
import { GROUND_Y } from './config';
import { makeBuilding, box } from './buildings';
import { toon } from './materials';

export function sign(text: string,x: number,y: number,z: number,w: number,h: number,bg='#184c72',fg='#fff4d4') {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);
  ctx.strokeStyle='#e9c775';ctx.lineWidth=8;ctx.strokeRect(4,4,504,120);
  ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 48px "Microsoft YaHei",sans-serif';ctx.fillText(text,256,68,480);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
  mesh.position.set(x,GROUND_Y+y,z);mesh.userData.signText=text;world.add(mesh);return mesh;
}
export function awning(x:number,y:number,z:number,w:number,d:number,color=0x207fa9) {
  for(let i=0;i<10;i++) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w/10,.18,d),toon(i%2?0xfff0d9:color));
    mesh.position.set(x-w/2+(i+.5)*w/10,GROUND_Y+y,z);mesh.rotation.x=.12;mesh.castShadow=true;world.add(mesh);
  }
}
export function billiardsHall(x:number,z:number,n:number,symbolOnly=false) {
  makeBuilding({x,z,w:7,d:7,h:6.8,style:'arcade',base:n===2?'#b56e4c':'#f4e4bd',roof:n===3?0x272f3d:0x246d85});
  const face=z+3.61;
  box(7.1,2.3,.25,n===3?0x202836:0x216578,x,GROUND_Y+5.2,face,{outline:false});
  if(symbolOnly)billiardEmblem(x,7.35,z,.58);
  else sign(`⑧  ${n}  BILLIARDS`,x,5.2,face+.16,6.8,2);
  awning(x,3.7,z+4,7.5,2.2,n===2?0x24805b:0x19769b);
  for(const xx of [-2,0,2]) box(.12,2.6,.15,0xd9bc72,x+xx,GROUND_Y+1.5,face+.02,{outline:false});
}
export function marketDetails(cx:number,cz:number) {
  // Taller workshop and lower barrel-roof gallery flank an open market court.
  const workshop=makeBuilding({x:cx-7.3,z:cz-6.7,w:9,d:8,h:9.4,style:'flat',detail:false,base:'#eedbb7',roof:0x266c85});
  workshop.name='market-cue-workshop';
  box(9.3,.35,8.3,0xeadbb7,cx-7.3,GROUND_Y+9.55,cz-6.7,{outline:false});
  box(4.4,2,2.2,0xeadbb7,cx-7.3,GROUND_Y+10.4,cz-9.5,{outline:false});
  box(4.7,.22,2.5,0x28657d,cx-7.3,GROUND_Y+11.5,cz-9.5,{outline:false});
  awning(cx-7.3,3.5,cz-1.9,9.6,2.4,0x247f8d);
  billiardEmblem(cx-7.3,9.85,cz-6.7,1);
  const gallery=makeBuilding({x:cx+6.8,z:cz-6.7,w:7.6,d:7.8,h:6.8,style:'flat',detail:false,base:'#b97852',roof:0x315e78});
  gallery.name='market-arched-gallery';
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(3.9,3.9,7.8,24,1,true,0,Math.PI),toon(0x347e9b,{side:THREE.DoubleSide}));
  barrel.rotation.z=Math.PI/2;barrel.position.set(cx+6.8,GROUND_Y+6.85,cz-6.7);barrel.name='market-barrel-roof';barrel.castShadow=true;world.add(barrel);
  for(const side of [-1,1]){
    const end=new THREE.Mesh(new THREE.CircleGeometry(3.9,24,0,Math.PI),toon(0x7ab1bf,{side:THREE.DoubleSide}));end.rotation.y=Math.PI/2;end.position.set(cx+6.8+side*3.91,GROUND_Y+6.85,cz-6.7);world.add(end);
  }
  for(const dx of [-3.8,-1.3,1.3,3.8]){
    const points=Array.from({length:25},(_,i)=>{const a=i*Math.PI/24;return new THREE.Vector3(cx+6.8+dx,GROUND_Y+6.9+3.93*Math.sin(a),cz-6.7+3.93*Math.cos(a));});
    const rib=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.055,5,false),toon(0xe8d6ab));world.add(rib);
  }
  awning(cx+6.8,3.4,cz-2,8,2.3,0xb75b45);
  // Deep display windows and entrance frames use shapes instead of written signage.
  for(const dx of [-9.8,-6.7,4.3,7.3]){
    box(2.3,2.2,.16,0x3d7c91,cx+dx,GROUND_Y+4.8,cz-2.64,{outline:false});
    box(2.5,.16,.3,0xe9d5a4,cx+dx,GROUND_Y+6,cz-2.6,{outline:false});
  }
  // Upright cues and balls distinguish these stalls from a generic food market.
  for(let i=0;i<6;i++) {
    const cue=new THREE.Mesh(new THREE.CylinderGeometry(.04,.08,3.7,5),toon(0xc89d56));
    cue.position.set(cx-10+i*.35,GROUND_Y+2.4,cz+2);cue.rotation.z=.12;world.add(cue);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.24,8,6),toon([0xf7d05a,0x2879af,0xdd5a60][i%3]));
    ball.position.set(cx+5+i*.48,GROUND_Y+1.6,cz+6);world.add(ball);
  }
  billiardsHall(cx,cz+28,2,true);
}
export function commercialDistrict(cx:number,cz:number) {
  makeBuilding({x:cx-2,z:cz-2,w:13,d:13,h:82,style:'artdeco',base:'#e7dfc8',win:'#478db5',roof:0x1f76a8});
  for(const dx of [-8,8]) makeBuilding({x:cx+dx,z:cz+5,w:5,d:5,h:dx<0?21:30,style:'glass',base:'#e9f2f2',roof:0x317fa6});

}
export function hospitalDetails(cx:number,cz:number) {
  // Horizontal blue glazing, white mullions and a real H-shaped helipad marking.
  for(const y of [4,7,10,13]) {
    box(13,.9,.12,0x458bb8,cx-1,GROUND_Y+y,cz+5.56,{outline:false});
    for(const dx of [-5,-2,1,4]) box(.18,1,.16,0xf5f9fb,cx+dx,GROUND_Y+y,cz+5.64,{outline:false});
  }
  box(1,3.6,.18,0xe43d42,cx-6,GROUND_Y+13,cz+5.72,{outline:false});
  box(3.1,1,.18,0xe43d42,cx-6,GROUND_Y+13,cz+5.74,{outline:false});
  awning(cx,3.1,cz+7,10,3,0x247fb5);
  sign('港町综合病院',cx+1,4.9,cz+5.8,8,1.6,'#f2f8ff','#20628d');
  // Blue pad sits above the existing roof disk.
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(2.7,2.7,.09,24),toon(0x238ac7));
  pad.position.set(cx+7,GROUND_Y+9.43,cz+2);world.add(pad);
  for(const dx of [-1,1]) box(.38,.1,2.6,0xffffff,cx+7+dx,GROUND_Y+9.5,cz+2,{outline:false});
  box(2,.1,.38,0xffffff,cx+7,GROUND_Y+9.51,cz+2,{outline:false});
  billiardsHall(cx,cz+28,4);
}
export function hotelDetails(cx:number,cz:number) {
  for(const y of [4,8,12]) {
    box(22,.35,1.3,0xfff6df,cx,GROUND_Y+y,cz+2.1,{outline:false});
    box(22,.65,.12,0xfff7e4,cx,GROUND_Y+y+.4,cz+2.7,{outline:false});
    for(const dx of [-10,-6,-2,2,6,10]) box(.16,.85,.14,0xe1cfab,cx+dx,GROUND_Y+y+.45,cz+2.72,{outline:false});
  }
  sign('SEASIDE HOTEL',cx,3.1,cz+12.1,12,1.6,'#f9ecd0','#256d9b');
}
export function restaurantDetails(cx:number,cz:number) {
  awning(cx-2,4.6,cz+3.4,15.5,4.5,0xc84b43);
  sign('海鲜料理',cx-2,7,cz+1.2,10,2.4,'#fff1d6','#b63c34');
  const crab=new THREE.Mesh(new THREE.SphereGeometry(.85,10,6),toon(0xde5141));
  crab.scale.set(1.8,.7,.5);crab.position.set(cx+7,GROUND_Y+8,cz+1.25);world.add(crab);
  for(const dx of [-2,2]) {
    const claw=new THREE.Mesh(new THREE.TorusGeometry(.55,.14,5,10,Math.PI*1.5),toon(0xde5141));
    claw.position.set(cx+7+dx,GROUND_Y+8.5,cz+1.25);world.add(claw);
  }
}
export function cafeDetails(cx:number,cz:number) {
  awning(cx-4,4.9,cz+3.5,13.2,4.5,0x247aa9);
  sign('うみカフェ',cx-4,6.4,cz+1.15,9,1.6,'#f3e8c8','#245b88');
  const cup=new THREE.Mesh(new THREE.CylinderGeometry(.8,.6,1.2,12),toon(0xfff5dc));
  cup.position.set(cx+4.5,GROUND_Y+8,cz+1);world.add(cup);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.5,.14,6,12),toon(0xfff5dc));
  handle.position.set(cx+5.3,GROUND_Y+8,cz+1);world.add(handle);
}
