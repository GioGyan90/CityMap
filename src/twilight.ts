import {smooth} from './solarCycle';

/** Art direction follows solar altitude, so seasons and clock speed stay coherent.
 * A blue-hour tail keeps colour after the solar disc drops below the horizon.
 */
export function twilightProfile(altitude:number,azimuth:number){
 const glow=smooth(-12,-3,altitude)*(1-smooth(3,20,altitude));
 const dusk=azimuth>=180?1:0;
 return {glow,dusk,
  horizon:dusk?0xff9055:0xffb47e,
  rose:dusk?0xed5c87:0xf78eaa,
  zenith:dusk?0x514b94:0x7c8bc7,
  sunlight:dusk?0xffad67:0xffd29a,
  cloud:dusk?0xff958b:0xffb8ae};
}

/** Shared by the live Sky shader and the offscreen shader check. */
export const twilightSkyFragment=`
 float elevation=max(direction.y,0.0);
 vec3 nightColor=mix(horizonColor,vec3(.0006,.0018,.006),smoothstep(0.0,.75,elevation));
 vec3 boundedSky=retColor/(retColor+vec3(.7));
 vec3 illustratedDay=mix(horizonColor,vec3(.008,.22,.55),smoothstep(0.0,.65,elevation));
 boundedSky=mix(boundedSky,illustratedDay,daylight*.4);
 vec3 skyColor=mix(boundedSky,nightColor,nightBlend);
 // Art-led crimson/rose band spans more of the sky; cool violet stays above.
 // Dividing by a bounded length also handles a camera looking at the zenith.
 vec2 horizontal=direction.xz/max(length(direction.xz),.0001);
 vec2 sunHorizontal=vSunDirection.xz/max(length(vSunDirection.xz),.0001);
 float facing=smoothstep(-.45,.95,dot(horizontal,sunHorizontal));
 vec3 lowSky=mix(twilightRose,twilightHorizon,facing);
 vec3 middleSky=mix(twilightRose,twilightHorizon,.12*facing);
 vec3 twilightColor=mix(lowSky,middleSky,smoothstep(.01,.18,elevation));
 twilightColor=mix(twilightColor,twilightZenith,smoothstep(.16,.85,elevation));
 float halo=pow(max(dot(direction,vSunDirection),0.0),18.0);
 twilightColor+=twilightHorizon*halo*.42;
 // Broad, sparse high-cloud ribbons; they wrap with view direction and have
 // no screen-space motion or random per-frame flicker.
 float az=atan(direction.z,direction.x);
 float ribbonHeight=.13+.022*sin(az*3.)+.012*sin(az*7.);
 float ribbon=exp(-pow((elevation-ribbonHeight)/.023,2.));
 ribbon+=.45*exp(-pow((elevation-ribbonHeight-.085)/.018,2.));
 float gaps=smoothstep(-.45,.65,sin(az*5.+.7)+.35*sin(az*11.));
 twilightColor=mix(twilightColor,mix(twilightRose,twilightHorizon,facing),clamp(ribbon*gaps*.38,0.,.42));
 skyColor=mix(skyColor,twilightColor,twilightStrength);
 // Preserve a restrained solar disc after artistic sky compositing.
 float disc=smoothstep(.99993,.99997,dot(direction,vSunDirection));
 skyColor=mix(skyColor,vec3(1.,.80,.46),disc*twilightStrength*smoothstep(-.018,.008,vSunDirection.y));
 skyColor=mix(skyColor,horizonColor,exp(-elevation*32.)*.62);
 gl_FragColor=vec4(skyColor,1.0);`;
