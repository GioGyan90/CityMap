import {surfaceHeight} from '../src/terrainSurface';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPalm,createPalmCluster,bakePalm,palmPath} from '../src/palm';
import {sweepProfile,circularProfile,leafRibbon,seededRandom,radialPlacements} from '../src/proceduralGeometry';
import {createTree,treeSamples,createGardenCluster,renderPlant,createFlower,createPlanter} from '../src/plantAssets';
// Canvas drawing is irrelevant to geometry, but facade textures retain their real identity.
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});
(globalThis as any).document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};
const {makeBuilding,facadeCache}=await import('../src/buildings');
const {buildGovernment}=await import('../src/landmarks');
const {world}=await import('../src/scene');
test('path sweeps bridge every section with outward faces and fixed-seed radial placement',()=>{
 const path=new THREE.LineCurve3(new THREE.Vector3(),new THREE.Vector3(0,7,0)),geometry=sweepProfile(path,circularProfile(8),12,u=>.4-u*.2);
 const position=geometry.attributes.position,normal=geometry.attributes.normal;
 for(let i=8;i<12*8;i++)assert.ok(new THREE.Vector3(position.getX(i),0,position.getZ(i)).dot(new THREE.Vector3(normal.getX(i),0,normal.getZ(i)))>0,'trunk faces point outward');
 const edgeCounts=new Map<string,number>(),index=geometry.index!;
 for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){const a=index.getX(i+j),b=index.getX(i+(j+1)%3),key=[a,b].sort((x,y)=>x-y).join(':');edgeCounts.set(key,(edgeCounts.get(key)??0)+1);}
 assert.ok([...edgeCounts.values()].every(n=>n===2),'swept trunk including caps is closed');
 assert.deepEqual(radialPlacements(12,seededRandom(41)),radialPlacements(12,seededRandom(41)));
 const ribbon=leafRibbon(new THREE.LineCurve3(new THREE.Vector3(),new THREE.Vector3(2,0,0)),.2);assert.ok(ribbon.attributes.normal.getY(4)>0,'upper leaf normals point up');
});
test('palm assemblies keep attachments when height, bend and frond count change',()=>{
 for(const [height,bend,fronds] of [[5,0,6],[7,1,12],[9,2,18]]){
  const tree=createPalm({seed:41,height,bend,fronds}),crown=tree.getObjectByName('palm-crown')!,trunk=tree.getObjectByName('palm-trunk')!;
  assert.ok(trunk&&tree.getObjectByName('palm-coconuts'));
  const heading=seededRandom(41)()*Math.PI*2,path=palmPath(height,bend,heading);
  assert.ok(crown.position.distanceTo(path.getPointAt(1))<1e-6);
  assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(crown.quaternion).distanceTo(path.getTangentAt(1))<1e-6);
  let leaves=0;tree.traverse(o=>{if(o.name==='palm-frond'){leaves++;assert.ok(o.position.length()<.3,'leaf bases stay in crown');const blade=o.getObjectByName('notched-leaf-blade') as THREE.Mesh;assert.ok(blade);assert.equal(blade.geometry.userData.operation,'planar-difference');assert.ok(blade.geometry.userData.cutArea<blade.geometry.userData.originalArea*.98);assert.equal(blade.geometry.userData.pieces,1,'cuts leave the leaf attached');}});assert.equal(leaves,fronds);
  tree.updateMatrixWorld(true);const sourceBox=new THREE.Box3().setFromObject(tree,true),baked=bakePalm(tree);assert.ok(baked.boundingBox!.min.distanceTo(sourceBox.min)<1e-5);assert.ok(baked.boundingBox!.max.distanceTo(sourceBox.max)<1e-5);
  for(const a of Object.values(baked.attributes))for(const n of a.array)assert.ok(Number.isFinite(n));
  assert.ok(baked.attributes.position.count/3<fronds*1200+1500,'variant has a bounded triangle budget');
  assert.ok((crown.getObjectByName('palm-coconuts')!.children).every(o=>o.position.y<0),'fruit hangs below the crown');
 }
 assert.deepEqual(Array.from(bakePalm(createPalm({seed:41})).attributes.position.array),Array.from(bakePalm(createPalm({seed:41})).attributes.position.array));
 const relocated=createPalm({seed:41});relocated.position.set(100,4,-20);relocated.rotation.y=.8;const local=bakePalm(relocated).attributes.position,reference=bakePalm(createPalm({seed:41})).attributes.position;
 for(let i=0;i<local.count;i++)assert.ok(new THREE.Vector3().fromBufferAttribute(local,i).distanceTo(new THREE.Vector3().fromBufferAttribute(reference,i))<1e-5,'baking excludes the tree placement transform');
});
test('palm barrels and cut leaves vary structurally instead of using uniform taper and spacing',()=>{
 const tree=createPalm({seed:41}),trunk=tree.getObjectByName('palm-trunk')!;
 const sections=trunk.children.map(o=>o.userData),heights=sections.map(s=>s.to-s.from),radii=sections.map(s=>s.radius);
 assert.ok(Math.max(...heights)/Math.min(...heights)>1.3,'barrel heights differ');
 assert.ok(radii.every((r,i)=>i===0||r<radii[i-1]),'barrel envelope shrinks towards the crown');const steps=radii.slice(1).map((r,i)=>radii[i]-r);assert.ok(Math.max(...steps)/Math.min(...steps)>1.2,'taper increments vary');
 const closedEdge=(geometry:THREE.BufferGeometry)=>{const edges=new Map<string,number>(),index=geometry.index!;for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){const a=index.getX(i+j),b=index.getX(i+(j+1)%3),key=[a,b].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)??0)+1);}return [...edges.values()].every(n=>n===2);};
 for(const o of trunk.children)assert.ok(closedEdge((o as THREE.Mesh).geometry),'each bucket is a closed connected solid');
 const group=tree.getObjectByName('spread-fronds')!,lengths=group.children.map(o=>o.userData.length);assert.ok(Math.max(...lengths)/Math.min(...lengths)>1.12);
 const angles=group.children.map(o=>(o.rotation.y%(Math.PI*2)+Math.PI*2)%(Math.PI*2)).sort((a,b)=>a-b),gaps=angles.map((a,i)=>(angles[(i+1)%angles.length]-a+Math.PI*2)%(Math.PI*2));assert.ok(Math.max(...gaps)/Math.min(...gaps)>1.2,'angular gaps differ visibly');
});
test('three-palm landscape has distinct trees, grounded roots and descending barrel envelopes',()=>{
 const cluster=createPalmCluster(),trees=cluster.children.filter(o=>o.name.startsWith('cluster-palm-'));
 assert.equal(trees.length,3);assert.equal(new Set(trees.map(o=>o.userData.seed)).size,3);
 assert.ok(trees[0].userData.height>trees[1].userData.height&&trees[1].userData.height>trees[2].userData.height);
 for(const tree of trees){assert.equal(tree.position.y,.85);const trunk=tree.getObjectByName('palm-trunk')!;const r=trunk.children.map(o=>o.userData.radius);assert.ok(r.every((v,i)=>i===0||v<r[i-1]));const root=trunk.children[0] as THREE.Mesh;root.geometry.computeBoundingBox();assert.ok(Math.abs(root.geometry.boundingBox!.min.y)<1e-5);}
 for(let seed=0;seed<12;seed++){const trunk=createPalm({seed}).getObjectByName('palm-trunk')!;const sizes=trunk.children.map(o=>o.userData.radius*1.2);assert.ok(sizes.every((r,i)=>i===0||r<sizes[i-1]),'all sampled seeds taper');}
});
test('new planting prototypes keep editable parts, grounded trunks and vertex colors when batched',()=>{
 const samples=treeSamples();assert.equal(samples.size,12);const sizes=[];
 for(const [id,tree] of samples){const trunk=tree.getObjectByName('tree-trunk')!,crown=tree.getObjectByName('tree-crown')!;assert.ok(trunk&&crown,id);const baked=renderPlant(tree).geometry;
  baked.computeBoundingBox();const box=baked.boundingBox!;assert.ok(Math.abs(box.min.y)<1e-4,'trunk datum is ground within numerical tolerance');sizes.push(box.getSize(new THREE.Vector3()).toArray().map(n=>n.toFixed(2)).join(','));
  const color=baked.attributes.color;let varied=false;for(let i=1;i<color.count;i++)if(Math.abs(color.getY(i)-color.getY(i-1))>.001)varied=true;assert.ok(varied,'foliage gradients survive baking');
  for(const a of Object.values(baked.attributes))for(const n of a.array)assert.ok(Number.isFinite(n));
 }
 assert.ok(new Set(sizes).size>=8,'variants have distinct shapes');
 const a=renderPlant(createTree('shade',51)).geometry.attributes.position,b=renderPlant(createTree('shade',51)).geometry.attributes.position;assert.deepEqual(Array.from(a.array),Array.from(b.array));
 const garden=createGardenCluster();assert.ok(garden.children.some(o=>o.name==='shrub')&&garden.children.some(o=>o.name==='grass-clump')&&garden.children.some(o=>o.name==='five-petal-flower'));
});
test('upward faces of ordinary building boxes never use window facade textures',()=>{
 for(const style of ['flat','stepped','artdeco','apartment','villa','arcade'] as const){
  const root=makeBuilding({x:0,z:0,w:12,d:10,h:24,style});
  root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
   const geometry=o.geometry,materials=Array.isArray(o.material)?o.material:[o.material],normal=geometry.attributes.normal;
   for(const group of geometry.groups){const material=Array.isArray(o.material)?materials[group.materialIndex??0]:o.material;
    if(!material.map||material.userData.lightingRole!=='window-facade')continue;
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

test('complete city assembles with finite geometry and two closed rail circuits',async()=>{
 world.clear();await import('../src/environment');await import('../src/city');world.updateMatrixWorld(true);
 assert.ok(world.getObjectByName('coast-double-track-circuit'));
 assert.ok(world.getObjectByName('express-double-track-circuit'));assert.equal(world.userData.transport.tracksPerLine,2);
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


test('workboats replace sails with supported equipment and retain geometry after batching',async()=>{
 const {createWorkboat,WORKBOAT_KINDS}=await import('../src/workboats');
 for(const kind of WORKBOAT_KINDS){
  const root=createWorkboat(kind),merged=createWorkboat(kind,true);
  const a=new THREE.Box3().setFromObject(root,true),b=new THREE.Box3().setFromObject(merged,true),size=a.getSize(new THREE.Vector3());
  assert.ok(size.x>12&&size.x<13&&size.z<4.5,'full ship and attachments fit the navigation envelope');
  assert.ok(a.min.distanceTo(b.min)<1e-5&&a.max.distanceTo(b.max)<1e-5,'batching preserves the complete ship');
  const deck=root.getObjectByName('船壳、龙骨与甲板')!;
  assert.ok(deck,'hull and deck are editable separately from the superstructure');
  assert.equal(root.userData.forward,'+X');
  assert.ok(.7+.12-.04-6.1*Math.sin(.045)>.24,'deck stays above the maximum displaced water surface when rolling');
 }
 const {boats}=await import('../src/port');assert.equal(boats.length,6);
 assert.equal(world.getObjectByName('horizontal-sailboat-hull'),undefined);
 for(const boat of boats){assert.ok(boat.mesh.position.x<=-165&&boat.mesh.position.x>=-215);assert.ok(boat.mesh.position.z>=-45&&boat.mesh.position.z<=155);}
 const moored:THREE.Object3D[]=[];world.traverse(o=>{if(o.name==='market-fishing-boat')moored.push(o);});assert.equal(moored.length,2);
 for(const boat of moored)assert.ok(Math.abs(boat.rotation.y-Math.PI/2)<1e-6,'moored boat runs parallel to its pier');
});

test('market arches are through openings and the carved table has six real pockets',async()=>{
 const {cutFacade}=await import('../src/carvedGeometry');
 const facade=new THREE.Mesh(cutFacade(12,8,.6,[{x:0,y:.3,w:4,h:5}]),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 facade.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,3,2),new THREE.Vector3(0,0,-1));
 assert.equal(ray.intersectObject(facade).length,0,'door void must pass through the full wall thickness');
 ray.set(new THREE.Vector3(4,3,2),new THREE.Vector3(0,0,-1));
 assert.ok(ray.intersectObject(facade).length>0,'wall beside the doorway remains solid');
 const {outdoorTable,TABLE_POCKETS}=await import('../src/billiardsArchitecture');
 const root=new THREE.Group();outdoorTable(root,0,0);root.updateMatrixWorld(true);
 const body=root.getObjectByName('carved-table-body')!,cloth=root.getObjectByName('six-pocket-cloth')!;
 for(const [x,z] of TABLE_POCKETS){
  ray.set(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObjects([body,cloth,root.getObjectByName('table-rail-ring')!]).length,0,`pocket ${x},${z}: ${ray.intersectObjects([body,cloth,root.getObjectByName('table-rail-ring')!]).map(h=>h.object.name)}`);
  assert.ok(Math.abs(x)>2.76||Math.abs(z)>1.4,'pocket centres are outside the playing cloth');
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


test('hall rack sign sits on the roof and shop cue racks clear both small canopies',async()=>{
 const {buildSuppliesMarket,buildOutdoorHall}=await import('../src/billiardsArchitecture');
 const market=buildSuppliesMarket(),hall=buildOutdoorHall();market.position.y=hall.position.y=0;market.updateMatrixWorld(true);hall.updateMatrixWorld(true);
 const sign=hall.getObjectByName('rooftop-triangle-sign')!;assert.ok(sign);
 const roof=new THREE.Box3().setFromObject(hall.getObjectByName('hall-inset-hip-roof')!);
 assert.ok(new THREE.Box3().setFromObject(sign).min.y>=roof.max.y,'rack is above the hall roof');
 const displays:THREE.Object3D[]=[],canopies:THREE.Object3D[]=[];
 market.traverse(o=>{if(o.name==='wall-cue-display')displays.push(o);if(o.name==='scalloped-canopy-edge')canopies.push(o);});
 assert.equal(canopies.length,16,'only the two eight-panel shopfront canopies remain');
 assert.equal(displays.length,2);
 for(const display of displays){const bounds=new THREE.Box3().setFromObject(display);assert.ok(bounds.min.z>1.5&&bounds.max.z<4,'cue racks hug the front wall');
  for(const canopy of canopies)assert.equal(bounds.intersectsBox(new THREE.Box3().setFromObject(canopy)),false);
 }
});

test('vehicle shells retain wheel clearance, recessed glazing and a ground contact datum',async()=>{
 const {createVehicle,VEHICLE_SIZES}=await import('../src/vehicles');
 for(const kind of ['sedan','bus','ambulance'] as const){
  const car=createVehicle(kind);car.updateMatrixWorld(true);const size=VEHICLE_SIZES[kind],bounds=new THREE.Box3().setFromObject(car),body=car.getObjectByName('carved-body')!;
  assert.ok(Math.abs(bounds.min.y)<.001,`${kind}: tires touch the ground`);
  assert.ok(bounds.max.x<=size.width/2+.035&&bounds.min.x>=-size.width/2-.035,`${kind}: body fits its traffic envelope`);
  assert.ok(bounds.max.z<=size.length/2+.001&&bounds.min.z>=-size.length/2-.001,`${kind}: length fits traffic envelope`);
  const radius=kind==='sedan'?.28:.36;
  for(const z of [-size.length*.31,size.length*.31]){
   const ray=new THREE.Raycaster(new THREE.Vector3(-3,radius,z),new THREE.Vector3(1,0,0));
   assert.equal(ray.intersectObject(body).length,0,`${kind}: wheel arches are subtracted from the body`);
  }
  car.traverse(o=>{if(o instanceof THREE.Mesh){const pos=o.geometry.attributes.position;assert.equal(pos.itemSize,3);for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i))&&Number.isFinite(pos.getY(i))&&Number.isFinite(pos.getZ(i)));}});
  if(kind==='sedan')assert.ok(car.getObjectByName('sloped-windscreen-inset'));
  else assert.ok(car.getObjectByName('passenger-door'));
 }
 const a=createVehicle(),b=createVehicle();assert.notEqual(a,b);assert.equal((a.getObjectByName('carved-body') as THREE.Mesh).geometry,(b.getObjectByName('carved-body') as THREE.Mesh).geometry,'fleet reuses geometry');
});

test('city planting batches stay off roads, parking access and buildings and sample ground without floating',async()=>{
 const {blocked}=await import('../src/vegetation'),{surfaceHeight}=await import('../src/terrainSurface');
 const plants=world.getObjectByName('city-vegetation')!;assert.ok(plants);const positions=plants.userData.placements;
 assert.ok(positions.length>500);const kinds=new Set(positions.map(p=>p.kind));for(const type of ['shade','slender','flowering','pine','shrub','grass'])assert.ok([...kinds].some((k:string)=>k.startsWith(type)),type);
 for(const p of positions){assert.equal(blocked(p.x,p.z,p.kind==='shrub'||p.kind==='grass'?.55:p.kind.startsWith('palm')?1:1.4),false);assert.ok(p.y<=surfaceHeight(p.x,p.z)+.001);assert.ok(surfaceHeight(p.x,p.z)-p.y<.65,'root neck is close to local ground');}
 for(const batch of plants.children){assert.ok(batch instanceof THREE.InstancedMesh);assert.ok((batch as THREE.InstancedMesh).count>0);}
});


test('all tree crowns stay green and flower petals vary in size, angle and curl',()=>{
 for(const tree of treeSamples().values())tree.getObjectByName('tree-crown')!.traverse(o=>{if(o instanceof THREE.Mesh){const color=o.geometry.attributes.color;assert.ok(color,'crown has vertex colors');for(let i=0;i<color.count;i++){assert.ok(color.getY(i)>color.getX(i)&&color.getY(i)>color.getZ(i),'crown remains in the green range');}}});
 const flower=createFlower(11),petals=flower.children.filter(o=>o.name==='flower-petal');assert.equal(petals.length,5);
 const lengths=petals.map(o=>o.userData.length),widths=petals.map(o=>o.userData.width),curls=petals.map(o=>o.userData.curl);assert.ok(Math.max(...lengths)/Math.min(...lengths)>1.1);assert.ok(Math.max(...widths)/Math.min(...widths)>1.1);assert.ok(Math.max(...curls)-Math.min(...curls)>.025);
 const angles=petals.map(o=>o.userData.angle),gaps=angles.slice(1).map((a,i)=>a-angles[i]);assert.ok(Math.max(...gaps)/Math.min(...gaps)>1.1);
});
test('batched facade textures never cover upward roof faces and roof samples have independent groups',async()=>{
 const {ordinaryAssetSamples}=await import('../src/buildings');let checked=0;
 world.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const mats=Array.isArray(o.material)?o.material:[o.material],groups=Array.isArray(o.material)?o.geometry.groups:[{start:0,count:o.geometry.index?.count??o.geometry.attributes.position.count,materialIndex:0}];
  for(const group of groups){const material=mats[group.materialIndex??0];if(!material.map||material.userData.lightingRole!=='window-facade')continue;const normals=o.geometry.attributes.normal;for(let i=group.start;i<group.start+group.count;i++){const at=o.geometry.index?o.geometry.index.getX(i):i;assert.ok(normals.getY(at)<.05,'facade batch has no roof triangles');checked++;}}
 });assert.ok(checked>0,'remaining textured office facades are actually inspected');
 for(const sample of ordinaryAssetSamples.values()){const roof=sample.getObjectByName('building-roof');assert.ok(roof&&roof.children.length,'roof is independently modelled');roof.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])assert.ok(!m.map||m.userData.lightingRole!=='window-facade');});}
});
test('all planted footprints clear the real curved road edge after placement',async()=>{
 const {plantingBoxClear}=await import('../src/plantPlacement');world.updateMatrixWorld(true);let count=0;
 const names=new Set(['palm-tree','tree-shade','tree-slender','tree-flowering','tree-pine','shrub','grass-clump','five-petal-flower','planted-stone-bowl']);
 world.traverse(o=>{if(!(o instanceof THREE.Mesh))return;if(o instanceof THREE.InstancedMesh&&o.name.startsWith('vegetation-')){o.geometry.computeBoundingBox();for(let i=0;i<o.count;i++){const matrix=new THREE.Matrix4();o.getMatrixAt(i,matrix);assert.ok(plantingBoxClear(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld.clone().multiply(matrix))));count++;}}else if(names.has(o.name)){assert.ok(plantingBoxClear(new THREE.Box3().setFromObject(o)));count++;}});assert.ok(count>400);
});


