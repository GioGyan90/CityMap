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
const {surfaceHeight}=await import('./src/terrainSurface');
const viewspec=[['campus-doors',156,34,25],['campus-left-door',146,37,12],['campus-centre-door',156,28,12],['campus-right-door',166,37,12],['hospital-exit',132,-9,30],['hospital-turn',146,-10,18],['hospital-road-join',113,-4,18],['hotel-turn',46,140,23],['civic-turn',25,-15,20],['hospital-low',142,-10,27],['hospital-bottom',142,-10,27]];
for(const [name,x,z,scale]of viewspec){const target=new THREE.Vector3(x,surfaceHeight(x,z)+1,z);targets.push(target);const offset=name.includes('top')?[.01,140,0]:name.includes('side')?[110,35,0]:name.includes('back')?[0,35,-110]:name.includes('low')?[75,4,95]:name.includes('bottom')?[50,-60,85]:name.includes('front')?[0,40,110]:[55,90,65];views.push({name,eye:target.clone().add(new THREE.Vector3(...offset)).toArray(),target:target.toArray(),scale});}
const {hillApproaches,roadProfiles}=await import('./src/roadNetwork');placements.push({siteAccess:world.userData.siteAccess,greening:world.userData.greening,hill:hillApproaches?.map(r=>({id:r.id,width:r.width,maxGrade:r.maxGrade,points:r.points.map(p=>p.toArray())})),roads:roadProfiles.map(r=>({id:r.id,width:r.width}))});
const hospital=world.getObjectByName('hospital-ambulance');placements.push({hospitalAmbulanceBounds:new THREE.Box3().setFromObject(hospital,true).getSize(new THREE.Vector3()).toArray(),hospitalDrive:world.userData.hospitalDrive});
const {motorwayCurve}=await import('./src/transport');let minHighwayClearance=Infinity;for(let i=0;i<=600;i++){const p=motorwayCurve.getPointAt(i/600),t=motorwayCurve.getTangentAt(i/600),normal=new THREE.Vector3(-t.z,0,t.x).normalize();for(const side of [-5,-2.5,0,2.5,5]){const q=p.clone().addScaledVector(normal,side);minHighwayClearance=Math.min(minHighwayClearance,p.y+.1-surfaceHeight(q.x,q.z));}}placements.push({minHighwayClearance});
if(process.env.REVIEW_STAGE!=='before'){
 const {strict:assert}=await import('node:assert'),mask=terrainRoadMask.image.getContext('2d'),pixel=(x,z)=>mask.getImageData(Math.round((x+130)/470*3072),Math.round((z+220)/470*3072),1,1).data;let checked=0;
 for(const plan of world.userData.siteAccess){for(let j=1;j<plan.points.length;j++){const a=plan.points[j-1],b=plan.points[j],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.15);for(let k=0;k<=count;k++){const t=k/count,p=pixel(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);assert.ok(Math.max(p[0],p[1],p[2])>60,plan.id+' has an unpainted path gap');checked++;}}}
 assert.ok(minHighwayClearance>.3,'terrain pierces the elevated motorway');placements.push({paintedWalkSamples:checked});
}
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
writeFileSync(process.argv[2],JSON.stringify({meshes,views}));writeFileSync(process.argv[3],JSON.stringify({vehicles:placements,roadFleet:cars.map(c=>({id:c.id,kind:c.mesh.userData.vehicleKind??(c.mesh.name==='city-bus'?'bus':'sedan'),route:c.route.id,position:c.mesh.position.toArray(),width:c.width,length:c.length})),waterRoute:world.userData.speedboats},null,2));
`},bundle:true,platform:'node',format:'esm',external:[canvas],outfile:bundle,plugins:[{name:'headless-scene',setup(b){b.onResolve({filter:/\/scene$/},()=>({path:'scene',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"import * as THREE from 'three';export const world=new THREE.Group();",resolveDir:process.cwd()}));}}]});
 for(const [command,args]of [[process.execPath,[bundle,json,resolve('docs/access-turn-review/placements.json')]],['python',[resolve('scripts/review/tunnel-contact.py'),json,resolve('docs/access-turn-review/'+(process.env.REVIEW_STAGE??'after')+'.jpg')]]]){const r=spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)throw Error(command+' failed');}
}finally{await rm(directory,{recursive:true,force:true});}
