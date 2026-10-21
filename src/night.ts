import {surfaceHeight} from './terrainSurface';
import {DAY_LIGHTING} from './visualStyle';
import * as THREE from 'three';
import { scene, world, sky, hemi, sun, fill, camera } from './scene';
import { COAST, GROUND_Y } from './config';
import { ROAD_PATHS,terrainHeight,ZONES } from './layout';
import { setWaterNight } from './water';

export let nightMode=false;
const nightGroup=new THREE.Group();nightGroup.name='night-lighting';nightGroup.visible=false;world.add(nightGroup);
const daySky=(sky.material as THREE.MeshBasicMaterial).map;
const canvas=document.createElement('canvas');canvas.width=8;canvas.height=256;
const ctx=canvas.getContext('2d')!;const gradient=ctx.createLinearGradient(0,0,0,256);
gradient.addColorStop(0,'#020a23');gradient.addColorStop(.6,'#0b2149');gradient.addColorStop(1,'#294965');
ctx.fillStyle=gradient;ctx.fillRect(0,0,8,256);
const nightSky=new THREE.CanvasTexture(canvas);nightSky.colorSpace=THREE.SRGBColorSpace;
const meshMaterials=new Set<THREE.Material>();
world.traverse(object=>{if(object instanceof THREE.Mesh && object.name.indexOf('pick-')!==0){const ms=Array.isArray(object.material)?object.material:[object.material];ms.forEach(m=>meshMaterials.add(m));}});
const litMaterials:THREE.MeshToonMaterial[]=[];
const glazingMaterials=[...meshMaterials].filter((m):m is THREE.MeshToonMaterial=>m instanceof THREE.MeshToonMaterial && m.color.getHex()===0x3987aa);
for(const material of meshMaterials) {
  if(!(material instanceof THREE.MeshToonMaterial))continue;
  material.userData.dayEmission=material.emissive.clone();
  if(material.map?.image instanceof HTMLCanvasElement) {
    // Only warm window pixels emit: walls and roofs stay dark at night.
    const src=material.map.image as HTMLCanvasElement;
    const cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;
    const c=cv.getContext('2d')!;c.drawImage(src,0,0);const pixels=c.getImageData(0,0,cv.width,cv.height);
    let hasLight=false;
    for(let i=0;i<pixels.data.length;i+=4) {
      const lit=pixels.data[i]>240&&pixels.data[i+1]>215&&pixels.data[i+2]>145&&pixels.data[i+2]<180;
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=lit?255:0;hasLight ||= lit;
    }
    if(hasLight){c.putImageData(pixels,0,0);material.emissiveMap=new THREE.CanvasTexture(cv);material.emissiveMap.colorSpace=THREE.SRGBColorSpace;material.needsUpdate=true;litMaterials.push(material);}
  }
}
const rideMaterials=new Set<THREE.MeshToonMaterial>();
world.getObjectByName('ferris-rotor')?.traverse(object=>{
  if(object instanceof THREE.Mesh && object.material instanceof THREE.MeshToonMaterial)rideMaterials.add(object.material);
});
// One instanced draw per lamp component, rather than hundreds of point lights.
const sites:[number,number][]=[];
for(let z=-177;z<170;z+=14)sites.push([COAST(z)+9,z]);
for(const road of ROAD_PATHS)for(let i=1;i<road.points.length;i++){
 const a=road.points[i-1],b=road.points[i],count=Math.max(1,Math.floor(Math.hypot(b[0]-a[0],b[1]-a[1])/15));
 for(let j=0;j<count;j++){const t=j/count;sites.push([a[0]+(b[0]-a[0])*t+road.width*.6,a[1]+(b[1]-a[1])*t]);}
}
const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.07,.11,3.5,5),new THREE.MeshToonMaterial({color:0x38495a}),sites.length);
const lamps=new THREE.InstancedMesh(new THREE.SphereGeometry(.38,6,5),new THREE.MeshBasicMaterial({color:0xffda87}),sites.length);
const pools=new THREE.InstancedMesh(new THREE.CircleGeometry(2.5,16),new THREE.MeshBasicMaterial({color:0xf5b95b,transparent:true,opacity:.14,depthWrite:false}),sites.length);
const matrix=new THREE.Matrix4();const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
sites.forEach(([x,z],i)=>{matrix.makeTranslation(x,surfaceHeight(x,z)+1.75,z);poles.setMatrixAt(i,matrix);matrix.makeTranslation(x,surfaceHeight(x,z)+3.55,z);lamps.setMatrixAt(i,matrix);matrix.compose(new THREE.Vector3(x,surfaceHeight(x,z)+.2,z),rotation,new THREE.Vector3(1,1,1));pools.setMatrixAt(i,matrix)});
world.add(poles);nightGroup.add(lamps,pools);
for(const id of ['park','hotel','market','hospital','port','restaurant','promenade']){
 const zone=ZONES[id],x=zone.x,z=zone.z;
 const light=new THREE.PointLight(0xffc477,30,55,1.8);light.position.set(x,surfaceHeight(x,z)+8,z);nightGroup.add(light);
}
// A distant camera-relative backdrop stays visible above an isometric city view.
const space=new THREE.Group();space.name='night-sky-backdrop';space.visible=false;camera.add(space);scene.add(camera);
const starGeometry=new THREE.BufferGeometry();
const starfield=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xc8ddff,size:1.2,sizeAttenuation:false,fog:false}));space.add(starfield);
const moon=new THREE.Mesh(new THREE.SphereGeometry(18,24,16),new THREE.MeshBasicMaterial({color:0xe3ecff,fog:false,depthTest:false,depthWrite:false}));moon.renderOrder=20;space.add(moon);
function layoutBackdrop(){
  let seed=1923;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const halfHeight=1500*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const halfWidth=halfHeight*innerWidth/innerHeight;const stars:number[]=[];
  for(let i=0;i<260;i++)stars.push((random()*2-1)*halfWidth,(.55+random()*.45)*halfHeight,-1500);
  starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));starGeometry.computeBoundingSphere();
  moon.position.set(halfWidth*.65,halfHeight*.76,-1490);
}
layoutBackdrop();window.addEventListener('resize',layoutBackdrop);

