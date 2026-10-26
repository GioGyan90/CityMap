import * as THREE from 'three';
export interface FountainOptions {id:string;waterY:number;nozzleY:number;radius:number;rise:number}
interface Ripple {mesh:THREE.Mesh;phase:number}
export interface FountainState {root:THREE.Group;options:FountainOptions;time:number;drops:THREE.InstancedMesh;column:THREE.Mesh;ripples:Ripple[]}
export const fountainStates:FountainState[]=[];
const dummy=new THREE.Object3D(),arms=8,dropsPerArm=6;
export function fountainJetPoint(o:FountainOptions,angle:number,t:number,target=new THREE.Vector3()){const r=.12+(o.radius-.12)*t;return target.set(Math.cos(angle)*r,o.nozzleY+(o.waterY-o.nozzleY)*t+4*o.rise*t*(1-t),Math.sin(angle)*r);}
export function createFountainWater(options:FountainOptions){
 const root=new THREE.Group();root.name='animated-fountain-'+options.id;root.userData.fountain={...options};
 const water=new THREE.MeshToonMaterial({color:0x8ce7fa,transparent:true,opacity:.66,depthWrite:false,emissive:0x123945,emissiveIntensity:.08}),ripples:Ripple[]=[];
 for(let i=0;i<arms;i++){const a=i*Math.PI*2/arms,start=fountainJetPoint(options,a,0),end=fountainJetPoint(options,a,1),control=new THREE.Vector3().copy(start).lerp(end,.5);control.y+=2*options.rise;const stream=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start,control,end),16,.027,4,false),water);stream.name='arched-water-jet';root.add(stream);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,24),new THREE.MeshBasicMaterial({color:0xc7f4ff,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(end.x,options.waterY+.018,end.z);ring.name='impact-ripple';root.add(ring);ripples.push({mesh:ring,phase:i/arms});
 }
 const height=options.rise*.9,column=new THREE.Mesh(new THREE.CylinderGeometry(.035,.065,height,8),water);column.name='pulsing-central-jet';root.add(column);
 const drops=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.045,0),new THREE.MeshToonMaterial({color:0xc5f3ff,transparent:true,opacity:.88,depthWrite:false}),arms*dropsPerArm);drops.name='moving-water-droplets';drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(drops);
 const state={root,options,time:0,drops,column,ripples};fountainStates.push(state);updateFountain(state,0);
 // The conservative bound includes every future droplet, not only its initial phase.
 drops.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,(options.waterY+options.nozzleY+options.rise)/2,0),options.radius+options.rise+2);
 return root;
}
function updateFountain(state:FountainState,dt:number){state.time+=dt;const {options:o,time:t}=state,height=o.rise*.9*(.96+.04*Math.sin(t*2.1));state.column.scale.y=height/(o.rise*.9);state.column.position.set(0,o.nozzleY+height/2,0);
 for(let arm=0;arm<arms;arm++)for(let j=0;j<dropsPerArm;j++){const phase=(j/dropsPerArm+arm*.073+t*.57)%1;fountainJetPoint(o,arm*Math.PI*2/arms,phase,dummy.position);dummy.scale.setScalar(.65+.4*Math.sin(phase*Math.PI));dummy.updateMatrix();state.drops.setMatrixAt(arm*dropsPerArm+j,dummy.matrix);}state.drops.instanceMatrix.needsUpdate=true;
 for(const ripple of state.ripples){const phase=(t*.85+ripple.phase)%1;ripple.mesh.scale.setScalar(.08+.2*phase);(ripple.mesh.material as THREE.MeshBasicMaterial).opacity=.48*(1-phase);}
}
export function updateFountains(dt:number){if(!(dt>0))return;for(const state of fountainStates)updateFountain(state,dt);}
