import {entranceWall,addBuildingEntrance} from './buildingAccess';
import {createMassing,massingGeometry,type BuildingPlan} from './buildingPlans';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd, clamp } from "./random";
import { toon } from "./materials";
import { GROUND_Y, buildingFootprints } from "./config";
import { world } from "./scene";

export const outlineParts = [];
export function addOutline(geo, x, y, z, ry = 0) {
  const e = new THREE.EdgesGeometry(geo, 25);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
    new THREE.Vector3(1, 1, 1)
  );
  e.applyMatrix4(m);
  outlineParts.push(e);
}
export function finalizeOutlines() {
  if (!outlineParts.length) return;
  const merged = mergeGeometries(outlineParts, false);
  const lines = new THREE.LineSegments(
    merged,
    new THREE.LineBasicMaterial({ color: 0x365c77, transparent: true, opacity: 0.36 })
  );
  lines.name = "city-building-outlines";
  world.add(lines);
  outlineParts.forEach(part => part.dispose());
  outlineParts.length = 0;
}

/* ============================================================
   5. 立面贴图 / 通用楼体
   ============================================================ */
export const facadeCache = new Map();
export const matCache = new Map();

export function getFacadeTex(base, win, floors, cols, lit) {
  lit = Math.round(lit * 4) / 4;
  const key = `${base}|${win}|${floors}|${cols}|${lit}`;
  if (facadeCache.has(key)) return facadeCache.get(key);

  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');

  g.fillStyle = base;
  g.fillRect(0, 0, S, S);

  const lg = g.createLinearGradient(0, 0, 0, S);
  lg.addColorStop(0, 'rgba(255,255,255,0.22)');
  lg.addColorStop(0.55, 'rgba(255,255,255,0)');
  lg.addColorStop(1, 'rgba(31,79,112,0.08)');
  g.fillStyle = lg;
  g.fillRect(0, 0, S, S);

  const margin = 10;
  const cw = (S - margin * 2) / cols;
  const ch = (S - margin * 2) / floors;

  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const px = margin + c * cw;
      const py = margin + r * ch;
      const padX = cw * (floors >= 9 ? .13 : .19), padY = ch * (floors >= 9 ? .16 : .21);
      g.fillStyle = rnd() < lit ? '#ffe9a6' : win;
      g.fillRect(px + padX, py + padY, cw - padX * 2, ch - padY * 2);
      g.strokeStyle = 'rgba(39,91,120,0.55)';
      g.lineWidth = .8;
      g.strokeRect(px + padX, py + padY, cw - padX * 2, ch - padY * 2);
    }
  }

  /* Thin warm stone trim preserves light facades at city-map scale. */
  g.strokeStyle = '#cbbb92';
  g.lineWidth = 2.6;
  g.strokeRect(1.5, 1.5, S - 3, S - 3);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  facadeCache.set(key, tex);
  return tex;
}

export function facadeMaterial(tex) {
  let m = matCache.get(tex.uuid);
  if (!m) {
    m = toon(0xffffff, { map: tex });
    matCache.set(tex.uuid, m);
  }
  return m;
}

export type BuildingStyle = 'flat' | 'pitched' | 'glass' | 'stepped' | 'artdeco' | 'round' | 'arcade' | 'apartment' | 'villa' | 'warehouse';
export interface BuildingOptions {
  x: number; z: number; w?: number; d?: number; h?: number; ry?: number;
  base?: string; win?: string; roof?: number; lit?: number; style?: BuildingStyle; detail?: boolean; elevation?: number; plan?: BuildingPlan; frontage?: [number,number];
}
export const buildingStats = { count: 0, plans: {} as Record<string,number>, samples: [] as {plan:BuildingPlan;x:number;z:number;w:number;d:number;h:number;wings?:ReturnType<typeof createMassing>}[], styles: {} as Record<string, number>, batches: 0, originalDrawCalls: 0, entrances: [] as {x:number;z:number;kind:string;height:number}[] };
const buildingGroups: THREE.Group[] = [];
export const ordinaryAssetSamples=new Map<string,THREE.Group>();
const accentMaterials = new Map<number, THREE.MeshToonMaterial>();
function accent(color: number) {
  if (!accentMaterials.has(color)) accentMaterials.set(color, toon(color));
  return accentMaterials.get(color)!;
}

