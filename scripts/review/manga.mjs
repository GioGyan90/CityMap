// Scene integration check; canvas drawing supplies the real terrain/facade textures.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const canvas=process.env.CITYMAP_CANVAS_MODULE;if(!canvas)throw Error('Set CITYMAP_CANVAS_MODULE to @napi-rs/canvas/index.js');
const output=resolve(process.env.MANGA_REVIEW_DIR??'docs/manga-review');
const directory=await mkdtemp(join(tmpdir(),'citymap-fleet-scene-')),bundle=join(directory,'export.mjs'),json=join(directory,'scene.json');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`
import * as THREE from 'three';import {writeFileSync,appendFileSync,openSync,closeSync,readSync,writeSync,unlinkSync} from 'node:fs';import {createCanvas} from ${JSON.stringify(canvas)};
globalThis.document={createElement:()=>createCanvas(128,128)};globalThis.window={};
const {world}=await import('./src/scene');world.userData.deferClouds=true;await import('./src/environment');await import('./src/city');
const {cars}=await import('./src/traffic'),{marineFleet}=await import('./src/marineTraffic'),{terrainRoadMask}=await import('./src/groundRoadMaterial');world.updateMatrixWorld(true);
const {sampleSolar,civilTimestamp}=await import('./src/solarCycle');const {DAY_LIGHTING}=await import('./src/visualStyle');const {twilightProfile}=await import('./src/twilight');
const views=[],targets=[];const {surfaceHeight}=await import('./src/terrainSurface');const court=world.userData.residential.courts.find(c=>c.homes.length===5)??world.userData.residential.courts[0],h=court.garden,y=surfaceHeight(...h);
const shots=[['panorama',[80,13,8],[-225,225,320],720],['cargo',[-100,5,-140],[-164,48,-85],720],['housing',[h[0],y+3,h[1]],[h[0]+45,y+35,h[1]+50],720],['sunset',[80,13,8],[-225,225,320],1050],['night',[80,13,8],[-225,225,320],1260]];
for(const [name,target,eye,minute] of shots){targets.push(new THREE.Vector3(...target));const sun=sampleSolar(civilTimestamp('2026-09-22',minute)),twilight=twilightProfile(sun.sun.altitude,sun.sun.azimuth);views.push({name,target,eye,solar:{altitude:sun.sun.altitude,azimuth:sun.sun.azimuth,night:sun.night,daylight:sun.daylight,direct:sun.direct,warm:sun.warm,direction:sun.sunDirection,twilight,fogColor:new THREE.Color(0x09162c).lerp(new THREE.Color(DAY_LIGHTING.fog),sun.daylight).lerp(new THREE.Color(twilight.horizon),twilight.glow*.65).toArray()}});}
const {mangaVertex,mangaFragment}=await import('./src/mangaShader');const {ORIGINAL_TOON_RAMP,MANGA_TOON_RAMP}=await import('./src/materials');const inkColor=new THREE.Color(0x314f69).toArray();
const nearBox=b=>targets.some(p=>b.max.x>p.x-440&&b.min.x<p.x+440&&b.max.z>p.z-440&&b.min.z<p.z+440),textureCache=new Map();const partsFile=process.argv[2]+'.parts';writeFileSync(partsFile,'');
const dataURL=t=>{if(!t?.image)return null;if(textureCache.has(t.uuid))return t.uuid;let url=null;if(t.image.toDataURL)url=t.image.toDataURL();else if(t.image.data){const c=createCanvas(t.image.width,t.image.height),g=c.getContext('2d'),id=g.createImageData(t.image.width,t.image.height);id.data.set(t.image.data);g.putImageData(id,0,0);url=c.toDataURL();}if(url)textureCache.set(t.uuid,url);return url?t.uuid:null;};
world.traverse(o=>{if(!(o instanceof THREE.Mesh)||!o.visible||o.name.startsWith('pick-')||o.name==='soft-density-envelope')return;const g=o.geometry,instances=o instanceof THREE.InstancedMesh?o.count:1;g.computeBoundingBox();
 for(let instance=0;instance<instances;instance++){const matrix=o.matrixWorld.clone();if(o instanceof THREE.InstancedMesh){const local=new THREE.Matrix4();o.getMatrixAt(instance,local);matrix.multiply(local);}if(!nearBox(g.boundingBox.clone().applyMatrix4(matrix)))continue;
 const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix),groups=Array.isArray(o.material)?g.groups:[{start:0,count:g.index?.count??g.attributes.position.count,materialIndex:0}];
 for(const group of groups){const m=Array.isArray(o.material)?o.material[group.materialIndex??0]:o.material;if(!m||m.visible===false||m.opacity<.1)continue;const v=[],n=[],c=[],uv=[],color=m.color??m.uniforms?.deep?.value??new THREE.Color(0xffffff);
 for(let j=group.start;j<group.start+group.count;j+=3){const ids=[0,1,2].map(k=>g.index?g.index.getX(j+k):j+k),points=ids.map(i=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix)),box=new THREE.Box3().setFromPoints(points);if(!nearBox(box))continue;
 for(let k=0;k<3;k++){const i=ids[k],p=points[k],normal=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).applyMatrix3(normalMatrix).normalize(),col=color.clone();if(m.vertexColors&&g.attributes.color)col.multiply(new THREE.Color().fromBufferAttribute(g.attributes.color,i));v.push(...p.toArray());n.push(...normal.toArray());c.push(...col.toArray());uv.push(g.attributes.uv?.getX(i)??0,g.attributes.uv?.getY(i)??0);}}
 if(v.length)appendFileSync(partsFile,JSON.stringify({name:o.name,v:Buffer.from(new Float32Array(v).buffer).toString('base64'),n:Buffer.from(new Float32Array(n).buffer).toString('base64'),c:Buffer.from(new Float32Array(c).buffer).toString('base64'),uv:Buffer.from(new Float32Array(uv).buffer).toString('base64'),toon:m.isMeshToonMaterial===true,depthWrite:m.depthWrite,transparent:m.transparent,opacity:m.opacity,side:m.side,texture:dataURL(m.map),emissiveTexture:dataURL(m.emissiveMap),role:m.userData.lightingRole??'',water:o.name==='animated-ocean',groundTexture:o.name==='irregular-elevated-terrain'?dataURL(terrainRoadMask):null,emission:m.emissive?.clone().multiplyScalar(m.emissiveIntensity).toArray()??[0,0,0]})+'\\n');
 }} });
writeFileSync(process.argv[2],JSON.stringify({views,mangaVertex,mangaFragment,inkColor,ORIGINAL_TOON_RAMP,MANGA_TOON_RAMP,textures:Object.fromEntries(textureCache)})+'\\n');const input=openSync(partsFile,'r'),output=openSync(process.argv[2],'a'),buffer=Buffer.alloc(1024*1024);let bytes;while((bytes=readSync(input,buffer,0,buffer.length,null))>0)writeSync(output,buffer,0,bytes);closeSync(input);closeSync(output);unlinkSync(partsFile);
`},bundle:true,platform:'node',format:'esm',external:[canvas],outfile:bundle,plugins:[{name:'headless-scene',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:process.cwd()}));}}]});
 for(const [command,args]of [[process.execPath,[bundle,json,resolve(output,'solar.json')]],['python',[resolve('scripts/review/manga.py'),json,output]]]){const r=spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)throw Error(command+' failed');}
}finally{await rm(directory,{recursive:true,force:true});}
