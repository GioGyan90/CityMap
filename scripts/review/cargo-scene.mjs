// Scene integration check; canvas drawing supplies the real terrain/facade textures.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const canvas=process.env.CITYMAP_CANVAS_MODULE;if(!canvas)throw Error('Set CITYMAP_CANVAS_MODULE to @napi-rs/canvas/index.js');
const directory=await mkdtemp(join(tmpdir(),'citymap-fleet-scene-')),bundle=join(directory,'export.mjs'),json=join(directory,'scene.json');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`
import * as THREE from 'three';import {writeFileSync} from 'node:fs';import {createCanvas} from ${JSON.stringify(canvas)};
globalThis.document={createElement:()=>createCanvas(128,128)};globalThis.window={};
const {world}=await import('./src/scene');await import('./src/environment');await import('./src/city');
const {cars}=await import('./src/traffic'),{marineFleet}=await import('./src/marineTraffic'),{terrainRoadMask}=await import('./src/groundRoadMaterial');world.updateMatrixWorld(true);
const views=[],targets=[],placements=[];
const target=new THREE.Vector3(-100,5,-140);targets.push(target);
for(const [name,t,eye,scale]of [['front',[-100,5,-140],[-100,18,-74],28],['sea',[-100,5,-140],[-177,20,-140],28],['land',[-100,5,-140],[-35,30,-140],28],['back',[-100,5,-140],[-100,18,-207],28],['iso',[-100,5,-140],[-164,48,-85],30],['low',[-100,2,-140],[-164,3,-95],28],['bottom',[-100,-1,-140],[-156,-30,-90],29],['gate',[-71,3,-140],[-45,24,-123],16]])views.push({name,target:t,eye,scale});
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
const {specialBuildings}=await import('./src/specialBuildings'),{roadEdgeDistance}=await import('./src/roadNetwork'),{gridCell}=await import('./src/mapCoordinates');const audits={};
for(const id of ['cargo']){const root=specialBuildings.find(s=>s.id===id).group,bounds=new THREE.Box3().setFromObject(root,true);let clearance=Infinity;root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const b=new THREE.Box3().setFromObject(o,true);for(let x=b.min.x;x<=b.max.x+.001;x+=.4)for(let z=b.min.z;z<=b.max.z+.001;z+=.4)clearance=Math.min(clearance,roadEdgeDistance(x,z));});audits[id]={grid:gridCell(root.position.x,root.position.z).id,min:bounds.min.toArray(),max:bounds.max.toArray(),minimumRoadEdgeClearance:clearance};}
const cargoEntry=specialBuildings.find(s=>s.id==='cargo'),cargo=cargoEntry.group;
const anchors=[['码头中心',0,.5,0],['北岸桥',-20.5,.58,-8.3],['南岸桥',-20.5,.58,8.3],['调度楼',21,.5,-10],['货运门区',26.4,.5,0],['支线货船',-34,-1.06,0]].map(([name,x,y,z])=>{const p=cargo.localToWorld(new THREE.Vector3(x,y,z));return {name,position:p.toArray(),grid:gridCell(p.x,p.z).id};});
const {speedboatPose,speedboatRoute}=await import('./src/marineTraffic'),{createFleetVehicle}=await import('./src/fleetAssets');const boat=createFleetVehicle('speedboat'),shipBounds=new THREE.Box3().setFromObject(cargo.getObjectByName('cargo-feeder'));let patrolClearance=Infinity;
for(let i=0;i<400;i++){const p=speedboatPose(i/400*speedboatRoute.getLength());boat.position.copy(p.position);boat.rotation.y=p.heading;boat.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(boat),dx=Math.max(0,shipBounds.min.x-b.max.x,b.min.x-shipBounds.max.x),dz=Math.max(0,shipBounds.min.z-b.max.z,b.min.z-shipBounds.max.z);patrolClearance=Math.min(patrolClearance,Math.hypot(dx,dz));}
writeFileSync(process.argv[2],JSON.stringify({meshes,views}));writeFileSync(process.argv[3],JSON.stringify({audits,anchors,patrolClearance,cargo:world.userData.zoneLayout.cargo},null,2));
`},bundle:true,platform:'node',format:'esm',external:[canvas],outfile:bundle,plugins:[{name:'headless-scene',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:process.cwd()}));}}]});
 for(const [command,args]of [[process.execPath,[bundle,json,resolve('docs/cargo-review/placements.json')]],['python',[resolve('scripts/review/tunnel-contact.py'),json,resolve('docs/cargo-review/scene.jpg')]]]){const r=spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)throw Error(command+' failed');}
}finally{await rm(directory,{recursive:true,force:true});}
