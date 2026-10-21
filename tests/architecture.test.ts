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
 world.clear();await import('../src/environment');await import('../src/city');world.updateMatrixWorld(true);
 assert.ok(world.getObjectByName('north-rail-terminus'));
 assert.ok(world.getObjectByName('south-rail-terminus'));
 let meshes=0;
 world.traverse(o=>{if(!(o instanceof THREE.Mesh))return;meshes++;
  const p=o.geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)),'finite geometry');
 });
 assert.ok(meshes>100);
});


test('harbor ground faces point upward and reclaimed fill is separated from the terrain',()=>{
 const terrain=world.getObjectByName('irregular-elevated-terrain') as THREE.Mesh;
 const fill=world.getObjectByName('reclaimed-quay-fill') as THREE.Mesh;
 assert.ok(terrain&&fill);
 const box=new THREE.Box3().setFromObject(fill);
 assert.ok(box.max.y<1.06-.2,'no coincident cap at the terrain height');
 const g=terrain.geometry,p=g.attributes.position,idx=g.index!;
 for(let i=0;i<idx.count;i+=3){
  const a=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i)),b=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+2));
  assert.ok(b.sub(a).cross(c.sub(a)).y>=0,'terrain has no inverted ground triangles');
 }
});
test('three ports have separate functions and the cruise hull clears its quay',()=>{
 const cargo=world.getObjectByName('cargo-harbor')!,fish=world.getObjectByName('fish-market-wharf')!,passenger=world.getObjectByName('passenger-harbor')!,ship=world.getObjectByName('cruise-ship')!;
 assert.ok(cargo&&fish&&passenger&&ship);
 assert.equal(fish.getObjectByName('freight-container'),undefined);
 assert.ok(cargo.getObjectByName('freight-container'));
 const bounds=[cargo,fish,passenger].map(g=>new THREE.Box3().setFromObject(g));
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.equal(bounds[i].intersectsBox(bounds[j]),false,'separate port districts');
 const shipBounds=new THREE.Box3().setFromObject(ship);
 assert.ok(shipBounds.min.z>170,'ship hull clears the passenger pier edge');
 assert.ok(shipBounds.max.x<0,'cruise berth is away from the fish market');
});
