import * as THREE from 'three';
import {DAY_LIGHTING} from './visualStyle';
import {world} from './scene';
import {cloudAssembly,cloudDensityPixels,cloudMotion,cloudPosition,projectedCloudShadow,type CloudKind} from './cloudModel';
import {cloudVertexShader,cloudFragmentShader} from './cloudShader';
import {cloudShadowUniforms} from './cloudShadows';
import {seededRandom} from './proceduralGeometry';

interface CloudState {root:THREE.Group;mesh:THREE.Mesh;start:THREE.Vector3;motion:ReturnType<typeof cloudMotion>;shadow:boolean;elapsed:number}
export const cloudStates:CloudState[]=[];
const inverse=new THREE.Matrix4(),localCamera=new THREE.Vector3(),worldSun=new THREE.Vector3(-.3,.8,.3).normalize();
let directStrength=1,preview=false;
/** Reattach this callback to cloned shader materials in the asset viewer. */
export function prepareCloudMaterial(material:THREE.ShaderMaterial){
 (material as any).onBeforeRender=function(_renderer,_scene,camera,_geometry,object){
  inverse.copy(object.matrixWorld).invert();localCamera.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
  const m=this as THREE.ShaderMaterial;m.uniforms.cameraLocal.value.copy(localCamera);
  // The main field does not rotate; inverse-scale accounts for its ellipsoidal box.
  m.uniforms.sunLocal.value.copy(worldSun).transformDirection(inverse);m.uniformsNeedUpdate=true;
 };return material;
}
export function createCloud(kind:CloudKind,seed:number,width=54){
 const root=new THREE.Group();root.name='cloud-'+kind;
 const lobes=cloudAssembly(kind,seed),height=kind==='veil'?width*.15:kind==='towering'?width*.48:width*.35,depth=width*.57;
 const baked=cloudDensityPixels(lobes,seed),atlas=new THREE.DataTexture(new Uint8Array(baked.data),baked.width,baked.height,THREE.RedFormat);atlas.minFilter=atlas.magFilter=THREE.LinearFilter;atlas.needsUpdate=true;

 const mat=prepareCloudMaterial(new THREE.ShaderMaterial({vertexShader:cloudVertexShader,fragmentShader:cloudFragmentShader,transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{marchSteps:{value:typeof innerWidth==='number'&&innerWidth<700?20:32},cameraLocal:{value:new THREE.Vector3()},sunLocal:{value:worldSun.clone()},topColor:{value:new THREE.Color(0xfffdf7)},baseColor:{value:new THREE.Color(0x899db7)},rimColor:{value:new THREE.Color(0xfff7df)},densityAtlas:{value:atlas},opticalDepth:{value:kind==='veil'?2.3:kind==='towering'?10:7},visibility:{value:1},daylight:{value:1},seed:{value:seed*.013}}}));
 mat.userData.lightingRole='volumetric-cloud';
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),mat);mesh.name='soft-density-envelope';mesh.scale.set(width/2,height/2,depth/2);root.add(mesh);
 const parts=new THREE.Group();parts.name='designed-density-lobes';root.add(parts);
 for(const lobe of lobes){const part=new THREE.Object3D();part.name=lobe.name;part.position.set(lobe.center[0]*width/2,lobe.center[1]*height/2,lobe.center[2]*depth/2);part.scale.set(lobe.radius[0]*width/2,lobe.radius[1]*height/2,lobe.radius[2]*depth/2);parts.add(part);}
 root.userData={kind,seed,width,height,depth,parts:lobes.map(l=>l.name),motion:cloudMotion(seed+19)};return root;
}
export function buildClouds(){
 if(world.getObjectByName('layered-moving-cloud-field'))return;cloudStates.length=0;
 const field=new THREE.Group();field.name='layered-moving-cloud-field';world.add(field);const random=seededRandom(83017),rr=(a:number,b:number)=>a+(b-a)*random();
 for(let i=0;i<12;i++){
  const kind:CloudKind=i<4?'towering':i<9?'broken':'veil',width=kind==='towering'?rr(65,92):kind==='broken'?rr(36,61):rr(82,115),seed=83017+i*193;
  const root=createCloud(kind,seed,width),anchors=[[35,-75],[145,20],[65,115],[225,125]];
  root.position.set(i<4?anchors[i][0]+rr(-18,18):-240+(i%4)*155+rr(-32,32),kind==='veil'?rr(265,300):kind==='broken'?rr(218,248):rr(174,205),i<4?anchors[i][1]+rr(-20,20):-160+Math.floor(i/4)*135+rr(-35,35));field.add(root);
  cloudStates.push({root,mesh:root.children[0] as THREE.Mesh,start:root.position.clone(),motion:cloudMotion(seed+19),shadow:i<4,elapsed:0});
 }
 world.userData.clouds={count:12,layers:3,shadowClouds:4,render:'20–32-step soft density volumes',seed:83017};
}
function updateShadows(){
 const enabled=!preview&&worldSun.y>.10;
 cloudShadowUniforms.cloudShadowStrength.value=enabled?directStrength*THREE.MathUtils.smoothstep(worldSun.y,.10,.32):0;
 cloudShadowUniforms.cloudShadowSlope.value.set(worldSun.x/Math.max(.10,worldSun.y),worldSun.z/Math.max(.10,worldSun.y));
 let index=0;
 for(const cloud of cloudStates.filter(c=>c.shadow)){
  const l=cloud.root.userData,center=cloud.root.position;
  for(const offset of [-.20,0,.24]){
   const p=projectedCloudShadow(new THREE.Vector3(center.x+offset*l.width,center.y,center.z+offset*l.depth*.25),worldSun);
   cloudShadowUniforms.cloudShadowLobes.value[index].set(p?.x??10000,p?.y??10000,l.width*.45,l.depth*.55);
   cloudShadowUniforms.cloudShadowWeights.value[index++]=(cloud.mesh.material as THREE.ShaderMaterial).uniforms.visibility.value;
  }
 }
}
export function updateClouds(seconds:number){
 if(world.userData.assetView)return;
 if(Number.isFinite(seconds)&&seconds>0)for(const cloud of cloudStates){cloud.elapsed+=seconds;cloud.root.position.copy(cloudPosition(cloud.start,cloud.motion,cloud.elapsed));const edge=Math.min(cloud.root.position.x+410,450-cloud.root.position.x,cloud.root.position.z+350,300-cloud.root.position.z);(cloud.mesh.material as THREE.ShaderMaterial).uniforms.visibility.value=THREE.MathUtils.smoothstep(edge,0,65);}
 updateShadows();
}
export function setCloudLighting(night:number,glow:number,cloudTint:number,rose:number,sunDirection:THREE.Vector3,direct:number){
 preview=false;worldSun.copy(sunDirection);directStrength=THREE.MathUtils.clamp(direct/1.4,0,1);
 for(const c of cloudStates){const u=(c.mesh.material as THREE.ShaderMaterial).uniforms;
  u.topColor.value.set(0xfffdf7).lerp(new THREE.Color(0x6e7eaa),night).lerp(new THREE.Color(cloudTint),glow*.78);
  u.baseColor.value.set(0x899db7).lerp(new THREE.Color(0x263451),night).lerp(new THREE.Color(rose),glow*.36);
  u.rimColor.value.set(0xfff7df).lerp(new THREE.Color(cloudTint),glow);u.daylight.value=1-night;
 }updateShadows();
}
export function disableCloudShadows(){preview=true;worldSun.fromArray(DAY_LIGHTING.sun.position).normalize();cloudShadowUniforms.cloudShadowStrength.value=0;}
