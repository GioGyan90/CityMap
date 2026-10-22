export const cloudVertexShader=`varying vec3 localSurface;void main(){localSurface=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const cloudFragmentShader=`
 varying vec3 localSurface;
 uniform vec3 cameraLocal;uniform vec3 sunLocal;uniform vec3 topColor;uniform vec3 baseColor;uniform vec3 rimColor;
 uniform sampler2D densityAtlas;uniform int marchSteps;
 uniform float opticalDepth;uniform float visibility;uniform float daylight;
 float density(vec3 p){
  vec3 q=clamp(p*.5+.5,0.,1.);float slice=q.z*47.;float a=floor(slice),b=min(a+1.,47.);
  vec2 cellA=vec2(mod(a,8.),floor(a/8.)),cellB=vec2(mod(b,8.),floor(b/8.));
  vec2 uvA=(cellA*48.+vec2(.5)+q.xy*47.)/vec2(384.,288.);
  vec2 uvB=(cellB*48.+vec2(.5)+q.xy*47.)/vec2(384.,288.);
  return mix(texture2D(densityAtlas,uvA).r,texture2D(densityAtlas,uvB).r,fract(slice));
 }
 void main(){
  vec3 ray=normalize(localSurface-cameraLocal);
  vec3 safeRay=sign(ray+vec3(.0000001))*max(abs(ray),vec3(.00001));
  vec3 t0=(-vec3(1.)-cameraLocal)/safeRay,t1=(vec3(1.)-cameraLocal)/safeRay;
  vec3 nearV=min(t0,t1),farV=max(t0,t1);
  float entry=max(0.,max(nearV.x,max(nearV.y,nearV.z))),exitT=min(farV.x,min(farV.y,farV.z));
  if(exitT<=entry)discard;
  float stepSize=(exitT-entry)/float(marchSteps);vec3 lightDir=normalize(sunLocal);vec3 total=vec3(0.);float transmission=1.;
  for(int step=0;step<32;step++){if(step>=marchSteps)break;
   vec3 p=cameraLocal+ray*(entry+(float(step)+.5)*stepSize);
   float d=density(p);if(d<.005)continue;
   float above=smoothstep(-.45,.55,p.y);
   float sunSide=max(dot(normalize(p+vec3(0.,.35,0.)),lightDir),0.);
   float selfShade=density(p+lightDir*.23);
   float illumination=clamp(.24+.46*above+.32*sunSide-.30*selfShade,0.,1.);
   vec3 color=mix(baseColor,topColor,illumination);
   float rim=pow(max(dot(-ray,lightDir),0.),5.)*(1.-d)*.16*daylight;
   color+=rimColor*rim;
   float alpha=1.-exp(-d*opticalDepth*stepSize);
   total+=transmission*alpha*color;transmission*=1.-alpha;
   if(transmission<.025)break;
  }
  float alpha=(1.-transmission)*visibility;if(alpha<.003)discard;
  gl_FragColor=vec4(total/max(1.-transmission,.0001),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
