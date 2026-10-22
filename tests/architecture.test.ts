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
 });assert.ok(checked>1000);
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
