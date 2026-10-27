import * as THREE from 'three';
import {windowLightMask, type WindowLightRect} from './facadeLighting';

/** Shared floor heights align the three tower setbacks and the teaching wings. */
export function campusWindowLayout(width:number,height:number,bottom:number,side:'end'|'long',tower:boolean,front:boolean){
 const windows:{x:number;y:number;w:number;h:number;lit:boolean}[]=[];
 const pitch=tower?2.83:3;const count=side==='long'?4:tower?3:2;
 for(let floor=0;floor<6;floor++){
  const y=floor*pitch+.72,wh=tower?1.55:1.65;
  if(y<bottom+.15 || y+wh>bottom+height-.12)continue;
  for(let bay=0;bay<count;bay++){
   const spacing=width/(count+1),x=side==='end'&&!tower?(bay===0?-1:1)*width*.34:-width/2+spacing*(bay+1),ww=Math.min(spacing*(side==='long'?.72:.58),side==='long'?2.05:1.25);
   // Front ground-level central opening belongs to the existing entrance, not a window.
   if(front && floor===0 && Math.abs(x)<1.2+ww/2)continue;
   windows.push({x,y,w:ww,h:wh,lit:(floor*3+bay+(tower?1:0))%4===0});
  }
 }
 return windows;
}
const cache=new Map<string,THREE.CanvasTexture>();
export function campusFacadeTexture(width:number,height:number,bottom:number,side:'end'|'long',tower:boolean,front:boolean,base:string){
 const key=[width,height,bottom,side,tower,front,base].join('|');const old=cache.get(key);if(old)return old;
 const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const g=canvas.getContext('2d')!;
 g.fillStyle=base;g.fillRect(0,0,size,size);
 const windows=campusWindowLayout(width,height,bottom,side,tower,front),light:WindowLightRect[]=[];
 for(const p of windows){const x=(p.x-p.w/2+width/2)/width*size,y=(1-(p.y+p.h-bottom)/height)*size,w=p.w/width*size,h=p.h/height*size;
  g.fillStyle='#d6c7a8';g.fillRect(x-2,y-2,w+4,h+4);g.fillStyle='#4389ab';g.fillRect(x,y,w,h);
  // Classroom glazing has paired panes; the end elevations use narrower vertical openings.
  g.fillStyle='#e7ddc7';g.fillRect(x+w/2-1,y,2,h);g.fillRect(x,y+h*.36,w,2);
  g.fillStyle='#f5e8ce';g.fillRect(x-3,y+h+2,w+6,3);
  for(const [dx,dw] of [[1,w/2-2],[w/2+1,w/2-2]]) for(const [dy,dh] of [[1,h*.36-1],[h*.36+2,h*.64-3]]) light.push({x:x+dx,y:y+dy,width:dw,height:dh,lit:p.lit});
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 texture.userData.windowEmission=windowLightMask(size,light);texture.userData.campusWindows=windows;cache.set(key,texture);return texture;
}
