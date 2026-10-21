import * as THREE from 'three';
import {toon} from './materials';
import {roadProfiles,promenadeCurve} from './roadNetwork';
const bounds={x:-130,z:-220,w:470,d:470},resolution=3072;
const canvas=document.createElement('canvas');canvas.width=canvas.height=resolution;
const ctx=canvas.getContext('2d')!;ctx.fillStyle='#000';ctx.fillRect(0,0,resolution,resolution);
const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=8;
const project=(x:number,z:number)=>[(x-bounds.x)/bounds.w*resolution,(z-bounds.z)/bounds.d*resolution];
function path(curve:THREE.Curve<THREE.Vector3>,width:number,color:string){
 ctx.beginPath();curve.getSpacedPoints(Math.ceil(curve.getLength())).forEach((p,i)=>{const [x,y]=project(p.x,p.z);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
 ctx.strokeStyle=color;ctx.lineWidth=width/bounds.w*resolution;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
// All sidewalks first, then the complete asphalt network: junctions have one surface.
path(promenadeCurve,2.5,'#00ff00');for(const road of roadProfiles)path(road.curve,road.width+3,'#00ff00');
for(const road of roadProfiles)path(road.curve,road.width,'#ff0000');
for(const road of roadProfiles){const count=Math.floor(road.curve.getLength()/7);for(let i=0;i<count;i++){
 const t=(i+.5)/count,p=road.curve.getPointAt(t),v=road.curve.getTangentAt(t);const [x,y]=project(p.x,p.z);
 ctx.save();ctx.translate(x,y);ctx.rotate(-Math.atan2(v.x,v.z));ctx.fillStyle='#0000ff';ctx.fillRect(-.13/bounds.w*resolution,-1.2/bounds.d*resolution,.26/bounds.w*resolution,2.4/bounds.d*resolution);ctx.restore();
}}
export function paintGroundRect(x:number,z:number,w:number,d:number,color:'asphalt'|'walk'|'line'){
 const [px,pz]=project(x-w/2,z-d/2);ctx.fillStyle=color==='asphalt'?'#ff0000':color==='walk'?'#00ff00':'#0000ff';ctx.fillRect(px,pz,w/bounds.w*resolution,d/bounds.d*resolution);texture.needsUpdate=true;
}
export function createGroundMaterial(){
 const material=toon(0xffffff,{vertexColors:true});
 material.onBeforeCompile=shader=>{
  shader.uniforms.roadMask={value:texture};shader.uniforms.roadBounds={value:new THREE.Vector4(bounds.x,bounds.z,bounds.w,bounds.d)};
  shader.uniforms.asphaltColor={value:new THREE.Color(0x758c9d)};shader.uniforms.walkColor={value:new THREE.Color(0xf0dbac)};shader.uniforms.lineColor={value:new THREE.Color(0xffefc7)};
  shader.vertexShader='varying vec2 roadUv;uniform vec4 roadBounds;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nroadUv=vec2((position.x-roadBounds.x)/roadBounds.z,1.-(position.z-roadBounds.y)/roadBounds.w);');
  shader.fragmentShader='varying vec2 roadUv;uniform sampler2D roadMask;uniform vec3 asphaltColor;uniform vec3 walkColor;uniform vec3 lineColor;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 road=texture2D(roadMask,roadUv).rgb;
   diffuseColor.rgb=diffuseColor.rgb*(1.-clamp(road.r+road.g+road.b,0.,1.))+asphaltColor*road.r+walkColor*road.g+lineColor*road.b;`);
 };
 material.customProgramCacheKey=()=> 'shared-terrain-roads-v1';return material;
}

export function paintGroundPath(points:[number,number][],width:number,color:'asphalt'|'walk'|'line'){
 ctx.beginPath();points.forEach(([x,z],i)=>{const p=project(x,z);if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.lineWidth=width/bounds.w*resolution;ctx.lineCap='butt';ctx.strokeStyle=color==='asphalt'?'#ff0000':color==='walk'?'#00ff00':'#0000ff';ctx.stroke();texture.needsUpdate=true;
}
