import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
// Canvas drawing is irrelevant to geometry, but facade textures retain their real identity.
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});
(globalThis as any).document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};
const {makeBuilding,facadeCache}=await import('../src/buildings');
const {buildGovernment}=await import('../src/landmarks');
const {world}=await import('../src/scene');
test('upward faces of ordinary building boxes never use window facade textures',()=>{
 for(const style of ['flat','stepped','artdeco','apartment','villa','arcade'] as const){
  const root=makeBuilding({x:0,z:0,w:12,d:10,h:24,style});
  root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
   const geometry=o.geometry,materials=Array.isArray(o.material)?o.material:[o.material],normal=geometry.attributes.normal;
   for(const group of geometry.groups){const material=Array.isArray(o.material)?materials[group.materialIndex??0]:o.material;
    if(!material.map||![...facadeCache.values()].includes(material.map))continue;
    for(let i=group.start;i<group.start+group.count;i++){
     const index=geometry.index?geometry.index.getX(i):i;
     assert.ok(normal.getY(index)<.5,`${style}: facade appears on an upward face`);
    }
   }
  });
 }
});
test('government portico leaves a clear human-height route from the steps to the main door',()=>{
 world.clear();buildGovernment(0,0);world.updateMatrixWorld(true);
 const route=new THREE.Box3(new THREE.Vector3(-2,1.06+2.4,1.9),new THREE.Vector3(2,1.06+5.9,4.4));
 for(const object of world.children){
  if(!(object instanceof THREE.Mesh))continue;
  const bounds=new THREE.Box3().setFromObject(object);
  assert.equal(bounds.intersectsBox(route),false,`portico obstruction: ${object.geometry.type} ${object.position.toArray()}`);
 }
});

test('complete city assembles with finite geometry and explicit rail termini',async()=>{
 world.clear();await import('../src/city');world.updateMatrixWorld(true);
 assert.ok(world.getObjectByName('north-rail-terminus'));
 assert.ok(world.getObjectByName('south-rail-terminus'));
 let meshes=0;
 world.traverse(o=>{if(!(o instanceof THREE.Mesh))return;meshes++;
  const p=o.geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)),'finite geometry');
 });
 assert.ok(meshes>100);
});
