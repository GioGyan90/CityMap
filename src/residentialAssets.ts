import {mergeGeometryBatch,type GeometryBatchPart} from './geometryBatch';
import * as THREE from 'three';
import {toon} from './materials';
import {seededRandom} from './proceduralGeometry';
import {RESORT_ACCENTS} from './visualStyle';
export type HomeStyle='balcony'|'bay'|'shutters';
function box(g:THREE.Object3D,w:number,h:number,d:number,c:number,x:number,y:number,z:number,name:string){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(c));m.position.set(x,y,z);m.name=name;m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function opening(shape:THREE.Shape,x:number,y:number,w:number,h:number){const p=new THREE.Path();p.moveTo(x-w/2,y);p.lineTo(x-w/2,y+h);p.lineTo(x+w/2,y+h);p.lineTo(x+w/2,y);p.closePath();shape.holes.push(p);}
export function createHome(style:HomeStyle='balcony',seed=23001,w=6.5,d=5.9,floors=3){
 const root=new THREE.Group();root.name='courtyard-home-'+style;const rand=seededRandom(seed),h=floors*2.8+.35,wall=[0xfff1d9,0xffddcb,0xe7f3df,0xf2e5f2][seed%4],trim=0xfdf9eb,accent=[0x319c9e,0x8167ad,0xc77756][seed%3];
 box(root,w,.24,d,0xc4b7a2,0,.12,0,'house-plinth');
 for(let face=0;face<4;face++){
  const span=face%2?d:w,g=new THREE.Group();g.name=['front-facade','right-facade','rear-facade','left-facade'][face];g.rotation.y=face*Math.PI/2;g.position.set(face===1?w/2:face===3?-w/2:0,0,face===0?d/2:face===2?-d/2:0);root.add(g);
  const shape=new THREE.Shape([new THREE.Vector2(-span/2,.18),new THREE.Vector2(span/2,.18),new THREE.Vector2(span/2,h),new THREE.Vector2(-span/2,h)]),cols=face%2?2:3,windows:{x:number;y:number;ww:number;hh:number;floor:number;col:number}[]=[];
  for(let floor=0;floor<floors;floor++)for(let col=0;col<cols;col++){
   const x=(col-(cols-1)/2)*(span-.9)/cols,y=floor*2.8+1.02;
   if(face===0&&floor===0&&col===1){opening(shape,x,.18,1.25,2.15);continue;}
   // Side/rear stairwell panels and mixed window heights prevent a repeated wallpaper facade.
   const stair=face===2&&col===1,ww=stair?.6:style==='bay'&&face===0?1.3:1.06,hh=stair?1.6:(face%2?1.12:1.34);opening(shape,x,y,ww,hh);windows.push({x,y,ww,hh,floor,col});
  }
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false});geometry.translate(0,0,-.24);const shell=new THREE.Mesh(geometry,toon(wall));shell.name='perforated-wall';shell.castShadow=shell.receiveShadow=true;g.add(shell);
  for(const win of windows){const {x,y,ww,hh,floor,col}=win,glass=box(g,ww-.05,hh-.05,.06,0x3987aa,x,y+hh/2,-.17,'recessed-glass');glass.userData.residentialGlass=true;glass.userData.inhabited=rand()>.45;glass.material.userData={lightingRole:'residential-glass',inhabited:glass.userData.inhabited};
   for(const side of [-1,1])box(g,.075,hh+.12,.15,trim,x+side*(ww/2+.035),y+hh/2,-.015,'window-jamb');
   for(const top of [0,1])box(g,ww+.2,.085,.16,trim,x,y+top*hh,-.005,'window-frame');
   box(g,.055,hh,.06,accent,x,y+hh/2,-.09,'window-mullion');box(g,ww+.3,.1,.35,trim,x,y-.03,.09,'projecting-sill');
   if(style==='shutters'&&face<2)for(const side of [-1,1]){box(g,.28,hh,.12,accent,x+side*(ww/2+.23),y+hh/2,.03,'shutter');for(let j=0;j<4;j++)box(g,.22,.035,.025,0xd8eddb,x+side*(ww/2+.23),y+.18+j*.26,.1,'shutter-slat');}
   if(style==='bay'&&face===0&&col===0){box(g,ww+.3,.12,.65,accent,x,y+hh+.12,.2,'bay-canopy');for(const side of [-1,1])box(g,.12,hh,.5,wall,x+side*(ww/2+.13),y+hh/2,.13,'bay-cheek');}
   if(style==='balcony'&&face===0&&floor>0&&col!==1){const balcony=new THREE.Group();balcony.name='inhabited-balcony';g.add(balcony);box(balcony,1.75,.16,.95,trim,x,y-.12,.4,'balcony-slab');box(balcony,1.7,.62,.1,accent,x,y+.22,.82,'balcony-parapet');for(const side of [-1,1])box(balcony,.1,.62,.9,accent,x+side*.81,y+.22,.41,'balcony-return');
    if((seed+col+floor)%2===0){box(balcony,.48,.3,.35,0xbf8565,x+.35,y+.12,.55,'balcony-planter');box(balcony,.38,.28,.3,0x59a969,x+.35,y+.37,.55,'green-balcony-plant');}
   }
  }
  box(g,span+.08,.14,.18,trim,0,h-.12,.01,'cornice');
  if(face===2){box(g,.46,.44,.3,0xb9c8c2,span*.3,1.2,.15,'ventilator');for(let j=0;j<3;j++)box(g,.34,.035,.035,0x6d9095,span*.3,1.08+j*.11,.32,'vent-slat');}
 }
 const entrance=new THREE.Group();entrance.name='recessed-entrance';entrance.position.z=d/2;root.add(entrance);box(entrance,1.15,2.08,.08,0x326575,0,1.22,-.16,'entrance-door');box(entrance,.11,.11,.09,0xf0cb70,.35,1.2,-.08,'door-handle');box(entrance,1.8,.15,.9,accent,0,2.48,.3,'entry-canopy');box(entrance,1.7,.18,.3,0xd9c9ac,0,.09,.08,'entry-step');
 const roof=new THREE.Group();roof.name='independent-residential-roof';root.add(roof);
 if(style==='shutters'||seed%3===0){const profile=new THREE.Shape([new THREE.Vector2(-w/2-.25,0),new THREE.Vector2(0,1.15),new THREE.Vector2(w/2+.25,0),new THREE.Vector2(w/2+.25,-.14),new THREE.Vector2(-w/2-.25,-.14)]),m=new THREE.Mesh(new THREE.ExtrudeGeometry(profile,{depth:d+.5,bevelEnabled:false}),toon([0xe47b58,0xd88563,0x3677ad,0x9669b5,RESORT_ACCENTS.coral][Math.abs(seed)%5]));m.position.set(0,h+.1,-d/2-.25);m.name='pitched-roof';m.castShadow=true;roof.add(m);
 }else{box(roof,w+.3,.2,d+.3,0x5b8f9f,0,h+.08,0,'flat-roof-slab');for(const side of [-1,1]){box(roof,w+.3,.35,.14,trim,0,h+.3,side*(d/2+.08),'roof-parapet');box(roof,.14,.35,d+.3,trim,side*(w/2+.08),h+.3,0,'roof-parapet');}box(roof,1.15,.7,1.2,wall,w*.25,h+.5,-d*.2,'roof-stair-head');box(roof,1.35,.12,1.35,accent,w*.25,h+.9,-d*.2,'stair-head-cap');}
 root.userData={style,seed,w,d,floors,height:h,geometryWindows:true};return root;
}
export function createBusShelter(){const g=new THREE.Group();g.name='curb-bus-shelter';box(g,5.8,.16,2.5,0xe3d4b8,0,.08,0,'shelter-platform');box(g,5.8,.2,2.5,0x3889a2,0,2.95,0,'rain-canopy');
 for(const x of [-2.55,2.55])box(g,.13,2.8,.13,0x577b85,x,1.55,-.92,'shelter-column');box(g,5,.95,.1,0x88b6bd,0,1.25,-.96,'shelter-wind-screen');box(g,3.5,.14,.6,0xb8916a,0,.65,-.35,'shelter-bench');for(const x of [-1.25,1.25])box(g,.12,.5,.48,0x577b85,x,.37,-.35,'bench-support');box(g,.1,2.4,.1,0x577b85,2.65,1.35,.7,'bus-stop-post');box(g,.48,.65,.12,0xe9c76b,2.65,2.35,.7,'bus-stop-sign');return g;}
/** Preserve glass as a separate night-light material; batch everything else by colour. */
export function batchResidentialGeometry(root:THREE.Group){root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map<string,{mat:THREE.Material;parts:GeometryBatchPart[]}>(),remove:THREE.Mesh[]=[];
 root.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;const m=o.material as THREE.MeshToonMaterial,key=m.color.getHexString()+':'+(o.userData.residentialGlass?(o.userData.inhabited?'lit':'dark'):'solid');if(!buckets.has(key))buckets.set(key,{mat:m,parts:[]});buckets.get(key)!.parts.push({mesh:o,matrix:inverse.clone().multiply(o.matrixWorld),count:o.geometry.index?.count??o.geometry.attributes.position.count});remove.push(o);});
 for(const m of remove)m.removeFromParent();const group=new THREE.Group();group.name='residential-material-batches';root.add(group);for(const [key,b] of buckets){const geo=mergeGeometryBatch(b.parts),m=new THREE.Mesh(geo,b.mat);m.name='residential-'+key;m.castShadow=m.receiveShadow=true;if(key.endsWith(':lit')){m.userData.residentialGlass=true;m.userData.inhabited=true;}group.add(m);}root.userData.draws=buckets.size;
}
