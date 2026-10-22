import * as THREE from 'three';

export interface WindowLightRect {x:number;y:number;width:number;height:number;lit:boolean}
/** Explicit window geometry, never facade RGB values, defines indoor emission. */
export function windowLightMask(size:number,windows:WindowLightRect[]){
 const pixels=new Uint8Array(size*size*4);
 for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
 for(const w of windows){
  if(!w.lit)continue;
  // Pixel centers must be inside the glazing; the outside stroke/frame stays unlit.
  for(let y=Math.max(0,Math.ceil(w.y-.5));y<Math.min(size,Math.ceil(w.y+w.height-.5));y++)
   for(let x=Math.max(0,Math.ceil(w.x-.5));x<Math.min(size,Math.ceil(w.x+w.width-.5));x++){
    const i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;
   }
 }
 const texture=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
 texture.name='window-only-emission';texture.flipY=true;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
 texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
 return texture;
}
