import * as THREE from 'three';
import {RESORT_ACCENTS} from './visualStyle';
import {kit,C} from './referenceArchitecture';
import {roundPlan,extrudedPlan,polygonPlan,polygonRing,cutFacade,type PlanPoint} from './carvedGeometry';
const timber=0x93643d,lightWood=0xc89b60,darkWood=0x715035;
function part(root:THREE.Group,name:string,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);root.add(g);return g;}
export function createFish(){
 const g=new THREE.Group();g.name='market-fish';const k=kit(g),s=new THREE.Shape();s.moveTo(-1.3,0);s.lineTo(-2,.65);s.quadraticCurveTo(-2.2,0,-2,-.65);s.lineTo(-1.3,-.13);s.bezierCurveTo(-.4,-1,1.55,-.7,2,.05);s.bezierCurveTo(1.35,.9,-.5,.9,-1.3,0);s.closePath();
 k.mesh(new THREE.ExtrudeGeometry(s,{depth:.25,bevelEnabled:true,bevelThickness:.07,bevelSize:.07,bevelSegments:2}),0x85b8b8).name='fish-body';
 const fin=polygonPlan([[-.6,.35],[.0,1.1],[.6,.35]]);k.mesh(new THREE.ExtrudeGeometry(fin,{depth:.2,bevelEnabled:false}),0x3c8192,0,0,.02).name='fish-dorsal-fin';
 for(const z of [-.08,.33]){k.ball(.1,0x223f48,1.3,.25,z);const gill=k.mesh(new THREE.TorusGeometry(.35,.035,5,14,Math.PI*.9),0x3c8192,.9,.05,z);gill.rotation.z=1.7;}
 return g;
}
export function createBambooBasket(seed=0){const g=new THREE.Group();g.name='bamboo-fish-basket';const k=kit(g),r=.68+(seed%3)*.07,h=.8;
 k.mesh(new THREE.CylinderGeometry(r*.87,r*.68,.54,16),0xcee0d4,0,.36,0).name='basket-ice-bed';
 k.mesh(new THREE.CylinderGeometry(r*.68,r*.66,.1,16),lightWood,0,.05,0).name='basket-closed-bottom';
 for(let row=0;row<6;row++){const u=row/5,ring=k.mesh(new THREE.TorusGeometry(r*(.7+.3*u),.045,5,24),row%2?0xb4874d:0xd3ad72,0,.12+u*(h-.12),0);ring.rotation.x=Math.PI/2;}
 for(let i=0;i<18;i++){const a=i*Math.PI*2/18;k.rod(new THREE.Vector3(Math.cos(a)*r*.68,.08,Math.sin(a)*r*.68),new THREE.Vector3(Math.cos(a)*r,h,Math.sin(a)*r),.025,0xc69d5e);}
 return g;
}
export function createFishTable(seed=0){const g=new THREE.Group();g.name='fish-display-table';const k=kit(g);
 for(let i=0;i<5;i++)k.box(4.6,.17,.38,i%2?0xcba16c:lightWood,0,1.15,-.8+i*.4);
 for(const x of [-1.8,1.8])for(const z of [-.65,.65])k.box(.15,1.07,.15,timber,x,.535,z);
 for(const x of [-1.8,1.8])k.box(.18,.16,1.8,darkWood,x,.4,0);
 for(const x of [-1.35,0,1.35]){k.box(1.15,.13,1.35,0x62919b,x,1.3,0);const fish=createFish();fish.scale.setScalar(.25);fish.rotation.x=-Math.PI/2;fish.rotation.z=.15*(seed%3-1);fish.position.set(x,1.405,0);g.add(fish);}
 return g;
}
function tent(root:THREE.Group,x:number,z:number,color:number,width=5.8){const g=part(root,'canvas-fish-stall',x,.75,z),k=kit(g);
 for(const dx of [-width/2+.2,width/2-.2])for(const dz of [-2.1,2.1]){k.box(.15,3.3,.15,timber,dx,1.65,dz);k.rod(new THREE.Vector3(dx,2.6,dz),new THREE.Vector3(dx-Math.sign(dx)*.6,3.25,dz),.055,timber);}
 const roof=new THREE.Shape();roof.moveTo(-width/2-.3,3.15);roof.quadraticCurveTo(-width*.23,3.35,0,4.05);roof.quadraticCurveTo(width*.23,3.35,width/2+.3,3.15);roof.lineTo(width/2+.3,3.03);roof.quadraticCurveTo(width*.23,3.23,0,3.93);roof.quadraticCurveTo(-width*.23,3.23,-width/2-.3,3.03);roof.closePath();k.mesh(new THREE.ExtrudeGeometry(roof,{depth:4.9,bevelEnabled:false}),color,0,0,-2.45).name='curved-canvas-roof';
 k.box(width+.5,.3,.08,color,0,3.08,2.43);k.box(width-.2,.12,.15,lightWood,0,3.2,2.1);k.box(width-.2,.12,.15,lightWood,0,3.2,-2.1);k.box(.12,.12,4.8,lightWood,0,3.95,0);
 const table=createFishTable(Math.round(x+z));table.position.z=1;g.add(table);return g;
}
function servingWindow(){const s=new THREE.Shape([new THREE.Vector2(-2.9,0),new THREE.Vector2(2.9,0),new THREE.Vector2(2.9,3.2),new THREE.Vector2(-2.9,3.2)]);s.holes.push(new THREE.Path([new THREE.Vector2(-1.85,1.2),new THREE.Vector2(-1.85,2.75),new THREE.Vector2(1.85,2.75),new THREE.Vector2(1.85,1.2)]));return new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:false});}
function woodenShop(root:THREE.Group){const g=part(root,'wooden-fish-house',-7,.75,3.6),k=kit(g);
 // Wide serving opening and a separate side doorway keep this a usable wood cabin.
 k.mesh(servingWindow(),timber,0,0,2.5).name='fish-house-serving-wall';
 k.box(5.8,3.2,.18,timber,0,1.6,-2.5);k.box(.18,3.2,5.2,timber,-2.8,1.6,0);
 const door=k.mesh(cutFacade(5.2,3.2,.18,[{x:0,y:0,w:1.65,h:2.6}]),timber,2.8,0,0);door.rotation.y=Math.PI/2;
 for(let i=0;i<11;i++){const x=-2.6+i*.52;k.box(.035,1.17,.06,lightWood,x,.585,2.61);k.box(.035,3.2,.06,lightWood,x,1.6,-2.61);}
 for(let i=0;i<10;i++){const y=.18+i*.3,c=i%3===0?0xa77849:0x9b6d42;k.box(5.8,.27,.035,c,0,y,-2.61);k.box(.035,.27,5.2,c,-2.91,y,0);for(const z of [-1.77,1.77])k.box(.035,.27,1.65,c,2.99,y,z);}
 k.box(4.2,.15,1,lightWood,0,1.23,2.8);
 const roof=polygonPlan([[-3.3,3.2],[0,4.3],[3.3,3.2],[3.3,3.05],[0,4.15],[-3.3,3.05]]);k.mesh(new THREE.ExtrudeGeometry(roof,{depth:6,bevelEnabled:false}),0x6e7864,0,0,-3);
 for(const z of [-2.7,2.7])k.rod(new THREE.Vector3(-3.1,3.2,z),new THREE.Vector3(0,4.23,z),.075,lightWood);
 const sign=createFish();sign.name='large-fish-roof-sign';sign.scale.setScalar(.85);sign.position.set(0,5.3,.5);g.add(sign);
 for(const x of [-1,1])k.rod(new THREE.Vector3(x,3.8,.5),new THREE.Vector3(x,5.3,.5),.08,timber);
 return g;
}
function fishingBoat(root:THREE.Group,x:number,z:number,color:number){const g=part(root,'moored-wooden-fishing-boat',x,-.8,z),k=kit(g),plan:PlanPoint[]=[[0,-3],[-1,-1.8],[-1.15,1.8],[-.8,2.5],[.8,2.5],[1.15,1.8],[1,-1.8]];
 k.mesh(extrudedPlan(polygonPlan(plan),.65),color).name='fishing-hull';k.mesh(polygonRing(plan,.16,.55),lightWood,0,.6,0);k.mesh(extrudedPlan(polygonPlan(plan),.12),darkWood,0,.56,0);
 for(const zz of [-1,1.1])k.box(1.9,.15,.5,lightWood,0,1,zz);
 const basket=createBambooBasket(0);basket.scale.setScalar(.5);basket.position.set(0,.68,0);g.add(basket);k.box(.5,.9,.45,0x45515a,0,.5,2.55);
 return g;
}
export function createBeachFishMarket(){const root=new THREE.Group();root.name='beach-wooden-fish-market';const deck=part(root,'fish-market-boardwalk'),k=kit(deck);
 // Planks have real gaps; beams and piles carry the continuous market and pier deck.
 for(let i=0;i<48;i++)k.box(24,.18,.405,i%4===0?0xcba475:lightWood,0,.66,-9.8+i*.417);
 for(const x of [-10,-5,0,5,10]){k.box(.24,.32,20,darkWood,x,.4,0);for(const z of [-9,-3,3,9])k.mesh(new THREE.CylinderGeometry(.17,.22,3.3,9),timber,x,-1.1,z).name='market-support-pile';}
 const pier=part(root,'small-fishing-pier'),p=kit(pier);
 for(let i=0;i<52;i++)p.box(4.4,.18,.39,i%4?lightWood:0xd3ad78,0,.66,-10.2-i*.4);
 for(const x of [-1.7,1.7]){p.box(.22,.34,19.7,darkWood,x,.4,-19.5);for(const z of [-11,-16,-21,-26,-29]){p.mesh(new THREE.CylinderGeometry(.17,.22,3.3,9),timber,x,-1.1,z).name='pier-support-pile';p.mesh(new THREE.CylinderGeometry(.15,.15,.75,9),darkWood,x,1.1,z);}}
 for(let i=0;i<8;i++)for(const x of [-3.6,3.6])p.box(2.78,.18,.39,lightWood,x,.66,-27.8-i*.4);
 for(const z of [-28.2,-30.2])p.box(10,.32,.2,darkWood,0,.4,z);
 for(const x of [-4.6,4.6])for(const z of [-28.2,-30.2])p.mesh(new THREE.CylinderGeometry(.19,.24,3.3,9),timber,x,-1.1,z).name='pier-support-pile';
 const ramp=part(root,'fish-market-entry-ramp');const rs=new THREE.Shape([new THREE.Vector2(10,.75),new THREE.Vector2(13.2,.55),new THREE.Vector2(13.2,.4),new THREE.Vector2(10,.57)]);const rm=kit(ramp).mesh(new THREE.ExtrudeGeometry(rs,{depth:3.2,bevelEnabled:false}),lightWood);rm.rotation.y=-Math.PI/2;rm.position.x=1.6;
 const stalls=part(root,'fish-market-stalls');woodenShop(stalls);tent(stalls,-7,-4.5,0x4b92a2);tent(stalls,7,-4.5,RESORT_ACCENTS.apricot);tent(stalls,7,3.8,0x5e8e84);
 const goods=part(root,'fish-market-goods');for(let i=0;i<8;i++){const x=i<4?-3.2:3.3,z=-6+(i%4)*3.6,b=createBambooBasket(i);b.position.set(x,.75,z);goods.add(b);if(i%2===0){const fish=createFish();fish.scale.setScalar(.24);fish.rotation.x=-Math.PI/2;fish.position.set(x,1.39,z);goods.add(fish);}}
 const extra=createFishTable(4);extra.position.set(-7,.75,8.8);goods.add(extra);
 for(const [x,z,c] of [[4.7,-20,0x478393],[-4.7,-25,0x9e643e]]){fishingBoat(root,x,z,c);kit(root).rod(new THREE.Vector3(Math.sign(x)*1.7,1,-21),new THREE.Vector3(x-Math.sign(x),.2,z+1),.035,0xd9c48b);}
 // Entrance is the only gap in the otherwise low edge rail.
 for(const x of [-10,10]){for(const z of [-8,0,8])k.box(.13,1,.13,timber,x,1.25,z);k.box(.1,.1,16,lightWood,x,1.7,0);}
 return root;
}
