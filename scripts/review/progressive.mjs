// Real geometry/Canvas CPU slices and final fingerprints. Not a WebGL/input benchmark.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const canvas=process.env.CITYMAP_CANVAS_MODULE;if(!canvas)throw Error('Set CITYMAP_CANVAS_MODULE');
const dir=await mkdtemp(join(tmpdir(),'citymap-progressive-'));
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`
import {createCanvas} from ${JSON.stringify(canvas)};
import {createHash} from 'node:crypto';
globalThis.document={createElement:()=>createCanvas(128,128)};globalThis.window={};
const {configureLoading}=await import('./src/loadingScheduler');
const samples=[];let last=performance.now(),beats=0;const timer=setInterval(()=>beats++,1);
configureLoading(async label=>{samples.push({label,ms:performance.now()-last});await new Promise(r=>setImmediate(r));last=performance.now();});
const {world}=await import('./src/scene');world.userData.deferClouds=true;world.userData.progressivePriority=(x,z)=>-x+z;
const environmentStart=performance.now();await import('./src/environment');const environmentMs=performance.now()-environmentStart;last=performance.now();
await import('./src/city');clearInterval(timer);configureLoading();
world.updateMatrixWorld(true);const hash=createHash('sha256');let meshes=0,vertices=0;
world.traverse(o=>{if(!o.isMesh)return;meshes++;vertices+=o.geometry.attributes.position.count;hash.update(o.name);hash.update(JSON.stringify(o.matrixWorld.elements));for(const key of Object.keys(o.geometry.attributes).sort()){const a=o.geometry.attributes[key].array;hash.update(key);hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}const a=o.geometry.index?.array;if(a)hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));for(const m of Array.isArray(o.material)?o.material:[o.material])hash.update(JSON.stringify([m.type,m.color?.getHex(),m.emissive?.getHex(),m.opacity,m.side,m.vertexColors]));});
const {terrainRoadMask}=await import('./src/groundRoadMaterial');const image=terrainRoadMask.image;
const roadMaskHash=createHash('sha256').update(image.getContext('2d').getImageData(0,0,image.width,image.height).data).digest('hex');
console.log(JSON.stringify({environmentMs,beats,meshes,vertices,geometryAndMaterialHash:hash.digest('hex'),roadMaskHash,checkpoints:samples.length,longest:samples.sort((a,b)=>b.ms-a.ms).slice(0,20)},null,2));
`},bundle:true,platform:'node',format:'esm',external:[canvas],outfile:join(dir,'review.mjs'),plugins:[{name:'scene',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:process.cwd()}));}}]});
 const r=spawnSync(process.execPath,[join(dir,'review.mjs')],{encoding:'utf8'});if(r.status)throw Error(r.stderr);process.stdout.write(r.stdout);
}finally{await rm(dir,{recursive:true,force:true});}