export function makeBuilding(o: BuildingOptions) {
  const { x, z, w = 8, d = 8, h = 10, ry = 0, base = '#f3ebdd', win = '#2183b3',
    roof = 0x267ca4, lit = 0.25, style = 'flat', plan = 'rect', detail = true, elevation = GROUND_Y } = o;
  buildingStats.count++;
  buildingStats.plans[plan]=(buildingStats.plans[plan]||0)+1;

  buildingStats.styles[style] = (buildingStats.styles[style] || 0) + 1;
  buildingFootprints.push({ x, z, w: Math.abs(w*Math.cos(ry))+Math.abs(d*Math.sin(ry)), d: Math.abs(d*Math.cos(ry))+Math.abs(w*Math.sin(ry)) });
  const g = new THREE.Group();
  g.name = `building-${style}`;
  g.position.set(x, elevation, z);
  g.rotation.y = ry;
  world.add(g);
  buildingGroups.push(g);
  const roofMat = accent(roof), trim = accent(0xf4e8ce), blue = accent(0x3987aa);
  const floors = clamp(Math.round(h / 3), 2, 22);
  const sideMat = facadeMaterial(getFacadeTex(base, win, floors, clamp(Math.round(w / 2.5), 2, 8), lit));
  const solid = (geo: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], px: number, py: number, pz: number) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const block = (bw: number, bh: number, bd: number, py: number, material = sideMat, px = 0, pz = 0) =>
    solid(new THREE.BoxGeometry(bw, bh, bd),
      material===sideMat?[sideMat,sideMat,roofMat,trim,sideMat,sideMat]:material,px,py,pz);

  if(plan!=='rect'){
    const wings=createMassing(plan,x*37.1+z*19.7);
    buildingStats.samples.push({plan,x,z,w,d,h,wings});
    g.userData.massing=wings;
    const {geometry,rims}=massingGeometry(wings,w,d,h);
    const wingFacade=style==='glass'?facadeMaterial(getFacadeTex('#598ea5','#254f6c',floors,clamp(Math.round(w/2.5),2,8),lit)):sideMat;
    solid(geometry,[wingFacade,roofMat],0,0,0);
    for(const {a,b,height} of rims){
      const edge=block(Math.hypot(b[0]-a[0],b[1]-a[1])+.08,.28,.17,height+.14,trim,(a[0]+b[0])/2,(a[1]+b[1])/2);
      edge.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);
    }
    for(const wing of wings){
      const cx=(wing.x0+wing.x1)*w/2,cz=(wing.z0+wing.z1)*d/2,ww=(wing.x1-wing.x0)*w,dd=(wing.z1-wing.z0)*d,y=wing.height*h;
      if(wing.role==='link'){
        // Low connectors become occupied terraces instead of an equally tall letter stroke.
        block(ww*.7,.15,dd*.52,y+.12,accent(0xb8a385),cx,cz);
        for(const side of [-1,1]){
          block(.55,.5,.55,y+.4,trim,cx+side*ww*.27,cz);
          solid(new THREE.IcosahedronGeometry(.43,1),accent(0x568263),cx+side*ww*.27,y+.9,cz);
        }
      }else if(wing.role==='main'&&Math.min(ww,dd)>2.4){
        block(ww*.42,.8,Math.min(dd*.3,2.5),y+.4,trim,cx,cz);
        block(ww*.46,.14,Math.min(dd*.34,2.8),y+.88,blue,cx,cz);
      }
    }
  } else if (style === 'round') {
    // A distinct cylindrical tower with blue glazing, horizontal rings and a tapered crown.
    solid(new THREE.CylinderGeometry(w*.48, w*.48, h, 16), blue, 0, h/2, 0);
    for (let y=3; y<h; y+=5) solid(new THREE.CylinderGeometry(w*.50,w*.50,.45,16),trim,0,y,0);
    solid(new THREE.ConeGeometry(w*.5, 5, 16), roofMat, 0, h+2.5, 0);
    block(w*1.2, 3, d*1.2, 1.5, trim);
  } else if (style === 'stepped' || style === 'artdeco') {
    // True setbacks alter the skyline instead of just adding roof ornaments to identical cubes.
    block(w, h*.52, d, h*.26);
    block(w*.78, h*.30, d*.78, h*.67);
    block(w*.53, h*.18, d*.53, h*.91);
    for (const [scale, y] of [[1.05,h*.52],[.83,h*.82],[.57,h]]) block(w*scale,.7,d*scale,y,trim);
    if (style === 'artdeco') {
      for (const xx of [-w*.35,w*.35]) block(.55,h*.5,.6,h*.26,trim,xx,d*.5+.2);
      solid(new THREE.SphereGeometry(w*.27,12,8,0,Math.PI*2,0,Math.PI/2), roofMat, 0,h,0);
      solid(new THREE.CylinderGeometry(.12,.23,7,6),accent(0xe8be59),0,h+w*.27+3.5,0);
    }
  } else {
    const glass = style === 'glass';
    block(w,h,d,h/2, glass ? blue : sideMat);
    addOutline(new THREE.BoxGeometry(w,h,d),x,elevation+h/2,z,ry);
    if (glass) {
      for (let y=3; y<h; y+=4) block(w+.25,.45,d+.25,y,trim);
      for (const xx of [-w*.45,0,w*.45]) block(.36,h,.38,h/2,trim,xx,d/2+.12);
      block(w*1.1,1.3,d*1.1,h+.65,trim);
      block(w*.5,rrHeight(h),d*.5,h+rrHeight(h)/2,roofMat);
    } else if (style === 'pitched' || style === 'villa' || style === 'warehouse') {
      const rh = Math.min(w,d) * (style === 'warehouse' ? .28 : .48);
      const rm = solid(new THREE.ConeGeometry(.7072,1,4),roofMat,0,h+rh/2,0);
      rm.scale.set(w*1.1,rh,d*1.1);rm.rotation.y=Math.PI/4;
      if (style === 'villa') {
        block(w*.38,h*.6,d*.3,h*.3,trim,w*.53,d*.20);
        const turret=solid(new THREE.ConeGeometry(w*.27,3.2,4),roofMat,w*.53,h*.6+1.6,d*.20);
        turret.rotation.y=Math.PI/4;
        block(w*.52,.4,2.4,h*.45,trim,0,d*.5+1);
      }
    } else if (style === 'apartment') {
      for(let y=3;y<h;y+=3.5) {
        block(w*.86,.28,1.1,y,trim,0,d/2+.4);
        block(w*.86,.65,.12,y+.4,blue,0,d/2+.9);
      }
      block(w*1.08,.7,d*1.08,h+.35,trim);
    } else if (style === 'arcade') {
      block(w+1,.65,d+.6,h,trim);
      block(w+1,.5,d+.6,h*.64,trim);
      for (const xx of [-w*.37,w*.37]) block(.55,h*.32,.65,h*.16,trim,xx,d/2+.5);
      const awning=solid(new THREE.BoxGeometry(w*.9,.35,2.3),accent(roof),0,h*.35,d/2+.9);
      awning.rotation.x=.15;
      block(w*.7,.9,.2,h*.48,accent(0xe8be59),0,d/2+.13);
    } else if (detail) {
      block(w*.84,.8,d*.84,h+.4,roofMat);
      block(w*.25,1.2,d*.24,h+1.3,trim,w*.16);
    }
  }
  const target=o.frontage?{x:(o.frontage[0]-x)*Math.cos(ry)-(o.frontage[1]-z)*Math.sin(ry),z:(o.frontage[0]-x)*Math.sin(ry)+(o.frontage[1]-z)*Math.cos(ry)}:undefined;
  const large=h>25,kind=style==='warehouse'?'warehouse':large?'office':style==='arcade'?'shop':'house';
  const wall=entranceWall(style==='round'?w*1.2:w,style==='round'?d*1.2:d,style==='round'?3:h,g.userData.massing,target);
  if(style==='arcade')wall.ceiling=Math.min(wall.ceiling,h*.35+.30);
  addBuildingEntrance(g,wall,large,kind,0,style!=='arcade');
  g.userData.entranceWall=wall;
  buildingStats.entrances.push({x:x+wall.x*Math.cos(ry)+wall.z*Math.sin(ry),z:z-wall.x*Math.sin(ry)+wall.z*Math.cos(ry),kind,height:wall.ceiling});
  const sampleKey=style+'-'+plan;if(!ordinaryAssetSamples.has(sampleKey)){const sample=g.clone(true);sample.position.set(0,0,0);ordinaryAssetSamples.set(sampleKey,sample);}
  return g;
}
function rrHeight(h: number) { return h > 45 ? 4 : 2; }

