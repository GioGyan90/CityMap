import * as THREE from 'three';

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