test('all planter flower roots enter the soil while flower heights vary above it',()=>{
 for(const radius of [.65,1,2.5])for(const seed of [11,71,137]){
  const planter=createPlanter(seed,radius);planter.updateMatrixWorld(true);const soil=planter.getObjectByName('planter-soil')!,soilBox=new THREE.Box3().setFromObject(soil),flowers=planter.children.filter(o=>o.name==='five-petal-flower');assert.equal(flowers.length,6);
  const heights=[];for(const flower of flowers){const stem=flower.getObjectByName('flower-stem')!,stemBox=new THREE.Box3().setFromObject(stem);assert.ok(stemBox.min.y<=soilBox.max.y&&stemBox.min.y>soilBox.min.y,'stem root is embedded in soil');assert.ok(Math.hypot(flower.position.x,flower.position.z)<radius*.78,'root is inside the soil footprint');heights.push(stemBox.max.y);}
  assert.ok(Math.max(...heights)-Math.min(...heights)>.05,'heights vary through stem length');
 }
});


test('five themed halls are independent plots with clear carved doors, grounded tables and distinct roofs',async()=>{
 const {specialBuildings}=await import('../src/specialBuildings');const {createThemedHall,HALL_THEMES}=await import('../src/themedHalls');const {roadEdgeDistance}=await import('../src/roadNetwork');
 const roofs=new Set<string>();
 for(const spec of HALL_THEMES){
  const entry=specialBuildings.find(s=>s.id===spec.id)!;assert.ok(entry);assert.equal(entry.group.parent,world);assert.equal(entry.group.userData.theme,spec.theme);
  const hall=createThemedHall(spec.theme);hall.updateMatrixWorld(true);
  for(const name of ['base','shell','entrance','roof','emblem','furniture'])assert.ok(hall.getObjectByName('hall-'+name),name);
  const front=hall.getObjectByName(spec.theme==='elegance'?'hall-open-arch':'hall-pierced-front')!;
  const ray=new THREE.Raycaster(new THREE.Vector3(0,2.4,3),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(front).length,0,'door is a through opening');
  if(spec.theme==='science'){const curb=new THREE.Box3().setFromObject(hall.getObjectByName('science-vault-support-curb')!),vault=new THREE.Box3().setFromObject(hall.getObjectByName('science-vault-roof')!);assert.ok(curb.max.y>=vault.min.y-1e-5&&curb.min.y<=7.15,'vault curb bridges the wall and vault');assert.ok(curb.min.x<=vault.min.x+1e-5&&curb.max.x>=vault.max.x-1e-5,'curb supports the full vault length');}
  const cloth=hall.getObjectByName('six-pocket-cloth')!;assert.ok(cloth);
  let feet=0;hall.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry.type==='LatheGeometry'){const b=new THREE.Box3().setFromObject(o);assert.ok(b.min.y<=.351&&b.min.y>=.09,'table legs touch or enter the slab');feet++;}});assert.equal(feet,4);
  const roof=hall.getObjectByName('hall-roof')!;const b=new THREE.Box3().setFromObject(roof);roofs.add([b.min.x,b.max.x,b.min.y,b.max.y,roof.children.length].map(v=>v.toFixed(2)).join(','));
  const footprint=new THREE.Box3().setFromObject(entry.group);for(let x=footprint.min.x;x<=footprint.max.x;x+=.8)for(let z=footprint.min.z;z<=footprint.max.z;z+=.8)assert.ok(roadEdgeDistance(x,z)>.4,'hall footprint clears actual roads');
 }
 assert.equal(roofs.size,5,'all five roofs have distinct geometry');
 for(const id of ['park','hospital','commercial','port']){let old=0;specialBuildings.find(s=>s.id===id)!.group.traverse(o=>{if(/BILLIARDS/.test(o.userData.signText??''))old++;});assert.equal(old,0,'old hall removed from '+id);}
 const hall1=new THREE.Box3().setFromObject(specialBuildings.find(s=>s.id==='hall1')!.group),park=new THREE.Box3().setFromObject(specialBuildings.find(s=>s.id==='park')!.group);assert.equal(hall1.intersectsBox(park),false);
});


test('roof sculptures have five distinct motifs, supported giant eights and a real flame cutout',async()=>{
 const {createEmotionEmblem}=await import('../src/hallEmblems');const silhouettes=new Set<string>();
 for(const theme of ['fire','elegance','order','science','punk'] as const){const sculpture=createEmotionEmblem(theme);sculpture.updateMatrixWorld(true);const ball=sculpture.getObjectByName('eight-sphere')!,support=sculpture.getObjectByName('eight-support')!;assert.ok(ball&&support);const b=new THREE.Box3().setFromObject(ball),s=new THREE.Box3().setFromObject(support);assert.ok(s.max.y>=b.min.y&&s.min.y<=.251,'ball is connected to the pedestal');assert.ok(b.getSize(new THREE.Vector3()).x>=1.89,'eight is a landmark, not a small badge');assert.ok(sculpture.getObjectByName('sculpture-motif-'+theme));let numbers=0;sculpture.traverse(o=>{if(o.name==='raised-eight-number')numbers++;if(o.name==='sculpture-cue')assert.ok(o.getObjectByName('cue-mount-brace'),'cue has a physical mounting brace');});assert.equal(numbers,2,'eight reads from front and back');const bounds=new THREE.Box3().setFromObject(sculpture,true);assert.ok(Math.abs(bounds.min.y)<1e-5,theme+' minY '+bounds.min.y);silhouettes.add(bounds.getSize(new THREE.Vector3()).toArray().map(v=>v.toFixed(2)).join(','));}
 assert.equal(silhouettes.size,5);
 const flame=createEmotionEmblem('fire').getObjectByName('pierced-flame-silhouette')!;flame.updateWorldMatrix(true,false);const ray=new THREE.Raycaster(new THREE.Vector3(.25,3.35,4),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(flame).length,0,'flame centre is cut through');
});


test('supplies market uses the rounded ball rack and removes its previous black-ball roof sign',async()=>{
 const {specialBuildings}=await import('../src/specialBuildings');const root=specialBuildings.find(s=>s.id==='market')!.group;const rack=root.getObjectByName('rounded-hollow-triangle-rack') as THREE.Mesh;assert.ok(rack);assert.equal(root.getObjectByName('market-black-ball'),undefined);assert.equal(root.getObjectByName('market-billiard-emblem'),undefined);assert.ok(rack.geometry.userData.roundedCorners);assert.ok((rack.geometry as THREE.ExtrudeGeometry).parameters.options.bevelSegments!>=3);
 root.updateMatrixWorld(true);const roof=new THREE.Box3().setFromObject(root.getObjectByName('market-upper-roof')!),sign=new THREE.Box3().setFromObject(root.getObjectByName('market-rounded-triangle-sign')!);assert.ok(sign.min.y>roof.max.y);assert.ok(sign.min.x>roof.min.x&&sign.max.x<roof.max.x,'rack remains over the roof footprint');
});

test('beach fish market keeps a clear pier aisle, non-overlapping planks, grounded goods and roads free',async()=>{
 const {createBeachFishMarket,createFishTable,createBambooBasket}=await import('../src/beachFishMarket');const {specialBuildings}=await import('../src/specialBuildings');const {roadEdgeDistance}=await import('../src/roadNetwork');
 const source=createBeachFishMarket();source.updateMatrixWorld(true);let boats=0;source.traverse(o=>{if(o.name==='moored-wooden-fishing-boat')boats++;});assert.equal(boats,2);assert.ok(source.getObjectByName('large-fish-roof-sign'));
 const planks:THREE.Box3[]=[];for(const id of ['fish-market-boardwalk','small-fishing-pier']){source.getObjectByName(id)!.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry.type==='BoxGeometry'&&(o.geometry as THREE.BoxGeometry).parameters.height===.18)planks.push(new THREE.Box3().setFromObject(o));});}
 for(let i=0;i<planks.length;i++)for(let j=0;j<i;j++){const a=planks[i],b=planks[j];assert.ok(Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x)<1e-5||Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)<1e-5,'coplanar deck boards do not overlap');}
 const aisle=new THREE.Raycaster(new THREE.Vector3(0,2,9),new THREE.Vector3(0,0,-1),0,18);assert.equal(aisle.intersectObject(source.getObjectByName('fish-market-stalls')!,true).length,0,'central route reaches the pier');
 const table=createFishTable();table.updateMatrixWorld(true);for(const fish of table.children.filter(o=>o.name==='market-fish')){const b=new THREE.Box3().setFromObject(fish,true);assert.ok(b.min.y<=1.366&&b.min.y>=1.34,'fish rests on its tray');}
 const basket=createBambooBasket();basket.updateMatrixWorld(true);const bed=new THREE.Box3().setFromObject(basket.getObjectByName('basket-ice-bed')!),bottom=new THREE.Box3().setFromObject(basket.getObjectByName('basket-closed-bottom')!);assert.ok(bed.min.y<=bottom.max.y,'ice bed rests on basket bottom');
 const entry=specialBuildings.find(s=>s.id==='fishmarket')!;entry.group.updateMatrixWorld(true);for(const name of ['fish-market-boardwalk','fish-market-stalls','fish-market-entry-ramp']){const b=new THREE.Box3().setFromObject(entry.group.getObjectByName(name)!,true);for(let x=b.min.x;x<=b.max.x;x+=.5)for(let z=b.min.z;z<=b.max.z;z+=.5)assert.ok(roadEdgeDistance(x,z)>.35,'fish market clears the real curved road');}
 const hall=specialBuildings.find(s=>s.id==='hall2')!;assert.ok(Math.abs(hall.group.position.z-entry.group.position.z)<1,'fish market is beside the street-corner hall beach');
});


test('fish-market footpath crosses the tram with flush infill and open rail channels',()=>{
 const crossing=world.getObjectByName('fish-market-tram-crossing')!;assert.ok(crossing);crossing.updateWorldMatrix(true,true);
 for(const slot of crossing.userData.railSlots){const origin=new THREE.Vector3(...slot).add(new THREE.Vector3(0,2,0));assert.equal(new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,2.2).intersectObject(crossing,true).length,0,'four real flange channels remain open');}
 assert.equal(crossing.userData.railSlots.length,4);const origin=crossing.position.clone().add(new THREE.Vector3(0,2,0));assert.ok(new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,2.2).intersectObject(crossing,true).length>0,'infill supports the crossing');
});


test('night window masks exclude yellow walls, trim and unoccupied blue glass',async()=>{
 const {windowLightMask}=await import('../src/facadeLighting');
 const mask=windowLightMask(16,[{x:3,y:4,width:4,height:5,lit:true},{x:10,y:4,width:3,height:5,lit:false}]);
 const pixels=mask.image.data;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const expected=x>=3&&x<7&&y>=4&&y<9?255:0;
  assert.equal(pixels[(y*16+x)*4],expected,`mask pixel ${x},${y}`);
 }
 assert.equal(mask.flipY,true,'mask shares canvas facade UV orientation');
 const {getFacadeTex,facadeMaterial}=await import('../src/buildings');
 for(const base of ['#ffe3a1','#ffe6b0','#fff1cf']){
  const unlit=facadeMaterial(getFacadeTex(base,'#254f6c',4,3,0));
  assert.equal(unlit.userData.lightingRole,'window-facade');
  assert.ok(unlit.emissiveMap,'explicit mask attached before night module runs');
  assert.ok(Array.from(unlit.emissiveMap!.image.data).every((v,i)=>i%4===3||v===0),'even yellow walls produce zero emission with lights off');
  const occupied=facadeMaterial(getFacadeTex(base,'#254f6c',4,3,1));
  const data=occupied.emissiveMap!.image.data;
  assert.equal(data[0],0,'corner wall does not emit');
  assert.ok(Array.from(data).some((v,i)=>i%4!==3&&v>0),'occupied glazing emits');
 }
});

