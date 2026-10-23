import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {world} from './scene';
import {occupied} from './parcels';
import {parkingAccessBlocked} from './parking';
import {roadEdgeDistance,roadProfiles} from './roadNetwork';
import {surfaceHeight} from './terrainSurface';
import {paintGroundPath} from './groundRoadMaterial';
import {transit} from './transport';
import {trainProgress} from './transitDesign';
import {gridCell} from './mapCoordinates';
import {createStreetLamp,createSignalPost,setSignalColor,createCrossingGate,createGuideFence} from './trafficAssets';
import {planTrafficFixtures,signalColor,registerSignalStops,type FixtureSite} from './trafficPlan';
export const infrastructureSites:FixtureSite[]=[];
const signals:{root:THREE.Group;site:FixtureSite}[]=[],lenses:THREE.MeshToonMaterial[]=[],gates:THREE.Group[]=[];
export let trafficSeconds=0;
let crossing:THREE.Object3D|undefined,closed=0,hold=0;
export function crossingWarning(distance:number){return distance<67;}
export function buildTrafficInfrastructure(){
 if(world.getObjectByName('traffic-infrastructure'))return;
 const root=new THREE.Group();root.name='traffic-infrastructure';world.add(root);
 const lamps=new THREE.Group(),lights=new THREE.Group(),rail=new THREE.Group();lamps.name='roadside-lighting';lights.name='signal-junctions';rail.name='tram-crossing-safety';root.add(lamps,lights,rail);
 const blocked=(x:number,z:number)=>parkingAccessBlocked(x,z)||occupied.some(p=>Math.abs(x-p.x)<p.w/2+1&&Math.abs(z-p.z)<p.d/2+1);
 infrastructureSites.push(...planTrafficFixtures(blocked));registerSignalStops(infrastructureSites);
 for(const site of infrastructureSites){const g=site.kind==='lamp'?createStreetLamp():createSignalPost();g.name=site.id;g.position.set(site.x,site.y,site.z);g.rotation.y=site.heading;g.userData={...site};conformFoundation(g);(site.kind==='lamp'?lamps:lights).add(g);
  if(site.kind==='lamp')lenses.push((g.getObjectByName('lamp-lens') as THREE.Mesh).material as THREE.MeshToonMaterial);
  else {signals.push({root:g,site});
   // Mark only the incoming lane, using the shared terrain texture: no floating quads.
   const forward=new THREE.Vector3(-Math.sin(site.heading),0,-Math.cos(site.heading)),normal=new THREE.Vector3(-forward.z,0,forward.x),r=roadProfiles[site.road],center=g.position.clone().addScaledVector(normal,-(site.curbSide??1)*(r.width/2+1.25)).addScaledVector(forward,-2);
   const a=center.clone().addScaledVector(normal,.35),b=center.clone().addScaledVector(normal,r.width/2-.25);paintGroundPath([[a.x,a.z],[b.x,b.z]],.32,'line');
   const walk=center.clone().addScaledVector(forward,3.7);for(let offset=-r.width/2+.45;offset<r.width/2-.25;offset+=.85){const stripe=walk.clone().addScaledVector(normal,offset),a=stripe.clone().addScaledVector(forward,-.8),b=stripe.clone().addScaledVector(forward,.8);paintGroundPath([[a.x,a.z],[b.x,b.z]],.38,'line');}
  }
 }
 crossing=world.getObjectByName('fish-market-tram-crossing');
 const records:unknown[]=[];
 if(crossing){crossing.updateMatrixWorld(true);for(const side of [-1,1]){
  const g=createCrossingGate(),p=crossing.localToWorld(new THREE.Vector3(side*3.45,0,-1.7));g.position.set(p.x,surfaceHeight(p.x,p.z)-.03,p.z);g.rotation.y=crossing.rotation.y;conformFoundation(g);rail.add(g);gates.push(g);records.push({id:'fish-market-gate-'+(side<0?'seaward':'inland'),kind:'rail-gate',grid:gridCell(p.x,p.z).id,x:p.x,y:g.position.y,z:p.z});
  // Outside the 2.6 m walking path; short approach fences leave both entrances open.
  for(const direction of [-1,1]){const f=createGuideFence(),q=crossing.localToWorld(new THREE.Vector3(side*5.6,0,direction*1.9));f.position.set(q.x,surfaceHeight(q.x,q.z)-.03,q.z);f.rotation.y=crossing.rotation.y+Math.PI/2;
   if([-1,0,1].some(z=>{const test=new THREE.Vector3(0,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),f.rotation.y).add(f.position);return roadEdgeDistance(test.x,test.z)<.85;}))continue;
   // Each foot follows the actual ground, with the rails joining those feet.
   for(const m of f.children){const local=m.position.clone().applyAxisAngle(new THREE.Vector3(0,1,0),f.rotation.y).add(f.position);m.position.y+=surfaceHeight(local.x,local.z)-surfaceHeight(q.x,q.z);}rail.add(f);records.push({id:'guide-fence-'+side+'-'+direction,kind:'guide-fence',grid:gridCell(q.x,q.z).id,x:q.x,y:f.position.y,z:q.z});
  }
 }}
 batchStaticParts(root);
 world.userData.trafficInfrastructure={version:'curb-grid-v1',sites:infrastructureSites,crossings:records,controlledJunctions:5,lampSpacing:25};updateTrafficInfrastructure(0);
}
export function setInfrastructureNight(night:number){for(const m of lenses){m.emissive.set(0xffd890);m.emissiveIntensity=night*1.5;}}
export function updateTrafficInfrastructure(dt:number){
 trafficSeconds+=Math.max(0,dt);
 for(const {root,site} of signals)setSignalColor(root,signalColor(trafficSeconds,site.junction!,site.road));
 if(!crossing||!transit[0])return;
 const train=transit[0],p=train.curve.getPointAt(trainProgress(train.curve,train.offset)),distance=p.distanceTo(crossing.position),warn=crossingWarning(distance);
 if(warn)hold=4;else hold=Math.max(0,hold-dt);
 const target=warn||hold>0?1:0;closed=THREE.MathUtils.clamp(closed+Math.sign(target-closed)*dt/1.6,0,1);if(dt===0&&warn)closed=1;
 for(const g of gates){g.getObjectByName('barrier-pivot')!.rotation.x=-(1-closed)*Math.PI*.47;
  for(const side of [-1,1]){const m=(g.getObjectByName('warning-'+side) as THREE.Mesh).material as THREE.MeshBasicMaterial;m.color.setHex((warn||hold>0)&&((Math.floor(trafficSeconds*3)%2===0)===(side===1))?0xff4545:0x6a292c);}
 }
 world.userData.trafficInfrastructure.barrier={distance,warning:warn||hold>0,closed};
}

