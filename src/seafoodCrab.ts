import * as THREE from 'three';
import {kit} from './referenceArchitecture';

export const CRAB_PARTS:Record<string,string>={'crab-shell':'蟹壳与口器','crab-eyes':'眼柄与眼珠','crab-walking-legs':'八条分节步足','crab-claws':'双螯与开口钳指','crab-mount':'底座与屋檐支架'};
export function createSeafoodCrab(){
 const root=new THREE.Group();root.name='seafood-crab-sculpture';root.userData.front='+Z';
 const parts=Object.fromEntries(Object.keys(CRAB_PARTS).map(name=>{const g=new THREE.Group();g.name=name;root.add(g);return [name,g];}));
 const red=0xde5141,orange=0xf57a4a,dark=0xad3936,k=kit(parts['crab-shell']);
 const shell=k.ball(1,red,0,2.2,0);shell.scale.set(1.55,.85,.52);shell.name='domed-crab-carapace';
 const lip=k.ball(1,orange,0,1.89,.38);lip.scale.set(1.15,.3,.2);
 for(const side of [-1,1]){const mouth=k.ball(.17,dark,side*.15,1.8,.55);mouth.scale.set(.75,1,.4);}
 const eyes=kit(parts['crab-eyes']);
 for(const side of [-1,1]){eyes.rod(new THREE.Vector3(side*.6,2.78,.17),new THREE.Vector3(side*.76,3.34,.18),.095,dark);eyes.ball(.2,0xfff1ca,side*.76,3.34,.18);eyes.ball(.11,0x243e48,side*.76,3.34,.345);}
 const legs=kit(parts['crab-walking-legs']);
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const a=new THREE.Vector3(side*1.15,2.55-i*.25,0),b=new THREE.Vector3(side*[2.1,2.25,2.2,2][i],[2.9,2.3,1.75,1.3][i],.05),c=new THREE.Vector3(side*[2.6,3.15,3.1,2.7][i],[2.6,1.95,1.2,.55][i],.18);
  legs.rod(a,b,.11,red).name='crab-leg-upper';legs.ball(.13,orange,b.x,b.y,b.z);legs.rod(b,c,.075,dark).name='crab-leg-tip';
 }
 const claws=kit(parts['crab-claws']);
 for(const side of [-1,1]){
  const a=new THREE.Vector3(side*1.05,2.7,-.05),b=new THREE.Vector3(side*1.85,3.15,0),c=new THREE.Vector3(side*2.35,3.65,0);
  claws.rod(a,b,.15,dark);claws.ball(.18,orange,b.x,b.y,b.z);claws.rod(b,c,.17,red);
  // A single closed solid with an open U-shaped bite, rather than a broken torus.
  const shape=new THREE.Shape([[-.48,-.5],[-.65,.05],[-.5,.68],[-.22,.9],[-.25,.22],[0,.02],[.25,.22],[.22,.9],[.5,.68],[.65,.05],[.48,-.5]].map(([x,y])=>new THREE.Vector2(x,y)));
  const pincer=claws.mesh(new THREE.ExtrudeGeometry(shape,{depth:.36,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:1}),red,side*2.35,3.65,-.18);pincer.rotation.z=-side*.28;pincer.name='open-crab-pincer';
 }
 const mount=kit(parts['crab-mount']);mount.box(3.4,.18,1.2,0x547680,0,.09,0);
 for(const side of [-1,1]){mount.rod(new THREE.Vector3(side*.8,.16,0),new THREE.Vector3(side*.8,1.55,-.05),.085,0x547680);mount.rod(new THREE.Vector3(side*1,-.6,-1.6),new THREE.Vector3(side*1,0,0),.09,0x547680);mount.box(.4,.5,.12,0x547680,side*1,-.6,-1.6);}
 return root;
}