test('residential headland stays local and leaves hotel/cafe sites and all port decks unchanged',async()=>{
 const {residentialCliffLift}=await import('../src/residentialCliffPlan');
 const {eastCoast,terrainHeight,ZONES}=await import('../src/layout');
 for(const id of ['hotel','cafe','port','passenger','cargo','fishmarket']){
  const zone=ZONES[id];for(const dx of [-.5,0,.5])for(const dz of [-.5,0,.5])assert.equal(residentialCliffLift(zone.x+zone.w*dx,zone.z+zone.d*dz,eastCoast),0,id+' site is outside headland uplift');
 }
 for(let z=175;z<=197;z+=.5){const x=eastCoast(z),lift=residentialCliffLift(x,z,eastCoast);assert.ok(lift>=0&&lift<=3.8);assert.ok(terrainHeight(x,z)<=6.001,'coastal top remains a low cliff');}
 assert.ok(residentialCliffLift(eastCoast(186),186,eastCoast)>3.7);
});

test('headland roads retain gentle grades and rocks clear their full curved road corridor',async()=>{
 const {roadProfiles}=await import('../src/roadNetwork');
 const {createResidentialCliff}=await import('../src/residentialCliff');
 const {roadEdgeDistance}=await import('../src/roadNetwork');
 for(const road of roadProfiles){const samples=road.curve.getSpacedPoints(Math.ceil(road.curve.getLength()));for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i];if(a.z<155||a.x>115)continue;
  assert.ok(Math.abs(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z)<.16,'residential road grade below 16%');
 }}
 const root=createResidentialCliff();root.updateMatrixWorld(true);
 for(const m of root.getObjectByName('fractured-cliff-blocks')!.children){const box=new THREE.Box3().setFromObject(m);for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z])assert.ok(roadEdgeDistance(x,z)>1.5,'full rock footprint clears roads');}
});

test('cliff core is closed, reefs are submerged into seabed and assemblies are deterministic',async()=>{
 const {createResidentialCliff}=await import('../src/residentialCliff');
 const {isLand}=await import('../src/layout');
 const a=createResidentialCliff(),b=createResidentialCliff();a.updateMatrixWorld(true);
 const core=a.getObjectByName('closed-stratified-cliff-core') as THREE.Mesh;
 const geometry=core.geometry,index=geometry.index!,counts=new Map<string,number>();
 for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){const key=[index.getX(i+j),index.getX(i+(j+1)%3)].sort((x,y)=>x-y).join(':');counts.set(key,(counts.get(key)??0)+1);}
 assert.ok([...counts.values()].every(n=>n===2),'core includes closed ends and base');
 const blocks=a.getObjectByName('fractured-cliff-blocks')!.children;
 assert.ok(blocks.length>30);assert.ok(new Set(blocks.map(m=>m.rotation.y.toFixed(2))).size>10,'bedding angles vary');
 for(const cluster of a.getObjectByName('nearshore-reef-clusters')!.children)for(const m of cluster.children){
  const box=new THREE.Box3().setFromObject(m);assert.ok(Math.abs(box.min.y+3)<1e-5,'reef reaches seabed');assert.ok(box.max.y>-.26&&box.min.y<-.26,'reef crosses waterline');assert.equal(isLand(m.position.x,m.position.z),false);assert.ok(box.min.z>181,'working harbor remains clear');
 }
 assert.deepEqual(a.children.map(c=>c.children.map(m=>m.position.toArray())),b.children.map(c=>c.children.map(m=>m.position.toArray())));
 for(const value of geometry.attributes.position.array)assert.ok(Number.isFinite(value));
});

test('cloud silhouettes are designed groups with deterministic density and fully faded box borders',async()=>{
 const {cloudAssembly,cloudDensityAtlas}=await import('../src/cloudModel');
 const shapes=[];
 for(const kind of ['towering','broken','veil'] as const){
  const lobes=cloudAssembly(kind,83017),atlas=cloudDensityAtlas(lobes,83017);shapes.push(JSON.stringify(lobes));
  assert.ok(lobes.length>=4&&lobes.length<=8);assert.ok(lobes.some(l=>l.name.includes('base')||l.name==='flat-core'));
  assert.deepEqual(lobes,cloudAssembly(kind,83017));assert.notDeepEqual(lobes,cloudAssembly(kind,83018));
  const n=atlas.size;let peak=0,filled=0;
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const value=atlas.data[(((z>>3)*n+y)*atlas.width+(z%8)*n+x)*4];peak=Math.max(peak,value);if(value>30)filled++;
   if([x,y,z].some(v=>v===0||v===n-1))assert.equal(value,0,'no rectangular cut edge');
  }
  assert.ok(peak>130&&filled>n*n,'soft volume has a dense interior');assert.ok(filled<n*n*n*.5,'empty margin preserves cloud silhouette');
 }
 assert.equal(new Set(shapes).size,3);
});

test('cloud field varies height and scale, moves independently and pauses without shifting density',async()=>{
 const {cloudStates,buildClouds,updateClouds}=await import('../src/clouds');buildClouds();
 assert.equal(cloudStates.length,12);assert.equal(cloudStates.filter(c=>c.shadow).length,4);
 assert.ok(new Set(cloudStates.map(c=>c.start.y.toFixed(1))).size>8);
 assert.ok(new Set(cloudStates.map(c=>c.root.userData.width.toFixed(1))).size>8);
 const before=cloudStates.map(c=>c.root.position.clone());updateClouds(0);assert.ok(cloudStates.every((c,i)=>c.root.position.equals(before[i])));
 updateClouds(2);const displacements=cloudStates.map((c,i)=>c.root.position.clone().sub(before[i]));assert.ok(new Set(displacements.map(d=>d.x.toFixed(3)+':'+d.z.toFixed(3))).size>8);
 const paused=cloudStates.map(c=>c.root.position.clone());world.userData.assetView=true;updateClouds(20);assert.ok(cloudStates.every((c,i)=>c.root.position.equals(paused[i])));world.userData.assetView=false;
 for(const c of cloudStates){assert.ok(c.root.position.y-c.root.userData.height/2>140,'cloud envelope stays above buildings');}
});

test('cloud shadows project away from the sun, follow terrain height, fade at dusk and disappear in asset view',async()=>{
 const {projectedCloudShadow}=await import('../src/cloudModel');const {cloudShadowUniforms}=await import('../src/cloudShadows');const {setCloudLighting,disableCloudShadows,updateClouds}=await import('../src/clouds');
 const center=new THREE.Vector3(100,180,50),sun=new THREE.Vector3(.4,.8,.3).normalize();
 const a=projectedCloudShadow(center,sun)!,b=projectedCloudShadow(center,sun,20)!;assert.ok(a.x<center.x&&a.y<center.z);assert.ok(b.x>a.x&&b.y>a.y);assert.equal(projectedCloudShadow(center,new THREE.Vector3(1,0,0)),null);
 setCloudLighting(0,0,0xffffff,0xffaaaa,sun,1.5);updateClouds(0);assert.ok(cloudShadowUniforms.cloudShadowStrength.value>.9);assert.ok(cloudShadowUniforms.cloudShadowWeights.value.some(v=>v>0));
 for(const lobe of cloudShadowUniforms.cloudShadowLobes.value)assert.ok(lobe.toArray().every(Number.isFinite));
 disableCloudShadows();assert.equal(cloudShadowUniforms.cloudShadowStrength.value,0);
 setCloudLighting(1,0,0xffffff,0xffaaaa,new THREE.Vector3(1,-.2,0).normalize(),0);assert.equal(cloudShadowUniforms.cloudShadowStrength.value,0);
 setCloudLighting(0,0,0xffffff,0xffaaaa,sun,1.5);
});

test('cloud preview clones refresh camera-local rays without mutating original uniforms',async()=>{
 const {createCloud,prepareCloudMaterial}=await import('../src/clouds');
 const original=createCloud('towering',83017),copy=original.clone(true),mesh=copy.children[0] as THREE.Mesh;
 mesh.material=prepareCloudMaterial((mesh.material as THREE.ShaderMaterial).clone());const m=mesh.material as THREE.ShaderMaterial;copy.position.set(0,0,0);copy.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,20,100);camera.updateMatrixWorld();(m as any).onBeforeRender(null,null,camera,null,mesh);const first=m.uniforms.cameraLocal.value.clone();
 camera.position.x=50;camera.updateMatrixWorld();(m as any).onBeforeRender(null,null,camera,null,mesh);assert.ok(m.uniforms.cameraLocal.value.distanceTo(first)>1);assert.equal(m.uniformsNeedUpdate,true);
 assert.ok(((original.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.cameraLocal.value.equals(new THREE.Vector3()));
});

test('traffic foundations follow curved-road normals, have grid IDs and leave roads and entrances clear',async()=>{
 const {planTrafficFixtures,baseClear}=await import('../src/trafficPlan');const {gridCell}=await import('../src/mapCoordinates');const {surfaceHeight}=await import('../src/terrainSurface');
 const sites=planTrafficFixtures(),lamps=sites.filter(s=>s.kind==='lamp'),signals=sites.filter(s=>s.kind==='signal');
 assert.ok(lamps.length>=30&&lamps.length<65,'sparse road lighting replaces 148 overlapping poles');assert.ok(signals.length>=15);
 for(const site of sites){assert.ok(baseClear(site.x,site.z));assert.equal(site.grid,gridCell(site.x,site.z).id);assert.notEqual(site.grid,'OUT');assert.ok(Math.abs(site.y+.03-surfaceHeight(site.x,site.z))<1e-6);}
 for(let i=0;i<lamps.length;i++)for(let j=i+1;j<lamps.length;j++)assert.ok(Math.hypot(lamps[i].x-lamps[j].x,lamps[i].z-lamps[j].z)>=25);
 const excluded=planTrafficFixtures((x,z)=>x<50&&z>0);assert.ok(excluded.every(s=>!(s.x<50&&s.z>0)),'entrance exclusion applies to all component foundations');
});

test('signal phases include amber and all-red clearance, and cover every selected road approach',async()=>{
 const {signalColor,junctionPlan,controlledJunctions,planTrafficFixtures}=await import('../src/trafficPlan');const {roadProfiles}=await import('../src/roadNetwork');const sites=planTrafficFixtures();
 for(const ji of controlledJunctions){const j=junctionPlan[ji],primary=[...j.routes].sort((a,b)=>roadProfiles[b].width-roadProfiles[a].width||a-b)[0];
  for(const r of j.routes){const colors=new Set<string>();for(let t=0;t<52;t+=.25){colors.add(signalColor(t,ji,r));if(signalColor(t,ji,primary)!=='red'&&r!==primary)assert.equal(signalColor(t,ji,r),'red');}assert.deepEqual([...colors].sort(),['amber','green','red']);assert.ok(sites.some(s=>s.kind==='signal'&&s.junction===ji&&s.road===r),'every incoming route has a physical signal');}
  assert.ok(Array.from({length:104},(_,i)=>i*.5).some(t=>[...j.routes].every(r=>signalColor(t,ji,r)==='red')));
 }
});

test('traffic lights stop the actual vehicle nose at the marked line and let committed vehicles clear',async()=>{
 const {planTrafficFixtures,registerSignalStops,signalColor,signalAllows}=await import('../src/trafficPlan');const {roadProfiles}=await import('../src/roadNetwork');const {makeTrafficRoute}=await import('../src/trafficSimulation');
 const sites=planTrafficFixtures();registerSignalStops(sites);
 for(const s of sites.filter(s=>s.kind==='signal')){const r=roadProfiles[s.road],fx=-Math.sin(s.heading),fz=-Math.cos(s.heading),normal=new THREE.Vector3(-fz,0,fx),line=new THREE.Vector3(s.x,s.y,s.z).addScaledVector(normal,-(s.curbSide??1)*(r.width/2+1.25)).add(new THREE.Vector3(fx,0,fz).multiplyScalar(-3.6));
  const pose={position:line,heading:Math.atan2(fx,fz),pitch:0},car={id:1,route:makeTrafficRoute(r.curve,s.road),distance:0,length:3.2,width:1.6,desiredSpeed:6,speed:1,waiting:0,pose};const next={...pose,position:line.clone().add(new THREE.Vector3(fx,0,fz).multiplyScalar(.1))};
  const red=Array.from({length:52},(_,i)=>i).find(t=>signalColor(t,s.junction!,s.road)==='red')!,green=Array.from({length:52},(_,i)=>i).find(t=>signalColor(t,s.junction!,s.road)==='green')!;
  assert.equal(signalAllows(car,next,red),false);assert.equal(signalAllows(car,next,green),true);car.pose={...pose,position:line.clone().add(new THREE.Vector3(fx,0,fz).multiplyScalar(4))};assert.equal(signalAllows(car,{...car.pose,position:car.pose.position.clone().add(new THREE.Vector3(fx,0,fz).multiplyScalar(.1))},red),true);
 }registerSignalStops([]);
});

test('rail gate sweep stays clear of train envelope and gives sufficient closing lead time',async()=>{
 const {createCrossingGate,createStreetLamp,createSignalPost}=await import('../src/trafficAssets');
 const gate=createCrossingGate(),arm=gate.getObjectByName('barrier-pivot')!;gate.position.x=3.45;
 for(let i=0;i<=20;i++){arm.rotation.x=-Math.PI*.47*i/20;gate.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(arm);assert.ok(bounds.min.x>3.3,'arm never sweeps into the train');assert.ok(bounds.min.y>=1.15);}
 for(const g of [createStreetLamp(),createSignalPost(),createCrossingGate()]){g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g);assert.ok(Math.abs(b.min.y)<1e-6,'assembly foundation rests on ground');}
 // Forward route-distance warning accounts for both trains and both tracks.
 assert.ok(25-5*1.6>3.6/2+2);
});

test('small residential courts fit clipped land, keep all roof/balcony footprints off roads and retain grid IDs',async()=>{
 const {inside,edgeDistance}=await import('../src/residentialPlan');const {roadEdgeDistance}=await import('../src/roadNetwork');const {gridCell}=await import('../src/mapCoordinates');const {createHome}=await import('../src/residentialAssets');
 const courts=world.userData.residential.courts;assert.ok(courts.length>=8);let count=0;
 for(const court of courts){assert.ok(court.homes.length>=3&&court.homes.length<=5);assert.ok(court.area>290);for(const h of court.homes){count++;assert.equal(h.grid,gridCell(h.x,h.z).id);assert.ok(h.w<=6.8&&h.d<=5.9&&h.floors<=3);const home=createHome((['balcony','bay','shutters'] as const)[h.seed%3],h.seed,h.w,h.d,h.floors);home.position.set(h.x,0,h.z);home.rotation.y=h.heading;home.updateMatrixWorld(true);
  home.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert.ok(inside(court.ring,v.x,v.z),'complete house remains in clipped parcel');assert.ok(roadEdgeDistance(v.x,v.z)>2.1);}});
 }}assert.equal(count,world.userData.residential.homes);
});

test('courtyard gates and front doors connect to gardens without cutting through another home',async()=>{
 const {inside}=await import('../src/residentialPlan');
 for(const court of world.userData.residential.courts){const walks=court.walks.flatMap(w=>w.points.slice(1).map((p,i)=>[w.points[i],p,court.homes.findIndex(h=>h.id===w.owner)]));
  for(const [a,b,owner]of walks)for(let i=1;i<40;i++){const t=i/40,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;assert.ok(inside(court.ring,x,z),'walk remains in actual lot');for(let j=0;j<court.homes.length;j++){if(j===owner)continue;const h=court.homes[j],dx=x-h.x,dz=z-h.z,c=Math.cos(h.heading),s=Math.sin(h.heading);assert.ok(Math.abs(dx*c-dz*s)>h.w/2+.5||Math.abs(dx*s+dz*c)>h.d/2+.7,'no path through a neighbouring house');}}
 }
});