/** Keep moving arms and individually switched lenses separate; batch all fixed supports. */
function batchStaticParts(root:THREE.Group){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map<string,{material:THREE.Material;geometry:THREE.BufferGeometry[]}>(),remove:THREE.Mesh[]=[];
 root.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material)||o.name==='lamp-lens'||o.name.startsWith('signal-red')||o.name.startsWith('signal-green')||o.name.startsWith('signal-amber')||o.name.startsWith('warning-'))return;
  let parent=o.parent;while(parent&&parent!==root){if(parent.name==='barrier-pivot')return;parent=parent.parent;}
  const material=o.material as THREE.MeshToonMaterial,key=material.color.getHexString()+':'+material.side;if(!buckets.has(key))buckets.set(key,{material,geometry:[]});
  buckets.get(key)!.geometry.push(o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));remove.push(o);
 });
 for(const mesh of remove)mesh.removeFromParent();const group=new THREE.Group();group.name='batched-static-supports';root.add(group);
 for(const {material,geometry} of buckets.values()){const merged=mergeGeometries(geometry,false);if(merged){const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}geometry.forEach(g=>g.dispose());}
 root.userData.staticDraws=buckets.size;
}

function conformFoundation(root:THREE.Group){
 const base=(root.getObjectByName('grounded-plinth')??root.getObjectByName('gate-foundation')) as THREE.Mesh;
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(base),levels:number[]=[];
 for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z])levels.push(surfaceHeight(x,z)-root.position.y);
 const bottom=Math.min(0,...levels)-.04,top=Math.max(.18,...levels.map(y=>y+.08)),p=base.geometry.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)<0?bottom:top);base.position.y=0;p.needsUpdate=true;base.geometry.computeVertexNormals();
}
