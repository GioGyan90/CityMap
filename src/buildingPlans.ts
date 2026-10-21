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