test('residential windows are recessed openings, roofs stay independent and only selected glass emits',async()=>{
 const {createHome,batchResidentialGeometry}=await import('../src/residentialAssets');
 for(const style of ['balcony','bay','shutters'] as const){const home=createHome(style,23001,6.5,5.9,3);home.updateMatrixWorld(true);const front=home.getObjectByName('front-facade')!,wall=front.getObjectByName('perforated-wall') as THREE.Mesh,shape=(wall.geometry as THREE.ExtrudeGeometry).parameters.shapes as THREE.Shape;assert.equal(shape.holes.length,9);
  let glass=0,lit=0;home.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const mat=o.material as THREE.MeshToonMaterial;assert.ok(!mat.map,'residential detail is real geometry');if(o.name==='recessed-glass'){glass++;if(mat.userData.inhabited)lit++;assert.ok(o.position.z<-.1);} });assert.ok(glass>20&&lit>0&&lit<glass);
  const roof=home.getObjectByName('independent-residential-roof')!;assert.ok(new THREE.Box3().setFromObject(roof).min.y>8.6);batchResidentialGeometry(home);assert.ok(home.userData.draws<20);assert.ok(home.getObjectByName('residential-material-batches')!.children.length>3);
 }
});

test('all four bus shelters keep their complete canopy and waiting footprint outside every driving lane',async()=>{
 const {roadEdgeDistance}=await import('../src/roadNetwork');const {gridCell}=await import('../src/mapCoordinates');const stops=world.userData.busStops;assert.equal(stops.length,4);
 for(const s of stops){assert.equal(s.grid,gridCell(s.x,s.z).id);for(const [x,z]of s.footprint)assert.ok(roadEdgeDistance(x,z)>=.6);const root=world.getObjectByName(s.id)!;root.updateMatrixWorld(true);const roof=root.getObjectByName('rain-canopy') as THREE.Mesh,p=roof.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(roof.matrixWorld);assert.ok(roadEdgeDistance(v.x,v.z)>.6,'not just posts: every canopy corner clears the lane');}}
});

test('residential entrance stairs meet the rendered terrain, previews include paths, and random forest stays outside courts',async()=>{
 const {createResidentialCourt,courtSample}=await import('../src/residential');const {surfaceHeight}=await import('../src/terrainSurface');const {blocked}=await import('../src/vegetation');
 assert.ok(courtSample?.getObjectByName('clipped-preview-terrain'));assert.ok(courtSample?.getObjectByName('preview-garden-walk'));
 for(const plan of world.userData.residential.courts){const court=createResidentialCourt(plan,true);court.updateMatrixWorld(true);const steps=court.children.filter(o=>o.name==='entrance-terrain-step') as THREE.Mesh[];assert.equal(steps.length,plan.homes.length*3);for(let i=2;i<steps.length;i+=3){const step=steps[i],box=new THREE.Box3().setFromObject(step),ground=surfaceHeight(step.position.x,step.position.z);assert.ok(Math.abs(box.max.y-ground-.055)<1e-5,'last tread meets the path');assert.ok(box.min.y<ground,'step has a solid footing');}for(const h of plan.homes)assert.ok(blocked(h.x,h.z,1.4),'forest cannot spawn through the new buildings');}
});

test('coastal terminus matches the pictured tram end, clears the road and leaves the fish-market walk open',async()=>{
 const {STATION_PLAN,STATION_ORIGIN}=await import('../src/coastalStationPlan');const {transit}=await import('../src/transport');const {coastalStation,coastalStationPreview}=await import('../src/coastalStation');const {roadEdgeDistance}=await import('../src/roadNetwork');const {gridCell}=await import('../src/mapCoordinates');
 const {nearestRailPoint}=await import('../src/railNetwork');assert.ok(nearestRailPoint(transit[0].curve,STATION_ORIGIN.x,STATION_ORIGIN.z).distance<.15);assert.equal(gridCell(STATION_ORIGIN.x,STATION_ORIGIN.z).id,STATION_PLAN.grid);coastalStation!.updateMatrixWorld(true);let checked=0;
 coastalStation!.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert.ok(roadEdgeDistance(v.x,v.z)>.6,'whole station footprint clears asphalt');assert.ok(v.z>=58.49,'no station part blocks the existing z=57 crossing approach');checked++;}});assert.ok(checked>10000);assert.ok(coastalStationPreview?.getObjectByName('preview-running-rail'));assert.ok(coastalStationPreview?.getObjectByName('preview-station-forecourt'));
});

test('through-station boards all three cars and has no buffer across the loop',async()=>{
 const {transit}=await import('../src/transport');const {carPose}=await import('../src/railOperations');const {STATION_ORIGIN,STATION_HEADING,STATION_PLAN}=await import('../src/coastalStationPlan');const {coastalStation}=await import('../src/coastalStation');const train=transit[0],stop=train.stops.find(s=>s.id==='coast-0.955-14')!;assert.ok(stop);assert.equal(train.plan.cars,3);
 for(let i=0;i<train.plan.cars;i++){const p=carPose(train.curve,stop.distance-i*train.plan.carPitch,train.plan.carLength*.54).position.sub(STATION_ORIGIN).applyAxisAngle(new THREE.Vector3(0,1,0),-STATION_HEADING);assert.ok(p.z>-STATION_PLAN.platformLength+1&&p.z<-.5,'each coach centre boards at the through-platform');}
 assert.equal(coastalStation!.getObjectByName('terminal-end-fence'),undefined);assert.equal(coastalStation!.getObjectByName('red-white-buffer-beam'),undefined);
});

test('station ramp has a clear flat turn, grounded terminal stairs and a clock above the main roof',async()=>{
 const {coastalStation}=await import('../src/coastalStation');const {createStationRoof}=await import('../src/coastalStationAssets');const {surfaceHeight}=await import('../src/terrainSurface');const root=coastalStation!;assert.ok(root.getObjectByName('flat-ramp-turn-landing'));assert.ok(world.userData.coastalStation.ramp.rise/world.userData.coastalStation.ramp.run<1/12+.001);
 const steps=root.children.filter(o=>o.name==='station-entrance-stair');assert.equal(steps.length,5);const last=steps[4],p=new THREE.Vector3();last.getWorldPosition(p);const box=new THREE.Box3().setFromObject(last);assert.ok(Math.abs(box.max.y-surfaceHeight(p.x,p.z)-.055)<1e-5);
 const roof=createStationRoof();roof.updateMatrixWorld(true);const clock=new THREE.Box3().setFromObject(roof.getObjectByName('station-clock')!),main=new THREE.Box3().setFromObject(roof.getObjectByName('blue-standing-seam-gable')!);assert.ok(clock.min.y>main.max.y+.04,'roof cannot hide the clock face');
});

test('both slopes of the continuous station canopy have outward upward normals after batching',async()=>{
 const {coastalStation}=await import('../src/coastalStation');const canopy=coastalStation!.getObjectByName('curved-platform-canopy')!;let count=0;canopy.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const m=o.material as THREE.MeshToonMaterial;if(m.color.getHex()!==0x367f9b)return;const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++){assert.ok(n.getY(i)>.9,'neither roof slope faces down');count++;}});assert.ok(count>0);
});

test('both rail fleets circulate for ten minutes without reversing, catching up or leaving the track envelope',async()=>{
 const {transit}=await import('../src/transport');const {advanceRail,carPose}=await import('../src/railOperations');const states=transit.map(t=>({...t.state}));let minSeparation=Infinity;
 for(let frame=0;frame<3000;frame++){for(let i=0;i<transit.length;i++){const t=transit[i],before=states[i].distance;states[i]=advanceRail(states[i],.2,t.speed,t.curve.getLength(),t.stops);const delta=(states[i].distance-before+t.curve.getLength())%t.curve.getLength();assert.ok(delta<=t.speed*.2+.00001,'always forward, including departure after dwell');}
  for(const start of [0,2]){const t=transit[start],a=states[start],b=states[start+1];for(let i=0;i<t.plan.cars;i++)for(let j=0;j<t.plan.cars;j++){const p=carPose(t.curve,a.distance-i*t.plan.carPitch,t.plan.carLength*.54).position,q=carPose(t.curve,b.distance-j*t.plan.carPitch,t.plan.carLength*.54).position,d=p.distanceTo(q);minSeparation=Math.min(minSeparation,d);assert.ok(d>t.plan.carLength+2,'two fleets retain separation through stops and turns');}}
 }assert.equal(transit.length,4);console.log({railFleetMinimumSeparation:minSeparation});
});

test('double rail civil works clear roads, terrain and fixed landmark envelopes',async()=>{
 const {railRoutes}=await import('../src/transport');const {roadEdgeDistance}=await import('../src/roadNetwork');const {surfaceHeight}=await import('../src/terrainSurface');const {specialBuildings}=await import('../src/specialBuildings');
 for(const {plan,curve}of railRoutes){for(const p of curve.getSpacedPoints(900)){assert.ok(p.y-surfaceHeight(p.x,p.z)>(plan.elevated?6:.4),'rail bed stays above terrain');if(!plan.elevated)assert.ok(roadEdgeDistance(p.x,p.z)>3.6,'both ground tracks and their bed clear asphalt');
  for(const entry of specialBuildings){if(entry.id==='coaststation')continue;const box=new THREE.Box3().setFromObject(entry.group);box.min.x-=1.5;box.max.x+=1.5;box.min.z-=1.5;box.max.z+=1.5;if(p.y<box.max.y+.2&&p.y+3>box.min.y)assert.ok(p.x<box.min.x||p.x>box.max.x||p.z<box.min.z||p.z>box.max.z,plan.id+' avoids '+entry.id);}
 }
 const root=world.getObjectByName(plan.id+'-double-track-circuit')!;for(const [x,,z]of root.userData.piers)for(const dx of [-.75,.75])for(const dz of [-.9,.9])assert.ok(roadEdgeDistance(x+dx,z+dz)>.5,'whole viaduct pier avoids traffic');
 }
});

test('tapered neighbouring coach bodies do not intersect around either complete circuit',async()=>{
 const {createRailCar}=await import('../src/railVehicles');const {railRoutes}=await import('../src/transport');const {carPose}=await import('../src/railOperations');
 type P={x:number;z:number};const cross=(a:P,b:P,c:P)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
 const hull=(points:P[])=>{points.sort((a,b)=>a.x-b.x||a.z-b.z);const a:P[]=[],b:P[]=[];for(const p of points){while(a.length>1&&cross(a[a.length-2],a[a.length-1],p)<=0)a.pop();a.push(p);}for(const p of [...points].reverse()){while(b.length>1&&cross(b[b.length-2],b[b.length-1],p)<=0)b.pop();b.push(p);}a.pop();b.pop();return [...a,...b];};
 const overlap=(a:P[],b:P[])=>{for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],nx=q.z-p.z,nz=p.x-q.x,pa=a.map(p=>p.x*nx+p.z*nz),pb=b.map(p=>p.x*nx+p.z*nz);if(Math.max(...pa)<Math.min(...pb)||Math.max(...pb)<Math.min(...pa))return false;}return true;};
 for(const {plan,curve}of railRoutes){const shapes=[0,1].map(index=>{const car=createRailCar(plan,index);car.updateMatrixWorld(true);const points:P[]=[];car.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y>.7)points.push({x:v.x,z:v.z});}});return hull(points);});
  for(let i=0;i<700;i++){const d=i/700*curve.getLength(),polygons=shapes.map((h,j)=>{const pose=carPose(curve,d-j*plan.carPitch,plan.carLength*.54),c=Math.cos(pose.heading),s=Math.sin(pose.heading);return h.map(p=>({x:pose.position.x+p.x*c+p.z*s,z:pose.position.z-p.x*s+p.z*c}));});assert.equal(overlap(polygons[0],polygons[1]),false,plan.id+' coach collision at '+i/700);}
 }
});

