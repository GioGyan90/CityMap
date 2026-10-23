import {setInfrastructureNight} from './trafficInfrastructure';
import * as THREE from 'three';
import {scene,world,sky,hemi,sun,fill,camera} from './scene';
import {setCloudLighting,disableCloudShadows} from './clouds';
import {surfaceHeight} from './terrainSurface';
import {twilightProfile} from './twilight';
import {DAY_LIGHTING} from './visualStyle';
import {ZONES} from './layout';
import {setWaterLighting} from './water';
import {SolarClock,civilParts,formatTime,solarEvents,sampleSolar,smooth} from './solarCycle';
import './timeControls.css';
export let nightMode=false;
export const solarClock=new SolarClock();
const nightGroup=new THREE.Group();nightGroup.name='night-lighting';nightGroup.visible=false;world.add(nightGroup);
const meshMaterials=new Set<THREE.Material>();
world.traverse(object=>{if(object instanceof THREE.Mesh && object.name.indexOf('pick-')!==0){const ms=Array.isArray(object.material)?object.material:[object.material];ms.forEach(m=>meshMaterials.add(m));}});
const residentialGlazingMaterials=[...meshMaterials].filter((m):m is THREE.MeshToonMaterial=>m instanceof THREE.MeshToonMaterial&&m.userData.lightingRole==='residential-glass'&&m.userData.inhabited);
const stationLightMaterials=[...meshMaterials].filter((m):m is THREE.MeshToonMaterial=>m instanceof THREE.MeshToonMaterial&&m.userData.lightingRole==='station-light');
const vehicleLightMaterials=[...meshMaterials].filter((m):m is THREE.MeshToonMaterial=>m instanceof THREE.MeshToonMaterial&&m.userData.lightingRole==='vehicle-light');
const litMaterials:THREE.MeshToonMaterial[]=[];
const glazingMaterials=[...meshMaterials].filter((m):m is THREE.MeshToonMaterial=>m instanceof THREE.MeshToonMaterial && m.color.getHex()===0x3987aa && m.userData.lightingRole!=='residential-glass');
for(const material of meshMaterials) {
  if(!(material instanceof THREE.MeshToonMaterial))continue;
  material.userData.dayEmission=material.emissive.clone();
  if(material.userData.lightingRole==='window-facade' && material.emissiveMap)litMaterials.push(material);
}
const rideMaterials=new Set<THREE.MeshToonMaterial>();
world.getObjectByName('ferris-rotor')?.traverse(object=>{
  if(object instanceof THREE.Mesh && object.material instanceof THREE.MeshToonMaterial)rideMaterials.add(object.material);
});
for(const id of ['park','hotel','market','hospital','port','restaurant','promenade','hall2','fishmarket']){
 const zone=ZONES[id],x=zone.x,z=zone.z;
 const light=new THREE.PointLight(0xffc477,30,55,1.8);light.position.set(x,surfaceHeight(x,z)+8,z);nightGroup.add(light);
}

