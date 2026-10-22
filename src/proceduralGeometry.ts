import * as THREE from 'three';
import polygonClipping,{type Polygon} from 'polygon-clipping';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

/** Independent streams keep adding a detail from reshuffling every other asset. */
export function seededRandom(seed:number){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
export function pathFrames(path:THREE.Curve<THREE.Vector3>,segments:number){
 const frames=path.computeFrenetFrames(segments,false);
 return path.getSpacedPoints(segments).map((position,i)=>({position,tangent:frames.tangents[i],normal:frames.normals[i],binormal:frames.binormals[i]}));
}
/** Copy a 2D profile along a path, scale each section, and bridge corresponding vertices. */
export function sweepProfile(path:THREE.Curve<THREE.Vector3>,profile:THREE.Vector2[],segments:number,radius:(u:number)=>number){
 const frames=pathFrames(path,segments),vertices:number[]=[],indices:number[]=[],n=profile.length;
 for(let i=0;i<=segments;i++)for(const p of profile){const f=frames[i];vertices.push(...f.position.clone().addScaledVector(f.normal,p.x*radius(i/segments)).addScaledVector(f.binormal,p.y*radius(i/segments)).toArray());}
 for(let i=0;i<segments;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=a+n,d=b+n;indices.push(a,b,c,b,d,c);}
 for(const end of [0,segments]){const center=vertices.length/3;vertices.push(...frames[end].position.toArray());for(let j=0;j<n;j++){const a=end*n+j,b=end*n+(j+1)%n;indices.push(...(end?[center,a,b]:[center,b,a]));}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function circularProfile(sides=8){return Array.from({length:sides},(_,i)=>new THREE.Vector2(Math.cos(i/sides*Math.PI*2),Math.sin(i/sides*Math.PI*2)));}
/** A folded leaf ribbon. Width is measured across the axis; fold retains a midrib silhouette. */
export function leafRibbon(path:THREE.Curve<THREE.Vector3>,width:number,segments=3){
 const vertices:number[]=[],indices:number[]=[];
 const points=path.getSpacedPoints(segments);
 for(let i=0;i<=segments;i++){
  const u=i/segments,t=path.getTangentAt(u),side=new THREE.Vector3().crossVectors(t,Math.abs(t.y)>.95?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0)).normalize();
  const w=width*(.06+.94*Math.pow(Math.sin(Math.PI*u),.7));
  for(const a of [-1,0,1])vertices.push(...points[i].clone().addScaledVector(side,w*a).add(new THREE.Vector3(0,a===0?w*.2:0,0)).toArray());
 }
 for(let i=0;i<segments;i++)for(let j=0;j<2;j++){const a=i*3+j,b=a+1,c=a+3;indices.push(a,b,c,b,c+1,c);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function radialPlacements(count:number,random:()=>number,phase=0,jitter=.1){
 return Array.from({length:count},(_,i)=>({angle:phase+i/count*Math.PI*2+(random()-.5)*jitter,scale:.9+random()*.2}));
}

/** Actual planar difference, followed by thickness and curvature deformation. */
export function cutLeafGeometry(path:THREE.Curve<THREE.Vector3>,length:number,width:number,random:()=>number){
 const outline:[number,number][]=[],widthAt=(u:number)=>width*(u<.14?.055+.2*u/.14:Math.pow(Math.sin(Math.PI*(u-.1)/.9),.68));
 for(const side of [-1,1])for(let j=0;j<=18;j++){const u=side<0?j/18:1-j/18;outline.push([u*length,side*Math.max(.007,widthAt(u))*(1+.075*Math.sin(u*15+side))]);}
 const base:Polygon=[outline],cutters:Polygon[]=[];
 for(const side of [-1,1]){
  const count=3+Math.floor(random()*3);
  for(let i=0;i<count;i++){
   const u=.24+(i+random()*.6)/count*.65,span=length*(.018+random()*.035),w=widthAt(u),depth=w*(.24+random()*.43),x=u*length;
   const edge=side*w*1.45,inner=side*(w-depth);
   const ring:[number,number][]=[[x-span,edge],[x-span*.18,inner],[x+span*.5,inner+side*depth*.24],[x+span,edge]];
   cutters.push([ring]);
  }
 }
 const result=polygonClipping.difference(base,...cutters),shapes=result.map(p=>{const shape=new THREE.Shape(p[0].slice(0,-1).map(([x,y])=>new THREE.Vector2(x,y)));for(const hole of p.slice(1))shape.holes.push(new THREE.Path(hole.slice(0,-1).map(([x,y])=>new THREE.Vector2(x,y))));return shape;});
 const flat=new THREE.ExtrudeGeometry(shapes,{depth:.04,bevelEnabled:false,curveSegments:1,steps:1});
 // Slice triangles into longitudinal bands before bending, so long triangulation
 // diagonals cannot turn an arched silhouette into a flat chord.
 const src=flat.attributes.position,vertices:number[]=[];
 for(let i=0;i<src.count;i+=3){const triangle=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(src,i+j));
  const lo=Math.max(0,Math.floor(Math.min(...triangle.map(p=>p.x))/length*12)),hi=Math.min(11,Math.floor(Math.max(...triangle.map(p=>p.x))/length*12));
  for(let band=lo;band<=hi;band++){
   let polygon=triangle;
   for(const [plane,direction] of [[band/12*length,1],[(band+1)/12*length,-1]]){
    const output:THREE.Vector3[]=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],insideA=(a.x-plane)*direction>=-1e-7,insideB=(b.x-plane)*direction>=-1e-7;if(insideA)output.push(a);if(insideA!==insideB)output.push(a.clone().lerp(b,(plane-a.x)/(b.x-a.x)));}polygon=output;
   }
   for(let j=1;j+1<polygon.length;j++){const a=polygon[0],b=polygon[j],c=polygon[j+1];if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-12)for(const p of [a,b,c])vertices.push(...p.toArray());}
  }
 }
 flat.dispose();
 const twist=(random()-.5)*.6;
 for(let i=0;i<vertices.length;i+=3){const u=THREE.MathUtils.clamp(vertices[i]/length,0,1),across=vertices[i+1],thickness=vertices[i+2],p=path.getPointAt(u),t=path.getTangentAt(u),side=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),t).normalize();side.applyAxisAngle(t,twist*u);const up=new THREE.Vector3().crossVectors(t,side).normalize();
  p.addScaledVector(side,across).addScaledVector(up,thickness+.11*Math.sin(Math.PI*u)*(1-Math.min(1,Math.abs(across)/Math.max(.01,widthAt(u)))));vertices[i]=p.x;vertices[i+1]=p.y;vertices[i+2]=p.z;
 }
 const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const g=mergeVertices(raw,1e-5);raw.dispose();g.computeVertexNormals();
 const area=(ring:number[][])=>Math.abs(ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
 g.userData={operation:'planar-difference',cutCount:cutters.length,originalArea:area(outline),cutArea:result.reduce((sum,p)=>sum+area(p[0])-p.slice(1).reduce((a,h)=>a+area(h),0),0),pieces:result.length};return g;
}
