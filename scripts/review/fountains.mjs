import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'citymap-fountains-'));try{
 await build({stdin:{resolveDir:process.cwd(),contents:`
import * as THREE from 'three';import {writeFileSync} from 'node:fs';
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};globalThis.window={};
const {world}=await import('./src/scene');await import('./src/environment');await import('./src/city');const {updateFountains}=await import('./src/fountains');world.updateMatrixWorld(true);
const meshes=[],views=[];
for(let frame=0;frame<8;frame++){if(frame)updateFountains(.22);world.updateMatrixWorld(true);
 for(const id of ['civic','hotel']){const source=world.getObjectByName('animated-fountain-'+id),inverse=source.matrixWorld.clone().invert(),target=source.localToWorld(new THREE.Vector3(0,1.7,0)),asset=id+'-'+frame,scale=id==='civic'?5:4.3;views.push({asset,name:asset,eye:target.clone().add(new THREE.Vector3(7,6,9)).toArray(),target:target.toArray(),scale});
 world.traverse(o=>{if(!(o instanceof THREE.Mesh)||o.name.startsWith('pick-'))return;const g=o.geometry;g.computeBoundingBox();const localBox=g.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(localBox.max.x< -2.9||localBox.min.x>2.9||localBox.max.z< -2.9||localBox.min.z>2.9||localBox.min.y>5||localBox.max.y<-.2)return;
 for(let instance=0;instance<(o instanceof THREE.InstancedMesh?o.count:1);instance++){const matrix=o.matrixWorld.clone();if(o instanceof THREE.InstancedMesh){const m=new THREE.Matrix4();o.getMatrixAt(instance,m);matrix.multiply(m);}const nm=new THREE.Matrix3().getNormalMatrix(matrix),groups=Array.isArray(o.material)?g.groups:[{start:0,count:g.index?.count??g.attributes.position.count,materialIndex:0}];
 for(const group of groups){const mat=Array.isArray(o.material)?o.material[group.materialIndex??0]:o.material;if(!mat||mat.visible===false)continue;const v=[],n=[],c=[];
 for(let j=group.start;j<group.start+group.count;j+=3){const ids=[0,1,2].map(k=>g.index?g.index.getX(j+k):j+k),p=ids.map(i=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix)),b=new THREE.Box3().setFromPoints(p.map(q=>q.clone().applyMatrix4(inverse)));if(b.max.x< -2.9||b.min.x>2.9||b.max.z< -2.9||b.min.z>2.9||b.min.y>5||b.max.y<-.2)continue;for(let k=0;k<3;k++){const i=ids[k],normal=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).applyNormalMatrix(nm),color=(mat.color??new THREE.Color(0x3987aa)).clone();if(mat.vertexColors&&g.attributes.color)color.multiply(new THREE.Color().fromBufferAttribute(g.attributes.color,i));v.push(...p[k].toArray());n.push(...normal.toArray());c.push(...color.toArray());}}
 if(v.length)meshes.push({asset,v,n,c,opacity:mat.opacity,side:mat.side,emission:mat.emissive?.clone().multiplyScalar(mat.emissiveIntensity).toArray()??[0,0,0]});}
 }});
 }}writeFileSync(process.argv[2],JSON.stringify({meshes,views}));
`},bundle:true,platform:'node',format:'esm',outfile:join(dir,'export.mjs'),plugins:[{name:'mock',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:process.cwd()}));}}]});
 for(const [command,args]of [[process.execPath,[join(dir,'export.mjs'),join(dir,'frames.json')]],['python',[resolve('scripts/review/tunnel-contact.py'),join(dir,'frames.json'),resolve('docs/fountain-review/phases.jpg')]]]){const r=spawnSync(command,args,{stdio:'inherit',env:{...process.env,CITYMAP_REVIEW_FRAMES:resolve('docs/fountain-review/frames')}});if(r.status!==0)throw Error(command+' failed');}
}finally{await rm(dir,{recursive:true,force:true});}
