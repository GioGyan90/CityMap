import {inTunnelReservation} from './tunnelPlan';
import * as THREE from 'three';
import {roadEdgeDistance} from './roadNetwork';

/** Check the full projected footprint, including overhanging foliage and planter rims. */
export function plantingBoxClear(box:THREE.Box3,margin=.35){
 const nx=Math.max(1,Math.ceil((box.max.x-box.min.x)/.75)),nz=Math.max(1,Math.ceil((box.max.z-box.min.z)/.75));
 for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++)if(inTunnelReservation(THREE.MathUtils.lerp(box.min.x,box.max.x,i/nx),THREE.MathUtils.lerp(box.min.z,box.max.z,j/nz))||roadEdgeDistance(THREE.MathUtils.lerp(box.min.x,box.max.x,i/nx),THREE.MathUtils.lerp(box.min.z,box.max.z,j/nz))<margin)return false;
 return true;
}
export function auditPlacedPlants(world:THREE.Group){
 world.updateMatrixWorld(true);const remove:THREE.Object3D[]=[],names=new Set(['palm-tree','tree-shade','tree-slender','tree-flowering','tree-pine','shrub','grass-clump','five-petal-flower','planted-stone-bowl']);
 world.traverse(o=>{if(o instanceof THREE.Mesh&&!(o instanceof THREE.InstancedMesh)&&names.has(o.name)&&!plantingBoxClear(new THREE.Box3().setFromObject(o)))remove.push(o);});
 remove.forEach(o=>o.removeFromParent());world.userData.plantRoadAudit={removed:remove.length};
}
