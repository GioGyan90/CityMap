import * as THREE from 'three';
/** Planar difference with holes, extruded as one watertight solid (including reveals). */
export function rectangle(w:number,h:number){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.closePath();return s;}
export function archHole(x:number,y:number,w:number,h:number){
 const p=new THREE.Path(),r=w/2;p.moveTo(x-r,y);p.lineTo(x-r,y+h-r);p.absarc(x,y+h-r,r,Math.PI,0,true);p.lineTo(x+r,y);p.closePath();return p;
}
export function cutFacade(w:number,h:number,depth:number,openings:{x:number;y:number;w:number;h:number}[]){
 const shape=rectangle(w,h);shape.holes.push(...openings.map(o=>archHole(o.x,o.y,o.w,o.h)));
 const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12});g.computeVertexNormals();return g;
}
export function roundPlan(w:number,d:number,r:number){
 const s=new THREE.Shape(),a=w/2,b=d/2;s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);return s;
}
export function extrudedPlan(shape:THREE.Shape,h:number){const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:12});g.rotateX(Math.PI/2);g.translate(0,h,0);return g;}
export function insetRing(w:number,d:number,r:number,inset:number,h:number){const shape=roundPlan(w,d,r);shape.holes.push(new THREE.Path(roundPlan(w-inset*2,d-inset*2,Math.max(.05,r-inset)).getPoints(20)));return extrudedPlan(shape,h);}
export function rackGeometry(size=2.8){
 const s=new THREE.Shape();s.moveTo(-size/2,0);s.lineTo(size/2,0);s.lineTo(0,size*.87);s.closePath();
 const p=new THREE.Path();p.moveTo(-size*.35,size*.1);p.lineTo(0,size*.7);p.lineTo(size*.35,size*.1);p.closePath();s.holes.push(p);
 return new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:true,bevelSize:.045,bevelThickness:.035,bevelSegments:2});
}

export type PlanPoint=[number,number];
export function polygonPlan(points:PlanPoint[]){const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();return s;}
/** Inset adjacent edges, then intersect them: vertices retain the original silhouette order. */
export function insetPolygon(points:PlanPoint[],inset:number):PlanPoint[]{
 const area=THREE.ShapeUtils.area(points.map(p=>new THREE.Vector2(...p))),sign=area>0?1:-1;
 return points.map((p,i)=>{
  const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
  const u=new THREE.Vector2(p[0]-a[0],p[1]-a[1]).normalize(),v=new THREE.Vector2(b[0]-p[0],b[1]-p[1]).normalize();
  const n=new THREE.Vector2(-u.y,u.x).multiplyScalar(sign),m=new THREE.Vector2(-v.y,v.x).multiplyScalar(sign),bis=n.clone().add(m);
  const scale=inset/Math.max(.05,bis.dot(n));return [p[0]+bis.x*scale,p[1]+bis.y*scale];
 });
}
export function openPlanShell(points:PlanPoint[],inset:number,h:number){
 const inner=insetPolygon(points,inset),s=new THREE.Shape();
 const outline=[...points,...inner.slice().reverse()];outline.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();
 return extrudedPlan(s,h);
}
export function polygonRing(points:PlanPoint[],inset:number,h:number){
 const s=polygonPlan(points);s.holes.push(new THREE.Path(insetPolygon(points,inset).map(p=>new THREE.Vector2(...p))));return extrudedPlan(s,h);
}
export function insetLoft(points:PlanPoint[],inset:number,rise:number){
 const inner=insetPolygon(points,inset),positions:number[]=[];
 const tri=(a:number[],b:number[],c:number[])=>positions.push(...a,...b,...c);
 // Convex roof bands join the eaves to a genuinely smaller top face.
 for(let i=0;i<points.length;i++){const j=(i+1)%points.length,a=[points[i][0],0,points[i][1]],b=[points[j][0],0,points[j][1]],c=[inner[j][0],rise,inner[j][1]],d=[inner[i][0],rise,inner[i][1]];tri(a,d,b);tri(b,d,c);}
 for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(inner.map(p=>new THREE.Vector2(...p)),[]))tri([inner[a][0],rise,inner[a][1]],[inner[c][0],rise,inner[c][1]],[inner[b][0],rise,inner[b][1]]);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
