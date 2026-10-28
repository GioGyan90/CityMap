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

export const ORIGINAL_TOON_RAMP=[72,145,218,255] as const;
export const MANGA_TOON_RAMP=[85,174,174,255] as const;
/** Switching off writes the original bytes back into the same shared texture. */
export function setMangaRamp(enabled:boolean){
 const data=gradientMap.image.data,values=enabled?MANGA_TOON_RAMP:ORIGINAL_TOON_RAMP;
 if(values.some((v,i)=>data[i]!==v)){data.set(values);gradientMap.needsUpdate=true;}
}
