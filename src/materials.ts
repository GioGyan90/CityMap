import * as THREE from 'three';

/* Wider value separation; the cool fill keeps the darkest band readable. */
export const gradientMap = (() => {
  const data = new Uint8Array([72, 145, 218, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
