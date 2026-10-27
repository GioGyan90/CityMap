// Scene integration check; canvas drawing supplies the real terrain/facade textures.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const focus=process.env.CITYMAP_FACADE_FOCUS??'hospital';
const canvas=process.env.CITYMAP_CANVAS_MODULE;if(!canvas)throw Error('Set CITYMAP_CANVAS_MODULE to @napi-rs/canvas/index.js');
const directory=await mkdtemp(join(tmpdir(),'citymap-fleet-scene-')),bundle=join(directory,'export.mjs'),json=join(directory,'scene.json');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`
import * as THREE from 'three';import {writeFileSync} from 'node:fs';import {createCanvas} from ${JSON.stringify(canvas)};
globalThis.document={createElement:()=>createCanvas(128,128)};globalThis.window={};
const {world}=await import('./src/scene');const {makeBuilding}=await import('./src/buildings');makeBuilding({x:0,z:0,w:14,d:12,h:45,style:'glass',plan:'rect',elevation:0});const terrainRoadMask=null;world.updateMatrixWorld(true);
const views=[],targets=[],placements=[];
const configurations={hospital:[138,13,-59,24],hotel:[-17,14,140,27],civic:[60,13,16,28],fire:[-16,7,-20,18],science:[174,7,-32,18],punk:[100,7,164,20],commercial:[77,16,-102,30],district:[30,15,3,35],cargo:[-74,5,-149,18],market:[-9,8,15,23],elegance:[-13,7,57,18],order:[66.1,18,-120.4,13],police:[12,7,137,18],cafe:[93,7,125,19],restaurant:[141,7,135,17],port:[160,8,170,20],promenade:[-68,5,98,18],villa:[254.5,6,25,17],lighthouse:[254,10,50,18],passenger:[-100,6,150,30],fishmarket:[-82,5,57,18],park:[-13,9,-91.4,25]};
let [x,y,z,scale]=[0,21,0,28];if(['villa','lighthouse'].includes(${JSON.stringify(focus)})){const {terrainHeight}=await import('./src/layout');y+=terrainHeight(x,z);}const target=new THREE.Vector3(x,y,z);targets.push(target);
for(const [name,dx,dy,dz] of [['front',0,.25,2],['back',0,.25,-2],['side',2,.25,0],['iso',1.4,1.1,1.5],['low',1.4,.04,1.5]])views.push({name,target:[x,y,z],eye:[x+scale*dx,y+scale*dy,z+scale*dz],scale});
const nearBox=b=>targets.some(p=>b.max.x>p.x-64&&b.min.x<p.x+64&&b.max.z>p.z-64&&b.min.z<p.z+64),meshes=[],textureCache=new Map();
const dataURL=t=>{if(!t?.image?.toDataURL)return null;if(!textureCache.has(t.uuid))textureCache.set(t.uuid,t.image.toDataURL());return textureCache.get(t.uuid);};
world.traverse(o=>{if(!(o instanceof THREE.Mesh)||!o.visible||o.name.startsWith('pick-'))return;const g=o.geometry,instances=o instanceof THREE.InstancedMesh?o.count:1;g.computeBoundingBox();
 for(let instance=0;instance<instances;instance++){const matrix=o.matrixWorld.clone();if(o instanceof THREE.InstancedMesh){const local=new THREE.Matrix4();o.getMatrixAt(instance,local);matrix.multiply(local);}if(!nearBox(g.boundingBox.clone().applyMatrix4(matrix)))continue;
 const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix),groups=Array.isArray(o.material)?g.groups:[{start:0,count:g.index?.count??g.attributes.position.count,materialIndex:0}];
 for(const group of groups){const m=Array.isArray(o.material)?o.material[group.materialIndex??0]:o.material;if(!m||m.visible===false||m.opacity<.1)continue;const v=[],n=[],c=[],uv=[],color=m.color??m.uniforms?.deep?.value??new THREE.Color(0xffffff);
 for(let j=group.start;j<group.start+group.count;j+=3){const ids=[0,1,2].map(k=>g.index?g.index.getX(j+k):j+k),points=ids.map(i=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix)),box=new THREE.Box3().setFromPoints(points);if(!nearBox(box))continue;
 for(let k=0;k<3;k++){const i=ids[k],p=points[k],normal=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).applyMatrix3(normalMatrix).normalize(),col=color.clone();if(m.vertexColors&&g.attributes.color)col.multiply(new THREE.Color().fromBufferAttribute(g.attributes.color,i));v.push(...p.toArray());n.push(...normal.toArray());c.push(...col.toArray());uv.push(g.attributes.uv?.getX(i)??0,g.attributes.uv?.getY(i)??0);}}
 if(v.length)meshes.push({name:o.name,v,n,c,uv,opacity:m.opacity,side:m.side,texture:dataURL(m.map),groundTexture:o.name==='irregular-elevated-terrain'?dataURL(terrainRoadMask):null,emission:m.emissive?.clone().multiplyScalar(m.emissiveIntensity).toArray()??[0,0,0]});
 }} });
writeFileSync(process.argv[2],JSON.stringify({meshes,views}));
`},bundle:true,platform:'node',format:'esm',external:[canvas],outfile:bundle,plugins:[{name:'headless-scene',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:process.cwd()}));}}]});
 for(const [command,args]of [[process.execPath,[bundle,json,resolve('docs/palette-c-review/placements.json')]],['python',[resolve('scripts/review/tunnel-contact.py'),json,resolve('docs/glass-tower-review/sample.jpg')]]]){const r=spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)throw Error(command+' failed');}
}finally{await rm(directory,{recursive:true,force:true});}
