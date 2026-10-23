import * as THREE from 'three';
import {toon} from './materials';
import {createVehicle,batchVehicle} from './vehicles';
export type FleetKind='truck'|'taxi'|'police'|'speedboat';
export const FLEET_TITLES:Record<FleetKind,string>={truck:'港湾厢式货车',taxi:'海岸出租车',police:'城市巡逻警车',speedboat:'海风运动快艇'};
const colors={cream:0xf4f1df,navy:0x29475a,teal:0x398ea0,gold:0xf1c356,glass:0x6ca6ba,rubber:0x303c44,steel:0xb0c2c3};
export const FLEET_PART_TITLES:Record<string,string>={'truck-chassis':'底盘、轮轴与双后胎','truck-cab':'开孔驾驶室与车顶','truck-cargo-box':'厢体、独立箱顶与后门','taxi-body':'车体与轮组','taxi-chassis':'底盘、轮轴与排气管','taxi-equipment':'格纹腰线与后视镜','taxi-roof-sign':'立体出租车顶灯','police-body':'车体与轮组','police-chassis':'底盘、轮轴与排气管','police-equipment':'盾徽、防撞架与天线','police-lightbar':'红蓝警灯与支架','speedboat-hull':'V 形船壳、舷边与船首甲板','speedboat-cockpit':'座舱、座椅与操纵台','speedboat-windscreen':'倾斜风挡与框架','speedboat-outboard':'舷外机与螺旋桨','speedboat-safety':'救生圈、系缆件与航行灯'};
const cache=new Map<FleetKind,THREE.Group>(),optimizedCache=new Map<FleetKind,THREE.Group>();
function group(parent:THREE.Group,name:string){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
function kit(parent:THREE.Group){
 const mats=new Map<number,THREE.MeshToonMaterial>();
 const mesh=(geo:THREE.BufferGeometry,color:number,name:string,x=0,y=0,z=0)=>{if(!mats.has(color))mats.set(color,toon(color));const m=new THREE.Mesh(geo,mats.get(color)!);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const box=(w:number,h:number,d:number,color:number,name:string,x:number,y:number,z:number)=>mesh(new THREE.BoxGeometry(w,h,d),color,name,x,y,z);
 const beam=(a:THREE.Vector3,b:THREE.Vector3,r:number,color:number,name:string)=>{const m=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),8),color,name);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return m;};
 return {mesh,box,beam};
}
function shape(points:number[][]){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
function panel(points:number[][],thickness:number){return new THREE.ExtrudeGeometry(shape(points),{depth:thickness,bevelEnabled:false});}
function lamp(mesh:THREE.Mesh,color:number){const material=(mesh.material as THREE.MeshToonMaterial).clone();material.emissive.setHex(color);material.emissiveIntensity=.1;material.userData.lightingRole='vehicle-light';mesh.material=material;return mesh;}
function measure(root:THREE.Group,kind:FleetKind){root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());root.userData.vehicleKind=kind;root.userData.nominalSize={width:2*Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),length:2*Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)),height:size.y};root.userData.forward='+Z';root.userData.contact=kind==='speedboat'?'waterline':'wheel-bottom';}
export function createFleetVehicle(kind:FleetKind,optimized=false){
 if(!cache.has(kind)){const root=kind==='truck'?truck():kind==='speedboat'?speedboat():serviceCar(kind);root.name='vehicle-'+kind;measure(root,kind);cache.set(kind,root);}
 if(optimized){if(!optimizedCache.has(kind))optimizedCache.set(kind,batchVehicle(cache.get(kind)!));return optimizedCache.get(kind)!.clone(true);}
 return cache.get(kind)!.clone(true);
}
function truck(){
 const root=new THREE.Group(),chassis=group(root,'truck-chassis'),k=kit(chassis);
 k.box(1.08,.22,5.1,colors.navy,'ladder-frame',0,.56,0);for(const z of [-2.3,-.85,.4])k.box(1.85,.24,.16,colors.steel,'cargo-crossmember',0,.77,z);
 for(const z of [-1.65,1.86]){const axle=k.mesh(new THREE.CylinderGeometry(.075,.075,1.85,8),colors.steel,'axle',0,.4,z);axle.rotation.z=Math.PI/2;
  for(const side of [-1,1])for(const x of z<0?[.89,.68]:[.89]){
   const wheel=k.mesh(new THREE.CylinderGeometry(.4,.4,.18,20),colors.rubber,'truck-tyre',side*x,.4,z);wheel.rotation.z=Math.PI/2;
   if(x===.89){const hub=k.mesh(new THREE.CylinderGeometry(.22,.22,.035,12),colors.steel,'truck-hub',side*.99,.4,z);hub.rotation.z=Math.PI/2;}
  }
 }
 k.box(.3,.32,.8,colors.steel,'fuel-tank',-.82,.47,-.1);k.box(.25,.12,.7,colors.navy,'fuel-tank-mount',-.7,.68,-.1);
 k.box(1.95,.16,.2,colors.steel,'rear-bumper',0,.48,-2.72);
 const cab=group(root,'truck-cab'),c=kit(cab);
 c.box(1.45,.13,1.72,colors.navy,'cab-floor',0,.71,1.7);
 for(const side of [-1,1]){
  const s=new THREE.Shape();s.moveTo(.85,2.65);s.lineTo(2.37,2.65);s.lineTo(2.6,2.25);s.lineTo(2.6,.6);const r=.47,a=Math.asin(.2/r);s.lineTo(1.86+Math.cos(a)*r,.6);s.absarc(1.86,.4,r,a,Math.PI-a,false);s.lineTo(.85,.6);s.closePath();
  const opening=[[1.07,1.46],[2.36,1.46],[2.36,2.18],[2.23,2.42],[1.07,2.42]];s.holes.push(new THREE.Path(shape(opening).getPoints()));
  const geo=new THREE.ExtrudeGeometry(s,{depth:.09,bevelEnabled:false});geo.rotateY(-Math.PI/2);c.mesh(geo,colors.teal,'pierced-cab-side',side*.95+.045);
  const glass=panel(opening,.015);glass.rotateY(-Math.PI/2);c.mesh(glass,colors.glass,'recessed-cab-side-glass',side*.94+.0075);
  c.box(.045,.07,.24,colors.navy,'cab-door-handle',side*1.005,1.25,1.25);
  c.box(.35,.11,.46,colors.steel,'cab-step',side*.91,.4,1.02);c.box(.16,.28,.28,colors.navy,'step-bracket',side*.78,.56,1.02);
  c.beam(new THREE.Vector3(side*.98,1.82,1.95),new THREE.Vector3(side*1.12,1.95,2.0),.025,colors.navy,'mirror-arm');c.box(.16,.35,.15,colors.navy,'mirror-housing',side*1.12,1.98,2.0);c.box(.015,.28,.1,colors.steel,'mirror-glass',side*1.196,1.98,2.0);
  c.box(.48,.16,.5,colors.navy,'cab-seat-cushion',side*.43,.93,1.35);c.box(.48,.65,.14,colors.navy,'cab-seat-back',side*.43,1.28,1.12);
 }
 const front=shape([[-.95,.65],[.95,.65],[.95,2.25],[-.95,2.25]]);
 for(const [x,y,w,h]of [[-.78,1.45,1.56,.67],[-.43,.94,.86,.3],[-.83,.77,.34,.25],[.49,.77,.34,.25]])front.holes.push(new THREE.Path(shape([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]).getPoints()));
 c.mesh(new THREE.ExtrudeGeometry(front,{depth:.09,bevelEnabled:false}),colors.teal,'pierced-cab-front',0,0,2.52);
 c.box(1.51,.62,.025,colors.glass,'cab-windscreen',0,1.785,2.56);c.box(.045,.69,.05,colors.cream,'windscreen-divider',0,1.785,2.63);
 c.box(.81,.25,.03,colors.navy,'recessed-truck-grille',0,1.09,2.56);for(let i=-2;i<=2;i++)c.box(.025,.22,.035,colors.steel,'grille-fin',i*.13,1.09,2.59);
 for(const side of [-1,1]){lamp(c.box(.29,.2,.025,0xffe8b2,'truck-headlight',side*.66,.895,2.56),0xffdf9b);const wiper=c.box(.035,.32,.025,colors.navy,'truck-wiper',side*.39,1.62,2.65);wiper.rotation.z=side*-.35;}
 c.box(1.92,1.94,.1,colors.teal,'cab-back',0,1.63,.87);
 const slope=panel([[2.6,2.25],[2.37,2.65],[2.37,2.58],[2.55,2.23]],1.9);slope.rotateY(-Math.PI/2);c.mesh(slope,colors.teal,'cab-forehead',.95);
 c.box(2.02,.12,1.64,colors.cream,'independent-cab-roof',0,2.67,1.62);c.box(2.04,.17,.2,colors.navy,'front-bumper',0,.48,2.66);
 const cargo=group(root,'truck-cargo-box'),b=kit(cargo);
 b.box(2.04,.12,3.22,colors.steel,'cargo-floor',0,.93,-1.0);
 for(const side of [-1,1]){b.box(.08,2.04,3.2,colors.cream,'cargo-side-wall',side*.98,1.98,-1.0);
  for(let z=-2.45;z<.5;z+=.23)b.box(.03,1.82,.045,0xd8decb,'cargo-corrugation',side*1.035,1.97,z);
  b.box(.04,.3,2.95,colors.teal,'cargo-livery-band',side*1.06,1.55,-1.0);b.box(.042,.055,2.95,colors.gold,'cargo-gold-rule',side*1.065,1.74,-1.0);
 }
 b.box(2.04,2.04,.08,colors.cream,'cargo-front-wall',0,1.98,.56);b.box(2.14,.14,3.34,colors.cream,'independent-cargo-roof',0,3.06,-1.0);
 for(const side of [-1,1]){b.box(.97,1.98,.08,colors.teal,'rear-cargo-door',side*.5,1.98,-2.61);
  for(const y of [1.28,2.68])b.box(.12,.16,.13,colors.steel,'cargo-door-hinge',side*.92,y,-2.68);
  b.beam(new THREE.Vector3(side*.27,1.13,-2.68),new THREE.Vector3(side*.27,2.84,-2.68),.025,colors.steel,'door-locking-rod');b.box(.22,.055,.08,colors.gold,'locking-handle',side*.32,1.65,-2.73);
  lamp(b.box(.25,.12,.04,0xd7554b,'rear-truck-lamp',side*.74,.78,-2.67),0xe35b50);
 }
 return root;
}
const GLYPHS:Record<string,string[]>={T:['111','010','010','010','010'],A:['010','101','111','101','101'],X:['101','101','010','101','101'],I:['111','010','010','010','111']};
function taxiLetters(parent:THREE.Group,z:number,reverse=false){const text=group(parent,'taxi-sign-letters'),k=kit(text);for(const [i,ch]of [...'TAXI'].entries())GLYPHS[ch].forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==='1')k.box(.028,.028,.008,colors.navy,'raised-letter-pixel',(i*4+x-7)*.033,(2-y)*.033,z);}));if(reverse)text.rotation.y=Math.PI;}
function serviceCar(kind:'taxi'|'police'){
 const root=new THREE.Group(),body=createVehicle('sedan',kind==='taxi'?0xf5c347:colors.cream,{width:1.75,length:3.8});body.name=kind+'-body';root.add(body);
 body.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='recessed-lamp'){const color=(o.material as THREE.MeshToonMaterial).color.getHex();if(color===0xffe6a8||color===0xce5744)lamp(o,color);}});
 const underbody=group(root,kind+'-chassis'),u=kit(underbody);u.box(1.28,.1,2.7,colors.navy,'service-car-undertray',0,.13,0);
 for(const z of [-1.178,1.178]){const axle=u.mesh(new THREE.CylinderGeometry(.045,.045,1.5,8),colors.steel,'service-car-axle',0,.28,z);axle.rotation.z=Math.PI/2;}
 const exhaust=new THREE.Shape();exhaust.absarc(0,0,.055,0,Math.PI*2,false);const bore=new THREE.Path();bore.absarc(0,0,.035,0,Math.PI*2,true);exhaust.holes.push(bore);u.mesh(new THREE.ExtrudeGeometry(exhaust,{depth:.65,bevelEnabled:false,curveSegments:10}),colors.steel,'hollow-exhaust',.54,.15,-1.96);
 const trim=group(root,kind+'-equipment'),k=kit(trim);
 for(const side of [-1,1]){k.beam(new THREE.Vector3(side*.84,.98,.95),new THREE.Vector3(side*.96,1.1,1.0),.025,colors.navy,'car-mirror-arm');k.box(.14,.13,.2,colors.navy,'car-mirror',side*.96,1.1,1.0);}
 if(kind==='taxi'){
  k.box(1.22,.055,.86,colors.cream,'taxi-white-roof',0,1.735,-.15);
  const sign=group(root,'taxi-roof-sign'),s=kit(sign);sign.position.set(0,1.96,-.17);
  s.box(.67,.22,.22,colors.cream,'taxi-sign-box',0,0,0);s.box(.53,.16,.16,colors.navy,'taxi-sign-mount',0,-.155,0);taxiLetters(sign,.115);taxiLetters(sign,.115,true);
  for(const side of [-1,1])for(let i=0;i<12;i++)for(let row=0;row<2;row++)if((i+row)%2===0)k.box(.025,.065,.14,colors.navy,'taxi-checker',side*.89,.86+row*.068,-.81+i*.14);
 }else{
  k.box(1.5,.035,.36,colors.navy,'black-police-hood',0,.999,1.33);k.box(1.26,.045,.75,colors.navy,'police-roof-panel',0,1.735,-.15);
  const bar=group(root,'police-lightbar'),b=kit(bar);bar.position.set(0,1.94,-.17);b.box(1.16,.07,.25,colors.navy,'lightbar-mount',0,-.05,0);for(const side of [-1,1])b.box(.09,.15,.16,colors.navy,'lightbar-foot',side*.4,-.14,0);
  for(const [i,color]of [0xe14c50,0x4b9fe8].entries()){const lens=b.box(.46,.14,.23,color,i?'blue-police-lens':'red-police-lens',i?.32:-.32,.03,0);lamp(lens,color);}
  for(const side of [-1,1]){k.box(.025,.12,3.15,colors.navy,'police-side-band',side*.89,.91,0);
   const badge=panel([[-.16,.17],[.16,.17],[.14,-.1],[0,-.22],[-.14,-.1]],.025);badge.rotateY(side*Math.PI/2);k.mesh(badge,colors.gold,'raised-police-shield',side*.91,.68,-.12);
   k.box(.075,.47,.085,colors.navy,'pushbar-upright',side*.5,.61,2.0);k.box(.08,.08,.18,colors.navy,'pushbar-mount',side*.5,.4,1.92);
  }
  k.box(1.13,.075,.085,colors.navy,'pushbar-crosspiece',0,.75,2.0);k.box(1.13,.075,.085,colors.navy,'pushbar-foot',0,.4,2.0);
  k.beam(new THREE.Vector3(.45,.98,-1.28),new THREE.Vector3(.45,1.65,-1.33),.015,colors.navy,'police-antenna');
 }
 return root;
}
function speedboat(){
 const root=new THREE.Group(),hull=group(root,'speedboat-hull'),k=kit(hull);
 // z, half-beam, gunwale height, keel: closed V shell with an actual open cockpit.
 const stations=[[-2.9,.68,.55,-.23],[-2.4,.95,.6,-.36],[-1.6,1.08,.66,-.43],[-.5,1.08,.72,-.43],[.8,.95,.78,-.33],[1.8,.72,.84,-.15],[2.65,.36,.9,.25],[3.15,.025,.91,.88]];
 const vertices:number[]=[],indices:number[]=[],sections:THREE.Vector2[][]=[];
 for(const [z,w,top,keel]of stations){const t=Math.min(.12,(top-keel)*.25,w*.25),section=[[-w,top],[-w*.78,keel+.17*(top-keel)],[0,keel],[w*.78,keel+.17*(top-keel)],[w,top],[w-t,top-t*.5],[w*.78-t*.7,keel+t+.17*(top-keel)],[0,keel+t],[-w*.78+t*.7,keel+t+.17*(top-keel)],[-w+t,top-t*.5]];
  sections.push(section.map(p=>new THREE.Vector2(...p as [number,number])));for(const [x,y]of section)vertices.push(x,y,z);
 }
 const count=10;for(let row=0;row<stations.length-1;row++)for(let j=0;j<count;j++){const a=row*count+j,b=row*count+(j+1)%count,c=a+count,d=b+count;indices.push(a,b,c,b,d,c);}
 for(const row of [0,stations.length-1])for(const [a,b,c]of THREE.ShapeUtils.triangulateShape(sections[row],[]))indices.push(...(row===0?[c,b,a]:[a,b,c]).map(i=>row*count+i));
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();k.mesh(geo,colors.cream,'closed-v-hull-shell');
 k.mesh(panel([[-.68,.55],[-.53,-.097],[0,-.23],[.53,-.097],[.68,.55]],.12),colors.cream,'solid-transom',0,0,-2.9);
 for(const side of [-1,1]){
  const points=stations.map(([z,w,top])=>new THREE.Vector3(side*w,top+.015,z));k.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),70,.035,6,false),colors.steel,'connected-gunwale-rail');
  for(let row=0;row<stations.length-2;row++){
   const strip:number[]=[];for(const [z,w,top,keel]of [stations[row],stations[row+1]])for(const drop of [.12,.25]){const f=drop/((top-keel)*.83);strip.push(side*(w*(1-.22*f)+.008),top-drop,z);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(strip,3));g.setIndex(side===1?[0,2,1,1,2,3]:[0,1,2,1,3,2]);g.computeVertexNormals();k.mesh(g,colors.teal,'hull-livery-inlay');
  }
 }
 // Raised foredeck follows the narrowing bow, leaving the rear cockpit genuinely open.
 const deck:number[]=[],deckIndex:number[]=[];for(const [z,w,top]of stations.slice(4))for(const side of [-1,1])deck.push(side*Math.max(.008,w-.1),top-.015,z);
 for(let row=0;row<3;row++){const a=row*2;deckIndex.push(a,a+2,a+1,a+1,a+2,a+3);}const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(deck,3));dg.setIndex(deckIndex);dg.computeVertexNormals();k.mesh(dg,0xe6e7d4,'solid-bow-deck');
 const cockpit=group(root,'speedboat-cockpit'),c=kit(cockpit);c.box(1.45,.12,2.4,0xc7b994,'cockpit-floor',0,.24,-1.35);
 for(const side of [-1,1]){c.box(.57,.22,.55,colors.navy,'seat-pedestal',side*.43,.39,-.9);c.box(.6,.15,.58,0xf3d6a4,'seat-cushion',side*.43,.575,-.9);const back=c.box(.6,.58,.13,colors.cream,'seat-back',side*.43,.87,-1.14);back.rotation.x=-.1;
  c.box(.07,.38,.08,colors.navy,'dashboard-support',side*.65,.48,.2);
 }
 for(const side of [-1,1])c.box(.18,.14,.28,colors.navy,'rear-bench-pedestal',side*.4,.335,-2.23);
 c.box(1.28,.22,.4,0xf3d6a4,'rear-bench',0,.48,-2.23);c.box(1.29,.42,.14,colors.cream,'rear-bench-back',0,.79,-2.4);
 c.box(1.7,.24,.35,colors.navy,'dashboard-console',0,.78,.2);
 c.beam(new THREE.Vector3(-.43,.76,.1),new THREE.Vector3(-.43,.81,-.2),.035,colors.steel,'steering-column');const wheel=c.mesh(new THREE.TorusGeometry(.18,.025,6,16),colors.navy,'steering-wheel',-.43,.82,-.2);wheel.rotation.x=.25;
 for(const x of [-.1,.15])c.box(.13,.08,.025,0x8ac7d3,'dashboard-gauge',x,.81,.015);
 const windscreen=group(root,'speedboat-windscreen'),w=kit(windscreen),corners=[[-.86,.81,.35],[.86,.81,.35],[.73,1.2,-.02],[-.73,1.2,-.02]].map(p=>new THREE.Vector3(...p as [number,number,number]));
 const glass=new THREE.BufferGeometry();glass.setAttribute('position',new THREE.Float32BufferAttribute([0,1,2,0,2,3].flatMap(i=>corners[i].toArray()),3));glass.computeVertexNormals();const pane=w.mesh(glass,0x88c2d1,'raked-windshield');pane.material=(pane.material as THREE.MeshToonMaterial).clone();Object.assign(pane.material,{transparent:true,opacity:.62,depthWrite:false,side:THREE.DoubleSide});
 for(let i=0;i<4;i++)w.beam(corners[i],corners[(i+1)%4],.028,colors.steel,'windscreen-frame');
 const motor=group(root,'speedboat-outboard'),m=kit(motor);
 m.box(.44,.24,.32,colors.steel,'transom-clamp',0,.19,-2.94);m.box(.28,.28,.42,colors.navy,'motor-bracket',0,.18,-3.15);
 m.box(.59,.62,.62,colors.navy,'outboard-cowling',0,.43,-3.38);m.box(.6,.1,.63,colors.cream,'cowling-cap',0,.77,-3.38);m.box(.62,.09,.31,colors.gold,'outboard-band',0,.43,-3.38);
 m.box(.15,.88,.2,colors.steel,'outboard-lower-leg',0,-.24,-3.4);m.box(.34,.04,.42,colors.steel,'anti-cavitation-plate',0,-.53,-3.42);
 const prop=group(motor,'outboard-propeller');prop.position.set(0,-.69,-3.55);const p=kit(prop),hub=p.mesh(new THREE.CylinderGeometry(.085,.07,.22,12),colors.navy,'propeller-hub');hub.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,blade=p.box(.09,.31,.045,colors.steel,'propeller-blade',Math.sin(a)*.14,Math.cos(a)*.14,0);blade.rotation.z=-a;}
 const safety=group(root,'speedboat-safety'),s=kit(safety);const ring=s.mesh(new THREE.TorusGeometry(.2,.055,6,20),colors.gold,'mounted-life-ring',1.055,.6,-1.65);ring.rotation.y=Math.PI/2;
 s.beam(new THREE.Vector3(.97,.59,-1.65),new THREE.Vector3(1.06,.59,-1.65),.027,colors.steel,'life-ring-mount');
 for(const side of [-1,1]){s.box(.08,.08,.12,colors.steel,'cleat-base',side*.61,.58,-2.62);s.box(.08,.06,.24,colors.steel,'stern-cleat',side*.61,.62,-2.62);s.box(.06,.13,.1,colors.steel,'navigation-light-mount',side*.76,.82,.95);lamp(s.box(.09,.06,.13,side<0?0xdf5550:0x57ad86,'navigation-light',side*.76,.9,.95),side<0?0xdf5550:0x57ad86);}
 return root;
}
