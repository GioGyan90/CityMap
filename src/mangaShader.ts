/** One fullscreen pass; samples the beauty pass depth, no normal/outline scene re-render. */
export const mangaVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const mangaFragment=`
uniform sampler2D tColor;uniform sampler2D tDepth;
uniform vec2 texel;uniform float nearPlane;uniform float farPlane;uniform float daylight;
uniform vec3 inkColor;uniform vec3 fogColor;uniform mat4 inverseViewProjection;
varying vec2 vUv;
float viewDepth(float d){return nearPlane*farPlane/(farPlane-(farPlane-nearPlane)*d);}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec3 displayColor(vec3 c){c=max(c,vec3(0.));return mix(1.055*pow(c,vec3(1./2.4))-.055,c*12.92,step(c,vec3(.0031308)));}
void main(){
 vec3 base=texture2D(tColor,vUv).rgb;
 vec3 left=texture2D(tColor,vUv-vec2(texel.x,0.)).rgb,right=texture2D(tColor,vUv+vec2(texel.x,0.)).rgb;
 vec3 down=texture2D(tColor,vUv-vec2(0.,texel.y)).rgb,up=texture2D(tColor,vUv+vec2(0.,texel.y)).rgb;
 // A small edge-adaptive filter softens the single-sample target, leaving flat colours intact.
 float range=max(max(lum(left),lum(right)),max(lum(up),lum(down)))-min(min(lum(left),lum(right)),min(lum(up),lum(down)));
 base=mix(base,(base*4.+left+right+up+down)/8.,smoothstep(.025,.16,range)*.32);
 float raw=texture2D(tDepth,vUv).x,z=viewDepth(raw);
 // Wider depth kernel strengthens geometry ink without blurring the colour pass.
 vec2 inkStep=texel*2.;
 float l=viewDepth(texture2D(tDepth,vUv-vec2(inkStep.x,0.)).x),r=viewDepth(texture2D(tDepth,vUv+vec2(inkStep.x,0.)).x);
 float b=viewDepth(texture2D(tDepth,vUv-vec2(0.,inkStep.y)).x),t=viewDepth(texture2D(tDepth,vUv+vec2(0.,inkStep.y)).x);
 // Second differences reject continuous plane slopes; distance fading quiets tiny far-away detail.
 float bend=max(abs(l+r-2.*z),abs(b+t-2.*z))/max(z,1.);
 vec4 worldPoint=inverseViewProjection*vec4(vUv*2.-1.,raw*2.-1.,1.);
 float aboveWater=smoothstep(-.1,.3,worldPoint.y/worldPoint.w);
 float edge=smoothstep(.005,.028,bend)*(1.-smoothstep(.99995,1.,raw))*aboveWater;
 float distanceFade=mix(1.,.38,smoothstep(70.,520.,z));
 float day=clamp(daylight,0.,1.),surface=1.-step(.99995,raw);
 float shade=(1.-smoothstep(.08,.6,lum(base)))*day;
 vec3 color=mix(vec3(lum(base)),base,1.035);
 color*=mix(vec3(1.),vec3(.965,.985,1.055),shade*.65);
 // Preserve the C palette; only the distant layers receive a restrained cool haze.
 color=mix(color,fogColor,smoothstep(230.,900.,z)*.115*day*surface);
 // Ink only darkens: night edges must not turn into blue emissive outlines.
 color=mix(color,min(inkColor,color*.7),edge*distanceFade*mix(.12,.78,day));
 gl_FragColor=vec4(displayColor(color),1.);
}`;
