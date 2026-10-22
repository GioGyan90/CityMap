import * as THREE from 'three';
import {seededRandom} from './proceduralGeometry';
export type CloudKind='towering'|'broken'|'veil';
export interface CloudLobe {name:string;center:[number,number,number];radius:[number,number,number]}
/** Deliberate silhouettes first, bounded variation second. Coordinates fit [-1,1]. */
export function cloudAssembly(kind:CloudKind,seed:number){
 const r=seededRandom(seed),rr=(a:number,b:number)=>a+(b-a)*r();
 const templates:Record<CloudKind,CloudLobe[]>={
  towering:[
   {name:'wide-base',center:[0,-.30,0],radius:[.83,.32,.67]},
   {name:'offset-summit',center:[-.16,.24,0],radius:[.43,.63,.48]},
   {name:'left-shoulder',center:[-.54,-.02,.04],radius:[.36,.44,.45]},
   {name:'right-shoulder',center:[.42,.03,-.08],radius:[.40,.47,.48]},
   {name:'foreground-puff',center:[.08,-.13,.40],radius:[.43,.37,.36]},
   {name:'back-puff',center:[.13,-.04,-.42],radius:[.45,.39,.36]},
   {name:'broken-tail',center:[.70,-.22,.12],radius:[.22,.25,.30]}],
  broken:[
   {name:'loose-base',center:[-.06,-.2,0],radius:[.72,.32,.55]},
   {name:'main-puff',center:[-.29,.08,.03],radius:[.42,.58,.48]},
   {name:'side-puff',center:[.36,.02,-.13],radius:[.36,.45,.43]},
   {name:'front-fragment',center:[.03,-.17,.42],radius:[.34,.28,.29]},
   {name:'small-tail',center:[.67,-.21,.13],radius:[.24,.26,.28]}],
  veil:[
   {name:'flat-core',center:[-.12,-.10,0],radius:[.76,.44,.52]},
   {name:'offset-sheet',center:[.27,.14,-.22],radius:[.58,.40,.44]},
   {name:'trailing-sheet',center:[.56,-.13,.25],radius:[.35,.28,.35]},
   {name:'wispy-tip',center:[-.68,.02,.20],radius:[.24,.30,.30]}]
 };
 return templates[kind].map(l=>({name:l.name,center:l.center.map(v=>v+rr(-.035,.035)) as [number,number,number],radius:l.radius.map(v=>v*rr(.90,1.05)) as [number,number,number]}));
}
export function cloudMotion(seed:number){const r=seededRandom(seed);return {vx:.5+r()*1.1,vz:-.12+r()*.35,phase:r()*Math.PI*2};}
export function cloudPosition(start:THREE.Vector3,motion:ReturnType<typeof cloudMotion>,seconds:number){
 const wrap=(v:number,min:number,max:number)=>min+((v-min)%(max-min)+(max-min))%(max-min);
 return new THREE.Vector3(wrap(start.x+motion.vx*seconds,-410,450),start.y,wrap(start.z+motion.vz*seconds,-350,300));
}
export function projectedCloudShadow(center:THREE.Vector3,sun:THREE.Vector3,groundY=0){
 if(sun.y<=.10)return null;
 return new THREE.Vector2(center.x-sun.x*(center.y-groundY)/sun.y,center.z-sun.z*(center.y-groundY)/sun.y);
}

/** Bake once to a compact 8×6 slice atlas; only two lookups per march step. */
export function cloudDensityAtlas(lobes:CloudLobe[],seed:number){
 const size=48,width=size*8,height=size*6,data=new Uint8Array(width*height*4);
 const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 const hash=(x:number,y:number,z:number)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 const noise=(x:number,y:number,z:number)=>{
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=smooth(0,1,x-ix),fy=smooth(0,1,y-iy),fz=smooth(0,1,z-iz),mix=(a:number,b:number,t:number)=>a+(b-a)*t;
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),fx),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),fx),fy),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),fx),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),fx),fy),fz);
 };
 for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const p=[x,y,z].map(v=>v/(size-1)*2-1),warped=[p[0]+.045*Math.sin(p[1]*9+seed),p[1]+.045*Math.sin(p[2]*8+seed),p[2]+.045*Math.sin(p[0]*7+seed)];
  let d=0;for(const l of lobes){const distance=l.center.reduce((sum,c,i)=>sum+((warped[i]-c)/l.radius[i])**2,0),puff=1-smooth(.18,1,distance);d=1-(1-d)*(1-puff);}
  const erosion=.23*noise(p[0]*11,p[1]*11,p[2]*11)+.10*noise(p[0]*23,p[1]*23,p[2]*23),edge=1-smooth(.88,.99,Math.max(...p.map(Math.abs))),value=Math.round(Math.max(0,d-.10-erosion)*edge*255);
  const pixel=(((z>>3)*size+y)*width+(z%8)*size+x)*4;data[pixel]=data[pixel+1]=data[pixel+2]=value;data[pixel+3]=255;
 }
 return {data,width,height,size};
}
