import * as THREE from 'three';
import {ZONES} from './layout';
import {surfaceHeight} from './terrainSurface';
import {nearestRoad} from './roadNetwork';
import {paintGroundPath} from './groundRoadMaterial';
import {parkingAccessPaths} from './parking';
import {world} from './scene';
import {toon} from './materials';
import {gridCell} from './mapCoordinates';
export const SITE_GATES=[{id:'hospital',x:133,z:-10},{id:'campus',x:142,z:81},{id:'civic',x:60,z:39.5},{id:'market',x:-9,z:36},{id:'hotel',x:-12,z:162.5},{id:'cafe',x:93,z:139.5},{id:'park',x:-13,z:-77.2},{id:'commercial',x:77,z:-110.5},{id:'restaurant',x:126.8,z:140}];
type Point=[number,number];
export function planSiteAccess(gate:typeof SITE_GATES[number]){
 const road=nearestRoad(gate.x,gate.z),length=Math.hypot(gate.x-road.x,gate.z-road.z),n=new THREE.Vector2(gate.x-road.x,gate.z-road.z).normalize();
 const curb:Point=[road.x+n.x*(road.width/2+.9),road.z+n.y*(road.width/2+.9)],start:Point=[gate.x,gate.z];
 if(length<=road.width/2+1.8)return {id:gate.id,points:[start,curb,[road.x+n.x*(road.width/2+.03),road.z+n.y*(road.width/2+.03)] as Point],width:2.4,rejected:false};
 const step=2,goal=[Math.round((curb[0]-gate.x)/step),Math.round((curb[1]-gate.z)/step)],key=(a:number,b:number)=>a+','+b;
 const nodes=new Map<string,{x:number;z:number;cost:number;score:number;parent:string|null}>(),open=new Set<string>(['0,0']),closed=new Set<string>();nodes.set('0,0',{x:0,z:0,cost:0,score:0,parent:null});let result:string|undefined;
 const blocked=(x:number,z:number)=>Object.entries(ZONES).some(([id,s])=>id!==gate.id&&id!=='cruise'&&Math.abs(x-s.x)<s.w/2+1.3&&Math.abs(z-s.z)<s.d/2+1.3);
 for(let tries=0;open.size&&tries<3500;tries++){
  let id=[...open].reduce((a,b)=>nodes.get(a)!.score<nodes.get(b)!.score?a:b),a=nodes.get(id)!;open.delete(id);closed.add(id);
  if(a.x===goal[0]&&a.z===goal[1]){result=id;break;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const x=a.x+dx,z=a.z+dz,k=key(x,z),wx=x===goal[0]&&z===goal[1]?curb[0]:gate.x+x*step,wz=x===goal[0]&&z===goal[1]?curb[1]:gate.z+z*step;if(closed.has(k)||Math.abs(x)>35||Math.abs(z)>35||blocked(wx,wz))continue;
   const distance=step*Math.hypot(dx,dz),rise=Math.abs(surfaceHeight(wx,wz)-surfaceHeight(gate.x+a.x*step,gate.z+a.z*step));if(rise/distance>.2)continue;
   const r=nearestRoad(wx,wz);if(r.distance<r.width/2+.7)continue;
   const cost=a.cost+distance+rise*8;if(nodes.has(k)&&nodes.get(k)!.cost<=cost)continue;
   nodes.set(k,{x,z,cost,score:cost+step*Math.hypot(goal[0]-x,goal[1]-z),parent:id});open.add(k);
  }
 }
 if(!result)return {id:gate.id,points:[] as Point[],width:2.4,rejected:true};
 const edge:Point=[road.x+n.x*(road.width/2+.03),road.z+n.y*(road.width/2+.03)];
 const points:Point[]=[edge,curb];while(result){const a=nodes.get(result)!;points.push([gate.x+a.x*step,gate.z+a.z*step]);result=a.parent??undefined;}points.reverse();points[0]=start;
 // Keep anchors only where heading changes; round strokes join these continuous paths.
 const simplified=points.filter((p,i)=>!i||i===points.length-1||Math.abs((p[0]-points[i-1][0])*(points[i+1][1]-p[1])-(p[1]-points[i-1][1])*(points[i+1][0]-p[0]))>.01);
 return {id:gate.id,points:simplified,width:2.4,rejected:false};
}
export function buildSiteAccess(){
 const root=new THREE.Group();root.name='landmark-entrance-connections';world.add(root);const records=[];
 for(const gate of SITE_GATES){const plan=planSiteAccess(gate);records.push({...plan,cell:gridCell(gate.x,gate.z).id});if(plan.rejected)continue;
  paintGroundPath(plan.points,plan.width,'walk');paintGroundPath(plan.points.slice(0,2),3,'walk');
  for(let i=1;i<plan.points.length;i++)parkingAccessPaths.push({points:[plan.points[i-1],plan.points[i]],width:plan.width});
  // Short grounded threshold wedge removes the small raised forecourt curb at the gate.
  if(['hospital','campus','restaurant'].includes(gate.id)&&plan.points.length>1){
   const a=new THREE.Vector3(gate.x,surfaceHeight(gate.x,gate.z)+(gate.id==='restaurant'?.315:.18),gate.z),b=new THREE.Vector3(plan.points[1][0],0,plan.points[1][1]),direction=b.clone().sub(a);direction.y=0;direction.normalize();b.copy(a).addScaledVector(direction,3);b.y=surfaceHeight(b.x,b.z)+.025;
   const right=new THREE.Vector3(-direction.z,0,direction.x).multiplyScalar(1.3),p=[a.clone().add(right),a.clone().sub(right),b.clone().add(right),b.clone().sub(right)],verts:number[]=[];
   for(const [i,j,k]of [[0,2,1],[1,2,3]])for(const id of [i,j,k])verts.push(...p[id].toArray());
   for(const [i,j]of [[0,1],[1,3],[3,2],[2,0]]){const low=(v:THREE.Vector3)=>new THREE.Vector3(v.x,surfaceHeight(v.x,v.z)-.08,v.z);for(const v of [p[i],p[j],low(p[j]),p[i],low(p[j]),low(p[i])])verts.push(...v.toArray());}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,toon(0xe7d9b9));mesh.name=gate.id+'-threshold-ramp';root.add(mesh);
  }
 }
 root.userData.connections=records;world.userData.siteAccess=records;
}
