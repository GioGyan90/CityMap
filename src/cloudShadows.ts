import * as THREE from 'three';
export const CLOUD_SHADOW_LOBES=12;
export const cloudShadowUniforms={
 cloudShadowLobes:{value:Array.from({length:CLOUD_SHADOW_LOBES},()=>new THREE.Vector4(10000,10000,1,1))},
 cloudShadowWeights:{value:Array(12).fill(0)},
 cloudShadowSlope:{value:new THREE.Vector2()},cloudShadowStrength:{value:0}
};
export const cloudShadowDeclarations=`uniform vec4 cloudShadowLobes[12];uniform float cloudShadowWeights[12];uniform vec2 cloudShadowSlope;uniform float cloudShadowStrength;varying vec3 cloudShadowWorld;`;
export const cloudShadowFragment=`
 float cloudCover=0.;
 for(int i=0;i<12;i++){
  vec4 lobe=cloudShadowLobes[i];
  vec2 delta=(cloudShadowWorld.xz-cloudShadowSlope*cloudShadowWorld.y-lobe.xy)/lobe.zw;
  cloudCover=max(cloudCover,exp(-dot(delta,delta)*1.6)*cloudShadowWeights[i]);
 }
 diffuseColor.rgb*=mix(vec3(1.),vec3(.66,.72,.83),cloudCover*cloudShadowStrength);`;
/** Ground-only analytic soft cloud shadows follow the actual surface height. */
export function attachCloudShadows(shader:any){
 Object.assign(shader.uniforms,cloudShadowUniforms);
 shader.vertexShader='varying vec3 cloudShadowWorld;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncloudShadowWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
 shader.fragmentShader=cloudShadowDeclarations+'\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',cloudShadowFragment+'\n#include <alphamap_fragment>');
}