test('tunnel arches are genuine holes with solid reveals and no face across traffic',async()=>{
 const {createTunnelArch,createTunnelPortal}=await import('../src/roadTunnels');
 const portal=createTunnelPortal();portal.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,2,-8),new THREE.Vector3(0,0,1),0,14);
 assert.equal(ray.intersectObject(portal,true).length,0,'centre of doorway remains open');
 for(const x of [-5.65,5.65]){ray.set(new THREE.Vector3(x,2,-8),new THREE.Vector3(0,0,1));assert.ok(ray.intersectObject(createTunnelArch(),true).length>0,'solid arch jamb');}
});
test('tunnel roads use separate deck height and preserve the mountain roof',async()=>{
 const {tunnelFrame,tunnelLength,TUNNEL}=await import('../src/tunnelPlan');const {tunnelDrivingHeight}=await import('../src/tunnelTraffic');
 for(let s=5;s<tunnelLength-5;s+=.5){const f=tunnelFrame(s/tunnelLength);
 for(const side of [-1,0,1]){const p=f.p.clone().addScaledVector(f.right,side*2.65),deck=tunnelDrivingHeight(p.x,p.z)!;assert.ok(Math.abs(deck-f.p.y-.025)<.04);assert.ok(surfaceHeight(p.x,p.z)>deck+TUNNEL.spring+Math.sqrt(TUNNEL.innerRadius**2-2.65**2)+.4,'continuous terrain stays above vehicle cavity');}}
});
test('tunnel traffic has no portal turn caps and buses clear both walls through the whole bend',async()=>{
 const {tunnelTrafficSources,tunnelDrivingHeight}=await import('../src/tunnelTraffic');const {tunnelLocation,tunnelLength,tunnelFrame,TUNNEL}=await import('../src/tunnelPlan');
 const {makeTrafficRoute,poseAt}=await import('../src/trafficSimulation');const sources=tunnelTrafficSources();assert.equal(sources.length,9);assert.equal(sources.some(s=>s.id===9),false);
 const route=makeTrafficRoute(sources[0].curve,0);let seen=0;
 for(let d=0;d<route.length;d+=.25){const pose=poseAt(route,d),n=tunnelLocation(pose.position.x,pose.position.z);if(n.distance>3||n.t*tunnelLength<4||(1-n.t)*tunnelLength<4)continue;seen++;
 for(const longitudinal of [-2.85,0,2.85])for(const lateral of [-1,1]){const x=pose.position.x+Math.sin(pose.heading)*longitudinal+Math.cos(pose.heading)*lateral,z=pose.position.z+Math.cos(pose.heading)*longitudinal-Math.sin(pose.heading)*lateral,q=tunnelLocation(x,z);assert.ok(q.distance<TUNNEL.innerRadius-.15,'bus swept rectangle clears arch walls');}
 assert.ok(tunnelDrivingHeight(pose.position.x,pose.position.z)!<surfaceHeight(pose.position.x,pose.position.z)-4,'traffic stays underground');
 }
 assert.ok(seen>250,'both directions traverse the entire tunnel');
 for(const t of [0,1]){const f=tunnelFrame(t),near=sources[0].curve.getSpacedPoints(3000).filter(p=>p.distanceTo(f.p)<1.5);assert.ok(near.length>0);}
});
test('tunnel alignment stays on land with a usable radius and bounded mountain-road gradient',async()=>{
 const {tunnelCurve,tunnelFrame,TUNNEL}=await import('../src/tunnelPlan');const {isLand}=await import('../src/layout');let maxGrade=0,minRadius=Infinity;
 for(let i=1;i<999;i++){const a=tunnelCurve.getPointAt((i-1)/1000),b=tunnelCurve.getPointAt((i+1)/1000),f=tunnelFrame(i/1000),dot=tunnelFrame((i-1)/1000).forward.dot(tunnelFrame((i+1)/1000).forward);
 maxGrade=Math.max(maxGrade,Math.abs(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z));minRadius=Math.min(minRadius,a.distanceTo(b)/Math.acos(Math.min(1,dot)));
 for(const side of [-1,1]){const p=f.p.clone().addScaledVector(f.right,side*(TUNNEL.innerRadius+TUNNEL.thickness));assert.ok(isLand(p.x,p.z),'complete shell remains within peninsula');}}
 assert.ok(minRadius>10);assert.ok(maxGrade<.11);
});
test('joined-road buses and cars circulate through both mouths for ten minutes without overlaps',async()=>{
 const {tunnelTrafficSources}=await import('../src/tunnelTraffic');const {tunnelLocation}=await import('../src/tunnelPlan');const {makeTrafficRoute,poseAt,stepTraffic,vehiclesOverlap}=await import('../src/trafficSimulation');
 const route=makeTrafficRoute(tunnelTrafficSources()[0].curve,0),cars=Array.from({length:6},(_,id)=>({id,route,distance:id*route.length/6,length:id<2?5.7:3.2,width:id<2?2:1.6,desiredSpeed:7,speed:0,waiting:0,pose:poseAt(route,id*route.length/6)}));const entered=new Set<number>();
 for(let i=0;i<6000;i++){stepTraffic(cars,[],.1);for(const car of cars){const n=tunnelLocation(car.pose.position.x,car.pose.position.z);if(n.distance<2.5&&n.t>.1&&n.t<.9)entered.add(car.id);}if(i%10===0)for(let a=0;a<cars.length;a++)for(let b=a+1;b<cars.length;b++)assert.equal(vehiclesOverlap(cars[a],cars[b],0),false);}
 assert.equal(entered.size,6);assert.ok(cars.every(c=>c.waiting<20),'circulation remains live');
});
test('underground road and lining expose the correct driving-side faces',async()=>{
 const {createRoadTunnel}=await import('../src/roadTunnels');const {tunnelFrame}=await import('../src/tunnelPlan');const site=createRoadTunnel();site.updateMatrixWorld(true);
 for(const t of [.1,.3,.5,.7,.9]){const f=tunnelFrame(t),origin=f.p.clone().add(new THREE.Vector3(0,2,0));for(const direction of [new THREE.Vector3(0,1,0),f.right,f.right.clone().negate()]){const ray=new THREE.Raycaster(origin,direction);assert.ok(ray.intersectObject(site,true).some(h=>['swept-hollow-shell','portal-curved-lining-collar'].includes(h.object.name)),'inside-facing shell');}
 const down=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0));assert.ok(down.intersectObject(site,true).some(h=>h.object.name==='independent-underground-road'&&h.distance<2.1),'road faces upward');}
});
test('coastal retaining faces sample the raised shoreline instead of falling through Float32 bounds',async()=>{
 const {westCoast,eastCoast}=await import('../src/layout');const {terrainPositions,terrainCols,terrainRows}=await import('../src/terrainSurface');
 for(let row=0;row<=terrainRows;row++){const z=-200+row*2;for(const [coast,col]of [[westCoast,0],[eastCoast,terrainCols]] as const){const expected=terrainPositions[(row*(terrainCols+1)+col)*3+1];assert.ok(Math.abs(surfaceHeight(coast(z),z)-expected)<.0001,'cliff top meets its terrain vertex');}}
});
test('the integrated nine-road network stays live and collision-free with joined tunnel traffic',async()=>{
 const {tunnelTrafficSources}=await import('../src/tunnelTraffic');const {makeTrafficRoute,poseAt,findJunctions,stepTraffic,vehiclesOverlap}=await import('../src/trafficSimulation');const {signalAllows}=await import('../src/trafficPlan');
 const routes=tunnelTrafficSources().map(s=>makeTrafficRoute(s.curve,s.id)),zones=findJunctions(routes),cars:any[]=[];
 for(let id=0;id<28;id++){const route=routes[id%routes.length],bus=id%7===0,car={id,route,distance:0,length:bus?5.7:3.2,width:bus?2:1.6,desiredSpeed:5+(id%4)*.6,speed:0,waiting:0,pose:poseAt(route,0)};
 for(let attempt=0;attempt<160;attempt++){car.distance=((Math.floor(id/routes.length)+.2)*route.length/4+attempt*7.3)%route.length;car.pose=poseAt(route,car.distance);if(zones.some(z=>Math.hypot(car.pose.position.x-z.position.x,car.pose.position.z-z.position.z)<z.radius+car.length)||cars.some(other=>vehiclesOverlap(car,other,3)))continue;cars.push(car);break;}}
 assert.equal(cars.length,28);const moved=new Map(cars.map(c=>[c.id,0]));
 for(let i=0;i<3000;i++){const before=cars.map(c=>c.distance);stepTraffic(cars,zones,.1,(c,n)=>signalAllows(c,n,i*.1));for(let k=0;k<cars.length;k++)moved.set(cars[k].id,moved.get(cars[k].id)!+(cars[k].distance-before[k]+cars[k].route.length)%cars[k].route.length);if(i%10===0)for(let a=0;a<cars.length;a++)for(let b=a+1;b<cars.length;b++)assert.equal(vehiclesOverlap(cars[a],cars[b],0),false);}
 assert.ok([...moved.values()].every(d=>d>100),'every car makes progress in five minutes');assert.ok(cars.every(c=>c.waiting<90),'no permanent tunnel/junction queue');
});
test('portal contact matches rendered apron triangles and no foundation protrudes through asphalt',async()=>{
 const {createRoadTunnel}=await import('../src/roadTunnels');const {tunnelPortals}=await import('../src/tunnelPlan');const {tunnelDrivingHeight}=await import('../src/tunnelTraffic');
 const site=createRoadTunnel();site.updateMatrixWorld(true);const decks:THREE.Mesh[]=[],asphalt:THREE.Mesh[]=[];
 site.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='graded-portal-apron'){decks.push(o);if((o.material as THREE.MeshToonMaterial).color.getHex()===0x526d87)asphalt.push(o);}});
 for(const f of tunnelPortals)for(let s=-5.9;s<-.04;s+=.13)for(const side of [-2,-1.65,0,1.65,2]){
  const p=f.p.clone().addScaledVector(f.into,s).addScaledVector(f.right,side),ray=new THREE.Raycaster(new THREE.Vector3(p.x,80,p.z),new THREE.Vector3(0,-1,0));
  const road=ray.intersectObjects(asphalt)[0],top=ray.intersectObjects(decks)[0];assert.ok(road&&top,'both lanes have an actual apron');
  assert.ok(Math.abs(tunnelDrivingHeight(p.x,p.z)!-road.point.y)<.0001,'vehicle height uses actual triangles');
  assert.ok(Math.abs(top.point.y-road.point.y)<.0001,'foundation stays beneath the driving surface');
 }
});
test('apron slab closure has no unpaired mesh edges and does not mutate contact profiles',async()=>{
 const {createRoadTunnel}=await import('../src/roadTunnels');const {apronProfile}=await import('../src/tunnelAprons');const {tunnelPortals}=await import('../src/tunnelPlan');
 const snapshots=tunnelPortals.map(f=>Array.from(apronProfile(f,f.t===0?5:9,.025).positions));
 const site=createRoadTunnel();site.traverse(o=>{if(!(o instanceof THREE.Mesh)||o.name!=='graded-portal-apron'||(o.material as THREE.MeshToonMaterial).color.getHex()!==0xe0d6b9)return;
  const edges=new Map<string,number>(),index=o.geometry.index!;for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){const a=index.getX(i+j),b=index.getX(i+(j+1)%3),key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)??0)+1);}assert.ok([...edges.values()].every(n=>n===2),'foundation is a closed solid');
 });
 tunnelPortals.forEach((f,i)=>assert.deepEqual(Array.from(apronProfile(f,f.t===0?5:9,.025).positions),snapshots[i]));
});
test('both straight portal throats join the curved lining without exposed gaps',async()=>{
 const {createRoadTunnel}=await import('../src/roadTunnels');const {tunnelFrame,tunnelLength}=await import('../src/tunnelPlan');const site=createRoadTunnel();site.updateMatrixWorld(true);
 for(const end of [0,1])for(let s=3.85;s<5.4;s+=.11){const f=tunnelFrame(end?1-s/tunnelLength:s/tunnelLength),origin=f.p.clone().add(new THREE.Vector3(0,2,0));
  for(const direction of [new THREE.Vector3(0,1,0),f.right,f.right.clone().negate()]){const ray=new THREE.Raycaster(origin,direction,0,7);assert.ok(ray.intersectObject(site,true).some(h=>['tunnel-arch-solid-open','portal-curved-lining-collar','swept-hollow-shell'].includes(h.object.name)),'roof and both walls close the straight-to-curved joint');}
 }
});

test('four editable fleet models retain bounds, light roles and nested transforms after batching',async()=>{
 const {createFleetVehicle}=await import('../src/fleetAssets');const {batchVehicle}=await import('../src/vehicles');
 for(const kind of ['truck','taxi','police','speedboat'] as const){const source=createFleetVehicle(kind),batched=createFleetVehicle(kind,true),box=new THREE.Box3().setFromObject(source),batchBox=new THREE.Box3().setFromObject(batched);
  assert.ok(box.min.distanceTo(batchBox.min)<.00001&&box.max.distanceTo(batchBox.max)<.00001,kind+' batching retains full shape');
  const size=box.getSize(new THREE.Vector3()),nominal=source.userData.nominalSize;assert.ok(box.max.x<=nominal.width/2+.00001&&box.min.x>=-nominal.width/2-.00001&&box.max.z<=nominal.length/2+.00001&&box.min.z>=-nominal.length/2-.00001,'centered traffic envelope includes mirrors and asymmetric equipment');
  assert.ok(source.children.length>=3,'editable structural groups');assert.equal(source.userData.forward,'+Z');
  if(kind!=='speedboat')assert.ok(Math.abs(box.min.y)<.00001,'wheel bottoms contact the road');else assert.ok(box.min.y<-.4&&box.max.y>1,'keel/motor below waterline, windscreen above');
  let triangles=0;source.traverse(o=>{if(o instanceof THREE.Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const attribute of Object.values(o.geometry.attributes))for(const value of attribute.array)assert.ok(Number.isFinite(value));}});assert.ok(triangles<5000,'bounded model complexity');
  source.position.set(15,4,-8);source.rotation.y=.7;const relocated=batchVehicle(source);const relocatedBox=new THREE.Box3().setFromObject(relocated);assert.ok(relocatedBox.min.distanceTo(box.min)<.0001&&relocatedBox.max.distanceTo(box.max)<.0001,'batching strips root placement but keeps child placement');
 }
 const police=createFleetVehicle('police');for(const [name,color]of [['red-police-lens',0xe14c50],['blue-police-lens',0x4b9fe8]] as const){const lens=police.getObjectByName(name) as THREE.Mesh,material=lens.material as THREE.MeshToonMaterial;assert.equal(material.userData.lightingRole,'vehicle-light');assert.equal(material.emissive.getHex(),color,'colored lenses retain their own hue');}
});
test('truck windows and front wheel arches are cut into real cab panels',async()=>{
 const {createFleetVehicle}=await import('../src/fleetAssets');const truck=createFleetVehicle('truck');truck.updateMatrixWorld(true);const panels:THREE.Mesh[]=[];truck.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='pierced-cab-side')panels.push(o);});
 for(const [y,z,open]of [[1.9,1.5,true],[.79,1.86,true],[2.5,1.0,false]] as const){const ray=new THREE.Raycaster(new THREE.Vector3(3,y,z),new THREE.Vector3(-1,0,0),0,6);assert.equal(ray.intersectObjects(panels).length===0,open,'side window/arch has depth and frame');}
 const front=truck.getObjectByName('pierced-cab-front')!;assert.equal(new THREE.Raycaster(new THREE.Vector3(0,1.8,4),new THREE.Vector3(0,0,-1),0,2).intersectObject(front).length,0,'front windshield is not painted on solid wall');
});
test('speedboat has an open cockpit, closed V hull, solid foredeck and outward livery faces',async()=>{
 const {createFleetVehicle}=await import('../src/fleetAssets');const boat=createFleetVehicle('speedboat');boat.updateMatrixWorld(true);const hull=boat.getObjectByName('closed-v-hull-shell') as THREE.Mesh;
 const inside=new THREE.Raycaster(new THREE.Vector3(0,3,-.8),new THREE.Vector3(0,-1,0)).intersectObject(hull)[0];assert.ok(inside&&inside.point.y<0,'cockpit remains open down to inner hull');
 const keel=new THREE.Raycaster(new THREE.Vector3(0,-2,-.8),new THREE.Vector3(0,1,0)).intersectObject(hull)[0];assert.ok(keel&&keel.point.y<-.3,'outward-facing keel closes the underside');
 const deck=new THREE.Raycaster(new THREE.Vector3(0,3,1.8),new THREE.Vector3(0,-1,0)).intersectObject(boat.getObjectByName('solid-bow-deck')!)[0];assert.ok(deck&&deck.point.y>.7);
 const inlays:THREE.Object3D[]=[];boat.traverse(o=>{if(o.name==='hull-livery-inlay')inlays.push(o);});for(const side of [-1,1]){const hits=new THREE.Raycaster(new THREE.Vector3(side*3,.56,0),new THREE.Vector3(-side,0,0),0,2.3).intersectObjects(inlays);assert.ok(hits.length>0,'both livery sides face outward');}
 const edges=new Map<string,number>(),index=hull.geometry.index!;for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){const a=index.getX(i+j),b=index.getX(i+(j+1)%3),key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)??0)+1);}assert.ok([...edges.values()].every(n=>n===2),'hollow hull shell is a closed solid');
});
test('offshore speedboats retain whole-hull clearance, heading and safe opposite-phase spacing',async()=>{
 const {speedboatRoute,speedboatPose}=await import('../src/marineTraffic');const {createFleetVehicle}=await import('../src/fleetAssets');const {isLand}=await import('../src/layout');const box=new THREE.Box3().setFromObject(createFleetVehicle('speedboat')),length=speedboatRoute.getLength();let radius=Infinity;
 for(let i=1;i<600;i++){const d=i/600*length,pose=speedboatPose(d),tangent=speedboatRoute.getTangentAt(i/600);assert.ok(Math.sin(pose.heading)*tangent.x+Math.cos(pose.heading)*tangent.z>.999);
  for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),pose.heading).add(pose.position);assert.ok(!isLand(p.x,p.z)&&p.x< -132&&p.z< -90,'full craft clears shore, sailboat lane and harbors');}
  assert.ok(pose.position.distanceTo(speedboatPose(d+length/2).position)>45,'two boats remain separated');const a=speedboatRoute.getPointAt((i-1)/600),b=speedboatRoute.getPointAt((i+1)/600),u=speedboatRoute.getTangentAt((i-1)/600),v=speedboatRoute.getTangentAt((i+1)/600);radius=Math.min(radius,a.distanceTo(b)/Math.acos(Math.min(1,u.dot(v))));
 }
 assert.ok(radius>15,'wide sweep avoids abrupt high-speed turns');assert.ok(speedboatPose(0).position.distanceTo(speedboatPose(length).position)<.00001,'closed route does not teleport');
});
test('mixed road fleet uses its complete physical sizes and stays live without collisions',async()=>{
 const {cars}=await import('../src/traffic');const {poseAt,findJunctions,stepTraffic,vehiclesOverlap}=await import('../src/trafficSimulation');const {signalAllows,registerSignalStops}=await import('../src/trafficPlan');const {infrastructureSites}=await import('../src/trafficInfrastructure');registerSignalStops(infrastructureSites);
 assert.equal(cars.length,28);for(const kind of ['truck','taxi','police'])assert.ok(cars.some(c=>c.mesh.userData.vehicleKind===kind),kind+' is integrated');
 const simulated=cars.map(c=>({...c,pose:poseAt(c.route,c.distance)})),routes=[...new Set(cars.map(c=>c.route))],zones=findJunctions(routes),moved=simulated.map(()=>0);
 for(const car of cars)if(['truck','taxi','police'].includes(car.mesh.userData.vehicleKind)){assert.equal(car.width,car.mesh.userData.nominalSize.width);assert.equal(car.length,car.mesh.userData.nominalSize.length);}
 for(let i=0;i<3000;i++){const before=simulated.map(c=>c.distance);stepTraffic(simulated,zones,.1,(c,p)=>signalAllows(c,p,i*.1));simulated.forEach((c,j)=>moved[j]+=(c.distance-before[j]+c.route.length)%c.route.length);if(i%10===0)for(let a=0;a<simulated.length;a++)for(let b=a+1;b<simulated.length;b++)assert.equal(vehiclesOverlap(simulated[a],simulated[b],0),false,'mixed fleet overlap');}
 assert.ok(moved.every(d=>d>100));assert.ok(simulated.every(c=>c.waiting<90));registerSignalStops([]);
});
test('truck cargo crossmembers carry the box while its frame clears the dual rear tyres',async()=>{
 const {createFleetVehicle}=await import('../src/fleetAssets');const truck=createFleetVehicle('truck');truck.updateMatrixWorld(true);const frame=new THREE.Box3().setFromObject(truck.getObjectByName('ladder-frame')!),floor=new THREE.Box3().setFromObject(truck.getObjectByName('cargo-floor')!),supports:THREE.Object3D[]=[];
 truck.traverse(o=>{if(o.name==='truck-tyre')assert.equal(frame.intersectsBox(new THREE.Box3().setFromObject(o)),false,'frame leaves tyre clearance');if(o.name==='cargo-crossmember')supports.push(o);});assert.equal(supports.length,3);for(const support of supports){const box=new THREE.Box3().setFromObject(support);assert.ok(box.intersectsBox(frame)&&box.intersectsBox(floor),'floor is supported from the chassis');}
});
test('both speedboat cockpits remain above the animated sea throughout ten minutes',async()=>{
 const {createFleetVehicle}=await import('../src/fleetAssets');const {speedboatMotion,speedboatRoute}=await import('../src/marineTraffic');const boat=createFleetVehicle('speedboat');boat.updateMatrixWorld(true);const floor=new THREE.Box3().setFromObject(boat.getObjectByName('cockpit-floor')!),length=speedboatRoute.getLength();let margin=Infinity;
 for(let t=0;t<=600;t+=.25)for(let i=0;i<2;i++){const pose=speedboatMotion(i*length/2+t*8,i*Math.PI,t),rotation=new THREE.Euler(pose.pitch,pose.heading,pose.roll,'YXZ');
  for(const x of [floor.min.x,floor.max.x])for(const z of [floor.min.z,floor.max.z]){const p=new THREE.Vector3(x,floor.max.y,z).applyEuler(rotation).add(pose.position);
   // Same geometric swell as water.ts's vertex shader, independently evaluated at the floor.
   const water=.15*Math.sin(p.x*.025+p.z*.016+t*.8)+.09*Math.sin(-p.x*.017+p.z*.04-t*.65);margin=Math.min(margin,p.y-water);}
 }
 assert.ok(margin>.025,'water cannot flash through the cockpit floor during bob/pitch/roll');
});

