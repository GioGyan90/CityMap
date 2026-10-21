import * as THREE from 'three';

/* 卡通阶梯光照贴图 */
export const gradientMap = (() => {
  const data = new Uint8Array([96, 158, 210, 246]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
