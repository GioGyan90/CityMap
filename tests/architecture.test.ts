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


test('sailboat hull lies along the water and its bow follows the sailing heading',async()=>{
 const {makeSailboat}=await import('../src/port');
 const boat=makeSailboat(0,0);boat.updateMatrixWorld(true);
 const hull=boat.getObjectByName('horizontal-sailboat-hull')!;
 const size=new THREE.Box3().setFromObject(hull).getSize(new THREE.Vector3());
 assert.ok(size.x>7&&size.z>1.5&&size.y<1.1,'long axis is horizontal and vertical draft stays shallow');
 assert.ok(size.x>size.z*2.5,'bow follows the X axis used by the sailing animation');
 const cafe=world.getObjectByName('old-town-cafe');assert.ok(cafe,'reference cafe is assembled in the full city');
});

test('market arches are through openings and the carved table has six real pockets',async()=>{
 const {cutFacade}=await import('../src/carvedGeometry');
 const facade=new THREE.Mesh(cutFacade(12,8,.6,[{x:0,y:.3,w:4,h:5}]),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 facade.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,3,2),new THREE.Vector3(0,0,-1));
 assert.equal(ray.intersectObject(facade).length,0,'door void must pass through the full wall thickness');
 ray.set(new THREE.Vector3(4,3,2),new THREE.Vector3(0,0,-1));
 assert.ok(ray.intersectObject(facade).length>0,'wall beside the doorway remains solid');
 const {outdoorTable}=await import('../src/billiardsArchitecture');
 const root=new THREE.Group();outdoorTable(root,0,0);root.updateMatrixWorld(true);
 const body=root.getObjectByName('carved-table-body')!,cloth=root.getObjectByName('six-pocket-cloth')!;
 for(const x of [-2.45,0,2.45])for(const z of [-1.2,1.2]){
  ray.set(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObjects([body,cloth]).length,0,'pockets cut through both cloth and wooden body');
 }
 ray.set(new THREE.Vector3(0,3,0),new THREE.Vector3(0,-1,0));
 assert.ok(ray.intersectObject(cloth).length>0,'cloth remains solid between pockets');
});
test('the second hall has its own plot and the market no longer contains a duplicate hall',async()=>{
 const {specialBuildings}=await import('../src/specialBuildings');
 const market=specialBuildings.find(s=>s.id==='market')!,hall=specialBuildings.find(s=>s.id==='hall2')!;
 assert.ok(market&&hall);
 assert.equal(market.group.getObjectByName('independent-outdoor-billiards-hall'),undefined);
 assert.ok(hall.group.getObjectByName('six-pocket-cloth'));
 const m=new THREE.Box3().setFromObject(market.group),h=new THREE.Box3().setFromObject(hall.group);
 assert.equal(m.intersectsBox(h),false,'separate facilities have breathing space');
 assert.ok(market.group.getObjectByName('market-pierced-facade'));
});

test('asymmetric plan extrusion preserves front and back and roofs sit over their walls',async()=>{
 const {extrudedPlan,polygonPlan}=await import('../src/carvedGeometry');
 const {HALL_PLAN,buildOutdoorHall,buildSuppliesMarket}=await import('../src/billiardsArchitecture');
 const plan=new THREE.Mesh(extrudedPlan(polygonPlan(HALL_PLAN),2),new THREE.MeshBasicMaterial());
 const b=new THREE.Box3().setFromObject(plan);
 assert.ok(Math.abs(b.min.z+8)<.0001&&Math.abs(b.max.z+1)<.0001,'negative rear coordinates must stay behind the facade');
 const hall=buildOutdoorHall(),market=buildSuppliesMarket();hall.updateMatrixWorld(true);market.updateMatrixWorld(true);
 for(const [root,wallName,roofName] of [[hall,'hall-rear-shell','hall-inset-hip-roof'],[market,'market-ground-shell','market-ground-roof'],[market,'market-upper-shell','market-upper-roof']] as const){
  const wall=new THREE.Box3();root.getObjectByName(wallName)!.traverse(o=>{if(o.name==='structural-shell-panel')wall.union(new THREE.Box3().setFromObject(o));});const roof=new THREE.Box3().setFromObject(root.getObjectByName(roofName)!);
  for(const key of ['x','z'] as const){assert.ok(Math.abs(wall.min[key]-roof.min[key])<.001);assert.ok(Math.abs(wall.max[key]-roof.max[key])<.001);}
  assert.ok(Math.abs(wall.max.y-roof.min.y)<.001,'roof springs directly from the top of the shell');
 }
});
test('the actual outdoor table has unobstructed approaches from the front and both sides',async()=>{
 const {buildOutdoorHall}=await import('../src/billiardsArchitecture');
 const hall=buildOutdoorHall();hall.position.y=0;hall.updateMatrixWorld(true);
 const obstacles:THREE.Mesh[]=[];
 hall.traverse(o=>{if(o instanceof THREE.Mesh&&!['six-pocket-cloth','table-rail-ring','carved-table-body'].includes(o.name))obstacles.push(o);});
 // Probe at waist and shoulder height around the playing area, beyond the table itself.
 const ray=new THREE.Raycaster();
 for(const height of [1,2.6])for(const [from,to] of [
  [[0,height,10],[0,height,8.2]], [[-8,height,5.8],[-3.8,height,5.8]], [[8,height,5.8],[3.8,height,5.8]]
 ]){
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);ray.set(a,b.clone().sub(a).normalize());ray.far=a.distanceTo(b);
  assert.equal(ray.intersectObjects(obstacles).length,0,'no enclosing wall blocks a player approaching the table');
 }
});
