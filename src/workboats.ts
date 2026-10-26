import * as THREE from 'three';
import {kit} from './referenceArchitecture';
import {batchVehicle} from './vehicles';
export const WORKBOAT_TITLES={tug:'港口拖轮',crane:'吊机工程船',fishing:'近海作业渔船'};
export type WorkboatKind=keyof typeof WORKBOAT_TITLES;
export const WORKBOAT_KINDS=Object.keys(WORKBOAT_TITLES) as WorkboatKind[];
/** +X is bow; origin at waterline. Deck and equipment share one root. */
export function createWorkboat(kind:WorkboatKind,optimized=false){
 const root=new THREE.Group();root.name='workboat-'+kind;
 const part=(name:string)=>{const p=new THREE.Group();p.name=name;root.add(p);return kit(p);};
 const color=kind==='tug'?0x258d9d:kind==='crane'?0xe7ac36:0x397eb3;
 const h=part('船壳、龙骨与甲板');
 const outline=[[-6,-1.9],[2.8,-2.05],[4.7,-1.4],[6,0],[4.7,1.4],[2.8,2.05],[-6,1.9]];
 // Loft closed hull: narrower keel, broad chine, full sheer. No flat slab silhouette.
 const rings=[{y:-1.05,s:.62},{y:-.35,s:.92},{y:.72,s:1}],v:number[]=[],idx:number[]=[];
 for(const r of rings)for(const [x,z] of outline)v.push(x*r.s,r.y,z*r.s);
 for(let r=0;r<2;r++)for(let i=0;i<7;i++){const j=(i+1)%7,a=r*7+i,b=r*7+j,c=(r+1)*7+j,d=(r+1)*7+i;idx.push(a,d,b,b,d,c);}
 for(let i=1;i<6;i++)idx.push(0,i,i+1);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(idx);geo.computeVertexNormals();h.mesh(geo,color);
 h.slab(outline,.16,.7,0xd9cba9);h.slab(outline.map(([x,z])=>[x*.94,z*.94]),.05,.86,0xb4aa89);
 const rail=part('舷墙、扶栏与系泊设备');
 for(let i=0;i<7;i++){const a=outline[i],b=outline[(i+1)%7];rail.rod(new THREE.Vector3(a[0],.87,a[1]),new THREE.Vector3(b[0],.87,b[1]),.095,color);
  rail.rod(new THREE.Vector3(a[0],.92,a[1]),new THREE.Vector3(a[0],1.55,a[1]),.04,0xf5ebd6);
  rail.rod(new THREE.Vector3(a[0],1.55,a[1]),new THREE.Vector3(b[0],1.55,b[1]),.045,0xf5ebd6);
 }
 for(const x of [-5,4])for(const z of [-1.45,1.45]){rail.box(.5,.13,.25,0x405862,x,.95,z);for(const dx of [-.14,.14])rail.box(.07,.28,.09,0x405862,x+dx,1.12,z);}
 const cabin=part('驾驶楼、窗框与独立屋顶'),cx=kind==='tug'?0:2;
 cabin.box(3.1,1.15,2.75,0xf0ebd4,cx,1.47,0);
 // Actual framed glazing, with pillars and roof supported at all corners.
 cabin.box(2.95,.88,2.55,0x498ba4,cx,2.48,0);
 for(const x of [-1.5,0,1.5])for(const z of [-1.32,1.32])cabin.box(.12,1,.12,0xf0ebd4,cx+x,2.5,z);
 for(const x of [-1.5,1.5])cabin.box(.12,1,2.65,0xf0ebd4,cx+x,2.5,0).scale.z=.045;
 cabin.box(3.5,.2,3.05,0xfaf4df,cx,3.06,0);cabin.box(.65,.85,.06,0x367480,cx-.6,1.52,1.4);
 cabin.box(.12,.06,.07,0xe6bd55,cx-.4,1.53,1.45);
 const safety=part('桅杆、救生圈与推进器');
 safety.rod(new THREE.Vector3(cx,3.16,0),new THREE.Vector3(cx,4.45,0),.065,0xf0ebd4);
 safety.box(1.5,.12,.22,0xf0ebd4,cx,4.2,0);
 for(const z of [-1,1]){const ring=safety.mesh(new THREE.TorusGeometry(.31,.09,6,16),0xf17941,cx-.8,1.65,z*1.45);ring.rotation.x=Math.PI/2;}
 for(const z of [-.85,.85]){safety.rod(new THREE.Vector3(-4,-.5,z),new THREE.Vector3(-5.7,-.55,z),.09,0x506774);const p=safety.mesh(new THREE.CylinderGeometry(.4,.4,.13,3),0xbfa369,-5.65,-.55,z);p.rotation.z=Math.PI/2;safety.box(.12,.65,.42,0x405862,-5.9,-.55,z);}
 const gear=part('作业甲板与专用设备');
 if(kind==='tug'){
  for(const z of [-1.98,1.98])for(const x of [-4,-2,0,2]){gear.mesh(new THREE.TorusGeometry(.39,.14,7,14),0x384750,x,.62,z);}
  gear.box(1.1,.3,1.5,0x536977,-3.6,1.08,0);const winch=gear.mesh(new THREE.CylinderGeometry(.48,.48,1.1,12),0xb4b5a8,-3.6,1.6,0);winch.rotation.x=Math.PI/2;
  for(const z of [-.64,.64])gear.box(.85,.85,.12,color,-3.6,1.42,z);
  gear.box(.65,1.45,.6,0xd17b43,1.7,2.85,0);gear.box(.75,.15,.7,0x405862,1.7,3.62,0);
 }else if(kind==='crane'){
  gear.box(2,.25,2,0x485f6d,-2,1,0);gear.mesh(new THREE.CylinderGeometry(.65,.8,.65,12),color,-2,1.45,0);
  const a=new THREE.Vector3(-2,1.8,0),b=new THREE.Vector3(-4.8,5,0);
  for(const z of [-.32,.32])gear.rod(a.clone().add(new THREE.Vector3(0,0,z)),b.clone().add(new THREE.Vector3(0,0,z)),.13,color);
  gear.rod(b,new THREE.Vector3(-5,2.1,0),.025,0x405862);gear.mesh(new THREE.TorusGeometry(.18,.045,6,12,Math.PI*1.5),0x405862,-5,1.95,0);
  for(const x of [-.4,.5])gear.box(.65,.5,1.2,0x788f89,x,1.15,0);
 }else{
  for(const z of [-1.25,1.25])gear.rod(new THREE.Vector3(-4,.9,z),new THREE.Vector3(-4,3.4,z),.09,0xe8e1c9);
  gear.rod(new THREE.Vector3(-4,3.4,-1.25),new THREE.Vector3(-4,3.4,1.25),.1,0xe8e1c9);
  const drum=gear.mesh(new THREE.CylinderGeometry(.48,.48,1.6,12),0x6c998d,-3.7,1.5,0);drum.rotation.x=Math.PI/2;
  for(const x of [-2,-.9])for(const z of [-.75,.75]){gear.box(.85,.55,.65,0x64b4ad,x,1.17,z);gear.box(.7,.04,.5,0x3d7a82,x,1.47,z);}
 }
 root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root);root.userData={kind,forward:'+X',contact:'waterline',bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
 return optimized?batchVehicle(root):root;
}
