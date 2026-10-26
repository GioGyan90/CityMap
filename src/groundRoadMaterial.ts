import {junctionFilletPatches,junctionArms} from './roadJunctions';
import {ROAD_DESIGN} from './roadDesign';
import {tunnelPortals} from './tunnelPlan';
import * as THREE from 'three';
import {attachCloudShadows} from './cloudShadows';
import {toon} from './materials';
import {roadProfiles,promenadeCurve,hillApproaches,nearestRoad,junctionAnchors} from './roadNetwork';
const bounds={x:-130,z:-220,w:470,d:470},resolution=3072;
const canvas=document.createElement('canvas');canvas.width=canvas.height=resolution;
const ctx=canvas.getContext('2d')!;ctx.fillStyle='#000';ctx.fillRect(0,0,resolution,resolution);
let asphaltStencil:HTMLCanvasElement|undefined;
const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=8;
const project=(x:number,z:number)=>[(x-bounds.x)/bounds.w*resolution,(z-bounds.z)/bounds.d*resolution];
function path(curve:THREE.Curve<THREE.Vector3>,width:number,color:string){
 ctx.beginPath();curve.getSpacedPoints(Math.ceil(curve.getLength())).forEach((p,i)=>{const [x,y]=project(p.x,p.z);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
 ctx.strokeStyle=color;ctx.lineWidth=width/bounds.w*resolution;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
function patch(node:typeof junctionAnchors[number],walk:boolean){
 for(const points of junctionFilletPatches(junctionArms(node,roadProfiles),walk?ROAD_DESIGN.sidewalk:0)){
  ctx.beginPath();points.forEach(([x,z],i)=>{const p=project(x+node.x,z+node.z);if(i)ctx.lineTo(...p as [number,number]);else ctx.moveTo(...p as [number,number]);});ctx.closePath();ctx.fillStyle=walk?'#00ff00':'#ff0000';ctx.fill();
 }
}
// All sidewalks first, then the complete asphalt network: junctions have one surface.
path(promenadeCurve,3.4,'#00ff00');for(const road of roadProfiles)path(road.curve,road.width+2*ROAD_DESIGN.sidewalk,'#00ff00');
for(const road of hillApproaches)path(road.curve,road.width+.7,'#00ff00');
for(const node of junctionAnchors)patch(node,true);
for(const road of roadProfiles)path(road.curve,road.width,'#ff0000');
for(const road of hillApproaches)if(road.id==='villa')path(road.curve,road.width,'#ff0000');
for(const node of junctionAnchors)patch(node,false);
const markSamples=roadProfiles.map(r=>r.curve.getSpacedPoints(Math.ceil(r.curve.getLength()/3)));
for(const road of roadProfiles){const count=Math.floor(road.curve.getLength()/7);for(let i=0;i<count;i++){
 const t=(i+.5)/count,p=road.curve.getPointAt(t),v=road.curve.getTangentAt(t);if(junctionAnchors.some(n=>Math.hypot(n.x-p.x,n.z-p.z)<n.radius+3)||roadProfiles.some(other=>other!==road&&markSamples[roadProfiles.indexOf(other)].some(q=>Math.hypot(q.x-p.x,q.z-p.z)<other.width/2+3)))continue;const [x,y]=project(p.x,p.z);
 ctx.save();ctx.translate(x,y);ctx.rotate(-Math.atan2(v.x,v.z));ctx.fillStyle='#0000ff';ctx.fillRect(-.13/bounds.w*resolution,-1.2/bounds.d*resolution,.26/bounds.w*resolution,2.4/bounds.d*resolution);ctx.restore();
}}
// Rounded outdoor stroke caps must not paint asphalt on the ridge behind a mouth.
for(const f of tunnelPortals){ctx.beginPath();for(const [i,[s,side]]of [[.02,-1],[8,-1],[8,1],[.02,1]].entries()){const p=f.p.clone().addScaledVector(f.into,s).addScaledVector(f.right,side*7.2),q=project(p.x,p.z);if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1]);}ctx.closePath();ctx.fillStyle='#000';ctx.fill();}
export function paintGroundRect(x:number,z:number,w:number,d:number,color:'asphalt'|'walk'|'line'){
 const [px,pz]=project(x-w/2,z-d/2);ctx.fillStyle=color==='asphalt'?'#ff0000':color==='walk'?'#00ff00':'#0000ff';ctx.fillRect(px,pz,w/bounds.w*resolution,d/bounds.d*resolution);if(color==='asphalt'&&asphaltStencil){const target=asphaltStencil.getContext('2d')!;target.fillStyle='#fff';target.fillRect(px,pz,w/bounds.w*resolution,d/bounds.d*resolution);}texture.needsUpdate=true;
}
export function createGroundMaterial(){
 const material=toon(0xffffff,{vertexColors:true});
 material.onBeforeCompile=shader=>{
  shader.uniforms.roadMask={value:texture};shader.uniforms.roadBounds={value:new THREE.Vector4(bounds.x,bounds.z,bounds.w,bounds.d)};
  shader.uniforms.asphaltColor={value:new THREE.Color(0x526d87)};shader.uniforms.walkColor={value:new THREE.Color(0xf3e7cc)};shader.uniforms.lineColor={value:new THREE.Color(0xffefc7)};
  shader.vertexShader='varying vec2 roadUv;uniform vec4 roadBounds;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nroadUv=vec2((position.x-roadBounds.x)/roadBounds.z,1.-(position.z-roadBounds.y)/roadBounds.w);');
  shader.fragmentShader='varying vec2 roadUv;uniform sampler2D roadMask;uniform vec3 asphaltColor;uniform vec3 walkColor;uniform vec3 lineColor;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 road=texture2D(roadMask,roadUv).rgb;
   vec2 paving=(roadUv*vec2(470.,-470.))/1.25;
   paving.x+=mod(floor(paving.y),2.)*.5;vec2 tile=fract(paving);
   float joint=1.-smoothstep(.025,.05,min(min(tile.x,1.-tile.x),min(tile.y,1.-tile.y)));
   vec3 walk=walkColor*(1.-joint*.12);float grain=fract(sin(dot(floor(roadUv*470.*8.),vec2(12.9898,78.233)))*43758.5453);
   diffuseColor.rgb=diffuseColor.rgb*(1.-clamp(road.r+road.g+road.b,0.,1.))+asphaltColor*(.98+.035*grain)*road.r+walk*road.g+lineColor*road.b;`);
  attachCloudShadows(shader);
 };
 material.customProgramCacheKey=()=> 'shared-terrain-roads-v1';return material;
}

// Build an immutable public-road stencil once. Local walks are clipped to its real silhouette.

function stencil(){
 if(asphaltStencil)return asphaltStencil;asphaltStencil=document.createElement('canvas');asphaltStencil.width=asphaltStencil.height=resolution;
 const target=asphaltStencil.getContext('2d')!,pixels=ctx.getImageData?.(0,0,resolution,resolution);
 if(pixels?.data){for(let i=0;i<pixels.data.length;i+=4){const alpha=Math.max(pixels.data[i],pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=alpha;}target.putImageData(pixels,0,0);}
 return asphaltStencil;
}
export function paintGroundPath(points:[number,number][],width:number,color:'asphalt'|'walk'|'line'){
 if(points.length<2)return;const projected=points.map(([x,z])=>project(x,z)),pad=width/bounds.w*resolution/2+3,minX=Math.floor(Math.min(...projected.map(p=>p[0]))-pad),minY=Math.floor(Math.min(...projected.map(p=>p[1]))-pad),w=Math.ceil(Math.max(...projected.map(p=>p[0]))+pad-minX),h=Math.ceil(Math.max(...projected.map(p=>p[1]))+pad-minY);
 const scratch=document.createElement('canvas');scratch.width=w;scratch.height=h;const draw=scratch.getContext('2d')!;
 draw.beginPath();projected.forEach(([x,y],i)=>{if(i)draw.lineTo(x-minX,y-minY);else draw.moveTo(x-minX,y-minY);});draw.lineWidth=width/bounds.w*resolution;draw.lineCap=draw.lineJoin='round';draw.strokeStyle=color==='asphalt'?'#ff0000':color==='walk'?'#00ff00':'#0000ff';draw.stroke();
 if(color==='walk'){draw.globalCompositeOperation='destination-out';draw.drawImage(stencil(),minX,minY,w,h,0,0,w,h);draw.globalCompositeOperation='source-over';}
 ctx.drawImage(scratch,minX,minY);if(color==='asphalt'&&asphaltStencil)asphaltStencil.getContext('2d')!.drawImage(scratch,minX,minY);texture.needsUpdate=true;
}

export function paintGroundPolygon(points:[number,number][],color:'asphalt'|'walk'|'line'){
 ctx.beginPath();points.forEach(([x,z],i)=>{const p=project(x,z);if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.closePath();ctx.fillStyle=color==='asphalt'?'#ff0000':color==='walk'?'#00ff00':'#0000ff';ctx.fill();texture.needsUpdate=true;
}

/** Actual mask is also available to offline scene inspection tools. */
export {texture as terrainRoadMask};