/** Merge only static building meshes; rides, boats, labels and cars retain their transforms. */
export function batchBuildings() {
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const g of buildingGroups) {
    // Special buildings keep independent geometry for hover focus.
    if (g.parent !== world) continue;
    g.updateMatrixWorld(true);
    g.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const groups = Array.isArray(obj.material) ? obj.geometry.groups : [{start:0,count:obj.geometry.index?.count ?? obj.geometry.attributes.position.count,materialIndex:0}];
      for (const group of groups) {
        const material = materials[group.materialIndex || 0];
        const geo = obj.geometry.clone();
        if (geo.index) geo.setIndex(Array.from(geo.index.array.slice(group.start,group.start+group.count)) as number[]);
        let part = geo.index ? geo.toNonIndexed() : geo;
        if (part !== geo) geo.dispose();
        part.applyMatrix4(obj.matrixWorld);
        if (!buckets.has(material)) buckets.set(material,[]);
        buckets.get(material)!.push(part);
        buildingStats.originalDrawCalls++;
      }
      obj.geometry.dispose();
    });
    world.remove(g);
  }
  for (const [material,parts] of buckets) {
    const geo = mergeGeometries(parts,false);
    parts.forEach(p=>p.dispose());
    if (!geo) throw new Error('Unable to batch city building geometry');
    const mesh=new THREE.Mesh(geo,material);
    mesh.name='city-building-batch';
    mesh.castShadow=mesh.receiveShadow=true;
    world.add(mesh);
  }
  buildingStats.batches=buckets.size;
  world.userData.buildings=buildingStats;
  buildingGroups.length=0;
}

/* 便捷立方体（自动描边） */
export function box(w, h, d, color, x, y, z, opt: { ry?: number; cast?: boolean; outline?: boolean } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  if (opt.ry) m.rotation.y = opt.ry;
  m.castShadow = opt.cast !== false;
  m.receiveShadow = true;
  world.add(m);
  if (opt.outline !== false) addOutline(geo, x, y, z, opt.ry || 0);
  return m;
}

/* 三棱柱（山花 / 坡屋顶） */
export function prism(w, h, depth, color, x, y, z, ry = 0) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  world.add(m);
  return m;
}

