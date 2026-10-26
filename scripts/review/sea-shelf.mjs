// Scene integration check; canvas drawing supplies the real terrain/facade textures.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const canvas=process.env.CITYMAP_CANVAS_MODULE;if(!canvas)throw Error('Set CITYMAP_CANVAS_MODULE to @napi-rs/canvas/index.js');
const sourceRoot=resolve(process.env.REVIEW_ROOT??'.');
const directory=await mkdtemp(join(tmpdir(),'citymap-fleet-scene-')),bundle=join(directory,'export.mjs'),json=join(directory,'scene.json');
try{
 await build({stdin:{resolveDir:sourceRoot,contents:`
import * as THREE from 'three';import {writeFileSync} from 'node:fs';import {createCanvas} from ${JSON.stringify(canvas)};
globalThis.document={createElement:()=>createCanvas(128,128)};globalThis.window={};
const {world}=await import('./src/scene');world.userData.deferClouds=true;await import('./src/environment');await import('./src/city');
const {cars}=await import('./src/traffic'),{marineFleet}=await import('./src/marineTraffic'),{terrainRoadMask}=await import('./src/groundRoadMaterial');world.updateMatrixWorld(true);
const views=[],targets=[],placements=[];
const {surfaceHeight}=await import('./src/terrainSurface');
const viewspec=[['ridge-front',70,-190,76],['ridge-back',70,-190,76],['ridge-side',70,-190,76],['ridge-iso',70,-190,76],['ridge-low',70,-190,76],['ridge-bottom',70,-190,76],['shelf-west-top',-80,30,85],['shelf-west-iso',-80,30,85],['shelf-north-iso',70,-210,100]];
for(const [name,x,z,scale]of viewspec){const target=new THREE.Vector3(x,name.startsWith('ridge')?20:0,z);targets.push(target);const offset=name.includes('top')?[.01,180,0]:name.includes('side')?[180,30,0]:name.includes('back')?[0,30,-180]:name.includes('low')?[30,4,-180]:name.includes('bottom')?[25,-85,-60]:name.includes('front')?[0,50,180]:[-100,150,-90];views.push({name,eye:target.clone().add(new THREE.Vector3(...offset)).toArray(),target:target.toArray(),scale});}
const nearBox=b=>views.some(v=>b.max.x>v.target[0]-v.scale*1.45&&b.min.x<v.target[0]+v.scale*1.45&&b.max.z>v.target[2]-v.scale*1.45&&b.min.z<v.target[2]+v.scale*1.45),meshes=[],textureCache=new Map();
const dataURL=t=>{if(!t?.image?.toDataURL)return null;if(!textureCache.has(t.uuid))textureCache.set(t.uuid,t.image.toDataURL());return textureCache.get(t.uuid);};
world.traverse(o=>{if(!(o instanceof THREE.Mesh)||!o.visible||o.name.startsWith('pick-'))return;const g=o.geometry,instances=o instanceof THREE.InstancedMesh?o.count:1;g.computeBoundingBox();
 for(let instance=0;instance<instances;instance++){const matrix=o.matrixWorld.clone();if(o instanceof THREE.InstancedMesh){const local=new THREE.Matrix4();o.getMatrixAt(instance,local);matrix.multiply(local);}if(!nearBox(g.boundingBox.clone().applyMatrix4(matrix)))continue;
 const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix),groups=Array.isArray(o.material)?g.groups:[{start:0,count:g.index?.count??g.attributes.position.count,materialIndex:0}];
 for(const group of groups){const m=Array.isArray(o.material)?o.material[group.materialIndex??0]:o.material;if(!m||m.visible===false||m.opacity<.1)continue;const v=[],n=[],c=[],uv=[],color=m.color??m.uniforms?.deep?.value??new THREE.Color(0xffffff);
 for(let j=group.start;j<group.start+group.count;j+=3){const ids=[0,1,2].map(k=>g.index?g.index.getX(j+k):j+k),points=ids.map(i=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix)),box=new THREE.Box3().setFromPoints(points);if(!nearBox(box)&&!((o.name==='animated-ocean'||o.name==='submerged-continental-shelf')&&views.some(v=>box.max.x>v.target[0]-650&&box.min.x<v.target[0]+650&&box.max.z>v.target[2]-650&&box.min.z<v.target[2]+650)))continue;
 for(let k=0;k<3;k++){const i=ids[k],p=points[k],normal=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).applyMatrix3(normalMatrix).normalize(),col=color.clone();if(m.vertexColors&&g.attributes.color)col.multiply(new THREE.Color().fromBufferAttribute(g.attributes.color,i));v.push(...p.toArray());n.push(...normal.toArray());c.push(...col.toArray());uv.push(g.attributes.uv?.getX(i)??0,g.attributes.uv?.getY(i)??0);}}
 if(v.length)meshes.push({name:o.name,v,n,c,uv,opacity:m.opacity,side:m.side,texture:dataURL(m.map),groundTexture:o.name==='irregular-elevated-terrain'?dataURL(terrainRoadMask):null,emission:m.emissive?.clone().multiplyScalar(m.emissiveIntensity).toArray()??[0,0,0],water:o.name==='animated-ocean'?{vertex:m.vertexShader,fragment:m.fragmentShader,uniforms:Object.fromEntries(Object.entries(m.uniforms).map(([k,u])=>[k,u.value?.toArray?u.value.toArray():Array.isArray(u.value)?u.value.flatMap(v=>v.toArray()):u.value]))}:null});
 }} });
writeFileSync(process.argv[2],JSON.stringify({meshes,views}));writeFileSync(process.argv[3],JSON.stringify({terrain:world.userData.terrain,review:'Actual geometry and ocean shader, simplified fixed lighting'},null,2));
`},bundle:true,platform:'node',format:'esm',external:[canvas],outfile:bundle,plugins:[{name:'headless-scene',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:sourceRoot}));}}]});
 for(const [command,args]of [[process.execPath,[bundle,json,resolve('docs/sea-shelf-review/'+(process.env.REVIEW_STAGE??'after')+'.json')]],['python',[resolve('scripts/review/sea-shelf.py'),json,resolve('docs/sea-shelf-review/'+(process.env.REVIEW_STAGE??'after')+'.jpg')]]]){const r=spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)throw Error(command+' failed');}
}finally{await rm(directory,{recursive:true,force:true});}
