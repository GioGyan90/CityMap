// Render the exact baked preview mesh with EGL. Does not test browser input or GPU shaders.
import {build} from 'esbuild';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'citymap-grey-')),output=resolve('docs/progressive-review');
await mkdir(output,{recursive:true});
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`
import * as THREE from 'three';import {writeFileSync} from 'node:fs';import {createGreyPreview} from './src/greyPreview';
const {root}=createGreyPreview();root.updateMatrixWorld(true);
const solar={direction:[-.5,.8,.3],daylight:1,night:0,direct:1,warm:0};
const views=[['front',[-225,225,320]],['east',[530,190,50]],['back',[80,190,-500]],['top',[80,650,10]]].map(([name,eye])=>({name,eye,target:[80,13,8],solar}));
const lines=[JSON.stringify({views,textures:{}})];root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,v=[],n=[],c=[],normal=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);for(let j=0;j<(g.index?.count??g.attributes.position.count);j++){const i=g.index?g.index.getX(j):j;v.push(...new THREE.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(o.matrixWorld).toArray());n.push(...new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).applyMatrix3(normal).toArray());c.push(...o.material.color.toArray());}lines.push(JSON.stringify({name:o.name,v,n,c,opacity:1,side:o.material.side}));});writeFileSync(process.argv[2],lines.join('\\n'));
`},bundle:true,platform:'node',format:'esm',outfile:join(dir,'export.mjs')});
 for(const [command,args] of [[process.execPath,[join(dir,'export.mjs'),join(dir,'scene.json')]],['python',['scripts/review/grey-preview.py',join(dir,'scene.json'),output]]]){const r=spawnSync(command,args,{stdio:'inherit'});if(r.status)throw Error('Grey preview review failed');}
}finally{await rm(dir,{recursive:true,force:true});}
