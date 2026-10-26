import {spawnSync} from 'node:child_process';import {resolve} from 'node:path';import {writeFileSync} from 'node:fs';
const script=resolve('scripts/review/startup.mjs'),baseline=resolve(process.argv[2]),report={baseline:[],optimized:[]};
for(const label of ['baseline','optimized'])for(let i=0;i<2;i++){const env={...process.env,PREBAKED:label==='optimized'?'1':'0',DEFER_CLOUDS:label==='optimized'?'1':'0',PROFILE:'0'},r=spawnSync(process.execPath,[script],{cwd:label==='baseline'?baseline:process.cwd(),env,encoding:'utf8'});if(r.status)throw Error(r.stderr);report[label].push(JSON.parse(r.stdout.trim().split('\n').at(-1)));}
writeFileSync('docs/road-review/performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
