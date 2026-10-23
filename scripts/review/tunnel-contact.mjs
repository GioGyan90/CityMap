// Actual isolated tunnel/vehicle geometry export; no replacement modeling or browser claim.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),directory=await mkdtemp(join(tmpdir(),'citymap-contact-')),bundle=join(directory,'export.mjs'),json=join(directory,'geometry.json');
try{
 await build({stdin:{resolveDir:root,contents:`
import * as THREE from 'three';import {writeFileSync} from 'node:fs';
import {createRoadTunnel} from './src/roadTunnels';import {createVehicle} from './src/vehicles';
import {tunnelPortals} from './src/tunnelPlan';import {tunnelTrafficSources,tunnelDrivingHeight} from './src/tunnelTraffic';
import {makeTrafficRoute,poseAt} from './src/trafficSimulation';import {surfaceHeight} from './src/terrainSurface';
const root=createRoadTunnel(),route=makeTrafficRoute(tunnelTrafficSources()[0].curve,0);
for(const [i,f]of tunnelPortals.entries()){
 const target=f.p.clone().addScaledVector(f.into,-2.8).addScaledVector(f.right,i?1.65:-1.65);let nearest,best=Infinity;
 for(let d=0;d<route.length;d+=.1){const pose=poseAt(route,d),distance=Math.hypot(pose.position.x-target.x,pose.position.z-target.z);if(distance<best){best=distance;nearest=pose;}}
 const {position,heading}=nearest,vehicle=createVehicle('bus',i?0xdc9654:0x4a94ac);vehicle.name='contact-bus-'+i;
 const dx=Math.sin(heading)*.5,dz=Math.cos(heading)*.5,a=tunnelDrivingHeight(position.x-dx,position.z-dz)??surfaceHeight(position.x-dx,position.z-dz),b=tunnelDrivingHeight(position.x+dx,position.z+dz)??surfaceHeight(position.x+dx,position.z+dz);
 vehicle.position.copy(position);vehicle.position.y=tunnelDrivingHeight(position.x,position.z)+.015;vehicle.rotation.set(-Math.atan2(b-a,1),heading,0,'YXZ');root.add(vehicle);
}
root.updateMatrixWorld(true);const meshes=[];
root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const g=o.geometry,groups=g.groups.length?g.groups:[{start:0,count:g.index?.count??g.attributes.position.count,materialIndex:0}];
 for(const group of groups){const m=Array.isArray(o.material)?o.material[group.materialIndex??0]:o.material;if(!m)continue;const v=[],n=[],c=[],p=new THREE.Vector3(),normal=new THREE.Vector3(),nm=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
 for(let j=group.start;j<group.start+group.count;j++){const i=g.index?g.index.getX(j):j;p.fromBufferAttribute(g.attributes.position,i).applyMatrix4(o.matrixWorld);normal.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(nm).normalize();v.push(...p.toArray());n.push(...normal.toArray());c.push(...m.color.toArray());}
 meshes.push({name:o.name,v,n,c,side:m.side,emission:m.emissive?.clone().multiplyScalar(m.emissiveIntensity).toArray()??[0,0,0]});
 }});
const views=[];
for(const [i,f]of tunnelPortals.entries()){
 const target=f.p.clone().addScaledVector(f.into,-1).add(new THREE.Vector3(0,2,0));
 for(const [name,across,along,height]of [['front',0,-24,7],['side',24,-2,7],['back',0,24,9],['iso',18,-22,16],['low',16,-24,1],['bottom',12,-18,-20]]){
  views.push({name:(i?'boulevard-':'seafront-')+name,eye:f.p.clone().addScaledVector(f.right,across).addScaledVector(f.into,along).add(new THREE.Vector3(0,height,0)).toArray(),target:target.toArray(),scale:11});
 }
}
writeFileSync(process.argv[2],JSON.stringify({meshes,views}));
`},bundle:true,platform:'node',format:'esm',outfile:bundle});
 for(const [command,args]of [[process.execPath,[bundle,json]],['python',[resolve('scripts/review/tunnel-contact.py'),json,resolve(process.argv[2]??'docs/tunnel-review/contact-fix.jpg')]]]){
  const r=spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)throw Error(`${command} failed`);
 }
}finally{await rm(directory,{recursive:true,force:true});}