test('facility courtyard routes and hospital landing stay clear and connected',async()=>{
 const {createFacilityCourtyard}=await import('../src/facilityCourtyards');
 for(const kind of ['hospital','campus'] as const){
  const root=createFacilityCourtyard(kind);root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root,true);
  assert.ok(box.min.x>=-22&&box.max.x<=18);
  assert.ok(box.min.z>=(kind==='campus'?-23:-12)&&box.max.z<=38);
  for(const route of root.userData.clearRoutes){
   const clearance=new THREE.Box3(new THREE.Vector3(route.x-route.w/2,.85,route.z-route.d/2),new THREE.Vector3(route.x+route.w/2,2.5,route.z+route.d/2));
   for(const part of root.children){if(['walkways','entrance-ramp','ambulance-apron'].includes(part.name))continue;
    assert.ok(!clearance.intersectsBox(new THREE.Box3().setFromObject(part,true)),kind+' '+part.name+' blocks a clear route');
   }
  }
  for(const pergola of root.children.filter(p=>p.name==='pergola')){
   const posts=pergola.children.filter(o=>o instanceof THREE.Mesh&&(o.geometry as THREE.BoxGeometry).parameters?.height===2.95);
   assert.equal(posts.length,4);
  }
  const placed=world.getObjectByName(kind+'-courtyard')!;assert.ok(placed);assert.equal(placed.parent?.name,'special-'+kind);
  assert.ok(placed.getWorldScale(new THREE.Vector3()).distanceTo(new THREE.Vector3(1,1,1))<1e-6);
  if(kind==='hospital'){
   const ramp=root.getObjectByName('entrance-ramp')!;
   for(const x of [-5,10.1]){const ray=new THREE.Raycaster(new THREE.Vector3(x,3,-2.69),new THREE.Vector3(0,-1,0));const hits=ray.intersectObject(ramp,true);assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-.7705)<.003);}
  }else{
   const stand=new THREE.Box3().setFromObject(root.getObjectByName('pitch-seating')!,true);assert.ok(stand.min.x>11.875);assert.ok(stand.max.x<15.5);
  }
 }
});

test('graded public and private roads limit slopes and private access retains real terrain contact',async()=>{
 const {roadProfiles,hillApproaches}=await import('../src/roadNetwork');const {isLand}=await import('../src/layout');
 const grades:Record<string,number>={};
 for(const r of [...roadProfiles,...hillApproaches]){const p=r.curve.getSpacedPoints(Math.ceil(r.curve.getLength()*3));let max=0;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];max=Math.max(max,Math.abs(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z));}grades[r.id]=max;assert.ok(max<.145,r.id+' grade '+max);}
 for(const r of hillApproaches){assert.ok(r.curve.getLength()>40);const pts=r.curve.getSpacedPoints(150);for(const p of pts){assert.ok(isLand(p.x,p.z),'access must remain on land');for(const side of [-1,1]){const t=r.curve.getTangentAt(pts.indexOf(p)/(pts.length-1)),n=new THREE.Vector3(-t.z,0,t.x).normalize().multiplyScalar(side*(r.width/2+.25));assert.ok(isLand(p.x+n.x,p.z+n.z),'full private road clears shoreline');}assert.ok(Math.abs(surfaceHeight(p.x,p.z)-p.y)<.45,'hill access follows the graded ground');}}
 console.log({roadGrades:grades});
});
test('landmark gates have continuous reserved walks ending at sidewalks',async()=>{
 const {SITE_GATES}=await import('../src/siteAccess'),{nearestRoad}=await import('../src/roadNetwork');const plans=world.userData.siteAccess;assert.equal(plans.length,SITE_GATES.length);
 for(const plan of plans){assert.equal(plan.rejected,false,plan.id+' gate disconnected');assert.ok(plan.points.length>=2);const end=plan.points.at(-1),r=nearestRoad(...end);assert.ok(r.distance>=r.width/2&&r.distance<=r.width/2+2,'walk terminates at the actual sidewalk');for(const p of plan.points)assert.ok(p.every(Number.isFinite));}
});
test('packed cloud bytes preserve the procedural density exactly and use one GPU channel',async()=>{
 const {readFileSync}=await import('node:fs'),{gunzipSync}=await import('node:zlib'),{cloudAssembly,cloudDensityAtlas,cloudDensityPixels,installPackedCloudDensity}=await import('../src/cloudModel');
 const packed=readFileSync('public/cache/cloud-density-v1.bin'),raw=gunzipSync(packed);assert.ok(packed.length<raw.length*.12);installPackedCloudDensity(raw);
 for(const i of [0,5,11]){const seed=83017+i*193,kind=i<4?'towering':i<9?'broken':'veil',lobes=cloudAssembly(kind,seed),a=cloudDensityAtlas(lobes,seed),b=cloudDensityPixels(lobes,seed);assert.equal(b.data.length,a.data.length/4);for(let j=0;j<b.data.length;j++)assert.equal(b.data[j],a.data[j*4]);}
});


test('junction anchors share elevations and private roads avoid steep terrain stair steps',async()=>{
 const {junctionAnchors,roadProfiles,hillApproaches}=await import('../src/roadNetwork');
 for(const n of junctionAnchors){const values=roadProfiles.filter(r=>n.roads.includes(r.id)).map(r=>r.curve.getPoint(r.points.findIndex(p=>Math.hypot(p[0]-n.x,p[1]-n.z)<.1)/(r.points.length-1)).y);assert.ok(Math.max(...values)-Math.min(...values)<.015,'junction height agrees');}
 for(const road of hillApproaches){const p=road.curve.getSpacedPoints(1000);let max=0;for(let i=1;i<p.length;i++)max=Math.max(max,Math.abs(surfaceHeight(p[i].x,p[i].z)-surfaceHeight(p[i-1].x,p[i-1].z))/Math.hypot(p[i].x-p[i-1].x,p[i].z-p[i-1].z));assert.ok(max<.22,'actual terrain grade '+road.id+' '+max);}
});

test('junction fillets stay close to actual arms and do not create oversized circular bulbs',async()=>{
 const {junctionOutline}=await import('../src/roadJunctions');
 const arms=[{x:-1,z:0,width:8},{x:1,z:0,width:8},{x:0,z:1,width:6}];
 for(const [x,z]of junctionOutline(arms)){
  const distance=Math.min(...arms.map(a=>{const t=Math.max(0,x*a.x+z*a.z);return Math.hypot(x-a.x*t,z-a.z*t)-a.width/2;}));assert.ok(distance<=.7,'fillet extends too far outside lane silhouette');
 }
 const turn=junctionOutline([{x:0,z:-1,width:3.6},{x:.75,z:.66,width:3.6}]);assert.ok(turn.length>8,'a bend includes inner and outer corners rather than a triangular shortcut');
});
test('decorative mountain and lighthouse rocks clear their complete road footprints',async()=>{
 const {plantingBoxClear}=await import('../src/plantPlacement');let count=0;world.updateMatrixWorld(true);
 world.traverse(o=>{if(['coastal-ridge-rock','lighthouse-ground-rock'].includes(o.name)){assert.ok(plantingBoxClear(new THREE.Box3().setFromObject(o,true),.35));count++;}});assert.ok(count>0);
});
test('elevated motorway clears the actual hillside across its whole ten-metre deck',async()=>{
 const {motorwayCurve}=await import('../src/transport');assert.ok(motorwayCurve);let minimum=Infinity;
 for(let i=0;i<=600;i++){const p=motorwayCurve!.getPointAt(i/600),t=motorwayCurve!.getTangentAt(i/600),n=new THREE.Vector3(-t.z,0,t.x).normalize();for(const offset of [-5,-2.5,0,2.5,5]){const q=p.clone().addScaledVector(n,offset);minimum=Math.min(minimum,p.y+.1-surfaceHeight(q.x,q.z));}}
 assert.ok(minimum>.3,'terrain intersects bridge deck: '+minimum);
});
test('villa wall, foundation piers and hillside guardrails leave the entry and branch open',async()=>{
 const {ZONES}=await import('../src/layout'),{hillRailClear}=await import('../src/hillAccess'),{hillApproaches}=await import('../src/roadNetwork');const site=world.getObjectByName('hill-access-and-foundations')!;world.updateMatrixWorld(true);
 const gate=new THREE.Box3(new THREE.Vector3(ZONES.villa.x-1.8,surfaceHeight(ZONES.villa.x,36)+.05,35.75),new THREE.Vector3(ZONES.villa.x+1.8,surfaceHeight(ZONES.villa.x,36)+.7,36.25));
 for(const mesh of site.children.filter(o=>o instanceof THREE.Mesh&&(o.geometry as THREE.BoxGeometry).type==='BoxGeometry'))assert.ok(!gate.intersectsBox(new THREE.Box3().setFromObject(mesh,true)),'foundation blocks villa entry');
 for(const id of ['villa','lighthouse']){const points=hillApproaches.find(r=>r.id===id)!.points;assert.ok(points.length>30);}
 let posts=0;for(const o of site.children.filter(o=>o.name.endsWith('-grounded-rail-post'))){const p=o.position,id=o.name.startsWith('villa')?'villa':'lighthouse';assert.ok(hillRailClear(p.x,p.z,id));posts++;}assert.ok(posts>30);
});

test('all three academy door landings connect continuously to the courtyard spine',async()=>{
 const site=world.getObjectByName('special-campus')!,paving=world.getObjectByName('campus-courtyard')!.getObjectByName('walkways')!,doors:THREE.Object3D[]=[];site.traverse(o=>{if(o.name==='building-entrance')doors.push(o);});assert.equal(doors.length,3);site.updateWorldMatrix(true,true);let samples=0;
 for(const door of doors){const d=door.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).transformDirection(door.matrixWorld),start=d.clone().addScaledVector(normal,1.5),points=[start,new THREE.Vector3(start.x,start.y,39.1),new THREE.Vector3(156,start.y,39.1),new THREE.Vector3(156,start.y,50)];
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(a.distanceTo(b)/.25));for(let j=0;j<=n;j++){const p=a.clone().lerp(b,j/n),ray=new THREE.Raycaster(new THREE.Vector3(p.x,p.y+10,p.z),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObject(paving,true).length,'grass gap after teaching-block door '+d.toArray());samples++;}}
 }assert.ok(samples>100);
});
test('hospital outbound driveway reaches the public carriageway with a full ambulance turning envelope',async()=>{
 const {hospitalDriveCurve,hospitalExitPose,hospitalDriveWidth,hospitalDrivePoint}=await import('../src/hospitalDrive'),{nearestRoad}=await import('../src/roadNetwork');const root=world.getObjectByName('hospital-vehicle-access')!,surface=root.getObjectByName('continuous-hospital-drive-surface')!,van=world.getObjectByName('hospital-ambulance')!;world.updateMatrixWorld(true);
 const size=new THREE.Box3().setFromObject(van,true).getSize(new THREE.Vector3());assert.ok(size.x<2.5&&size.z<5.5,'ambulance remains a normal-sized city vehicle');assert.ok(van.getWorldScale(new THREE.Vector3()).distanceTo(new THREE.Vector3(1,1,1))<1e-6);
 const roadSamples=hospitalDriveCurve.getSpacedPoints(900);
 for(let i=0;i<=180;i++){const t=i/180,pose=hospitalExitPose(t),forward=new THREE.Vector3(Math.sin(pose.heading),0,Math.cos(pose.heading)),right=new THREE.Vector3(forward.z,0,-forward.x);
  const ray=new THREE.Raycaster(pose.position.clone().add(new THREE.Vector3(0,3,0)),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObject(surface,true).length,'drive surface absent at '+t+' '+pose.position.toArray());
  // Every body corner must lie in the continuous drive, including the seven-metre-radius bend.
  for(const a of [-.5,.5])for(const b of [-.5,.5]){const p=pose.position.clone().addScaledVector(right,size.x*a).addScaledVector(forward,size.z*b);let distance=Infinity;for(const q of roadSamples)distance=Math.min(distance,Math.hypot(p.x-q.x,p.z-q.z));if(t>.12&&t<.9)assert.ok(distance<hospitalDriveWidth(t)/2+.06,'ambulance corner leaves turn envelope');}
 }
 const end=hospitalDriveCurve.getPointAt(1),road=nearestRoad(end.x,end.z);assert.ok(road.distance<.05,'drive reaches public road centreline');
 for(const side of [-1,0,1]){const p=hospitalDrivePoint(1,side*hospitalDriveWidth(1)/2);assert.ok(Math.abs(p.y-surfaceHeight(p.x,p.z))<.04,'no abrupt step at road merge');}
});
test('junction additions contain only local corner infill and no straight arm end seams',async()=>{
 const {junctionFilletPatches}=await import('../src/roadJunctions');const patches=junctionFilletPatches([{x:-1,z:0,width:8},{x:1,z:0,width:8},{x:0,z:1,width:6}]);assert.equal(patches.length,2);
 for(const patch of patches){const xs=patch.map(p=>p[0]),zs=patch.map(p=>p[1]);assert.ok(Math.max(...xs)-Math.min(...xs)<.7&&Math.max(...zs)-Math.min(...zs)<.7,'no ten-metre straight overlay remains on a curve');}
});

test('parked ambulance has a continuous supported approach from the hospital platform to its exit drive',async()=>{
 const {hospitalExitPose}=await import('../src/hospitalDrive'),reference=world.getObjectByName('reference-hospital')!,court=world.getObjectByName('hospital-courtyard')!,drive=world.getObjectByName('hospital-vehicle-access')!;
 const floors=[...reference.children.slice(0,2),court.getObjectByName('entrance-ramp')!,court.getObjectByName('ambulance-apron')!,drive.getObjectByName('continuous-hospital-drive-surface')!];world.updateMatrixWorld(true);let previous:number|undefined;
 for(let i=0;i<=100;i++){const z=-49.18+(49.18-27)*i/100,x=hospitalExitPose(0).position.x,ray=new THREE.Raycaster(new THREE.Vector3(x,15,z),new THREE.Vector3(0,-1,0)),hits=ray.intersectObjects(floors,true);assert.ok(hits.length,'unsupported ambulance approach at '+z);if(previous!==undefined)assert.ok(Math.abs(hits[0].point.y-previous)<.18,'abrupt platform/driveway step');previous=hits[0].point.y;}
});

