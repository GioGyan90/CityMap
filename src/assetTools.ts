import {RAIL_PLANS} from './railNetworkPlan';
import {createRailCar,createRailTrain} from './railVehicles';
import {coastalStationPreview} from './coastalStation';
import {createStationHouse,createStationRoof,createStationClock,createPlatformCanopyBay} from './coastalStationAssets';
import {createHome,createBusShelter} from './residentialAssets';
import {courtSample} from './residential';
import {createStreetLamp,createSignalPost,createCrossingGate,createGuideFence} from './trafficAssets';
import {createCloud,prepareCloudMaterial} from './clouds';
import {enterAssetDaylight,refreshDayNight} from './night';
import {DAY_LIGHTING} from './visualStyle';
import {createBambooBasket,createFish,createFishTable} from './beachFishMarket';
import {createMarketRack} from './billiardsArchitecture';
import {hallSamples,createHallTable,createHallEntrance,createHallEmblem,HALL_THEMES} from './themedHalls';
import {treeSamples,shrubSample,grassSample,flowerSample,planterSample,createGardenCluster} from './plantAssets';
import {palmSamples,createPalmFrond,createPalmCluster} from './palm';
import {updateFocus} from './focus';
import * as THREE from 'three';
import {scene,world,camera,controls,renderer,sky,sun} from './scene';
import {specialBuildings} from './specialBuildings';
import {ordinaryAssetSamples} from './buildings';
import {createVehicle} from './vehicles';
import {labelObjs,labelRenderer} from './labels';
import {surfaceHeight} from './terrainSurface';
import {isLand,ROAD_PATHS} from './layout';
import {MAP_GRID,columnLabel,gridCell,validatePositions,type PositionDraft} from './mapCoordinates';
import './assetTools.css';
type Item={id:string;title:string;source:THREE.Object3D;placement?:typeof specialBuildings[number]};
const STORE='citymap-layout-draft-v1',NOTE_STORE='citymap-position-notes-v1';
export function initAssetTools(){
 const items:Item[]=specialBuildings.map(s=>({id:s.id,title:s.name,source:s.id==='coaststation'&&coastalStationPreview?coastalStationPreview:s.group,placement:s}));
 for(const [kind,title] of [['sedan','轿车'],['bus','公交车'],['ambulance','救护车']] as const)items.push({id:'vehicle-'+kind,title:'车辆 · '+title,source:createVehicle(kind)});
 for(const [id,title,source] of [['street-lamp','交通 · 路侧灯组合',createStreetLamp()],['traffic-signal','交通 · 三色信号灯组合',createSignalPost()],['rail-gate','交通 · 电车道口栏杆组合',createCrossingGate()],['guide-fence','交通 · 道口导向栏杆',createGuideFence()]] as const)items.push({id,title,source});
 for(const style of ['balcony','bay','shutters'] as const)items.push({id:'courtyard-home-'+style,title:'小区住宅 · '+({balcony:'生活阳台',bay:'凹窗挑檐',shutters:'百叶坡顶'}[style]),source:createHome(style)});
 items.push({id:'curb-bus-shelter',title:'交通 · 路侧公交雨棚',source:createBusShelter()});if(courtSample)items.push({id:'residential-court',title:'住宅 · 围合花园小区',source:courtSample});
 for(const [id,title,source]of [['station-house','总站 · 拱券站房',createStationHouse()],['station-roof','总站原件 · 坡顶与钟塔',createStationRoof()],['station-clock','总站原件 · 立体钟面',createStationClock()],['station-canopy','总站原件 · 雨棚支撑单元',createPlatformCanopyBay()],['station-canopy-detail','车站 · 雨棚结构',createPlatformCanopyBay()]] as const)items.push({id,title,source});
 const styleNames:Record<string,string>={flat:'平顶',pitched:'坡顶',glass:'玻璃楼',stepped:'退台',artdeco:'装饰塔楼',round:'圆塔',arcade:'骑楼',apartment:'公寓',villa:'别墅',warehouse:'仓库'};
 for(const [id,source] of ordinaryAssetSamples)items.push({id:'ordinary-'+id,title:'普通建筑 · '+(styleNames[id.split('-')[0]]??id)+' '+id.split('-')[1],source});
 for(const plan of RAIL_PLANS){items.push({id:plan.id+'-train-kit',title:plan.name+' · 完整编组',source:createRailTrain(plan)});items.push({id:plan.id+'-cab-kit',title:plan.name+' · 车头原件',source:createRailCar(plan,0)});items.push({id:plan.id+'-coach-kit',title:plan.name+' · 客车原件',source:createRailCar(plan,1)});}
 for(const [name,title] of [['horizontal-sailboat-hull','帆船']] as const){const found=world.getObjectByName(name);if(found)items.push({id:name,title:'交通 · '+title,source:name==='horizontal-sailboat-hull'?found.parent!:found});}
 items.push({id:'palm-cluster',title:'景观组合 · 三棵椰树与沙丘',source:createPalmCluster()});
 const cliff=world.getObjectByName('residential-coastal-cliff');if(cliff){items.push({id:'residential-cliff',title:'地貌组合 · 临海住宅低崖',source:cliff});for(const [name,title] of [['continuous-rock-core','连续岩体'],['fractured-cliff-blocks','错层岩块'],['nearshore-reef-clusters','近岸礁石']] as const){const source=cliff.getObjectByName(name);if(source)items.push({id:'cliff-'+name,title:'地貌分组 · '+title,source});}}
 for(const [kind,title] of [['towering','厚积云'],['broken','碎积云'],['veil','高层薄云']] as const)items.push({id:'cloud-'+kind,title:'云团组合 · '+title,source:createCloud(kind,83017,54)});
 const palms=palmSamples();items.push({id:'tree-0',title:'绿化 · 树木样式 1 · 椰树',source:palms[0]});
 for(let i=1;i<palms.length;i++)items.push({id:'palm-variant-'+i,title:'绿化 · 椰树变体 '+(i+1),source:palms[i]});
 items.push({id:'palm-part-barrel',title:'椰树原件 · 单个桶节',source:palms[0].getObjectByName('palm-trunk')!.children[3]},
 {id:'palm-part-trunk',title:'椰树原件 · 不规则桶节树干',source:palms[0].getObjectByName('palm-trunk')!},
 {id:'palm-part-frond',title:'椰树原件 · 单片切口宽叶',source:createPalmFrond()},
 {id:'palm-part-crown',title:'椰树原件 · 分层树冠',source:palms[0].getObjectByName('palm-crown')!},
 {id:'palm-part-fruit',title:'椰树原件 · 成簇椰子',source:palms[0].getObjectByName('palm-coconuts')!});
 const treeNames={shade:'展开阔叶树',slender:'挺拔行道树',flowering:'浅绿景观树',pine:'坡地常绿树'};let treeId=1;
 for(const [kind,title] of Object.entries(treeNames)){const source=treeSamples().get(kind+'-0')!;items.push({id:'tree-'+treeId++,title:'绿化 · '+title,source});}
 const shade=treeSamples().get('shade-0')!;
 items.push({id:'plant-part-trunk',title:'绿植原件 · 树干与根颈',source:shade.getObjectByName('tree-trunk')!},
 {id:'plant-part-branches',title:'绿植原件 · 分枝',source:shade.getObjectByName('tree-branches')!},
 {id:'plant-part-crown',title:'绿植原件 · 不规则连续树冠',source:shade.getObjectByName('tree-crown')!},
 {id:'plant-shrub',title:'绿植 · 灌木丛',source:shrubSample},{id:'plant-grass',title:'绿植 · 弯叶草簇',source:grassSample},
 {id:'plant-flower',title:'绿植 · 五瓣花',source:flowerSample},{id:'plant-planter',title:'绿植 · 花钵组合',source:planterSample},
 {id:'garden-cluster',title:'景观组合 · 乔木灌木花草',source:createGardenCluster()});
 for(const theme of HALL_THEMES){const sample=hallSamples().get(theme.theme)!;for(const [part,title] of [['hall-shell','主体'],['hall-roof','屋顶'],['hall-emblem','招牌']] as const){const source=sample.getObjectByName(part);if(source)items.push({id:`hall-part-${theme.theme}-${part}`,title:`球馆原件 · ${theme.name} · ${title}`,source});}}
 items.push({id:'hall-part-table',title:'球馆原件 · 六袋球桌',source:createHallTable()},{id:'hall-part-entrance',title:'球馆原件 · 挖空门框与玻璃门',source:createHallEntrance()},{id:'hall-part-emblem',title:'球馆原件 · 秩序门与巨型八号球',source:createHallEmblem('order')});
 for(const t of HALL_THEMES){const sculpture=createHallEmblem(t.theme);items.push({id:'hall-sculpture-'+t.theme,title:'屋顶景观 · '+t.name,source:sculpture});const motif=sculpture.getObjectByName('sculpture-motif-'+t.theme)!;items.push({id:'hall-motif-'+t.theme,title:'屋顶原件 · '+t.name,source:motif});}
 const fishSite=specialBuildings.find(s=>s.id==='fishmarket');if(fishSite){for(const [name,title] of [['small-fishing-pier','小渔船码头'],['fish-market-stalls','木屋与帆布摊棚']] as const)items.push({id:'fish-market-'+name,title:'鱼市原件 · '+title,source:fishSite.group.getObjectByName(name)!});}
 items.push({id:'market-roof-rack',title:'市场原件 · 圆角码球三角架',source:createMarketRack()},{id:'fish-market-table',title:'鱼市原件 · 木板鱼桌',source:createFishTable()},{id:'fish-market-basket',title:'鱼市原件 · 编织竹筐',source:createBambooBasket()},{id:'fish-market-fish',title:'鱼市原件 · 立体鱼招牌',source:createFish()});
 const panel=document.createElement('section');panel.className='asset-panel';panel.hidden=true;
 panel.innerHTML=`<div class="asset-heading"><strong>资产与地图规划</strong><button id="asset-close" aria-label="关闭面板">×</button></div>
 <label>搜索资产<input id="asset-search" placeholder="建筑、车辆、树木…"></label><select id="asset-select" aria-label="选择资产"></select>
 <div class="asset-row"><button id="asset-isolate">单独查看</button><button id="asset-map">返回地图</button></div>
 <div class="asset-row"><button data-angle="front">正面</button><button data-angle="side">侧面</button><button data-angle="back">背面</button><button data-angle="top">顶部</button><button data-angle="iso">斜视</button></div>
 <div class="asset-row"><label><input type="checkbox" id="asset-wire">线框</label><label><input type="checkbox" id="asset-spin">旋转</label><button id="asset-fit">适配视图</button></div>
 <output id="asset-stats"></output><hr><strong>地图位置草稿</strong><p class="asset-help">位置草稿保存在本机；移动建筑后，道路和地形需另行调整。</p>
 <div class="asset-coordinates"><label>X<input type="number" step=".1" id="asset-x"></label><label>Y<input type="number" step=".1" id="asset-y"></label><label>Z<input type="number" step=".1" id="asset-z"></label></div>
 <div class="asset-row"><button id="asset-apply">应用并保存位置</button><button id="asset-locate">地图定位</button></div>
 <div class="asset-row"><label><input type="checkbox" id="asset-grid">20 米网格</label><button id="asset-top-map">地图俯视</button></div>
 <output id="asset-coord">打开网格后，点击地图选取位置。</output><input id="asset-note" placeholder="给选取的位置写备注"><button id="asset-add-note">记录选取的位置</button><div id="asset-notes"></div>
 <div class="asset-row"><button id="asset-export">导出布局 JSON</button><button id="asset-import">导入草稿</button><button id="asset-reset">恢复原始位置</button></div><input type="file" id="asset-file" accept="application/json" hidden><output id="asset-status" role="status"></output>`;
 document.body.appendChild(panel);const launch=document.createElement('button');launch.className='asset-launch';launch.textContent='资产查看 / 网格规划';document.body.appendChild(launch);
 const el=<T extends HTMLElement>(id:string)=>panel.querySelector<T>('#asset-'+id)!;
 const select=el<HTMLSelectElement>('select'),status=el<HTMLOutputElement>('status');
 const original=new Map(specialBuildings.map(s=>[s.id,s.group.position.clone()]));
 const selected=()=>items.find(a=>a.id===select.value)??items[0];
 let preview:THREE.Group|null=null,copy:THREE.Object3D|null=null,isolated=false,savedCamera=camera.position.clone(),savedTarget=controls.target.clone();
 const savedScene={fog:scene.fog,background:scene.background,sky:sky.visible};
 const shadowCamera=sun.shadow.camera,savedShadow={position:sun.position.clone(),target:sun.target.position.clone(),left:shadowCamera.left,right:shadowCamera.right,top:shadowCamera.top,bottom:shadowCamera.bottom,near:shadowCamera.near,far:shadowCamera.far,bias:sun.shadow.bias,normalBias:sun.shadow.normalBias};
 function restoreShadow(){sun.position.copy(savedShadow.position);sun.target.position.copy(savedShadow.target);sun.target.updateMatrixWorld();for(const k of ['left','right','top','bottom','near','far'] as const)shadowCamera[k]=savedShadow[k];sun.shadow.bias=savedShadow.bias;sun.shadow.normalBias=savedShadow.normalBias;shadowCamera.updateProjectionMatrix();}
 const mapGrid=new THREE.Group();mapGrid.name='planning-grid';mapGrid.visible=false;world.add(mapGrid);
 let picked:THREE.Vector3|null=null,notes:{x:number;y:number;z:number;text:string}[]=[];
 const noteGroup=new THREE.Group();noteGroup.name='planning-notes';world.add(noteGroup);
 const tell=(text:string)=>status.textContent=text;
 function fillList(){const query=el<HTMLInputElement>('search').value.trim().toLowerCase(),before=select.value;select.replaceChildren();for(const item of items)if((item.title+' '+item.id).toLowerCase().includes(query)){const o=document.createElement('option');o.value=item.id;o.textContent=item.title;select.appendChild(o);}if([...select.options].some(o=>o.value===before))select.value=before;}
 function fillPosition(){const a=selected(),p=a.placement?.group.position;for(const key of ['x','y','z'] as const){const input=el<HTMLInputElement>(key);input.disabled=!p;input.value=p?p[key].toFixed(2):'';}el<HTMLButtonElement>('apply').disabled=!p;el<HTMLButtonElement>('locate').disabled=!p;if(!isolated)el('stats').textContent=p?`${a.id} · 网格 ${gridCell(p.x,p.z).id}`:'可单独检查形体；通用样式没有固定地图位置。';}
 function disposePreview(){if(!preview)return;preview.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.previewMaterial){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}if(o.userData.previewHelper&&o instanceof THREE.LineSegments){o.geometry.dispose();(o.material as THREE.Material).dispose();}});scene.remove(preview);preview=null;copy=null;}
 function fit(angle='iso'){
  if(!copy)return;copy.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(copy,true),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),distance=Math.max(size.x,size.y,size.z)*(innerWidth<600?3.4:2)+1;
  camera.setViewOffset(innerWidth,innerHeight,innerWidth<600?0:-170,innerWidth<600?innerHeight*.18:0,innerWidth,innerHeight);
  const views:Record<string,THREE.Vector3>={front:new THREE.Vector3(0,.15,1),back:new THREE.Vector3(0,.15,-1),side:new THREE.Vector3(1,.15,0),top:new THREE.Vector3(.001,1,.001),iso:new THREE.Vector3(.75,.55,1)};
  camera.up.set(0,angle==='top'?0:1,angle==='top'?-1:0);controls.target.copy(center);camera.position.copy(center).add(views[angle].normalize().multiplyScalar(distance));controls.update();
 }
 function isolate(){
  if(!isolated){savedCamera=camera.position.clone();savedTarget=controls.target.clone();savedScene.fog=scene.fog;savedScene.background=scene.background;savedScene.sky=sky.visible;}
  controls.dispatchEvent({type:'start'});updateFocus(2);isolated=true;world.userData.assetView=true;enterAssetDaylight();world.visible=false;sky.visible=false;scene.fog=null;scene.background=new THREE.Color(0xdce9ed);labelRenderer.domElement.style.display='none';document.body.dataset.assetView='true';controls.minDistance=.4;controls.maxDistance=1000;camera.near=.02;camera.updateProjectionMatrix();
  disposePreview();preview=new THREE.Group();preview.name='isolated-asset';scene.add(preview);copy=selected().source.clone(true);copy.position.set(0,0,0);if(selected().placement)copy.rotation.set(0,0,0);
  let triangles=0,meshes=0;copy.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.userData.previewMaterial=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.ShaderMaterial&&m.userData.lightingRole==='volumetric-cloud')prepareCloudMaterial(m);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshToonMaterial)m.emissiveIntensity=0;for(const m of Array.isArray(o.material)?o.material:[o.material])if('wireframe' in m)m.wireframe=el<HTMLInputElement>('wire').checked;}});preview.add(copy);copy.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(copy,true),size=b.getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,2)*1.4;
  const center=b.getCenter(new THREE.Vector3()),lightDistance=span*4+40;sun.position.copy(new THREE.Vector3().fromArray(DAY_LIGHTING.sun.position).normalize().multiplyScalar(lightDistance).add(center));sun.target.position.copy(center);sun.target.updateMatrixWorld();shadowCamera.left=shadowCamera.bottom=-span;shadowCamera.right=shadowCamera.top=span;shadowCamera.near=1;shadowCamera.far=lightDistance+span*3;sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;shadowCamera.updateProjectionMatrix();
  const grid=new THREE.GridHelper(span,20,0x759396,0xb8cdd0);grid.position.set((b.min.x+b.max.x)/2,b.min.y-.025,(b.min.z+b.max.z)/2);grid.userData.previewHelper=true;preview.add(grid);
  el('stats').textContent=`${meshes} 个网格 · ${Math.round(triangles).toLocaleString()} 三角面\n尺寸 ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`;fit();
 }
 function exit(){if(!isolated)return;restoreShadow();disposePreview();isolated=false;world.userData.assetView=false;world.visible=true;scene.fog=savedScene.fog;scene.background=savedScene.background;sky.visible=savedScene.sky;labelRenderer.domElement.style.display='';delete document.body.dataset.assetView;controls.autoRotate=false;el<HTMLInputElement>('spin').checked=false;controls.minDistance=40;controls.maxDistance=950;camera.near=.5;camera.clearViewOffset();camera.up.set(0,1,0);camera.updateProjectionMatrix();camera.position.copy(savedCamera);controls.target.copy(savedTarget);controls.update();refreshDayNight();fillPosition();}
 function move(p:PositionDraft){const a=specialBuildings.find(s=>s.id===p.id)!;const delta=new THREE.Vector3(p.x,p.y,p.z).sub(a.group.position);a.group.position.set(p.x,p.y,p.z);a.pick.position.add(delta);a.group.updateMatrixWorld(true);for(const l of labelObjs)if(l.element.dataset.special===p.id)l.position.add(delta);}
 function positions(){return specialBuildings.map(s=>({id:s.id,x:s.group.position.x,y:s.group.position.y,z:s.group.position.z}));}
 function save(){try{localStorage.setItem(STORE,JSON.stringify(positions()));}catch{tell('当前浏览器无法保存草稿，请导出 JSON。');}}
 function readDraft(){try{const raw=localStorage.getItem(STORE);if(raw)for(const p of validatePositions(JSON.parse(raw),new Set(specialBuildings.map(s=>s.id))))move(p);}catch{tell('已忽略无效的位置草稿。');}}
 function renderNotes(){el('notes').replaceChildren();for(const child of [...noteGroup.children]){noteGroup.remove(child);if(child instanceof THREE.Mesh){child.geometry.dispose();(child.material as THREE.Material).dispose();}}notes.forEach((n,i)=>{const row=document.createElement('div');row.className='asset-note-row';const text=document.createElement('span');text.textContent=`${gridCell(n.x,n.z).id} · ${n.x.toFixed(1)}, ${n.z.toFixed(1)} · ${n.text}`;const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','删除位置备注');remove.onclick=()=>{notes.splice(i,1);saveNotes();renderNotes();};row.append(text,remove);el('notes').appendChild(row);const m=new THREE.Mesh(new THREE.ConeGeometry(.7,2,6),new THREE.MeshBasicMaterial({color:0xe66c45}));m.position.set(n.x,n.y+1,n.z);noteGroup.add(m);});}
 function saveNotes(){try{localStorage.setItem(NOTE_STORE,JSON.stringify(notes));}catch{tell('请导出位置备注以保存。');}}
 function makeGrid(){if(mapGrid.children.length)return;const v:number[]=[];for(let axis=0;axis<2;axis++){const count=axis?MAP_GRID.rows:MAP_GRID.columns,extent=axis?MAP_GRID.columns*20:MAP_GRID.rows*20;for(let i=0;i<=count;i++)for(let d=0;d<extent;d+=2){for(const t of [d,Math.min(d+2,extent)]){const x=MAP_GRID.originX+(axis?t:i*20),z=MAP_GRID.originZ+(axis?i*20:t);v.push(x,isLand(x,z)?surfaceHeight(x,z)+.12:.15,z);}}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));mapGrid.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x2c7382,transparent:true,opacity:.65})));
  for(let axis=0;axis<2;axis++)for(let i=0;i<(axis?MAP_GRID.rows:MAP_GRID.columns);i++){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const c=canvas.getContext('2d')!;c.fillStyle='#fff6dc';c.fillRect(0,0,128,64);c.fillStyle='#204653';c.font='bold 38px sans-serif';c.textAlign='center';c.fillText(axis?String(i+1).padStart(2,'0'):columnLabel(i),64,46);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));s.scale.set(7,3.5,1);s.position.set(MAP_GRID.originX+(axis?-6:i*20+10),3,MAP_GRID.originZ+(axis?i*20+10:-6));mapGrid.add(s);}
 }
 launch.onclick=()=>{panel.hidden=!panel.hidden;};el('close').onclick=()=>{exit();panel.hidden=true;};el('search').oninput=()=>{fillList();if(!select.options.length){tell('未找到匹配资产。');return;}fillPosition();if(isolated)isolate();};select.onchange=()=>{fillPosition();if(isolated)isolate();};el('isolate').onclick=isolate;el('map').onclick=exit;el('fit').onclick=()=>{if(!isolated)isolate();else fit();};
 panel.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(b=>b.onclick=()=>{if(!isolated)isolate();fit(b.dataset.angle);});el('wire').onchange=()=>{if(isolated)isolate();};el('spin').onchange=()=>{if(!isolated)isolate();controls.autoRotate=el<HTMLInputElement>('spin').checked;controls.autoRotateSpeed=1;};
 el('apply').onclick=()=>{const a=selected();if(!a.placement)return;try{if(['x','y','z'].some(k=>!el<HTMLInputElement>(k).value.trim()))throw Error('请输入完整的 X / Y / Z 坐标');const p=validatePositions([{id:a.id,...Object.fromEntries(['x','y','z'].map(k=>[k,Number(el<HTMLInputElement>(k).value)]))}],new Set([a.id]))[0];move(p);save();fillPosition();tell('位置草稿已保存到本机。');}catch(e){tell((e as Error).message);}};
 el('locate').onclick=()=>{exit();const p=selected().source.position;camera.position.copy(p).add(new THREE.Vector3(-45,35,55));controls.target.copy(p);controls.update();};
 el('grid').onchange=()=>{exit();makeGrid();mapGrid.visible=el<HTMLInputElement>('grid').checked;};el('top-map').onclick=()=>{exit();controls.dispatchEvent({type:'start'});camera.position.set(40,600,10);controls.target.set(40,0,10);controls.update();};
 const ray=new THREE.Raycaster(),uv=new THREE.Vector2();let down=[0,0];renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{if(isolated||!mapGrid.visible||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;uv.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(uv,camera);const ground=['irregular-elevated-terrain','reclaimed-quay-fill','animated-ocean'].map(n=>world.getObjectByName(n)).filter(Boolean) as THREE.Object3D[];const hit=ray.intersectObjects(ground)[0];if(hit){picked=hit.point.clone();el('coord').textContent=`${gridCell(picked.x,picked.z).id} · X ${picked.x.toFixed(2)} / Y ${picked.y.toFixed(2)} / Z ${picked.z.toFixed(2)}`;}});
 el('add-note').onclick=()=>{if(!picked){tell('请先打开网格并点击地图。');return;}notes.push({x:picked.x,y:picked.y,z:picked.z,text:el<HTMLInputElement>('note').value.trim()||'待调整位置'});saveNotes();renderNotes();};
 el('export').onclick=()=>{const value={schema:'citymap-layout-v1',grid:MAP_GRID,positions:positions().map(p=>({...p,cell:gridCell(p.x,p.z).id})),notes,roads:ROAD_PATHS};const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='citymap-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);tell('已导出布局、网格编号和备注。');};
 el('import').onclick=()=>el<HTMLInputElement>('file').click();el<HTMLInputElement>('file').onchange=async()=>{const file=el<HTMLInputElement>('file').files?.[0];if(!file)return;try{if(file.size>2e6)throw Error('文件过大');const d=JSON.parse(await file.text());if(d.schema!=='citymap-layout-v1')throw Error('布局文件版本不匹配');const values=validatePositions(d.positions,new Set(specialBuildings.map(s=>s.id)));const importedNotes=d.notes===undefined?null:d.notes;
 if(importedNotes!==null&&(!Array.isArray(importedNotes)||importedNotes.length>500||importedNotes.some(n=>!n||!['x','y','z'].every(k=>Number.isFinite(n[k]))||Math.abs(n.x)>1000||Math.abs(n.z)>1000||Math.abs(n.y)>500||typeof n.text!=='string'||n.text.length>1000)))throw Error('位置备注格式不正确');
 values.forEach(move);if(importedNotes!==null){notes=importedNotes;saveNotes();renderNotes();}save();fillPosition();tell(`已导入 ${values.length} 个资产位置。`);}catch(e){tell((e as Error).message);}el<HTMLInputElement>('file').value='';};
 el('reset').onclick=()=>{for(const [id,p] of original)move({id,x:p.x,y:p.y,z:p.z});try{localStorage.removeItem(STORE);}catch{}fillPosition();tell('已恢复原始地图位置；备注仍保留。');};
 fillList();readDraft();fillPosition();try{const parsed=JSON.parse(localStorage.getItem(NOTE_STORE)??'[]');if(Array.isArray(parsed))notes=parsed.filter(n=>['x','y','z'].every(k=>Number.isFinite(n[k]))&&typeof n.text==='string').slice(0,500);}catch{}renderNotes();
 window.addEventListener('resize',()=>{if(isolated)fit();});
 const requested=new URLSearchParams(location.search).get('asset');if(requested&&items.some(i=>i.id===requested)){select.value=requested;fillPosition();}
 if(new URLSearchParams(location.search).get('view')==='assets'){panel.hidden=false;isolate();}
}
