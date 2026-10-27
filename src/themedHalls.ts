import {createEmotionEmblem} from './hallEmblems';
import * as THREE from 'three';
import {kit,C} from './referenceArchitecture';
import {buildOutdoorHall,outdoorTable} from './billiardsArchitecture';
import {cutFacade,roundPlan,extrudedPlan,insetLoft,polygonPlan,type PlanPoint} from './carvedGeometry';

export type HallTheme='fire'|'order'|'science'|'elegance'|'punk';
export const HALL_THEMES:{id:string;theme:HallTheme;name:string;color:number;description:string}[]=[
 {id:'hall1',theme:'fire',name:'炽焰台球厅 · 火热',color:0xc94e39,description:'巨型火焰黑8、斜穿球杆与红色上扬屋顶'},
 {id:'hall2',theme:'elegance',name:'常青台球厅 · 优雅',color:0x397f4d,description:'月桂黑8雕塑、木质拱门与绿色遮棚'},
 {id:'hall3',theme:'order',name:'蓝序台球厅 · 秩序',color:0x327fa9,description:'竞技门架黑8雕塑、对称中轴与阶梯屋顶'},
 {id:'hall4',theme:'science',name:'白弧台球厅 · 科学',color:0xf4f1df,description:'立体轨道黑8雕塑、圆弧侧翼与凹入式玻璃'},
 {id:'hall5',theme:'punk',name:'黑铆台球厅 · 朋克',color:0x37414a,description:'闪电与破碎金属黑8雕塑、锯齿顶与铆钉钢架'}
];
function group(root:THREE.Group,name:string){const g=new THREE.Group();g.name=name;root.add(g);return g;}
function rectWall(w:number,h:number,depth:number,holes:{x:number;y:number;w:number;h:number}[]){
 const s=new THREE.Shape([new THREE.Vector2(-w/2,0),new THREE.Vector2(w/2,0),new THREE.Vector2(w/2,h),new THREE.Vector2(-w/2,h)]);
 for(const o of holes)s.holes.push(new THREE.Path([new THREE.Vector2(o.x-o.w/2,o.y),new THREE.Vector2(o.x-o.w/2,o.y+o.h),new THREE.Vector2(o.x+o.w/2,o.y+o.h),new THREE.Vector2(o.x+o.w/2,o.y)]));
 return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});
}
export function createHallTable(){const g=new THREE.Group();g.name='hall-module-table';outdoorTable(g,0,0);return g;}
export function createHallEntrance(color=0x327fa9){const g=new THREE.Group();g.name='hall-module-entrance';const k=kit(g);
 k.mesh(rectWall(4,5,.32,[{x:0,y:0,w:3.3,h:4.7}]),color,0,0,0).name='pierced-door-frame';
 for(const side of [-1,1]){k.box(1.5,4.5,.12,C.glass,side*.775,2.37,-.13);k.box(.12,4.7,.16,color,side*1.59,2.35,-.1);k.box(.05,.55,.14,C.gold,side*.16,2.3,-.03);}
 k.box(3.3,.1,.16,color,0,4.65,-.1);k.box(3.3,.12,.16,C.cream,0,.06,-.1);return g;
}
export const createHallEmblem=createEmotionEmblem;
function roofRibbon(x0:number,x1:number,depth:number,rise:number){
 const s=new THREE.Shape();for(let i=0;i<=12;i++){const u=i/12,x=THREE.MathUtils.lerp(x0,x1,u),y=rise*(.15+.85*Math.sin(u*Math.PI*.7));if(i)s.lineTo(x,y);else s.moveTo(x,y);}
 for(let i=12;i>=0;i--){const u=i/12;s.lineTo(THREE.MathUtils.lerp(x0,x1,u),rise*(.15+.85*Math.sin(u*Math.PI*.7))-.22);}s.closePath();
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);return g;
}
export function createThemedHall(theme:HallTheme){
 const spec=HALL_THEMES.find(t=>t.theme===theme)!;
 if(theme==='elegance'){
  const root=buildOutdoorHall(false);root.userData={...root.userData,theme,color:spec.color,hallId:spec.id};
  const entrance=createHallEntrance(0x476c43);entrance.position.set(0,.35,-2);entrance.scale.set(1.24,1,1);root.add(entrance);
  const parts=Object.fromEntries(['base','shell','entrance','roof','emblem','furniture'].map(n=>[n,group(root,'hall-'+n)]));
  for(const child of [...root.children]){if(Object.values(parts).includes(child as THREE.Group))continue;const bounds=new THREE.Box3().setFromObject(child);const part=child===entrance?'entrance':child.name==='rooftop-triangle-sign'?'emblem':child.name==='hall-rear-shell'||child.name==='hall-open-arch'?'shell':bounds.max.y<.7?'base':bounds.max.y>5.7?'roof':'furniture';parts[part].add(child);}
  const old=parts.emblem.getObjectByName('rooftop-triangle-sign');if(old)old.parent!.remove(old);const sculpture=createHallEmblem(theme);sculpture.position.set(0,8.35,-4.5);sculpture.scale.setScalar(.95);parts.emblem.add(sculpture);
  return root;
 }
 const root=new THREE.Group();root.name='themed-hall-'+theme;root.userData={theme,color:spec.color,hallId:spec.id};
 const base=group(root,'hall-base'),shell=group(root,'hall-shell'),entrance=group(root,'hall-entrance'),roof=group(root,'hall-roof'),identity=group(root,'hall-emblem'),furniture=group(root,'hall-furniture');
 const b=kit(base),k=kit(shell),r=kit(roof),f=kit(furniture),accent=spec.color,wall=theme==='punk'?0x5b6265:theme==='fire'?0xf3d4a6:0xf3e8cc;
 b.mesh(extrudedPlan(roundPlan(18,22,1.3),.35),0xdac7a1,0,0,0).name='hall-foundation';
 const plan:PlanPoint[]=theme==='punk'?[[-6.5,-1.2],[-6.5,-6.5],[-4.8,-8],[6.5,-8],[6.5,-1.2]]:[[-6.5,-1.2],[-6.5,-8],[6.5,-8],[6.5,-1.2]];

 if(theme==='science'){
  // Elliptical side wing: a connected curved wall, not a box with a curved cap.
  plan.splice(0,2,...Array.from({length:13},(_,i)=>{const a=Math.PI*i/12;return [-6.5-1.1*Math.sin(a),-1.2-6.8*i/12] as PlanPoint;}));
 }
 const structural=group(shell,'hall-structural-shell');
 for(let i=0;i<plan.length-1;i++){
  const a=plan[i],b=plan[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),segment=group(structural,'pierced-side-panel');segment.position.set((a[0]+b[0])/2,.35,(a[1]+b[1])/2);segment.rotation.y=Math.atan2(a[1]-b[1],b[0]-a[0]);const sk=kit(segment);
  // Each hall's side room has a distinct glazing rhythm and sill height.
  const spacing=theme==='order'?3.6:theme==='punk'?3.4:theme==='fire'?3.8:3.1;
  const count=length>3?Math.floor(length/spacing):theme==='science'&&i%2===1?1:0;
  const windows=Array.from({length:count},(_,j)=>({x:-length/2+length*(j+1)/(count+1),
   y:theme==='punk'?3.65:theme==='fire'?1.7:theme==='order'?2.15:1.85,
   w:Math.min(theme==='science'?2.15:theme==='order'?1.45:theme==='fire'?1.25:1.6,length/(count+1)*.6),
   h:theme==='punk'?1.15:theme==='fire'?3.15:theme==='order'?2.3:2.8}));
  sk.mesh(theme==='fire'?cutFacade(length+.04,6.8,.42,windows):rectWall(length+.04,6.8,.42,windows),wall).name='subtractively-windowed-wall';
  for(const w of windows){sk.box(w.w-.12,w.h-.15,.09,0x4e8693,w.x,w.y+w.h/2,.2);sk.box(w.w+.2,.12,.54,accent,w.x,w.y-.04,.2);sk.box(.08,w.h,.1,accent,w.x,w.y+w.h/2,-.04);}
 }
 
 const frontWidth=theme==='punk'?1.35:theme==='fire'?1.55:theme==='science'?2.55:2.1;
 const frontHeight=theme==='punk'?1.35:theme==='fire'?3.1:theme==='science'?2.3:2.8;
 const frontBottom=theme==='punk'?3.35:theme==='fire'?1.5:theme==='science'?1.8:1.6;
 const holes=[{x:0,y:.25,w:3.8,h:4.9},...[-4.65,4.65].map(x=>({x,y:frontBottom,w:frontWidth,h:frontHeight}))];
 k.mesh(theme==='fire'?cutFacade(13,6.8,.45,holes):rectWall(13,6.8,.45,holes),wall,0,.35,-1.65).name='hall-pierced-front';
 for(const x of [-4.65,4.65]){k.box(frontWidth-.12,frontHeight-.15,.12,0x4e8693,x,.35+frontBottom+frontHeight/2,-1.72);k.box(.08,frontHeight-.2,.13,accent,x,.35+frontBottom+frontHeight/2,-1.8);}
 const portal=createHallEntrance(accent);portal.position.set(0,.6,-1.03);entrance.add(portal);
 b.mesh(extrudedPlan(roundPlan(4.5,1.2,.15),.2),C.cream,0,.35,-.05);
 b.mesh(extrudedPlan(roundPlan(4.1,.65,.1),.2),C.white,0,.55,-.45);
 if(theme==='fire'){
  r.mesh(roofRibbon(-7,.2,8.1,1.25),accent,0,7.2,-4.6).name='fire-rising-roof-left';r.mesh(roofRibbon(-.1,7,8.1,.75),0xe78344,0,7.2,-4.6).name='fire-rising-roof-right';
  for(const x of [-6.3,-3,0,3,6.3])for(const z of [-7.7,-1.3]){const a=x<0?(x+7)/7.2:(x+.1)/7.1,h=7.2+(x<0?1.25:.75)*(.15+.85*Math.sin(a*Math.PI*.7));r.rod(new THREE.Vector3(x,6.9,z),new THREE.Vector3(x,h-.18,z),.095,0x9b4a32);}
  for(const side of [-1,1])k.rod(new THREE.Vector3(side*5.95,.5,-1.05),new THREE.Vector3(side*3.1,6.8,-1.05),.10,accent);
  for(const x of [-4.7,4.7])r.rod(new THREE.Vector3(x,.35,1.1),new THREE.Vector3(x,5.25,1.1),.1,accent);
  const canopy=r.mesh(roofRibbon(-5,5,2.7,.4),accent,0,5.05,.1);canopy.name='fire-entrance-wave';
 }else if(theme==='order'){
  for(const [w,d,y] of [[13.8,7.4,7.15],[10.5,5.6,7.6],[6.5,3.8,8.05]])r.box(w,.4,d,accent,0,y+.2,-4.6);
  for(const x of [-5.6,-2.8,2.8,5.6]){k.box(.22,6.7,.3,accent,x,3.7,-1.0);r.box(.26,.25,2.9,accent,x,5.4,.25);}
  r.box(12.3,.3,3.1,0x9dc9ce,0,5.35,.2);
 }else if(theme==='science'){
  r.mesh(insetLoft(plan,.55,.35),C.white,0,7.15,0);
  r.box(6.8,.4,4.8,C.white,-4,7.28,-4.6).name='science-vault-support-curb';
  const curveRoof=r.mesh(new THREE.CylinderGeometry(2.4,2.4,6.8,24,1,false,0,Math.PI),C.white,-4,7.48,-4.6);curveRoof.rotation.z=Math.PI/2;curveRoof.name='science-vault-roof';
  r.box(8.5,.25,3,0xd5e9e1,1.7,5.55,.25);for(const x of [-2.2,5.7])r.rod(new THREE.Vector3(x,.35,1.45),new THREE.Vector3(x,5.5,1.45),.11,0xb9d2cd);
 }else{
  for(let i=0;i<4;i++){const x=-6.7+i*3.4,shape=new THREE.Shape([new THREE.Vector2(x,0),new THREE.Vector2(x+3.4,0),new THREE.Vector2(x+3.4,1.65),new THREE.Vector2(x,1.0)]);r.mesh(new THREE.ExtrudeGeometry(shape,{depth:7.6,bevelEnabled:false}),accent,0,7.15,-8.4).name='punk-sawtooth-roof';}
  for(const side of [-1,1]){k.rod(new THREE.Vector3(side*6.1,.5,-1),new THREE.Vector3(side*2.6,6.6,-1),.12,0xad8255);for(let i=0;i<6;i++)k.ball(.085,0xbcc2b9,side*6.1,.8+i*.95,-.85);}
  r.mesh(new THREE.CylinderGeometry(.35,.35,2.1,10),0x899291,5,8.2,-5.5).name='punk-exhaust-stack';r.mesh(new THREE.TorusGeometry(.36,.085,6,12),0xabb2a6,5,9.25,-5.5).rotation.x=Math.PI/2;
 }
 const emblem=createHallEmblem(theme);emblem.scale.setScalar(theme==='science'?.85:1.05);emblem.position.set(theme==='science'?3.2:0,theme==='order'?8.45:theme==='punk'?8.85:theme==='fire'?8.5:7.5,-4.6);identity.add(emblem);
 // Two visible supports connect the sign plinth to the actual roof.
 for(const x of [-1.2,1.2])kit(identity).rod(new THREE.Vector3((theme==='science'?3.2:0)+x,7.3,-4.6),new THREE.Vector3((theme==='science'?3.2:0)+x,emblem.position.y,-4.6),.08,accent);
 const table=createHallTable();table.position.set(0,.25,5.3);furniture.add(table);
 for(const side of [-1,1]){f.box(2.5,.25,.8,theme==='punk'?0x7d6b54:0xb38952,side*6.2,1.05,4.8);for(const x of [-.8,.8])f.box(.15,.58,.5,accent,side*6.2+x,.64,4.8);}
 // Cue rack hugs the back wall, outside the central door and open play area.
 f.box(2.2,.15,.35,0xb38952,-4.65,.55,-.9);for(let i=0;i<4;i++)f.rod(new THREE.Vector3(-5.4+i*.5,.65,-.85),new THREE.Vector3(-5.2+i*.5,3.8,-.85),.035,0xd6a762);
 return root;
}
const samples=new Map<HallTheme,THREE.Group>();
export function hallSamples(){for(const t of HALL_THEMES)if(!samples.has(t.theme))samples.set(t.theme,createThemedHall(t.theme));return samples;}
