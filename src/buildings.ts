import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd, clamp } from "./random";
import { toon } from "./materials";
import { GROUND_Y } from "./config";
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
    new THREE.LineBasicMaterial({ color: 0x252a42, transparent: true, opacity: 0.8 })
  );
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
  lg.addColorStop(1, 'rgba(20,20,45,0.16)');
  g.fillStyle = lg;
  g.fillRect(0, 0, S, S);

  const margin = 16;
  const cw = (S - margin * 2) / cols;
  const ch = (S - margin * 2) / floors;

  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const px = margin + c * cw;
      const py = margin + r * ch;
      const padX = cw * 0.22, padY = ch * 0.26;
      g.fillStyle = rnd() < lit ? '#ffe9a6' : win;
      g.fillRect(px + padX, py + padY, cw - padX * 2, ch - padY * 2);
      g.strokeStyle = 'rgba(25,28,48,0.72)';
      g.lineWidth = 2;
      g.strokeRect(px + padX, py + padY, cw - padX * 2, ch - padY * 2);
    }
  }

  /* 深色外轮廓 = 漫画感 */
  g.strokeStyle = '#20243a';
  g.lineWidth = 10;
  g.strokeRect(5, 5, S - 10, S - 10);

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

export function makeBuilding(o) {
  const {
    x, z, w = 8, d = 8, h = 10, ry = 0,
    base = '#f3ebdd', win = '#48759c', roof = 0xb8a894,
    lit = 0.28, style = 'flat', detail = true
  } = o;

  const floors = clamp(Math.round(h / 3.4), 2, 9);
  const cols = clamp(Math.round(Math.max(w, d) / 3.2), 2, 6);
  const tex = getFacadeTex(base, win, floors, cols, lit);
  const sideMat = facadeMaterial(tex);
  const roofMat = toon(roof);

  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat]);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  g.rotation.y = ry;
  g.add(mesh);

  addOutline(geo, x, GROUND_Y + h / 2, z, ry);

  if (style === 'pitched') {
    const rh = Math.min(w, d) * 0.55;
    const cone = new THREE.ConeGeometry(0.7072, 1, 4, 1);
    const rm = new THREE.Mesh(cone, roofMat);
    rm.scale.set(w * 1.08, rh, d * 1.08);
    rm.rotation.y = Math.PI / 4;
    rm.position.y = h + rh / 2;
    rm.castShadow = true;
    g.add(rm);
  } else if (detail) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.9, d * 0.82), toon(roof));
    cap.position.y = h + 0.45;
    cap.castShadow = true;
    g.add(cap);
    if (h > 18) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4, 5), toon(0xdfe5f0));
      ant.position.set(w * 0.2, h + 2.6, -d * 0.15);
      g.add(ant);
    }
  }

  world.add(g);
  return g;
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

