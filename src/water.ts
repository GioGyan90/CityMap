import {SEA_PALETTE} from './visualStyle';
import {SHORE_Z,WEST_X,EAST_X} from './layout';
import * as THREE from 'three';
import { world } from './scene';

export const waterUniforms={
  lightDirection:{value:new THREE.Vector3(-.3,.85,.4).normalize()},lightColor:{value:new THREE.Color(0xffefc7)},lightStrength:{value:1},skyReflection:{value:new THREE.Color(0x79c7ed)},fogColor:{value:new THREE.Color(0xbce2f7)},time:{value:0},night:{value:0},westShore:{value:SHORE_Z.map((z,i)=>new THREE.Vector2(WEST_X[i],z))},eastShore:{value:SHORE_Z.map((z,i)=>new THREE.Vector2(EAST_X[i],z))},
  shallow:{value:new THREE.Color(SEA_PALETTE.shallow)},deep:{value:new THREE.Color(SEA_PALETTE.deep)}
};
const material=new THREE.ShaderMaterial({
  uniforms:waterUniforms,
  vertexShader:`
    uniform float time;varying vec3 vWorld;
    float swell(vec2 p){return .15*sin(dot(p,vec2(.025,.016))+time*.8)+.09*sin(dot(p,vec2(-.017,.04))-time*.65);}
    void main(){vec3 p=position;p.y+=swell(p.xz);vec4 wp=modelMatrix*vec4(p,1.);vWorld=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}
  `,
  fragmentShader:`
    uniform vec3 lightDirection;uniform vec3 lightColor;uniform float lightStrength;uniform vec3 skyReflection;uniform vec3 fogColor;uniform vec2 westShore[12];uniform vec2 eastShore[12];uniform float time;uniform float night;uniform vec3 shallow;uniform vec3 deep;varying vec3 vWorld;
    float surface(vec2 p){p.x+=sin(p.y*.041+time*.22)*2.5;p.y+=sin(p.x*.032-time*.15)*1.7;return .15*sin(dot(p,vec2(.025,.016))+time*.8)+.09*sin(dot(p,vec2(-.017,.04))-time*.65)+.045*sin(dot(p,vec2(.52,.28))+time*1.5)+.025*sin(dot(p,vec2(-.32,.71))-time*1.8);}
    void main(){
      vec2 p=vWorld.xz;float e=.12;
      vec3 n=normalize(vec3(surface(p-vec2(e,0.))-surface(p+vec2(e,0.)),2.*e,surface(p-vec2(0.,e))-surface(p+vec2(0.,e))));
      vec3 view=normalize(cameraPosition-vWorld);
      float fresnel=pow(1.-max(dot(n,view),0.),3.);
      float shoreZ=clamp(p.y,-200.,202.);
      float west=westShore[0].x,east=eastShore[0].x;
      for(int i=0;i<11;i++){if(shoreZ>=westShore[i].y){float k=clamp((shoreZ-westShore[i].y)/(westShore[i+1].y-westShore[i].y),0.,1.);k=k*k*(3.-2.*k);west=mix(westShore[i].x,westShore[i+1].x,k);east=mix(eastShore[i].x,eastShore[i+1].x,k);}}
      // Same foreshore profile as the terrain; keep the promenade restaurant inlet open.
      float beachWidth=smoothstep(-196.,-168.,p.y)*(1.-smoothstep(160.,196.,p.y))*(9.5+3.5*sin(p.y*.026)+1.5*cos(p.y*.063))*(1.-exp(-pow((p.y-98.)/17.,2.)));
      west-=beachWidth;
      vec2 shoreDistance=vec2(max(west-p.x,p.x-east),max(-200.-p.y,p.y-202.));
      float distanceToCoast=length(max(shoreDistance,vec2(0.)))+min(max(shoreDistance.x,shoreDistance.y),0.);
      float nearShore=1.-smoothstep(0.,36.,distanceToCoast);
      vec3 color=mix(deep,shallow,nearShore*.88);
      color=mix(color,skyReflection,fresnel*.7);
      vec3 light=normalize(lightDirection);
      float sun=pow(max(dot(reflect(-light,n),view),0.),76.);
      color*=.9+max(dot(n,light),0.)*.14;
      color+=lightColor*sun*.9*lightStrength;
      float crest=sin(distanceToCoast*2.4-time*1.6+sin(p.y*.23)*.8);
      float foam=smoothstep(.64,.97,crest)*(1.-smoothstep(.3,2.6,abs(distanceToCoast)));
      foam*=1.-smoothstep(197.,205.,abs(p.y));
      color=mix(color,mix(vec3(.8,.94,.91),vec3(.16,.31,.42),night),foam*.65);
      float distanceToCamera=length(cameraPosition-vWorld);
      color=mix(color,fogColor,smoothstep(700.,1500.,distanceToCamera));
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
});
const geo=new THREE.PlaneGeometry(10000,10000,220,220);geo.rotateX(-Math.PI/2);
export const water=new THREE.Mesh(geo,material);water.name='animated-ocean';water.position.y=-.26;world.add(water);
export function updateWater(time:number){waterUniforms.time.value=time;}
const dayShallow=new THREE.Color(SEA_PALETTE.shallow),dayDeep=new THREE.Color(SEA_PALETTE.deep),nightShallow=new THREE.Color('#123a58'),nightDeep=new THREE.Color('#081d3e'),sunset=new THREE.Color(0xb4a786);
export function setWaterLighting(night:number,warm:number,direct:number,moon:number,sunDirection:THREE.Vector3,moonDirection:THREE.Vector3,fogColor:THREE.Color){
 waterUniforms.night.value=night;waterUniforms.shallow.value.copy(dayShallow).lerp(nightShallow,night).lerp(sunset,warm*.2);waterUniforms.deep.value.copy(dayDeep).lerp(nightDeep,night);
 waterUniforms.lightDirection.value.copy(direct>0?sunDirection:moonDirection);waterUniforms.lightColor.value.set(direct>0?0xfff1d0:0x8aabe0);if(direct>0)waterUniforms.lightColor.value.lerp(new THREE.Color(0xff9e54),warm);
 waterUniforms.lightStrength.value=direct>0?direct/1.8:moon*.3;waterUniforms.skyReflection.value.set(0x79c7ed).lerp(new THREE.Color(0x050b1f),night).lerp(new THREE.Color(0xd9a16b),warm*.5);waterUniforms.fogColor.value.copy(fogColor);
}
