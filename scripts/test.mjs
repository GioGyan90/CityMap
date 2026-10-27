import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const directory=await mkdtemp(join(tmpdir(),'citymap-tests-'));
try{
 const output=join(directory,'tests.mjs');
 await build({entryPoints:['tests/trafficSimulation.test.ts'],bundle:true,platform:'node',format:'esm',outfile:output});
 const architecture=join(directory,'architecture.mjs');
 await build({entryPoints:['tests/architecture.test.ts'],bundle:true,platform:'node',format:'esm',outfile:architecture,
  plugins:[{name:'headless-scene',setup(build){
   build.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'test'}));
   build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:process.cwd()}));
  }}]});
 const immersive=join(directory,'immersive.mjs');
 await build({entryPoints:['tests/immersive.test.ts'],bundle:true,platform:'node',format:'esm',outfile:immersive});
 const solar=join(directory,'solar.mjs');
 await build({entryPoints:['tests/solarCycle.test.ts'],bundle:true,platform:'node',format:'esm',outfile:solar});
 const result=spawnSync(process.execPath,['--test',output,architecture,solar,immersive],{stdio:'inherit'});process.exitCode=result.status??1;
}finally{await rm(directory,{recursive:true,force:true});}
