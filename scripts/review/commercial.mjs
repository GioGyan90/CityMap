// Actual editable and optimized asset geometry, inspected independently of browser WebGL.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const directory=await mkdtemp(join(tmpdir(),'citymap-fleet-')),bundle=join(directory,'export.mjs'),json=join(directory,'fleet.json');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`
import * as THREE from 'three';import {writeFileSync} from 'node:fs';import {createCommercialDistrict} from './src/commercialDistrict';
const meshes=[],views=[],stats={};
for(const kind of ['commercial']){
 const root=createCommercialDistrict(process.env.FLEET_OPTIMIZED==='1');root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());let triangles=0,draws=0;
 root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const g=o.geometry,groups=g.groups.length?g.groups:[{start:0,count:g.index?.count??g.attributes.position.count,materialIndex:0}];
 draws+=Array.isArray(o.material)?groups.length:1;for(const group of groups){const m=Array.isArray(o.material)?o.material[group.materialIndex??0]:o.material;if(!m)continue;const v=[],n=[],c=[],p=new THREE.Vector3(),normal=new THREE.Vector3(),nm=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
 for(let j=group.start;j<group.start+group.count;j++){const i=g.index?g.index.getX(j):j;p.fromBufferAttribute(g.attributes.position,i).applyMatrix4(o.matrixWorld);normal.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(nm).normalize();v.push(...p.toArray());n.push(...normal.toArray());c.push(...m.color.toArray());}
 triangles+=v.length/9;meshes.push({asset:kind,name:o.name,v,n,c,opacity:m.opacity,side:m.side,emission:m.emissive?.clone().multiplyScalar(m.emissiveIntensity).toArray()??[0,0,0]});
 }});
 stats[kind]={triangles,draws,envelope:root.userData.nominalSize,size:size.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
 for(const [name,direction]of [['front',[0,.12,1]],['side',[1,.12,0]],['back',[0,.12,-1]],['iso',[.8,.55,1]],['low',[.8,.025,1]],['bottom',[.8,-.7,1]]])views.push({asset:kind,name:kind+'-'+name,eye:center.clone().addScaledVector(new THREE.Vector3(...direction).normalize(),120).toArray(),target:center.toArray(),scale:Math.max(size.x,size.y,size.z)*.62});
}
writeFileSync(process.argv[2],JSON.stringify({meshes,views}));writeFileSync(process.argv[3],JSON.stringify(stats,null,2));
`},bundle:true,platform:'node',format:'esm',outfile:bundle});
 const output=resolve(process.argv[2]??'docs/commercial-review/district.jpg'),stats=resolve(process.argv[3]??'docs/commercial-review/geometry.json');
 for(const [command,args]of [[process.execPath,[bundle,json,stats]],['python',[resolve('scripts/review/tunnel-contact.py'),json,output]]]){const r=spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)throw Error(command+' failed');}
}finally{await rm(directory,{recursive:true,force:true});}
