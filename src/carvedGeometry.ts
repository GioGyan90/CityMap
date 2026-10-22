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
export function extrudedPlan(shape:THREE.Shape,h:number){const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:12});g.rotateX(-Math.PI/2);return g;}
export function insetRing(w:number,d:number,r:number,inset:number,h:number){const shape=roundPlan(w,d,r);shape.holes.push(new THREE.Path(roundPlan(w-inset*2,d-inset*2,Math.max(.05,r-inset)).getPoints(20)));return extrudedPlan(shape,h);}
export function rackGeometry(size=2.8){
 const s=new THREE.Shape();s.moveTo(-size/2,0);s.lineTo(size/2,0);s.lineTo(0,size*.87);s.closePath();
 const p=new THREE.Path();p.moveTo(-size*.35,size*.1);p.lineTo(0,size*.7);p.lineTo(size*.35,size*.1);p.closePath();s.holes.push(p);
 return new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:true,bevelSize:.045,bevelThickness:.035,bevelSegments:2});
}
