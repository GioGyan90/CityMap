import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'commercial-audit-'));
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`
import * as THREE from 'three';import {writeFileSync} from 'node:fs';
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};globalThis.window={};
const {world}=await import('./src/scene');await import('./src/environment');await import('./src/city');world.updateMatrixWorld(true);
const {specialBuildings}=await import('./src/specialBuildings'),{roadProfiles}=await import('./src/roadNetwork'),{sampleSolar}=await import('./src/solarCycle'),{surfaceHeight}=await import('./src/terrainSurface'),{COMMERCIAL_PLAN:p}=await import('./src/commercialPlan');
const district=specialBuildings.find(s=>s.id==='commercial'),inverse=district.group.matrixWorld.clone().invert(),hall=specialBuildings.find(s=>s.id==='hall3'),road=roadProfiles.find(r=>r.id==='hospital-ring');let samples=0,minClearance=100,maxOffset=0;
for(const point of road.curve.getSpacedPoints(1500)){const q=point.clone().applyMatrix4(inverse);if(Math.abs(q.x)>28)continue;samples++;maxOffset=Math.max(maxOffset,Math.abs(q.z));minClearance=Math.min(minClearance,p.y+8.3-surfaceHeight(point.x,point.z));}
const meshes=[];world.traverse(o=>{if(o instanceof THREE.Mesh&&!o.name.startsWith('pick-'))meshes.push(o);});
const sun=[];for(const hour of [9,12,15]){const solar=sampleSolar(Date.parse('2026-09-22T00:00:00Z')+(hour-9)*3600000),origin=district.group.localToWorld(new THREE.Vector3(15,48.1,18)),ray=new THREE.Raycaster(origin,new THREE.Vector3(...solar.sunDirection),.05,400),hits=ray.intersectObjects(meshes,false);sun.push({localHour:hour,sunDirection:solar.sunDirection,unobstructed:hits.length===0,firstHit:hits[0]?{name:hits[0].object.name,distance:hits[0].distance}:null});}
writeFileSync(process.argv[2],JSON.stringify({road:'hospital-ring',samples,minClearance,maxOffset,hallLocal:hall.group.position.clone().applyMatrix4(inverse).toArray(),sun,geometryTree:world.userData.zoneLayout},null,2));
`},bundle:true,platform:'node',format:'esm',outfile:join(dir,'audit.mjs'),plugins:[{name:'mock',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:process.cwd()}));}}]});
 const r=spawnSync(process.execPath,[join(dir,'audit.mjs'),resolve('docs/commercial-review/audit.json')],{stdio:'inherit'});if(r.status!==0)throw Error('audit failed');
}finally{await rm(dir,{recursive:true,force:true});}