test('indexed railway reservations match exhaustive segment distances at multiple margins',async()=>{
 const {inRailReservation,railClearance,railStationReservations}=await import('../src/railNetworkPlan');
 const stations=railStationReservations();
 for(let z=-185;z<=150;z+=7.3)for(let x=-88;x<=230;x+=9.1)for(const margin of [.25,4.3,10,30]){
  const station=stations.some(p=>{const dx=x-p.x,dz=z-p.z;return Math.abs(dx*Math.cos(p.angle)-dz*Math.sin(p.angle))<p.w/2&&Math.abs(dx*Math.sin(p.angle)+dz*Math.cos(p.angle))<p.d/2;});
  assert.equal(inRailReservation(x,z,margin),railClearance(x,z)<margin||station,`reservation at ${x},${z}, margin ${margin}`);
 }
});

test('baked residential plans match the integrated city and invalidate on planning input changes',async()=>{
 const {residentialPlanKey,residentialPlanData}=await import('../src/generated/residentialPlans');
 const {residentialPlanningKey,lastResidentialPlanKey,lastResidentialPlanSource}=await import('../src/residentialPlan');
 const {terrainPositions}=await import('../src/terrainSurface');
 const {parkingAccessPaths}=await import('../src/parking');
 assert.equal(lastResidentialPlanKey,residentialPlanKey);assert.equal(lastResidentialPlanSource,'baked');
 assert.deepEqual(JSON.parse(residentialPlanData),world.userData.residential.courts);
 const key=residentialPlanningKey([]),height=terrainPositions[1];
 assert.notEqual(residentialPlanningKey([{x:0,z:0,w:1,d:1}]),key);
 try{terrainPositions[1]=height+1;assert.notEqual(residentialPlanningKey([]),key);}finally{terrainPositions[1]=height;}
 parkingAccessPaths.push({points:[[0,0],[1,1]],width:1});try{assert.notEqual(residentialPlanningKey([]),key);}finally{parkingAccessPaths.pop();}
 assert.equal(residentialPlanningKey([]),key);
});

test('indexed access reservations match full scans and include newly appended paths',async()=>{
 const {parkingAccessPaths,parkingAccessBlocked}=await import('../src/parking');
 const brute=(x:number,z:number)=>parkingAccessPaths.some(path=>{const [a,b]=path.points,dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<path.width/2+1.4;});
 for(let z=-180;z<200;z+=4.7)for(let x=-100;x<290;x+=5.3)assert.equal(parkingAccessBlocked(x,z),brute(x,z));
 const count=parkingAccessPaths.length;assert.equal(parkingAccessBlocked(900,900),false);
 try{parkingAccessPaths.push({points:[[890,890],[910,910]],width:4});assert.equal(parkingAccessBlocked(900,900),true);assert.equal(parkingAccessBlocked(900,904),brute(900,904));}finally{parkingAccessPaths.length=count;parkingAccessBlocked(900,900);}
 assert.equal(parkingAccessBlocked(900,900),false);
});

test('tunnel bounds rejection preserves exact reservations and terrain cover',async()=>{
 const {inTunnelReservation,tunnelLocation,coveredTerrainHeight,tunnelLength,TUNNEL}=await import('../src/tunnelPlan');
 for(let z=-210;z<210;z+=9.7)for(let x=-110;x<300;x+=11.3){
  const n=tunnelLocation(x,z);for(const margin of [0,8,40])assert.equal(inTunnelReservation(x,z,margin),n.distance<9+margin);
  const base=2,s=n.t*tunnelLength,expected=n.distance>13||s<.6||s>tunnelLength-.6?base:Math.max(base,THREE.MathUtils.lerp(base,n.y+TUNNEL.spring+TUNNEL.innerRadius+TUNNEL.thickness+TUNNEL.cover,1-THREE.MathUtils.smoothstep(n.distance,6.1,13)));
  assert.equal(coveredTerrainHeight(x,z,base),expected);
 }
});

test('northern ridge is sealed at its real top vertices and underside',async()=>{
 const {terrainPositions,terrainCols}=await import('../src/terrainSurface');
 const wall=world.getObjectByName('northern-ridge-backwall') as THREE.Mesh,cap=world.getObjectByName('sealed-terrain-underside') as THREE.Mesh;assert.ok(wall&&cap);
 const p=wall.geometry.attributes.position;
 for(let col=0;col<=terrainCols;col++){const i=col*6+5;assert.equal(p.getX(i),terrainPositions[col*3]);assert.equal(p.getY(i),terrainPositions[col*3+1]);assert.equal(p.getZ(i),terrainPositions[col*3+2]);}
 for(let x=-15;x<125;x+=5){const top=surfaceHeight(x,-200);for(const fraction of [.1,.5,.9]){const ray=new THREE.Raycaster(new THREE.Vector3(x,top*fraction,-210),new THREE.Vector3(0,0,1),0,12);assert.ok(ray.intersectObject(wall).length,'north face cannot see into the ridge');}}
 const below=new THREE.Raycaster(new THREE.Vector3(70,-4,-180),new THREE.Vector3(0,1,0),0,5);assert.ok(below.intersectObject(cap).length,'bottom closes against coastal rock walls');
});

test('continental shelf stays beneath waves, deepens offshore and has upward faces',async()=>{
 const {continentalDepth,oceanCoastDistance}=await import('../src/seabed');const {westCoast,eastCoast}=await import('../src/layout');const {beachExtension}=await import('../src/visualStyle');
 const shelf=world.getObjectByName('submerged-continental-shelf') as THREE.Mesh;assert.ok(shelf);const p=shelf.geometry.attributes.position,n=shelf.geometry.attributes.normal;
 for(let i=0;i<p.count;i++){assert.ok(p.getY(i)<-.5,'bed cannot pierce the lowest swell');assert.ok(n.getY(i)>0);assert.ok(p.getY(i)>=-31.62);}
 for(const z of [-110,0,65,120])for(const side of [-1,1]){const edge=side<0?westCoast(z)-beachExtension(z):eastCoast(z);let last=0;for(let d=0;d<=140;d+=2){const depth=continentalDepth(edge+side*d,z);assert.ok(depth>=last-1e-5,'transect deepens out to the shelf break');last=depth;}assert.ok(last>30);}
 assert.ok(oceanCoastDistance(155,163)<0,'reclaimed working quay participates in the shoreline');
 const ray=new THREE.Raycaster(new THREE.Vector3(-120,0,0),new THREE.Vector3(0,-1,0),0,40);assert.ok(ray.intersectObject(shelf).length,'visible bottom is real geometry');
});

test('ocean volume has a finite optical thickness and shares wave time with its surface',async()=>{
 const {water,waterUniforms}=await import('../src/water'),{WATER_THICKNESS,WATER_LEVEL}=await import('../src/waterVolume');
 const volume=world.getObjectByName('thin-ocean-volume') as THREE.Mesh;assert.ok(volume);assert.ok(WATER_THICKNESS>.24&&WATER_THICKNESS<1);
 const p=volume.geometry.attributes.position,edge=volume.geometry.attributes.surfaceEdge;
 for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-(edge.getX(i)?WATER_LEVEL:WATER_LEVEL-WATER_THICKNESS))<1e-6);
 assert.equal((volume.material as THREE.ShaderMaterial).uniforms.time,waterUniforms.time);assert.equal(water.receiveShadow,true);assert.equal((water.material as THREE.ShaderMaterial).lights,true);assert.ok(volume.renderOrder<water.renderOrder);
 const {boats}=await import('../src/port'),{marineFleet}=await import('../src/marineTraffic');
 for(const root of [...boats.map(b=>b.mesh),...marineFleet.map(b=>b.mesh),world.getObjectByName('cruise-ship')]){let casters=0;root.traverse(o=>{if((o as THREE.Mesh).isMesh&&o.castShadow)casters++;});assert.ok(casters>0,'every operating ship supplies a real shadow silhouette');}
});

test('commercial bridges preserve a through street and batching retains all five precincts',async()=>{
 const {createCommercialDistrict}=await import('../src/commercialDistrict');
 const editable=createCommercialDistrict(),batched=createCommercialDistrict(true);
 assert.equal(editable.children.length,5);assert.equal(batched.children.length,5);
 const a=new THREE.Box3().setFromObject(editable),b=new THREE.Box3().setFromObject(batched);
 assert.ok(a.min.distanceTo(b.min)<1e-4&&a.max.distanceTo(b.max)<1e-4);
 const route=new THREE.Box3(new THREE.Vector3(-29,.3,-8.4),new THREE.Vector3(29,8.29,8.4));
 editable.traverse(o=>{if(o instanceof THREE.Mesh)assert.equal(new THREE.Box3().setFromObject(o).intersectsBox(route),false,`street obstruction: ${o.name}`);});
 const triangles=(g:THREE.Object3D)=>{let n=0;g.traverse(o=>{if(o instanceof THREE.Mesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;};
 assert.equal(triangles(editable),triangles(batched));
});

test('commercial skywalk straddles the real city road and the small hall rests on its upper platform',async()=>{
 const {COMMERCIAL_PLAN:p}=await import('../src/commercialPlan');const {roadProfiles}=await import('../src/roadNetwork');const {specialBuildings}=await import('../src/specialBuildings');const {createCommercialDistrict}=await import('../src/commercialDistrict');
 const district=specialBuildings.find(s=>s.id==='commercial')!,hall=specialBuildings.find(s=>s.id==='hall3')!;
 district.group.updateMatrixWorld(true);hall.group.updateMatrixWorld(true);const inverse=district.group.matrixWorld.clone().invert(),road=roadProfiles.find(r=>r.id==='hospital-ring')!;let samples=0,minClearance=Infinity,maxOffset=0;
 for(const point of road.curve.getSpacedPoints(1500)){
  const q=point.clone().applyMatrix4(inverse);if(Math.abs(q.x)>28)continue;samples++;maxOffset=Math.max(maxOffset,Math.abs(q.z));assert.ok(Math.abs(q.z)+road.width/2<8.2,'both real traffic lanes remain between the occupied podiums');minClearance=Math.min(minClearance,p.y+8.3-surfaceHeight(point.x,point.z));
 }
 assert.ok(samples>100);assert.ok(minClearance>6.5,'carriageway has real vertical headroom');
 const hallLocal=hall.group.position.clone().applyMatrix4(inverse);assert.ok(Math.abs(hallLocal.x-p.hall.x)<1e-5&&Math.abs(hallLocal.z-p.hall.z)<1e-5);assert.ok(Math.abs(hallLocal.y-p.deck)<1e-5);assert.equal(hall.group.scale.x,.62);assert.equal(hall.group.scale.y,.62);
 const editable=createCommercialDistrict();editable.updateMatrixWorld(true);const a=editable.getObjectByName('lower-crown-tier')!,b=editable.getObjectByName('upper-crown-tier')!;const overlap=new THREE.Box3().setFromObject(a).intersect(new THREE.Box3().setFromObject(b));assert.ok(overlap.isEmpty(),'crown tiers do not interpenetrate');
 world.userData.commercialRoadAudit={road:'hospital-ring',samples,minClearance,maxOffset,hallLocal:hallLocal.toArray()};
});

test('streamed geometry batching matches legacy transforms and colours without mutating source buffers',async()=>{
 const {mergeGeometryBatch}=await import('../src/geometryBatch'),{mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js');
 const sphere=new THREE.SphereGeometry(1,8,6),box=new THREE.BoxGeometry(2,3,1).toNonIndexed();box.deleteAttribute('uv');const sourceColors=new Float32Array(sphere.attributes.position.count*3);for(let i=0;i<sourceColors.length;i++)sourceColors[i]=.2+(i%7)*.1;sphere.setAttribute('color',new THREE.BufferAttribute(sourceColors,3));
 const parts=[sphere,box].map((geometry,i)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshToonMaterial({color:i?0xffb670:0x53a98b,vertexColors:i===0}));mesh.position.set(3+i,-2,7);mesh.rotation.set(.2,.6,-.1);mesh.scale.set(1.2,.7,2.1);mesh.updateMatrixWorld(true);return {mesh,matrix:mesh.matrixWorld.clone(),count:geometry.index?.count??geometry.attributes.position.count};});
 const before=parts.map(p=>Array.from(p.mesh.geometry.attributes.position.array));
 for(const [uv,bake]of [[true,false],[false,true]]){
  const legacy=parts.map(({mesh,matrix})=>{const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(matrix);if(uv&&!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!uv)g.deleteAttribute('uv');const color=new Float32Array(g.attributes.position.count*3),m=mesh.material as THREE.MeshToonMaterial;for(let i=0;i<color.length;i++){const a=g.attributes.color,j=Math.floor(i/3),c=i%3;const v=a?[a.getX(j),a.getY(j),a.getZ(j)][c]:1;color[i]=bake?(m.vertexColors?v:1)*[m.color.r,m.color.g,m.color.b][c]:v;}g.setAttribute('color',new THREE.BufferAttribute(color,3));return g;});
  const expected=mergeGeometries(legacy,false)!,actual=mergeGeometryBatch(parts,uv,bake);assert.deepEqual(Object.keys(actual.attributes).sort(),Object.keys(expected.attributes).sort());for(const key of Object.keys(expected.attributes))assert.deepEqual(Array.from(actual.attributes[key].array),Array.from(expected.attributes[key].array),key);legacy.forEach(g=>g.dispose());expected.dispose();actual.dispose();
 }
 parts.forEach((p,i)=>assert.deepEqual(Array.from(p.mesh.geometry.attributes.position.array),before[i]));
});

test('police precinct keeps its long van under the canopy and leaves a real driveway and public path',async()=>{
 const {createPoliceStation}=await import('../src/policeStation'),{createPoliceCar}=await import('../src/policeAssets'),{specialBuildings}=await import('../src/specialBuildings'),{ZONES}=await import('../src/layout'),{nearestRoad}=await import('../src/roadNetwork');
 const root=createPoliceStation();root.updateMatrixWorld(true);const cars=root.getObjectByName('06-short-and-long-police-cars')!.children.map(c=>new THREE.Box3().setFromObject(c));assert.equal(cars.length,2);assert.ok(cars[1].getSize(new THREE.Vector3()).z>cars[0].getSize(new THREE.Vector3()).z+1,'long car has its own longer chassis');assert.ok(cars[1].max.y<3.39,'long van and antenna clear the canopy');assert.ok(cars.every(b=>Math.abs(b.min.y-.3)<1e-5),'wheels rest on the parking apron');
 const aisle=new THREE.Box3(new THREE.Vector3(-5.5,.4,7.75),new THREE.Vector3(7.7,3.24,13.2)),walk=new THREE.Box3(new THREE.Vector3(-7.35,.4,0),new THREE.Vector3(-6.05,2.5,13.2));root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const b=new THREE.Box3().setFromObject(o);assert.equal(b.intersectsBox(aisle),false,'parking aisle obstructed by '+o.name);assert.equal(b.intersectsBox(walk),false,'public footpath obstructed by '+o.name);});
 const van=createPoliceCar('long');assert.equal(van.getObjectsByProperty('name','medical-cross').length,0);assert.equal(van.getObjectsByProperty('name','ambulance-stripe').length,0);
 const placed=specialBuildings.find(s=>s.id==='police')!;placed.group.updateMatrixWorld(true);for(const corner of [[-7.75,-14],[-7.75,14],[7.75,-14],[7.75,14]]){const x=ZONES.police.x+corner[0],z=ZONES.police.z+corner[1],r=nearestRoad(x,z);assert.ok(r.distance>r.width/2,'station footprint enters a driving lane');}
 const drive=world.getObjectByName('police-station-driveway')!;let faces=0;drive.traverse(o=>{if(o instanceof THREE.Mesh){const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++){assert.ok(n.getY(i)>.8,'driveway faces point up');faces++;}}});assert.ok(faces>=12);const end=drive.userData.end,r=nearestRoad(end[0],end[2]);assert.ok(Math.abs(r.distance-r.width/2-.05)<.06,'driveway meets the actual curb without raising the public traffic lanes');
 const smaller=ZONES.hotel.sx*ZONES.hotel.sz/(1.8*1.7);assert.ok(smaller<.72&&smaller>.66,'hotel horizontal area reduced about thirty percent');
 const batched=createPoliceStation(true),a=new THREE.Box3().setFromObject(root),b=new THREE.Box3().setFromObject(batched);assert.ok(a.min.distanceTo(b.min)<1e-4&&a.max.distanceTo(b.max)<1e-4);
});

