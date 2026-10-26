// CPU build benchmark with real Canvas textures; excludes browser network/GPU work.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const canvas=process.env.CITYMAP_CANVAS_MODULE;
if(!canvas)throw Error('Set CITYMAP_CANVAS_MODULE to @napi-rs/canvas/index.js');
const root=resolve(process.argv[2]??'.'),dir=await mkdtemp(join(tmpdir(),'citymap-loading-'));
try{
 await build({stdin:{resolveDir:root,contents:`
import * as THREE from 'three';import {createHash} from 'node:crypto';import {createCanvas} from ${JSON.stringify(canvas)};
globalThis.document={createElement:()=>createCanvas(128,128)};globalThis.window={};
const start=performance.now();const {world}=await import('./src/scene');world.userData.deferClouds=true;
await import('./src/environment');const ground=performance.now();await import('./src/city');const end=performance.now();
const {terrainRoadMask}=await import('./src/groundRoadMaterial');
const hash=createHash('sha256');let meshes=0,vertices=0;world.updateMatrixWorld(true);
world.traverse(o=>{if(!o.isMesh)return;meshes++;vertices+=o.geometry.attributes.position.count;hash.update(o.name);hash.update(JSON.stringify(o.matrixWorld.elements));for(const key of Object.keys(o.geometry.attributes).sort()){const a=o.geometry.attributes[key].array;hash.update(key);hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}const a=o.geometry.index?.array;if(a)hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));for(const m of Array.isArray(o.material)?o.material:[o.material])hash.update(JSON.stringify([m.type,m.color?.getHex(),m.emissive?.getHex(),m.opacity,m.side,m.vertexColors]));});
const image=terrainRoadMask.image,mask=createHash('sha256').update(image.getContext('2d').getImageData(0,0,image.width,image.height).data).digest('hex');
console.log(JSON.stringify({environmentMs:ground-start,cityMs:end-ground,totalMs:end-start,meshes,vertices,geometryAndMaterialHash:hash.digest('hex'),roadMaskHash:mask,courts:world.userData.residential?.homes}));
`},bundle:true,platform:'node',format:'esm',external:[canvas],outfile:join(dir,'bench.mjs'),plugins:[{name:'mock-scene',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:root}));}}]});
 for(let i=0;i<2;i++){const result=spawnSync(process.execPath,[join(dir,'bench.mjs')],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);process.stdout.write(result.stdout);}
}finally{await rm(dir,{recursive:true,force:true});}
