import * as THREE from 'three';
import {toon} from './materials';
import {stationBox as box,stationBeam as beam,batchStationPart} from './coastalStationAssets';
import type {RailPlan} from './railNetworkPlan';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
export function createRailCar(plan:RailPlan,index=0){
 const root=new THREE.Group(),L=plan.carLength,w=plan.elevated?2.65:2.4,front=index===0;root.name=front?'streamlined-driving-car':'passenger-car';
 const side=new THREE.Shape();side.moveTo(-L/2,.62);side.lineTo(L/2,.62);side.lineTo(L/2,front?1.38:2.7);if(front)side.lineTo(L/2-.62,2.7);side.lineTo(-L/2,2.7);side.closePath();
 const geo=new THREE.ExtrudeGeometry(side,{depth:w,bevelEnabled:true,bevelSize:.09,bevelThickness:.09,bevelSegments:2,steps:1});geo.translate(0,0,-w/2);geo.rotateY(-Math.PI/2);const body=new THREE.Mesh(geo,toon(0xfff0cf));body.name='extruded-bevelled-car-shell';body.castShadow=body.receiveShadow=true;root.add(body);
 box(root,w+.06,.42,L-.15,plan.color,0,.88,-.02,'coloured-lower-skirt');
 // Independent arched roof. The front roof ends before the sloped cab windshield.
 const roofLength=L-(front?.65:.08),roofZ=front?-.29:0,section=new THREE.Shape();section.moveTo(-w/2-.05,2.7);section.lineTo(-w/2+.12,2.94);section.quadraticCurveTo(0,3.17,w/2-.12,2.94);section.lineTo(w/2+.05,2.7);section.closePath();const rg=new THREE.ExtrudeGeometry(section,{depth:roofLength,bevelEnabled:false,curveSegments:8});rg.translate(0,0,-roofLength/2+roofZ);const roof=new THREE.Mesh(rg,toon(plan.color));roof.name='independent-arched-roof';roof.castShadow=true;root.add(roof);
 for(const s of [-1,1]){
  const doorZ=-L*.28;box(root,.055,1.62,.62,0x96bdc0,s*(w/2+.096),1.59,doorZ,'recessed-sliding-door');box(root,.07,.78,.43,0x245775,s*(w/2+.13),1.92,doorZ,'door-glass');box(root,.08,.08,.7,0xf2c857,s*(w/2+.13),.79,doorZ,'door-step');
  for(const z of [0,L*.25]){box(root,.065,.94,.81,0xe4d8b8,s*(w/2+.1),2.08,z,'window-frame');box(root,.075,.76,.64,0x3987aa,s*(w/2+.14),2.1,z,'recessed-passenger-glass');box(root,.08,.055,.81,0xffffff,s*(w/2+.15),1.61,z,'window-sill');}
  box(root,.08,.12,L-.28,plan.color,s*(w/2+.1),1.28,0,'livery-waistband');
 }
 if(front){const glass=box(root,w*.81,.68,.07,0x245775,0,2.17,L/2-.30,'sloped-cab-windshield');glass.rotation.x=-.44;box(root,.55,.18,.08,0x3b554e,0,2.62,L/2-.51,'destination-display');for(const s of [-1,1]){const light=box(root,.25,.17,.1,0xffefb0,s*w*.32,1.17,L/2+.09,'headlamp');(light.material as THREE.Material).userData.lightingRole='station-light';beam(root,v(s*.2,1.94,L/2-.24),v(s*.36,2.27,L/2-.4),.025,0x455a66,'windscreen-wiper');}}
 else {box(root,1.15,1.85,.08,0xb4c4bf,0,1.57,L/2+.1,'gangway-door');box(root,.7,.78,.1,0x3987aa,0,2.06,L/2+.15,'gangway-window');}
 box(root,1.1,.82,.08,0x3987aa,0,2.08,-L/2-.14,'rear-end-window');for(const side of [-1,1])box(root,.18,.14,.08,index===plan.cars-1?0xd75651:0xa8b7ad,side*w*.32,1.12,-L/2-.15,'rear-marker-light');
 box(root,w*.8,.32,L-.5,0x66797b,0,.47,0,'underfloor-equipment');
 for(const z of [-L*.27,L*.27]){box(root,1.5,.25,.65,0x52676c,0,.42,z,'bogie-frame');for(const s of [-1,1]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.18,12),toon(0x45545c));wheel.rotation.z=Math.PI/2;wheel.position.set(s*.8,.31,z);wheel.name='flanged-steel-wheel';root.add(wheel);}beam(root,v(-.8,.31,z),v(.8,.31,z),.1,0x536569,'wheel-axle');}
 if(plan.elevated)box(root,1.4,.18,1.1,0xe1d8bb,0,3.07,-.3,'roof-air-conditioner');
 // Taper both coach ends so adjacent bodies clear one another on the compact return curves.
 root.updateMatrixWorld(true);root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.attributes.position,inverse=o.matrixWorld.clone().invert();for(let i=0;i<p.count;i++){const q=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld),t=THREE.MathUtils.smoothstep(Math.abs(q.z),L/2-(plan.elevated?1:.75),L/2);q.x*=1-t*(plan.elevated?.32:.5);q.applyMatrix4(inverse);p.setXYZ(i,q.x,q.y,q.z);}p.needsUpdate=true;o.geometry.computeVertexNormals();});
 batchStationPart(root);root.userData={railCar:true,length:L,width:w,bogieWheelbase:L*.54,front};return root;
}
export function createRailTrain(plan:RailPlan){const root=new THREE.Group();root.name=plan.id==='coast'?'moving-train':'moving-express-train';for(let i=0;i<plan.cars;i++){const car=createRailCar(plan,i);car.position.z=-i*plan.carPitch;root.add(car);}for(let i=0;i<plan.cars-1;i++){const g=new THREE.Group();g.name='flexible-car-gangway';g.position.set(0,1.61,-(i+.5)*plan.carPitch);g.scale.z=(plan.carPitch-plan.carLength)/.45;for(let j=0;j<5;j++)box(g,1.08+j%2*.07,1.85,.075,0x87938e,0,0,(j-2)*.09,'gangway-bellow');root.add(g);}root.userData.planId=plan.id;return root;}