const celestial=new THREE.Group();celestial.name='celestial-sky';scene.add(celestial);sky.renderOrder=-1000;
let seed=4924;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const stars:number[]=[];for(let i=0;i<600;i++){const y=.04+random()*.96,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);stars.push(Math.cos(a)*r*1550,y*1550,Math.sin(a)*r*1550);}
const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
const starMaterial=new THREE.PointsMaterial({color:0xc9ddff,size:1.5,sizeAttenuation:false,fog:false,transparent:true,opacity:0,depthWrite:false});
const starfield=new THREE.Points(starGeometry,starMaterial);starfield.name='astronomical-star-backdrop';celestial.add(starfield);
const moonMaterial=new THREE.ShaderMaterial({uniforms:{sunDirection:{value:new THREE.Vector3()},visibility:{value:1}},transparent:true,depthWrite:false,
 vertexShader:`varying vec3 worldNormal;void main(){worldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform vec3 sunDirection;uniform float visibility;varying vec3 worldNormal;void main(){float lit=smoothstep(-.04,.1,dot(normalize(worldNormal),sunDirection));gl_FragColor=vec4(vec3(.66,.75,.88)*mix(.025,1.0,lit),visibility);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
const moon=new THREE.Mesh(new THREE.SphereGeometry(7,32,20),moonMaterial);moon.name='astronomical-moon';celestial.add(moon);
const moonLight=new THREE.DirectionalLight(0x9ab8ed,0);moonLight.name='moon-light';scene.add(moonLight,moonLight.target,sun.target);
const center=new THREE.Vector3(70,0,10),sunDir=new THREE.Vector3(),moonDir=new THREE.Vector3();
const panel=document.createElement('section');panel.className='time-panel';panel.setAttribute('aria-label','昼夜时间控制');
panel.innerHTML=`<div class="time-heading"><strong>昼夜时间</strong><output id="time-clock">10:00</output><span id="time-phase"></span></div>
<input id="time-slider" aria-label="一天中的时间" type="range" min="0" max="1439" step="1" value="600"><div class="time-ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
<div class="time-actions"><button id="time-play" aria-pressed="true">暂停</button><select id="time-speed" aria-label="时间流速"><option value="1">实时</option><option value="60">一天24分钟</option><option value="360" selected>一天4分钟</option><option value="1440">一天1分钟</option></select><input id="time-date" aria-label="模拟日期" type="date" min="2000-01-01" max="2100-12-31"></div>
<div class="time-presets"><button data-solar-preset="sunrise">日出</button><button data-solar-preset="noon">正午</button><button data-solar-preset="sunset">日落</button><button data-solar-preset="midnight">午夜</button><output id="time-events"></output></div>`;
document.body.appendChild(panel);document.body.dataset.cycle='true';
const clockLabel=panel.querySelector<HTMLOutputElement>('#time-clock')!,slider=panel.querySelector<HTMLInputElement>('#time-slider')!,dateInput=panel.querySelector<HTMLInputElement>('#time-date')!,speedSelect=panel.querySelector<HTMLSelectElement>('#time-speed')!,playButton=panel.querySelector<HTMLButtonElement>('#time-play')!,phaseLabel=panel.querySelector('#time-phase')!,eventsLabel=panel.querySelector('#time-events')!;
let eventsDate='',previousAsset=false,skipAdvance=false,displayKey='';
function save(){try{localStorage.setItem('citymap-solar-v1',JSON.stringify({timestamp:solarClock.timestamp,speed:solarClock.speed,playing:solarClock.playing}));}catch{}}
function syncUI(){const local=civilParts(solarClock.timestamp),key=formatTime(solarClock.timestamp)+' '+local.date+' '+solarClock.speed+' '+solarClock.playing;if(key===displayKey)return;displayKey=key;clockLabel.value=formatTime(solarClock.timestamp);slider.value=String(Math.floor(local.minutes));dateInput.value=local.date;speedSelect.value=String(solarClock.speed);playButton.textContent=solarClock.playing?'暂停':'播放';playButton.setAttribute('aria-pressed',String(solarClock.playing));if(eventsDate!==local.date){eventsDate=local.date;const events=solarEvents(solarClock.timestamp);eventsLabel.textContent=`日出 ${events.sunrise?formatTime(+events.sunrise):'—'} · 日落 ${events.sunset?formatTime(+events.sunset):'—'}`;}}
export function refreshDayNight(){
 const state=sampleSolar(solarClock.timestamp),{daylight,night,warm}=state;const twilight=twilightProfile(state.sun.altitude,state.sun.azimuth);sunDir.fromArray(state.sunDirection);moonDir.fromArray(state.moonDirection);
 sun.target.position.copy(center);sun.position.copy(center).addScaledVector(sunDir,550);sun.target.updateMatrixWorld();sun.color.set(DAY_LIGHTING.sun.color).lerp(new THREE.Color(twilight.sunlight),warm);sun.intensity=state.direct*(DAY_LIGHTING.sun.intensity/1.8);sun.castShadow=state.direct>.015;
 hemi.color.set(0x9ebde9).lerp(new THREE.Color(DAY_LIGHTING.hemi.sky),daylight);hemi.groundColor.set(0x15213e).lerp(new THREE.Color(DAY_LIGHTING.hemi.ground),daylight);hemi.color.lerp(new THREE.Color(twilight.zenith),twilight.glow*.38);hemi.groundColor.lerp(new THREE.Color(0x64678e),twilight.glow*.35);hemi.intensity=THREE.MathUtils.lerp(.33,DAY_LIGHTING.hemi.intensity,daylight);
 fill.color.set(0x6d8ac1).lerp(new THREE.Color(DAY_LIGHTING.fill.color),daylight);fill.color.lerp(new THREE.Color(0x9b9fd9),twilight.glow*.55);fill.intensity=THREE.MathUtils.lerp(.11,DAY_LIGHTING.fill.intensity,daylight);
 moonLight.target.position.copy(center);moonLight.target.updateMatrixWorld();moonLight.position.copy(center).addScaledVector(moonDir,550);moonLight.intensity=night*state.moonVisibility*(.035+.09*state.moonFraction);
 const fogColor=new THREE.Color(0x09162c).lerp(new THREE.Color(DAY_LIGHTING.fog),daylight).lerp(new THREE.Color(twilight.horizon),twilight.glow*.65);if(scene.fog)(scene.fog as THREE.Fog).color.copy(fogColor);
 const sm=sky.material as THREE.ShaderMaterial;sm.uniforms.sunPosition.value.copy(sunDir);sm.uniforms.nightBlend.value=night;sm.uniforms.horizonColor.value.copy(fogColor);sm.uniforms.daylight.value=daylight;sm.uniforms.twilightStrength.value=twilight.glow;sm.uniforms.twilightHorizon.value.set(twilight.horizon);sm.uniforms.twilightRose.value.set(twilight.rose);sm.uniforms.twilightZenith.value.set(twilight.zenith);sky.position.copy(camera.position);
 celestial.visible=true;celestial.position.copy(camera.position);starMaterial.opacity=Math.pow(night,1.7)*.85;starfield.rotation.y=(civilParts(solarClock.timestamp).minutes/1440)*Math.PI*2;
 moon.position.copy(moonDir).multiplyScalar(1450);moon.visible=state.moon.altitude>-.4;moonMaterial.uniforms.sunDirection.value.copy(sunDir);moonMaterial.uniforms.visibility.value=(.25+.75*night)*state.moonVisibility;
 nightGroup.visible=night>.001;setInfrastructureNight(night);nightGroup.children.forEach(o=>{if(o instanceof THREE.PointLight)o.intensity=30*night;});
 for(const material of vehicleLightMaterials)material.emissiveIntensity=.1+night*.95;
 for(const material of litMaterials){material.emissive.set(0xffca75);material.emissiveIntensity=.85*night;}
 for(const material of stationLightMaterials){material.emissive.set(0xffd18a);material.emissiveIntensity=.12+night*1.2;}
 for(const material of residentialGlazingMaterials){material.emissive.set(0xffdca0);material.emissiveIntensity=.55*night;}
 for(const material of glazingMaterials){material.emissive.set(0xffdca0);material.emissiveIntensity=.55*night;}
 for(const material of rideMaterials){material.emissive.copy(material.color);material.emissiveIntensity=.45*night;}
 setCloudLighting(night,twilight.glow,twilight.cloud,twilight.rose,sunDir,state.direct);
 setWaterLighting(night,warm,state.direct,night*state.moonVisibility,sunDir,moonDir,fogColor,twilight);
 nightMode=night>.55;document.body.dataset.time=nightMode?'night':'day';const button=document.getElementById('toggleNight');if(button){button.textContent=nightMode?'切到白天':'切到夜晚';button.setAttribute('aria-pressed',String(nightMode));}
 phaseLabel.textContent=state.phase;world.userData.nightMode=nightMode;world.userData.solar={timestamp:solarClock.timestamp,clock:formatTime(solarClock.timestamp),speed:solarClock.speed,playing:solarClock.playing,altitude:state.sun.altitude,azimuth:state.sun.azimuth,sunDirection:state.sunDirection,night,direct:state.direct};syncUI();
}
export function enterAssetDaylight(){disableCloudShadows();celestial.visible=false;hemi.color.set(DAY_LIGHTING.hemi.sky);hemi.groundColor.set(DAY_LIGHTING.hemi.ground);hemi.intensity=DAY_LIGHTING.hemi.intensity;sun.color.set(DAY_LIGHTING.sun.color);sun.intensity=DAY_LIGHTING.sun.intensity;sun.castShadow=true;fill.color.set(DAY_LIGHTING.fill.color);fill.intensity=DAY_LIGHTING.fill.intensity;moonLight.intensity=0;}
export function updateDayNight(seconds:number){const asset=!!world.userData.assetView;if(asset){if(!previousAsset)enterAssetDaylight();previousAsset=true;return;}if(previousAsset){previousAsset=false;skipAdvance=true;}if(!document.hidden&&!skipAdvance)solarClock.advance(Math.min(Math.max(seconds,0),1));skipAdvance=false;refreshDayNight();}
export function setNightMode(value:boolean){solarClock.seek(civilParts(solarClock.timestamp).date,value?1320:720);solarClock.playing=false;refreshDayNight();save();}
document.getElementById('toggleNight')!.addEventListener('click',()=>setNightMode(!nightMode));
playButton.onclick=()=>{solarClock.playing=!solarClock.playing;syncUI();save();};speedSelect.onchange=()=>{solarClock.setSpeed(Number(speedSelect.value));syncUI();save();};
slider.oninput=()=>{solarClock.seek(civilParts(solarClock.timestamp).date,Number(slider.value));solarClock.playing=false;refreshDayNight();save();};
dateInput.onchange=()=>{try{solarClock.seek(dateInput.value,civilParts(solarClock.timestamp).minutes);refreshDayNight();save();}catch{dateInput.value=civilParts(solarClock.timestamp).date;}};
panel.querySelectorAll<HTMLButtonElement>('[data-solar-preset]').forEach(b=>b.onclick=()=>{const preset=b.dataset.solarPreset,events=solarEvents(solarClock.timestamp),date=civilParts(solarClock.timestamp).date;if(preset==='midnight')solarClock.seek(date,0);else{const event=preset==='noon'?events.solarNoon:preset==='sunrise'?events.sunrise:events.sunset;if(event)solarClock.timestamp=+event;}solarClock.playing=false;refreshDayNight();save();});
try{const stored=JSON.parse(localStorage.getItem('citymap-solar-v1')??'null');if(stored&&Number.isFinite(stored.timestamp)&&stored.timestamp>=Date.parse('2000-01-01')&&stored.timestamp<=Date.parse('2101-01-01')){solarClock.timestamp=stored.timestamp;try{solarClock.setSpeed(stored.speed);}catch{}solarClock.playing=typeof stored.playing==='boolean'?stored.playing:true;}else if(localStorage.getItem('citymap-night')==='true'){solarClock.seek(civilParts(solarClock.timestamp).date,1320);solarClock.playing=false;}}catch{}
const query=new URLSearchParams(location.search),hour=Number(query.get('time'));if(query.has('time')&&Number.isFinite(hour)&&hour>=0&&hour<24){solarClock.seek(civilParts(solarClock.timestamp).date,hour*60);solarClock.playing=false;}
if(query.has('speed'))try{solarClock.setSpeed(Number(query.get('speed')));}catch{}if(query.get('play')==='1')solarClock.playing=true;
document.addEventListener('visibilitychange',()=>{skipAdvance=true;});window.addEventListener('pagehide',save);refreshDayNight();
