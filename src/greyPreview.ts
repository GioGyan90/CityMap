import * as THREE from 'three';
import {greyPreview} from './generated/greyPreview';
/** Cheap build-time-derived silhouette; no runtime terrain/planning imports. */
export function createGreyPreview(){
 const root=new THREE.Group();root.name='loading-grey-preview';
 const materials=[0xb6bdba,0x8e9899,0xd0d1ca,0x929b9e].map(color=>new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
 const mesh=(positions:number[],indices:number[],material:THREE.Material)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,material);root.add(m);return m;};
 const terrain=mesh(greyPreview.positions,greyPreview.indices,materials[0]);
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),materials[1]);sea.rotation.x=-Math.PI/2;sea.position.y=-.4;root.add(sea);
 const roads=greyPreview.roads.map(r=>mesh(r.positions,r.indices,materials[3]));
 const boxes=new Map<string,THREE.Mesh[]>();
 for(const b of greyPreview.boxes){const lo=new THREE.Vector3().fromArray(b.min),hi=new THREE.Vector3().fromArray(b.max),size=hi.clone().sub(lo);const m=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),materials[2]);m.position.copy(lo).add(hi).multiplyScalar(.5);root.add(m);boxes.set(b.id,[...(boxes.get(b.id)??[]),m]);}
 return {root,materials,terrain,sea,roads,boxes};
}
