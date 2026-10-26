import * as THREE from 'three';
/** Optical water skin, not a second opaque seabed. Top boundary shares the ocean swell. */
export const WATER_LEVEL=-.26,WATER_THICKNESS=.65;
export const waterSwellGLSL=`float swell(vec2 p){return .15*sin(dot(p,vec2(.025,.016))+time*.8)+.09*sin(dot(p,vec2(-.017,.04))-time*.65);}`;
export function createWaterVolume(time:{value:number},deep:{value:THREE.Color},size=5000,segments=220){
 const vertices:number[]=[],indices:number[]=[],top:number[]=[];
 const add=(x:number,y:number,z:number,flag:number)=>{vertices.push(x,y,z);top.push(flag);};
 // Clockwise viewed from above: outward side faces and a down-facing bottom.
 const ring:[number,number][]=[];for(let i=0;i<segments;i++)ring.push([-size+i*2*size/segments,-size]);for(let i=0;i<segments;i++)ring.push([size,-size+i*2*size/segments]);for(let i=0;i<segments;i++)ring.push([size-i*2*size/segments,size]);for(let i=0;i<segments;i++)ring.push([-size,size-i*2*size/segments]);
 for(const [x,z]of ring){add(x,WATER_LEVEL,z,1);add(x,WATER_LEVEL-WATER_THICKNESS,z,0);}
 for(let i=0;i<ring.length;i++){const a=i*2,b=(i+1)%ring.length*2;indices.push(a,b,a+1,b,b+1,a+1);}
 const k=vertices.length/3;for(const [x,z]of [[-size,-size],[-size,size],[size,size],[size,-size]])add(x,WATER_LEVEL-WATER_THICKNESS,z,0);indices.push(k,k+2,k+1,k,k+3,k+2);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('surfaceEdge',new THREE.Float32BufferAttribute(top,1));g.setIndex(indices);g.computeVertexNormals();
 const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time,deep},vertexShader:`uniform float time;attribute float surfaceEdge;varying vec3 volumeWorld;varying vec3 volumeNormal;${waterSwellGLSL}void main(){vec3 p=position;p.y+=surfaceEdge*swell(p.xz);vec4 wp=modelMatrix*vec4(p,1.);volumeWorld=wp.xyz;volumeNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}`,fragmentShader:`uniform vec3 deep;varying vec3 volumeWorld;varying vec3 volumeNormal;void main(){float angle=max(.18,abs(dot(normalize(cameraPosition-volumeWorld),normalize(volumeNormal))));float alpha=min(.14,1.-exp(-.022*.65/angle));gl_FragColor=vec4(deep*.84,alpha);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`.replace(';#include',';\n#include')});
 const mesh=new THREE.Mesh(g,m);mesh.name='thin-ocean-volume';mesh.renderOrder=-2;mesh.frustumCulled=false;mesh.userData.thickness=WATER_THICKNESS;return mesh;
}
