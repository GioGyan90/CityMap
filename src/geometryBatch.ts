import * as THREE from 'three';
export interface GeometryBatchPart {mesh:THREE.Mesh;matrix:THREE.Matrix4;count:number}
/** Write transformed indexed/non-indexed inputs straight into one final allocation. */
export function mergeGeometryBatch(parts:GeometryBatchPart[],withUV=true,bakeMaterialColor=false){
 const count=parts.reduce((n,p)=>n+p.count,0),positions=new Float32Array(count*3),normals=new Float32Array(count*3),uv=withUV?new Float32Array(count*2):null,colors=new Float32Array(count*3),p=new THREE.Vector3(),n=new THREE.Vector3();let at=0;
 for(const part of parts){const g=part.mesh.geometry,normalMatrix=new THREE.Matrix3().getNormalMatrix(part.matrix),source=g.attributes,material=part.mesh.material as THREE.MeshToonMaterial,useColor=!bakeMaterialColor||material.vertexColors;
  for(let j=0;j<part.count;j++,at++){const i=g.index?g.index.getX(j):j;p.fromBufferAttribute(source.position,i).applyMatrix4(part.matrix);n.fromBufferAttribute(source.normal,i).applyNormalMatrix(normalMatrix);positions[at*3]=p.x;positions[at*3+1]=p.y;positions[at*3+2]=p.z;normals[at*3]=n.x;normals[at*3+1]=n.y;normals[at*3+2]=n.z;if(uv){uv[at*2]=source.uv?.getX(i)??0;uv[at*2+1]=source.uv?.getY(i)??0;}colors[at*3]=(useColor?source.color?.getX(i)??1:1)*(bakeMaterialColor?material.color.r:1);colors[at*3+1]=(useColor?source.color?.getY(i)??1:1)*(bakeMaterialColor?material.color.g:1);colors[at*3+2]=(useColor?source.color?.getZ(i)??1:1)*(bakeMaterialColor?material.color.b:1);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));if(uv)geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));return geo;
}
