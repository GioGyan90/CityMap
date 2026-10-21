import * as THREE from 'three';
export type BuildingPlan='rect'|'E'|'T'|'H'|'L'|'U';
/** Normalized, connected polygons, including open courts. All stay inside their lot. */
export const PLANS:Record<BuildingPlan,[number,number][]>= {
 rect:[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],
 E:[[-.5,-.5],[.5,-.5],[.5,-.25],[-.18,-.25],[-.18,-.12],[.32,-.12],[.32,.12],[-.18,.12],[-.18,.25],[.5,.25],[.5,.5],[-.5,.5]],
 T:[[-.5,-.5],[.5,-.5],[.5,-.18],[.17,-.18],[.17,.5],[-.17,.5],[-.17,-.18],[-.5,-.18]],
 H:[[-.5,-.5],[-.2,-.5],[-.2,-.14],[.2,-.14],[.2,-.5],[.5,-.5],[.5,.5],[.2,.5],[.2,.14],[-.2,.14],[-.2,.5],[-.5,.5]],
 L:[[-.5,-.5],[-.16,-.5],[-.16,.17],[.5,.17],[.5,.5],[-.5,.5]],
 U:[[-.5,-.5],[-.2,-.5],[-.2,.18],[.2,.18],[.2,-.5],[.5,-.5],[.5,.5],[-.5,.5]]
};
/** Shared polygon volume: no overlapping cubes, no wall faces across the open courts. */
export function planGeometry(plan:BuildingPlan,w:number,d:number,h:number){
 const points=PLANS[plan].map(([x,z])=>new THREE.Vector2(x*w,z*d));
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],n=positions.length/3;
  positions.push(a.x,0,a.y,b.x,0,b.y,b.x,h,b.y,a.x,h,a.y);
  uv.push(0,0,1,0,1,1,0,1);indices.push(n,n+2,n+1,n,n+3,n+2);
 }
 const wallCount=indices.length,n=positions.length/3;
 for(const p of points){positions.push(p.x,h,p.y);uv.push(p.x/w+.5,p.y/d+.5);}
 for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(points,[]))indices.push(n+a,n+c,n+b);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.addGroup(0,wallCount,0);geometry.addGroup(wallCount,indices.length-wallCount,1);geometry.computeVertexNormals();return geometry;
}

export interface BuildingWing {x0:number;x1:number;z0:number;z1:number;height:number;role:'main'|'wing'|'link'}
/** Letter names describe circulation only. Each wing has its own dimensions and roof level. */
export function createMassing(plan:Exclude<BuildingPlan,'rect'>,seed:number):BuildingWing[]{
 const random=(i:number)=>{const v=Math.sin(seed*.173+i*12.9898)*43758.5453;return v-Math.floor(v);};
 const wings:BuildingWing[]=[];
 const add=(x0:number,x1:number,z0:number,z1:number,height:number,role:BuildingWing['role']='wing')=>wings.push({x0,x1,z0,z1,height,role});
 const left=-.5+.22+.1*random(1),right=.5-.22-.09*random(2);
 if(plan==='E'){
  add(-.5,left,-.5,.5,1,'main');
  add(left,.29+.21*random(3),-.5,-.5+.19+.09*random(4),.64+.12*random(5));
  const center=-.05+.1*random(6),half=.075+.035*random(7);
  add(left,.12+.24*random(8),center-half,center+half,.40+.12*random(9));
  add(left,.28+.2*random(10),.18+.1*random(11),.5,.77+.13*random(12));
 }else if(plan==='T'){
  const center=-.09+.16*random(3),half=.12+.045*random(4),back=-.16-.1*random(5);
  add(center-half,center+half,-.5,.5,1,'main');
  add(-.5,center-half,-.5,back,.48+.12*random(6));
  add(center+half,.34+.16*random(7),-.5,back+.04,.7+.12*random(8));
 }else if(plan==='H'){
  add(-.5,left,-.5,.5,1,'main');
  add(right,.5,-.5+.15*random(3),.5-.12*random(4),.66+.17*random(5));
  const center=-.05+.12*random(6),half=.09+.04*random(7);
  add(left,right,center-half,center+half,.35+.16*random(8),'link');
 }else if(plan==='L'){
  add(-.5,left,-.5,.5,1,'main');add(left,.3+.2*random(3),.16+.13*random(4),.5,.5+.21*random(5));
 }else{
  const rear=.17+.12*random(3);
  add(-.5,left,-.5,.5,1,'main');add(right,.5,-.4+.1*random(4),.5,.62+.16*random(5));
  add(left,right,rear,.5,.37+.16*random(6),'link');
 }
 // Mirrors/half-turns break repeated street-facing arrangements without changing the lot.
 if(random(17)>.5)for(const wing of wings){const x=-wing.x1;wing.x1=-wing.x0;wing.x0=x;}
 if(random(18)>.5)for(const wing of wings){const z=-wing.z1;wing.z1=-wing.z0;wing.z0=z;}
 return wings;
}
export interface RoofRim {a:[number,number];b:[number,number];height:number}
/** Union height field removes shared walls and exposes real terrace steps between wings. */
export function massingGeometry(wings:BuildingWing[],w:number,d:number,h:number){
 const xs=[...new Set(wings.flatMap(p=>[p.x0*w,p.x1*w]))].sort((a,b)=>a-b),zs=[...new Set(wings.flatMap(p=>[p.z0*d,p.z1*d]))].sort((a,b)=>a-b);
 const heights=xs.slice(1).map((_,i)=>zs.slice(1).map((_,j)=>{const x=(xs[i]+xs[i+1])/(2*w),z=(zs[j]+zs[j+1])/(2*d);return Math.max(0,...wings.filter(p=>x>p.x0&&x<p.x1&&z>p.z0&&z<p.z1).map(p=>p.height*h));}));
 const wall:number[]=[],wallUV:number[]=[],roof:number[]=[],roofUV:number[]=[],rims:RoofRim[]=[];
 const quad=(target:number[],uv:number[],p:number[][],top=false)=>{for(const i of [0,1,2,0,2,3]){target.push(...p[i]);uv.push(top?p[i][0]/w+.5:(Math.abs(p[0][0]-p[1][0])<.00001&&Math.abs(p[0][0]-p[2][0])<.00001?p[i][2]/d+.5:p[i][0]/w+.5),top?p[i][2]/d+.5:p[i][1]/h);}};
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
  const y=heights[i][j];if(!y)continue;const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1];
  quad(roof,roofUV,[[x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0]],true);
  for(const [ni,nj,a,b] of [[i-1,j,[x0,z1],[x0,z0]],[i+1,j,[x1,z0],[x1,z1]],[i,j-1,[x0,z0],[x1,z0]],[i,j+1,[x1,z1],[x0,z1]]] as [number,number,[number,number],[number,number]][]){
   const lower=heights[ni]?.[nj]??0;if(lower>=y-.0001)continue;
   quad(wall,wallUV,[[a[0],lower,a[1]],[a[0],y,a[1]],[b[0],y,b[1]],[b[0],lower,b[1]]]);rims.push({a,b,height:y});
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([...wall,...roof],3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([...wallUV,...roofUV],2));geometry.addGroup(0,wall.length/3,0);geometry.addGroup(wall.length/3,roof.length/3,1);geometry.computeVertexNormals();return {geometry,rims};
}