export function setNightMode(value:boolean) {
  nightMode=value;nightGroup.visible=value;space.visible=value;
  (sky.material as THREE.MeshBasicMaterial).map=value?nightSky:daySky;
  hemi.color.set(value?0x9ebde9:DAY_LIGHTING.hemi.sky);hemi.groundColor.set(value?0x15213e:DAY_LIGHTING.hemi.ground);hemi.intensity=value?.38:DAY_LIGHTING.hemi.intensity;
  sun.color.set(value?0xa5c4ff:DAY_LIGHTING.sun.color);sun.intensity=value?.25:DAY_LIGHTING.sun.intensity;
  fill.color.set(value?0x5789cf:DAY_LIGHTING.fill.color);fill.intensity=value?.22:DAY_LIGHTING.fill.intensity;
  (scene.fog as THREE.Fog).color.set(value?0x0a1732:DAY_LIGHTING.fog);
  for(const material of litMaterials) {material.emissive.set(value?0xffca75:0x000000);material.emissiveIntensity=value?.85:0;}
  for(const material of glazingMaterials){material.emissive.set(value?0x174a75:0x000000);material.emissiveIntensity=value?.4:0;}
  for(const material of rideMaterials){material.emissive.copy(value?material.color:new THREE.Color(0));material.emissiveIntensity=value?.45:0;}
  setWaterNight(value);document.body.dataset.time=value?'night':'day';
  const button=document.getElementById('toggleNight');if(button){button.textContent=value?'切换白天':'夜间模式';button.setAttribute('aria-pressed',String(value));}
  world.userData.nightMode=value;
  try{localStorage.setItem('citymap-night',String(value))}catch{}
}
document.getElementById('toggleNight')!.addEventListener('click',()=>setNightMode(!nightMode));
let saved=false;try{saved=localStorage.getItem('citymap-night')==='true'}catch{}
setNightMode(saved);
