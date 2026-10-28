import {inPunkGarden} from './punkHallGarden';
import {roadEdgeDistance} from './roadNetwork';
import {plantingBoxClear} from './plantPlacement';
import {bakePalm,palmSamples} from './palm';
import {treeSamples,createTree,renderPlant,plantBatchMaterial,shrubSample,grassSample} from './plantAssets';
import {coastalPublicSpace,groveDensity} from './urbanDesign';
import {parkingAccessBlocked} from './parking';
import {surfaceHeight} from './terrainSurface';
import {isLand,roadDistance,reserved,railCorridor} from './layout';
import * as THREE from 'three';
import {seededRandom} from './proceduralGeometry';
import {Z0,COAST,BEACH_W,Z1,buildingFootprints} from './config';
import {world} from './scene';

export function palmGeometry(){return bakePalm(palmSamples()[0]);}
export function roundTreeGeometry(leafColor:number){return bakePalm(createTree(leafColor===0x9cc752?'slender':'shade',leafColor));}
export const treeMat=plantBatchMaterial;
export function blocked(x:number,z:number,radius=0){
 if(inPunkGarden(x,z,radius)||coastalPublicSpace(x,z,2+radius)||parkingAccessBlocked(x,z))return true;
 if(buildingFootprints.some(b=>Math.abs(x-b.x)<b.w/2+1.5+radius&&Math.abs(z-b.z)<b.d/2+1.5+radius))return true;
 if(roadEdgeDistance(x,z)<3+radius||reserved(x,z,2+radius*2,2+radius*2))return true;
 return [[0,0],[-radius,0],[radius,0],[0,-radius],[0,radius]].some(([dx,dz])=>railCorridor(x+dx,z+dz)||parkingAccessBlocked(x+dx,z+dz));
}
export const ZONE_CENTERS=[[-20,-24],[8,4],[36,-24],[-20,32],[8,32],[36,32],[-20,60],[-70,86],[-56,100]];
type Placement={x:number;z:number;scale:number;angle:number;kind:string;y?:number};
export function* plantTreesSteps(){
 const random=seededRandom(20261022),range=(a:number,b:number)=>a+random()*(b-a),root=new THREE.Group();root.name='city-vegetation';world.add(root);
 const placements:Placement[]=[],trees:Placement[]=[],low:Placement[]=[];
 for(let z=Z0+4;z<Z1-4;z+=7){const x=COAST(z)+range(2.5,10.5);if(!blocked(x,z,1)&&Math.abs(x-COAST(z)-8)>3.4)placements.push({x,z,scale:range(.75,1.05),angle:range(0,Math.PI*2),kind:'palm-'+Math.floor(random()*3)});}
 // Forest patches use several silhouettes; open town ground favours slender and flowering trees.
 for(let tries=0;trees.length<420&&tries<16000;tries++){if(tries%32===0)yield;
  const x=range(-50,274),z=range(Z0+6,Z1-6),scale=range(.72,1.22);
  if(!isLand(x,z)||x<COAST(z)+BEACH_W+1||blocked(x,z,1.4)||random()>groveDensity(x,z))continue;
  if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<2.4*(t.scale+scale)))continue;
  const heights=[[-.5,0],[.5,0],[0,-.5],[0,.5]].map(([dx,dz])=>surfaceHeight(x+dx,z+dz));if(Math.max(...heights)-Math.min(...heights)>1.15)continue;
  const style=x>150?(random()<.52?'pine':'shade'):random()<.32?'flowering':random()<.55?'slender':'shade';
  const tree={x,z,scale,angle:range(0,Math.PI*2),kind:style+'-'+Math.floor(random()*3)};trees.push(tree);placements.push(tree);
 }
 // Understorey follows loose tree groups, leaving road edges and building approaches clear.
 for(const [i,tree] of trees.entries())if(i%2===0)for(let j=0;j<2;j++){
  const a=range(0,Math.PI*2),distance=range(2.3,3.7),x=tree.x+Math.cos(a)*distance,z=tree.z+Math.sin(a)*distance;
  if(!isLand(x,z)||blocked(x,z,.55)||low.some(t=>Math.hypot(t.x-x,t.z-z)<1.25))continue;
  const p={x,z,scale:range(.65,1.1),angle:range(0,Math.PI*2),kind:j?'grass':'shrub'};low.push(p);placements.push(p);
 }
 // Reject cliff seams rather than burying the plant or leaving half its base suspended.
 for(let i=placements.length-1;i>=0;i--){const p=placements[i],d=p.kind==='grass'?.12:.4,heights=[[0,0],[d,0],[-d,0],[0,d],[0,-d]].map(([dx,dz])=>surfaceHeight(p.x+dx,p.z+dz));if(Math.max(...heights)-Math.min(...heights)>.55)placements.splice(i,1);}
 const sources=new Map<string,THREE.Group>(treeSamples());palmSamples().forEach((tree,i)=>sources.set('palm-'+i,tree));sources.set('shrub',shrubSample);sources.set('grass',grassSample);
 const retained:Placement[]=[];
 for(const [kind,source] of sources){yield;const proto=renderPlant(source);proto.geometry.computeBoundingBox();const bounds=proto.geometry.boundingBox!,dummy=new THREE.Object3D();
  const list=placements.filter(p=>p.kind===kind).filter(p=>{dummy.position.set(p.x,0,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();return plantingBoxClear(bounds.clone().applyMatrix4(dummy.matrix));});if(!list.length)continue;
  const batch=new THREE.InstancedMesh(proto.geometry,plantBatchMaterial,list.length);batch.name='vegetation-'+kind;
  list.forEach((p,i)=>{const spread=kind==='grass'?.12:.4,ground=Math.min(surfaceHeight(p.x,p.z),...[[spread,0],[-spread,0],[0,spread],[0,-spread]].map(([dx,dz])=>surfaceHeight(p.x+dx,p.z+dz)));p.y=ground-.035;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});batch.instanceMatrix.needsUpdate=true;batch.castShadow=batch.receiveShadow=true;root.add(batch);retained.push(...list);
 }
 placements.splice(0,placements.length,...retained);
 root.userData.placements=placements;world.userData.greening={trees:placements.filter(p=>!['shrub','grass'].includes(p.kind)&&!p.kind.startsWith('palm')).length,palms:placements.filter(p=>p.kind.startsWith('palm')).length,shrubs:placements.filter(p=>p.kind==='shrub').length,grass:placements.filter(p=>p.kind==='grass').length,batches:root.children.length};
}

export function plantTrees(){for(const _ of plantTreesSteps()){/* synchronous asset/headless API */}}