test('fountains follow supported ballistic jets, stay in their basins and freeze when paused',async()=>{
 const {createFountainWater,fountainStates,updateFountains,fountainJetPoint}=await import('../src/fountains');const before=fountainStates.length;
 const root=createFountainWater({id:'regression',waterY:.7,nozzleY:1.6,radius:1.8,rise:1.65}),state=fountainStates.at(-1)!;assert.equal(root.getObjectsByProperty('name','arched-water-jet').length,8);
 for(let i=0;i<=100;i++){const p=fountainJetPoint(state.options,.7,i/100);assert.ok(Math.hypot(p.x,p.z)<=1.800001);assert.ok(p.y>=.7-1e-8);}
 const end=fountainJetPoint(state.options,0,1);assert.ok(Math.abs(end.y-.7)<1e-8);const original=Array.from(state.drops.instanceMatrix.array);updateFountains(.25);assert.notDeepEqual(Array.from(state.drops.instanceMatrix.array),original);const stopped=Array.from(state.drops.instanceMatrix.array),time=state.time;updateFountains(0);assert.deepEqual(Array.from(state.drops.instanceMatrix.array),stopped);assert.equal(state.time,time);
 for(const ripple of state.ripples)assert.ok(Math.hypot(ripple.mesh.position.x,ripple.mesh.position.z)+ripple.mesh.scale.x<2.1);
 fountainStates.splice(before);
});

test('dock-market piers clear the plaza with upward thresholds and English geometric signage',async()=>{
 const root=world.getObjectByName('fish-market-wharf')!;root.updateWorldMatrix(true,true);
 const plaza=new THREE.Box3().setFromObject(root.getObjectByName('dock-market-plaza')!,true),piers:THREE.Mesh[]=[];
 root.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='dock-market-timber-pier')piers.push(o);});assert.equal(piers.length,2);
 for(const pier of piers){const b=new THREE.Box3().setFromObject(pier,true);assert.ok(b.max.y-plaza.max.y>.075);assert.ok(b.min.y<plaza.max.y,'pier side meets plaza without floating');
 for(let x=b.min.x;x<=b.max.x;x+=.5)for(let z=b.min.z;z<=Math.min(b.max.z,plaza.max.z);z+=.5)assert.ok(b.max.y-surfaceHeight(x,z)>.04,'timber clears actual terrain');}
 root.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='dock-market-pier-threshold'){const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(n.getY(i)>.9);}});
 const {createDockMarketSign}=await import('../src/dockMarketSign');const sign=createDockMarketSign();assert.equal(sign.userData.signText,'DOCK MARKET');assert.ok(sign.children.filter(o=>o.name==='dock-market-letter-pixel').length>100);sign.traverse(o=>{if(o instanceof THREE.Mesh)assert.equal((o.material as THREE.MeshToonMaterial).map,null);});
});

test('restaurant and dock market leave curved road and sidewalks clear after complete-group resizing',async()=>{
 const {specialBuildings}=await import('../src/specialBuildings'),{roadEdgeDistance}=await import('../src/roadNetwork');
 for(const id of ['restaurant','port']){const root=specialBuildings.find(s=>s.id===id)!.group;root.updateWorldMatrix(true,true);let minimum=Infinity,closest:any;
 root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const box=new THREE.Box3().setFromObject(o,true);for(let x=box.min.x;x<=box.max.x+.001;x+=.4)for(let z=box.min.z;z<=box.max.z+.001;z+=.4){const d=roadEdgeDistance(x,z);if(d<minimum){minimum=d;closest={name:o.name,x,z};}}});
 assert.ok(minimum>1.5,id+' complete roof/deck/plant footprint clears road and pavement: '+minimum+JSON.stringify(closest));
 }
 const root=specialBuildings.find(s=>s.id==='restaurant')!.group,terrace=new THREE.Box3().setFromObject(root.getObjectByName('restaurant-timber-terrace')!,true),tables:THREE.Object3D[]=[],parasols:THREE.Object3D[]=[];
 root.traverse(o=>{if(o.name==='restaurant-terrace-table')tables.push(o);if(o.name==='restaurant-terrace-parasol')parasols.push(o);});assert.equal(tables.length,3);assert.equal(parasols.length,3);
 for(const o of [...tables,...parasols]){const b=new THREE.Box3().setFromObject(o,true);assert.ok(b.min.x>=terrace.min.x&&b.max.x<=terrace.max.x&&b.min.z>=terrace.min.z&&b.max.z<=terrace.max.z,'all dining furniture is over its supporting terrace');}
});

test('punk hall and its garden retreat from the sea, face the cruise and retain grounded vegetation',async()=>{
 const {specialBuildings}=await import('../src/specialBuildings'),{ZONES,eastCoast}=await import('../src/layout'),{roadEdgeDistance}=await import('../src/roadNetwork');
 const entry=specialBuildings.find(s=>s.id==='hall5')!,root=entry.group;root.updateWorldMatrix(true,true);
 const forward=new THREE.Vector3(0,0,1).transformDirection(root.matrixWorld),ship=new THREE.Vector3(ZONES.cruise.x-root.position.x,0,ZONES.cruise.z-root.position.z).normalize();assert.ok(forward.dot(ship)>.999,'front sculpture points toward cruise berth');
 root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const b=new THREE.Box3().setFromObject(o,true);const nx=Math.max(1,Math.ceil((b.max.x-b.min.x)/.5)),nz=Math.max(1,Math.ceil((b.max.z-b.min.z)/.5));for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const x=THREE.MathUtils.lerp(b.min.x,b.max.x,i/nx),z=THREE.MathUtils.lerp(b.min.z,b.max.z,j/nz);assert.ok(eastCoast(z)-x>6,'full structure and foliage stays inside the coast');assert.ok(roadEdgeDistance(x,z)>3,'garden and hall leave street clear');}});
 const garden=root.getObjectByName('punk-hall-coastal-garden')!;assert.equal(garden.children.filter(o=>o.name==='punk-garden-tree').length,4);for(const o of garden.children){const p=o.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(p.y-surfaceHeight(p.x,p.z)+.035)<1e-5,'vegetation roots remain on real terrain');}
});

test('seafood crab is an editable supported sculpture with eight connected legs and two true open pincers',async()=>{
 const {createSeafoodCrab,CRAB_PARTS}=await import('../src/seafoodCrab');const crab=createSeafoodCrab();for(const name of Object.keys(CRAB_PARTS))assert.ok(crab.getObjectByName(name));
 const legs=crab.getObjectByName('crab-walking-legs')!;assert.equal(legs.children.filter(o=>o.name==='crab-leg-upper').length,8);assert.equal(legs.children.filter(o=>o.name==='crab-leg-tip').length,8);
 const claws=crab.getObjectByName('crab-claws')!.children.filter(o=>o.name==='open-crab-pincer') as THREE.Mesh[];assert.equal(claws.length,2);for(const o of claws){const g=o.geometry as THREE.ExtrudeGeometry;assert.ok(g.parameters.shapes instanceof THREE.Shape);const ray=new THREE.Raycaster(new THREE.Vector3(0,.55,2).applyMatrix4(o.matrix),new THREE.Vector3(0,0,-1),0,4);o.updateMatrixWorld(true);ray.ray.origin.set(0,.55,2).applyMatrix4(o.matrixWorld);assert.equal(ray.intersectObject(o).length,0,'the pincer bite is open geometry');}
 const {specialBuildings}=await import('../src/specialBuildings');const restaurant=specialBuildings.find(s=>s.id==='restaurant')!.group;assert.ok(restaurant.getObjectByName('seafood-crab-sculpture'));
});

test('academy crown is supported by the tower and leaves ordinary art deco roofs intact',async()=>{
 const {createCampusRoof}=await import('../src/campusRoof');
 const roof=createCampusRoof();roof.updateMatrixWorld(true);
 const bounds=(name:string)=>new THREE.Box3().setFromObject(roof.getObjectByName(name)!,true);
 const curb=bounds('cornice'),slope=bounds('hip-roof');
 assert.ok(Math.abs(curb.min.y-.18)<1e-5,'curb meets the existing flat roof');
 assert.ok(Math.abs(curb.max.y-slope.min.y)<1e-5,'roof meets the supporting curb');
 assert.ok(curb.min.x>=-11*.53/2 && curb.max.x<=11*.53/2 && curb.min.z>=-7*.53/2 && curb.max.z<=7*.53/2,'crown remains inside upper tower parapet');
 const face=(roof.getObjectByName('hip-roof')!.children[0] as THREE.Mesh).geometry;
 const normals=face.getAttribute('normal');for(let i=0;i<normals.count-6;i++)assert.ok(normals.getY(i)>0,'visible roof faces point upward');
 const ordinary=makeBuilding({x:0,z:0,w:11,d:7,h:17,style:'artdeco'}),academy=makeBuilding({x:0,z:0,w:11,d:7,h:17,style:'artdeco',omitArtdecoCrown:true});
 const countSpheres=(g:THREE.Object3D)=>{let n=0;g.traverse(o=>{if(o instanceof THREE.Mesh && o.geometry instanceof THREE.SphereGeometry)n++;});return n;};
 assert.equal(countSpheres(ordinary),1);assert.equal(countSpheres(academy),0);world.remove(ordinary,academy);
});

test('academy facade windows follow floors and do not occupy the entrance',async()=>{
 const {campusWindowLayout}=await import('../src/campusFacade');
 for(const [w,h,b,tower] of [[7,12,0,false],[11,8.84,0,true],[8.58,5.1,8.84,true],[5.83,3.06,13.94,true]] as const){
  for(const side of ['end','long'] as const)for(const front of [false,true]){
   const windows=campusWindowLayout(w,h,b,side,tower,front);
   assert.ok(windows.length>0);
   for(const p of windows){assert.ok(p.y>=b && p.y+p.h<=b+h);assert.ok(Math.abs(p.x)+p.w/2<w/2);if(front&&p.y<1)assert.ok(Math.abs(p.x)-p.w/2>=1.2,'entrance does not overlap glazing');}
  }
 }
 const end=campusWindowLayout(7,12,0,'end',false,false),long=campusWindowLayout(16,12,0,'long',false,false);
 assert.ok(long.length>end.length,'long classroom elevations get more bays than the end wall');
});

test('district facade layouts distinguish uses while reserving the ground-floor entry',async()=>{
 const {districtFacadeWindows,districtFacadeTexture}=await import('../src/districtFacade');
 const styles=['flat','pitched','villa','arcade','apartment','glass','stepped','artdeco','warehouse'] as const;
 for(const style of styles){
  const front=districtFacadeWindows(style,4,3,true),other=districtFacadeWindows(style,4,3,false);
  assert.ok(front.length<other.length,style+' reserves a door bay');
  for(const p of front){assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=128&&p.y+p.h<=128);}
  const tex=districtFacadeTexture('#fff1d9','#456b8d',4,3,style,true);assert.ok(tex.userData.windowEmission,'night mask exists');
 }
 const panes=(style:typeof styles[number])=>districtFacadeWindows(style,4,3,false);
 assert.ok(panes('warehouse').length<panes('apartment').length,'storage walls use sparse clerestory windows');
 assert.notEqual(panes('glass')[0].w,panes('villa')[0].w,'office and house glazing use different widths');
});


test('hospital entrance canopy stays clear of patient-room front windows',async()=>{
 const hospital=world.getObjectByName('reference-hospital')!;hospital.updateWorldMatrix(true,true);
 const canopy=hospital.getObjectByName('hospital-entry-canopy')!,canopyBounds=new THREE.Box3().setFromObject(canopy,true);let count=0;
 hospital.traverse(o=>{if(o.name!=='hospital-patient-front-window')return;count++;assert.ok(!canopyBounds.intersectsBox(new THREE.Box3().setFromObject(o,true)),'window must not cross the entry canopy');});
 assert.ok(count>5);
});

test('resort palette keeps distinct ocean depths and varied residential roof colours',async()=>{
 const {SEA_PALETTE,COAST_PALETTE,RESORT_ACCENTS}=await import('../src/visualStyle');
 const shallow=new THREE.Color(SEA_PALETTE.shallow),deep=new THREE.Color(SEA_PALETTE.deep);
 assert.ok(shallow.g>deep.g&&shallow.r>deep.r,'seafoam shallows remain lighter than cobalt deep water');
 const hsl={h:0,s:0,l:0};new THREE.Color(COAST_PALETTE.grass).getHSL(hsl);assert.ok(hsl.h>.2&&hsl.h<.45,'terrain remains green');
 const {createHome}=await import('../src/residentialAssets');const colors=new Set<number>();
 for(let seed=10;seed<15;seed++){const home=createHome('shutters',seed),roof=home.getObjectByName('pitched-roof') as THREE.Mesh;colors.add((roof.material as THREE.MeshToonMaterial).color.getHex());}
 assert.ok(colors.size>=4,'seeded homes retain varied roof colours');
 assert.notEqual(RESORT_ACCENTS.magenta,RESORT_ACCENTS.lavender);
});

test('office facade has individual bounded windows and a supported entrance',async()=>{
 const {createCommercialDistrict}=await import('../src/commercialDistrict');
 const district=createCommercialDistrict(false,true),facade=district.getObjectByName('office-facade-window-grid')!,entry=district.getObjectByName('office-entry')!;
 assert.ok(facade&&entry);const windows=facade.children.filter(o=>o.name==='office-window') as THREE.Mesh[];
 assert.ok(windows.length>200);assert.ok(windows.some(w=>w.material instanceof THREE.MeshToonMaterial&&w.material.userData.lightingRole==='office-glass'));
 for(const w of windows){const b=new THREE.Box3().setFromObject(w),size=b.getSize(new THREE.Vector3());assert.ok(size.y<2.2&&Math.max(size.x,size.z)<1);}
 const canopy=entry.getObjectByName('office-entry-canopy')!,posts=entry.children.filter(o=>o.name==='office-canopy-post');assert.equal(posts.length,2);
 const c=new THREE.Box3().setFromObject(canopy);for(const p of posts){const b=new THREE.Box3().setFromObject(p);assert.ok(Math.abs(b.min.y-9)<.001&&Math.abs(b.max.y-c.min.y)<.01);}
});

test('glass office has a lower L-shaped wrap and window-only lighting',async()=>{
 const {makeBuilding}=await import('../src/buildings');
 const tower=makeBuilding({x:0,z:0,w:12,d:10,h:45,style:'glass',plan:'rect',detail:false});
 const core=tower.getObjectByName('glass-office-core') as THREE.Mesh,side=tower.getObjectByName('glass-office-side-wing') as THREE.Mesh,rear=tower.getObjectByName('glass-office-rear-wing') as THREE.Mesh;
 assert.ok(core&&side&&rear);const a=new THREE.Box3().setFromObject(core),b=new THREE.Box3().setFromObject(side),c=new THREE.Box3().setFromObject(rear);
 assert.ok(b.max.y<a.max.y&&c.max.y<b.max.y);assert.ok(Math.abs(a.min.x-b.max.x)<1e-5&&Math.abs(a.min.z-c.max.z)<1e-5);assert.ok(Math.abs(b.min.x+6)<1e-5&&Math.abs(c.min.z+5)<1e-5);
 for(const part of [core,side,rear]){assert.ok(Array.isArray(part.material));for(const mat of [part.material[0],part.material[1],part.material[4],part.material[5]]){assert.equal(mat.userData.lightingRole,'window-facade');assert.ok((mat as THREE.MeshToonMaterial).emissiveMap);}}
 tower.removeFromParent();
});

test('glass facade varies window width and height without lighting the wall',async()=>{
 const {districtFacadeWindows,districtFacadeTexture}=await import('../src/districtFacade');
 const windows=districtFacadeWindows('glass',12,8,false);assert.ok(new Set(windows.map(w=>w.w)).size>1);assert.ok(new Set(windows.map(w=>w.h)).size>1);
 const tex=districtFacadeTexture('#edf5f8','#3d7e9e',12,8,'glass',false),mask=tex.userData.windowEmission.image.data as Uint8Array;let lit=0;for(let i=0;i<mask.length;i+=4)if(mask[i])lit++;assert.ok(lit>0&&lit<128*128*.3);
});
