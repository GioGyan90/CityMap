import * as THREE from 'three';
import {toon} from './materials';
const dark=0x345263;
function box(g:THREE.Object3D,w:number,h:number,d:number,c:number,x:number,y:number,z:number,name:string){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(c));m.position.set(x,y,z);m.name=name;m.castShadow=m.receiveShadow=true;g.add(m);return m;}
export function createStreetLamp(){
 const g=new THREE.Group();g.name='curb-street-lamp';
 box(g,.46,.18,.46,0xd8d5c5,0,.09,0,'grounded-plinth');box(g,.16,4.5,.16,dark,0,2.35,0,'lamp-mast');
 box(g,.16,.16,1.1,dark,0,4.55,.48,'road-facing-bracket');box(g,.56,.2,.9,dark,0,4.5,1,'lantern-housing');
 const lens=box(g,.45,.06,.72,0xffedb7,0,4.37,1,'lamp-lens');lens.userData.lightingRole='street-lens';return g;
}
export type SignalColor='red'|'amber'|'green';
export function createSignalPost(){
 const g=new THREE.Group();g.name='curb-traffic-signal';box(g,.48,.2,.48,0xd8d5c5,0,.1,0,'grounded-plinth');box(g,.16,3.7,.16,dark,0,1.95,0,'signal-mast');
 box(g,.68,1.65,.42,0x253d4b,0,3.65,.1,'signal-housing');
 for(const [i,c] of [0xed5c60,0xffca58,0x52e8b1].entries()){
  const name=(['red','amber','green'] as const)[i],lens=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.07,12),new THREE.MeshBasicMaterial({color:c}));lens.rotation.x=Math.PI/2;lens.position.set(0,4.16-i*.5,.35);lens.name='signal-'+name;g.add(lens);box(g,.58,.08,.3,dark,0,4.41-i*.5,.38,'sun-visor');
 }setSignalColor(g,'red');return g;
}
export function setSignalColor(g:THREE.Object3D,color:SignalColor){for(const c of ['red','amber','green']){const lens=g.getObjectByName('signal-'+c) as THREE.Mesh;const m=lens.material as THREE.MeshBasicMaterial;m.color.setHex(c==='red'?0xed5c60:c==='amber'?0xffca58:0x52e8b1);if(c!==color)m.color.multiplyScalar(.12);}}
export function createCrossingGate(){
 const g=new THREE.Group();g.name='tram-crossing-gate';box(g,.65,.18,.65,0xd8d5c5,0,.09,0,'gate-foundation');box(g,.38,1.15,.38,0xf4c34f,0,.75,0,'gate-motor');
 for(let i=0;i<3;i++)box(g,.4,.12,.4,dark,0,.4+i*.32,0,'hazard-band');
 box(g,.14,1.75,.14,dark,0,2,0,'warning-mast');box(g,1.05,.36,.18,dark,0,2.35,0,'warning-housing');
 for(const side of [-1,1]){const m=new THREE.Mesh(new THREE.SphereGeometry(.14,10,6),new THREE.MeshBasicMaterial({color:0xec5656}));m.name='warning-'+side;m.position.set(side*.3,2.35,.15);g.add(m);}
 for(const angle of [-.65,.65])box(g,1.1,.15,.12,0xffedc1,0,2.85,0,'crossbuck').rotation.z=angle;
 const arm=new THREE.Group();arm.name='barrier-pivot';arm.position.y=1.25;g.add(arm);
 for(let i=0;i<10;i++)box(arm,.13,.16,.3,i%2?0xf6f0de:0xe85f5d,0,0,.15+i*.3,'barrier-stripe');arm.rotation.x=-Math.PI*.47;return g;
}
export function createGuideFence(){const g=new THREE.Group();g.name='crossing-guide-fence';for(const z of [-1,1])box(g,.12,1.1,.12,dark,0,.55,z,'grounded-fence-post');for(const y of [.45,.95])box(g,.1,.1,2,dark,0,y,0,'fence-rail');return g;}
