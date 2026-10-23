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
  for(const group of groups){const material=mats[group.materialIndex??0];if(!material.map||![...facadeCache.values()].includes(material.map))continue;const normals=o.geometry.attributes.normal;for(let i=group.start;i<group.start+group.count;i++){const at=o.geometry.index?o.geometry.index.getX(i):i;assert.ok(normals.getY(at)<.05,'facade batch has no roof triangles');checked++;}}
 });assert.ok(checked>0,'remaining textured office facades are actually inspected');
 for(const sample of ordinaryAssetSamples.values()){const roof=sample.getObjectByName('building-roof');assert.ok(roof&&roof.children.length,'roof is independently modelled');roof.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])assert.ok(!m.map||![...facadeCache.values()].includes(m.map));});}
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
 for(const x of [-.8,.8]){const origin=new THREE.Vector3(x,2,0).applyMatrix4(crossing.matrixWorld),direction=new THREE.Vector3(0,-1,0);assert.equal(new THREE.Raycaster(origin,direction,0,2.1).intersectObject(crossing,true).length,0,'rail slot is unobstructed');}
 const origin=new THREE.Vector3(0,2,0).applyMatrix4(crossing.matrixWorld);assert.ok(new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,2.1).intersectObject(crossing,true).length>0,'infill supports the crossing');
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
 // Max tram speed is below 12 m/s; a 67 m warning closes in 1.6 s before its 7.4 m nose arrives.
 assert.ok(67-12*1.6>7.4+2);
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
 assert.ok(transit[0].curve.getPointAt(1).distanceTo(STATION_ORIGIN)<1e-8);assert.equal(STATION_PLAN.grid,'K15');assert.equal(gridCell(STATION_ORIGIN.x,STATION_ORIGIN.z).id,STATION_PLAN.grid);coastalStation!.updateMatrixWorld(true);let checked=0;
 coastalStation!.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert.ok(roadEdgeDistance(v.x,v.z)>.6,'whole station footprint clears asphalt');assert.ok(v.z>=58.49,'no station part blocks the existing z=57 crossing approach');checked++;}});assert.ok(checked>10000);assert.ok(coastalStationPreview?.getObjectByName('preview-running-rail'));assert.ok(coastalStationPreview?.getObjectByName('preview-station-forecourt'));
});

test('terminal buffer stays beyond the stopped train and both car centres have boarding platform',async()=>{
 const {transit}=await import('../src/transport');const {trainProgress}=await import('../src/transitDesign');const {STATION_ORIGIN,STATION_HEADING}=await import('../src/coastalStationPlan');const {createBufferStop}=await import('../src/coastalStationAssets');const curve=transit[0].curve,p=curve.getPointAt(trainProgress(curve,.5)),v=curve.getTangentAt(trainProgress(curve,.5));const local=p.clone().sub(STATION_ORIGIN).applyAxisAngle(new THREE.Vector3(0,1,0),-STATION_HEADING),angle=Math.atan2(v.x,v.z)-STATION_HEADING,nose=local.z+7.4*Math.cos(angle)+1.25*Math.abs(Math.sin(angle)),buffer=createBufferStop();buffer.position.z=.15;buffer.updateMatrixWorld(true);assert.ok(nose<new THREE.Box3().setFromObject(buffer).min.z-.8);
 assert.ok(-local.z+4<16.4&&-local.z-4>0,'both passenger car centres stop beside the platform');assert.equal(transit[0].terminalDwell,4);
});

test('station ramp has a clear flat turn, grounded terminal stairs and a clock above the main roof',async()=>{
 const {coastalStation}=await import('../src/coastalStation');const {createStationRoof}=await import('../src/coastalStationAssets');const {surfaceHeight}=await import('../src/terrainSurface');const root=coastalStation!;assert.ok(root.getObjectByName('flat-ramp-turn-landing'));assert.ok(world.userData.coastalStation.ramp.rise/world.userData.coastalStation.ramp.run<1/12+.001);
 const steps=root.children.filter(o=>o.name==='station-entrance-stair');assert.equal(steps.length,5);const last=steps[4],p=new THREE.Vector3();last.getWorldPosition(p);const box=new THREE.Box3().setFromObject(last);assert.ok(Math.abs(box.max.y-surfaceHeight(p.x,p.z)-.055)<1e-5);
 const roof=createStationRoof();roof.updateMatrixWorld(true);const clock=new THREE.Box3().setFromObject(roof.getObjectByName('station-clock')!),main=new THREE.Box3().setFromObject(roof.getObjectByName('blue-standing-seam-gable')!);assert.ok(clock.min.y>main.max.y+.04,'roof cannot hide the clock face');
});

test('both slopes of the continuous station canopy have outward upward normals after batching',async()=>{
 const {coastalStation}=await import('../src/coastalStation');const canopy=coastalStation!.getObjectByName('curved-platform-canopy')!;let count=0;canopy.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const m=o.material as THREE.MeshToonMaterial;if(m.color.getHex()!==0x367f9b)return;const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++){assert.ok(n.getY(i)>.9,'neither roof slope faces down');count++;}});assert.ok(count>0);
});
