import * as THREE from 'three';
import {windowLightMask,type WindowLightRect} from './facadeLighting';
import type {BuildingStyle} from './buildings';

/** Pixel-space layouts describe occupied floors, not random marks on a wall. */
export function districtFacadeWindows(style:BuildingStyle,floors:number,cols:number,front:boolean){
 const out:{x:number;y:number;w:number;h:number;lit:boolean}[]=[];const margin=8,cw=112/cols,ch=112/floors;
 for(let row=0;row<floors;row++)for(let col=0;col<cols;col++){
  const ground=row===floors-1;
  let wf=.61,hf=.58;
  if(style==='warehouse'){if(!ground && row!==0)continue;wf=.52;hf=.30;}
  else if(style==='glass'){wf=.86;hf=.72;}
  else if(style==='arcade'){wf=ground?.83:.56;hf=ground?.72:.57;}
  else if(style==='apartment'){wf=.58;hf=.69;}
  else if(style==='villa'||style==='pitched'){wf=.49;hf=.57;}
  else if(style==='artdeco'||style==='stepped'){wf=.48;hf=.68;}
  const w=cw*wf,h=ch*hf,x=margin+col*cw+(cw-w)/2,y=margin+row*ch+(ch-h)/2;
  // A wider central reservation also covers entries that span two window bays.
  if(front&&ground&&x<80&&x+w>48)continue;
  out.push({x,y,w,h,lit:(row*7+col*11+floors+cols)%5===0});
 }
 return out;
}
const cache=new Map<string,THREE.CanvasTexture>();
export function districtFacadeTexture(base:string,win:string,floors:number,cols:number,style:BuildingStyle,front:boolean){
 const key=[base,win,floors,cols,style,front].join('|');const old=cache.get(key);if(old)return old;
 const size=128,cv=document.createElement('canvas');cv.width=cv.height=size;const g=cv.getContext('2d')!;
 g.fillStyle=base;g.fillRect(0,0,size,size);
 const windows=districtFacadeWindows(style,floors,cols,front),light:WindowLightRect[]=[];
 for(const p of windows){
  const {x,y,w,h}=p;g.fillStyle=style==='glass'?'#b7d8da':'#d4c6ae';g.fillRect(x-1,y-1,w+2,h+2);
  g.fillStyle=win;g.fillRect(x,y,w,h);
  const mullion=style==='glass'?'#b5dce0':'#ece2cc';g.fillStyle=mullion;
  if(w>7){g.fillRect(x+w*.5-.55,y,1.1,h);}
  if(h>9 && style!=='warehouse')g.fillRect(x,y+h*.4,w,1);
  // Some inhabited rooms have a drawn curtain, so neighbouring homes differ.
  const curtain=(style==='apartment'||style==='villa'||style==='pitched')&&w>5&&h>5&&Math.floor(x+y)%3===0?w*.17:0;
  if(curtain){g.fillStyle='#efdbb8';g.fillRect(x+1,y+1,curtain,Math.max(0,h-2));}
  if(style!=='glass'){g.fillStyle='#f2e4cd';g.fillRect(x-1,y+h+1,w+2,1.5);}
  if((style==='villa'||style==='pitched')&&w>5){g.fillStyle='#728c80';g.fillRect(x-2,y,1,h);g.fillRect(x+w+1,y,1,h);}
  // Separate the small panes in the light mask so trim stays unlit.
  const xs=w>7?[[1,w*.5-1.6],[w*.5+.55,w*.5-1.55]]:[[1,w-2]];
  const ys=h>9&&style!=='warehouse'?[[1,h*.4-1],[h*.4+1,h*.6-2]]:[[1,h-2]];
  for(const [dx,dw] of xs)for(const [dy,dh] of ys){const start=Math.max(dx,curtain?curtain+1:dx),end=dx+dw;if(end>start&&dh>0)light.push({x:x+start,y:y+dy,width:end-start,height:dh,lit:p.lit});}
 }
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.userData.windowEmission=windowLightMask(size,light);tex.userData.facadeType=style;tex.userData.facadeWindows=windows;cache.set(key,tex);return tex;
}
