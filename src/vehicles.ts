import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {toon} from './materials';
export type VehicleKind='sedan'|'bus'|'ambulance';
export const VEHICLE_SIZES={sedan:{width:1.6,length:3.2,height:1.7},bus:{width:2,length:5.7,height:2.7},ambulance:{width:1.95,length:4.5,height:2.4}};
const cache=new Map<string,THREE.Group>();
const renderCache=new Map<string,THREE.Group>();
function polygon(points:number[][]){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
function profileGeometry(shape:THREE.Shape,depth:number){const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12});g.rotateY(-Math.PI/2);g.translate(depth/2,0,0);return g;}
export function createVehicle(kind:VehicleKind='sedan',color:number|undefined=undefined,dimensions?:{width:number;length:number},optimized=false){
 color??=kind==='ambulance'?0xfffbef:kind==='bus'?0x4a94ac:0xe7b75d;
 const {width:w,length:l}=dimensions??VEHICLE_SIZES[kind],key=`${kind}:${color}:${w}:${l}`;
 if(!cache.has(key))cache.set(key,build(kind,color,w,l));
 if(optimized){if(!renderCache.has(key))renderCache.set(key,batchVehicle(cache.get(key)!));return renderCache.get(key)!.clone(true);}
 return cache.get(key)!.clone(true);
}
function build(kind:VehicleKind,color:number,w:number,l:number){
 const root=new THREE.Group();root.name=`vehicle-${kind}`;root.userData.vehicleKind=kind;root.userData.nominalSize={width:w,length:l};
 const paints=new Map<number,THREE.MeshToonMaterial>();
 const add=(g:THREE.BufferGeometry,c:number,name:string,x=0,y=0,z=0)=>{if(!paints.has(c))paints.set(c,toon(c));const m=new THREE.Mesh(g,paints.get(c));m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 const box=(a:number,b:number,c:number,col:number,name:string,x:number,y:number,z:number)=>add(new THREE.BoxGeometry(a,b,c),col,name,x,y,z);
 const tall=kind!=='sedan',r=tall?.36:.28,arch=r+.075,axle=l*.31,bottom=.18;
 const shape=new THREE.Shape(),h=tall?(kind==='bus'?2.6:2.25):.98;
 shape.moveTo(-l/2+.12,bottom);shape.lineTo(-l/2+.12,h-.18);shape.lineTo(-l/2+.27,h);shape.lineTo(l/2-.35,h);shape.lineTo(l/2-.12,tall?h-.25:.75);shape.lineTo(l/2-.12,bottom);
 const angle=Math.asin((bottom-r)/arch),reach=Math.sqrt(arch*arch-(bottom-r)**2);
 for(const z of [axle,-axle]){shape.lineTo(z+reach,bottom);shape.absarc(z,r,arch,angle,Math.PI-angle,false);}
 shape.closePath();
 const windows:number[][][]=[];
 if(tall){
  const count=kind==='bus'?5:3;
  for(let i=0;i<count;i++){
   const z=-l*.39+i*l*.7/count,ww=l*.7/count-.12;
   const door=l*.14;
   const ranges=[[z,Math.min(z+ww,door-.39)],[Math.max(z,door+.39),z+ww]];
   for(const [a,b] of ranges)if(b-a>.18)windows.push([[a,h*.58],[b,h*.58],[b,h-.24],[a,h-.24]]);
  }
 }else{
  for(const [a,b] of [[-.58,-.04],[.04,.58]])windows.push([[a,.46],[b,.46],[b,.84],[a,.84]]);
 }
 shape.holes.push(...windows.map(p=>new THREE.Path(p.map(v=>new THREE.Vector2(...v as [number,number])))));
 if(tall){const z=l*.14;shape.holes.push(new THREE.Path(polygon([[z-.29,.25],[z+.29,.25],[z+.29,h-.18],[z-.29,h-.18]]).getPoints()));}
 add(profileGeometry(shape,w-.045),color,'carved-body');
 // Insets occupy the cutouts rather than sitting outside the body as opaque boxes.
 for(const side of [-1,1])for(const [i,points] of windows.entries()){
  const panel=add(profileGeometry(polygon(points),.018),tall?0x355f73:color,'inset-side-panel',side*(w/2-.055));panel.material.side=THREE.DoubleSide;
  if(!tall){const z=(points[0][0]+points[1][0])/2;box(.025,.045,.17,0x4e6065,'door-handle-recess',side*(w/2-.039),.79,z+.12);}
 }
 if(!tall){
  const shell=polygon([[-l*.29,.94],[-l*.19,1.58],[l*.1,1.58],[l*.29,.96]]);
  const holes=[polygon([[-l*.25,1.04],[-l*.17,1.45],[-.06,1.45],[-.06,1.04]]),polygon([[.06,1.04],[.06,1.45],[l*.07,1.45],[l*.24,1.04]])];
  shell.holes.push(...holes.map(s=>new THREE.Path(s.getPoints())));
  for(const side of [-1,1]){
   add(profileGeometry(shell,.045),color,'window-frame',side*(w/2-.085));
   for(const hole of holes){const g=add(profileGeometry(hole,.01),0x355f73,'recessed-side-glass',side*(w/2-.115));g.material.side=THREE.DoubleSide;}
  }
  const roof=polygon([[-w*.45,-l*.18],[-w*.37,-l*.21],[w*.37,-l*.21],[w*.45,-l*.18],[w*.45,l*.07],[w*.37,l*.11],[-w*.37,l*.11],[-w*.45,l*.07]]);
  const rg=new THREE.ExtrudeGeometry(roof,{depth:.065,bevelEnabled:false});rg.rotateX(Math.PI/2);rg.translate(0,1.645,0);add(rg,color,'inset-roof');
  for(const end of [-1,1]){
   const z0=end>0?l*.29:-l*.29,z1=end>0?l*.1:-l*.19;
   recessedQuad([[-w*.46,1.0,z0],[w*.46,1.0,z0],[w*.43,1.58,z1],[-w*.43,1.58,z1]],color,0x355f73,'sloped-windscreen');
  }
 }else{
  // Tall van/bus shells retain actual side window and door openings.
  for(const side of [-1,1]){
   const z=l*.14;
   const door=polygon([[z-.29,.25],[z+.29,.25],[z+.29,h-.18],[z-.29,h-.18]]);
   // Thin recessed door panel with a framed upper light and lower step well.
   add(profileGeometry(door,.018),0x3e6574,'passenger-door',side*(w/2-.06));
   box(.03,.14,.54,0x576f74,'door-step',side*(w/2-.04),.29,z);
   box(.026,.38,.035,0xe4d2a1,'door-divider',side*(w/2-.035),h*.68,z);
  }
  for(const end of [-1,1]){if(kind==='ambulance'&&end<0)continue;recessedQuad([[-w*.43,h*.55,end*(l/2-.035)],[w*.43,h*.55,end*(l/2-.035)],[w*.43,h-.18,end*(l/2-.035)],[-w*.43,h-.18,end*(l/2-.035)]],color,0x355f73,'tall-end-glass');}
 }
 // Pierced end caps give the lamp and grille wells an actual reveal depth.
 for(const end of [-1,1]){
  const cap=polygon([[-w*.47,.27],[w*.47,.27],[w*.47,.72],[-w*.47,.72]]),slots=[[-w*.37,.49,w*.18,.16],[w*.19,.49,w*.18,.16],[-w*.14,.32,w*.28,.14]];
  for(const [x,y,ww,hh] of slots)cap.holes.push(new THREE.Path(polygon([[x,y],[x+ww,y],[x+ww,y+hh],[x,y+hh]]).getPoints()));
  const plate=add(new THREE.ExtrudeGeometry(cap,{depth:.105,bevelEnabled:false}),color,'cut-headlight-fascia',0,0,end*(l/2-.105));if(end<0)plate.rotation.y=Math.PI;
  for(const [i,[x,y,ww,hh]] of slots.entries()){
   const m=box(ww-.025,hh-.025,.015,i===2?0x30494d:end>0?0xffe6a8:0xce5744,'recessed-lamp',end*x+end*ww/2,y+hh/2,end*(l/2-.075));
  }
 }
 for(const side of [-1,1])for(const z of [-axle,axle]){
  const wheel=add(new THREE.CylinderGeometry(r,r,.17,16),0x303b40,'wheel',side*(w/2-.09),r,z);wheel.rotation.z=Math.PI/2;
  const hub=add(new THREE.CylinderGeometry(r*.55,r*.55,.175,12),0xa9b9b7,'recessed-hub',side*(w/2-.09),r,z);hub.rotation.z=Math.PI/2;
 }
 if(kind==='ambulance'){
  for(const side of [-1,1]){
   const a=side<0?-w*.44:.025,b=side<0?-.025:w*.44,z=-l/2+.035;
   recessedQuad([[a,.32,z],[b,.32,z],[b,h-.16,z],[a,h-.16,z]],color,0xe2e6d8,'rear-door');
   recessedQuad([[a+.08,h*.6,z-.01],[b-.08,h*.6,z-.01],[b-.08,h-.29,z-.01],[a+.08,h-.29,z-.01]],color,0x355f73,'rear-door-window');
   box(.045,.25,.035,0x758c91,'rear-door-handle',side*.12,1.05,-l/2+.025);
  }
  box(w*.65,.16,.32,0xd95740,'emergency-light',0,h+.1,l*.16);
  for(const side of [-1,1]){box(.025,.14,l*.84,0xe17642,'ambulance-stripe',side*(w/2-.012),.98,0);box(.028,.55,.17,0xdb6445,'medical-cross',side*(w/2-.01),1.3,-l*.25);box(.03,.17,.55,0xdb6445,'medical-cross',side*(w/2-.01),1.3,-l*.25);}
 }
 return root;
 function recessedQuad(points:number[][],frame:number,glass:number,name:string){
  const q=points.map(p=>new THREE.Vector3(...p as [number,number,number])),center=q.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(.25),inner=q.map(v=>v.clone().lerp(center,.16));
  const n=q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])).normalize();if(n.z*center.z<0)n.negate();
  const verts:number[]=[];for(let i=0;i<4;i++){const j=(i+1)%4;for(const p of [q[i],q[j],inner[i],q[j],inner[j],inner[i]])verts.push(...p.toArray());}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();const m=add(g,frame,name+'-frame');m.material.side=THREE.DoubleSide;
  const v=inner.map(p=>p.clone().addScaledVector(n,-.035)),gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute([0,1,2,0,2,3].flatMap(i=>v[i].toArray()),3));gg.computeVertexNormals();const pane=add(gg,glass,name+'-inset');pane.material.side=THREE.DoubleSide;
 }
}

function batchVehicle(source:THREE.Group){
 const root=new THREE.Group();root.name=source.name;root.userData={...source.userData};const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();source.updateMatrixWorld(true);
 source.traverse(o=>{if(!(o instanceof THREE.Mesh))return;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));const material=o.material as THREE.Material;if(!buckets.has(material))buckets.set(material,[]);buckets.get(material)!.push(g);});
 for(const [material,parts] of buckets){const g=mergeGeometries(parts,false)!;const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;root.add(m);parts.forEach(g=>g.dispose());}return root;
}
