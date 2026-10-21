import * as THREE from 'three';
import type {BuildingWing} from './buildingPlans';
import {toon} from './materials';
export interface EntranceWall {x:number;z:number;nx:number;nz:number;length:number;ceiling:number}
export function entranceWall(w:number,d:number,h:number,wings?:BuildingWing[],target={x:0,z:d+20}):EntranceWall{
 const boxes=wings?.map(v=>({x0:v.x0*w,x1:v.x1*w,z0:v.z0*d,z1:v.z1*d,h:v.height*h}))??[{x0:-w/2,x1:w/2,z0:-d/2,z1:d/2,h}];
 const xs=[...new Set(boxes.flatMap(b=>[b.x0,b.x1]))].sort((a,b)=>a-b),zs=[...new Set(boxes.flatMap(b=>[b.z0,b.z1]))].sort((a,b)=>a-b);
 const inside=(x:number,z:number)=>boxes.filter(b=>x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1);
 const edges:EntranceWall[]=[];
 for(const box of boxes)for(const [axis,pos,from,to,nx,nz] of [['x',box.x0,box.z0,box.z1,-1,0],['x',box.x1,box.z0,box.z1,1,0],['z',box.z0,box.x0,box.x1,0,-1],['z',box.z1,box.x0,box.x1,0,1]] as [string,number,number,number,number,number][]){
  const cuts=(axis==='x'?zs:xs).filter(v=>v>=from&&v<=to);let run:number|null=null;
  for(let i=0;i<cuts.length-1;i++){
   const mid=(cuts[i]+cuts[i+1])/2,x=axis==='x'?pos:mid,z=axis==='x'?mid:pos;
   const exposed=!inside(x+nx*.01,z+nz*.01).length;
   if(exposed&&run===null)run=cuts[i];
   if(run!==null&&(!exposed||i===cuts.length-2)){
    const end=exposed?cuts[i+1]:cuts[i],length=end-run,c=(run+end)/2;
    if(length>1.35&&box.h>2.7)edges.push({x:axis==='x'?pos:c,z:axis==='x'?c:pos,nx,nz,length,ceiling:box.h});run=null;
   }
  }
 }
 const score=(e:EntranceWall)=>{const dx=target.x-e.x,dz=target.z-e.z;return Math.hypot(dx,dz)+(dx*e.nx+dz*e.nz<0?50:0)-Math.min(e.length,6)*.35;};
 return edges.sort((a,b)=>score(a)-score(b))[0]??{x:0,z:d/2,nx:0,nz:1,length:w,ceiling:h};
}
const materials=new Map<number,THREE.Material>();
const mat=(color:number)=>{if(!materials.has(color))materials.set(color,toon(color));return materials.get(color)!;};
export function addBuildingEntrance(parent:THREE.Object3D,wall:EntranceWall,large=false,kind:'house'|'shop'|'office'|'warehouse'='house',floor=0,includeCanopy=true){
 const group=new THREE.Group();group.name='building-entrance';group.position.set(wall.x+wall.nx*.05,floor,wall.z+wall.nz*.05);group.rotation.y=Math.atan2(wall.nx,wall.nz);parent.add(group);
 const height=Math.min(large?3.5:2.6,wall.ceiling-.55),width=Math.min(large?3.5:kind==='warehouse'?3.1:1.65,wall.length*.72);
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,color:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 // Raised frame, recessed-looking blue glass and separate door leaves/handles.
 box(width+.45,height+.36,.22,0,height/2+.18,.06,0xd8c49a);
 const glass=kind==='house'?0x7a664a:0x286b89;
 box(width,height,.10,0,height/2+.18,.19,glass);
 const leaves=large||kind==='shop'?2:1;
 for(let i=0;i<leaves;i++){
  const x=(i-(leaves-1)/2)*width/leaves;
  if(kind==='warehouse')for(let y=.5;y<height;y+=.32)box(width-.12,.045,.04,0,y,.26,0xa8b8b9);
  else{
   box(width/leaves-.13,height*.53,.05,x,height*.67,.255,kind==='house'?0x74a7b7:0x56a4bf);
   box(.07,.5,.08,x+(leaves===2?(i===0?1:-1)*width*.16:width*.31),height*.47,.31,0xd9b46b);
  }
 }
 if(leaves===2)box(.10,height,.11,0,height/2+.18,.28,0xdac69c);
 box(width+.65,.18,.8,0,.09,.45,0xe4d5b7);box(width+.85,.10,.35,0,.05,.98,0xf1e2c2);
 const canopyDepth=large?1.8:1.1;
 if(includeCanopy){
 box(width+.9,.17,canopyDepth,0,height+.45,canopyDepth/2,kind==='house'?0xb9784e:0x2d7898);
 box(width+.95,.09,.12,0,height+.39,canopyDepth-.04,0xe6c78c);
 }
 if(large&&includeCanopy)for(const side of [-1,1])box(.11,height+.28,.11,side*(width/2+.3),(height+.28)/2,canopyDepth-.14,0x527782);
 for(const side of [-1,1]){box(.17,.32,.17,side*(width/2+.24),height*.68,.29,0x47697d);box(.10,.18,.04,side*(width/2+.24),height*.68,.39,0xffdfa0);}
 group.userData.entrance={kind,width,height};return group;
}
