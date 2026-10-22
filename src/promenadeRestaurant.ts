import {renderPlant,createShrub,createFlower} from './plantAssets';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world } from './scene';
import { GROUND_Y } from './config';
import { toon } from './materials';

/** Reference pavilion: blue/gold hip roof, linen dining tables, rounded waterfront terrace. */
export function buildPromenadeRestaurant(){
 const root=new THREE.Group();root.name='promenade-pavilion';
 const stone=toon(0xe5d6b4),cap=toon(0xf6e7c7),wood=toon(0x98602e),deck=toon(0xb58347);
 const blue=toon(0x164d76),roof=toon(0x1e6598),roofShade=toon(0x174c7d),gold=toon(0xd5a13d);
 const linen=toon(0xfff9e8),green=toon(0x427c42),pink=toon(0xf05a9e),pinkLight=toon(0xff98c0),soil=toon(0x67402d);
 const glow=new THREE.MeshStandardMaterial({color:0xffdb8c,emissive:0xffb438,emissiveIntensity:.9,roughness:.55});
 const mesh=(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,ry=0)=>{
  const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.y=ry;o.castShadow=o.receiveShadow=true;root.add(o);return o;
 };
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,ry=0)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,ry);
 const ball=(x:number,y:number,z:number,r:number,m:THREE.Material)=>mesh(new THREE.SphereGeometry(r,8,6),m,x,y,z);
 const beam=(a:number[],b:number[],r:number,m:THREE.Material)=>{
  const p=new THREE.Vector3(...a as [number,number,number]),q=new THREE.Vector3(...b as [number,number,number]);
  const o=mesh(new THREE.CylinderGeometry(r,r,p.distanceTo(q),6),m);o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return o;
 };
 // D-shaped platform: straight promenade edge on the east, curved edge over the water.
 const terrace=new THREE.Shape();terrace.moveTo(6,-7);terrace.lineTo(0,-8);terrace.absellipse(0,0,8,8,-Math.PI/2,Math.PI/2,true,0);terrace.lineTo(6,7);terrace.closePath();
 const slab=mesh(new THREE.ExtrudeGeometry(terrace,{depth:1.7,bevelEnabled:false,curveSegments:32}),stone,0,.32);slab.rotation.x=Math.PI/2;
 // Deck follows the same outline, with individually visible timber planks.
 const floor=mesh(new THREE.ShapeGeometry(terrace,32),deck,0,.34);floor.rotation.x=-Math.PI/2;
 for(let x=-7.5;x<5.9;x+=.46){const end=x<0?Math.sqrt(64-x*x):7;box(x,.36,0,.025,.025,end*2-.12,wood);}
 // Curved blue balustrade, stone piers, gold finials; entrance remains open on landward side.
 const railPoints:number[][]=[];
 for(let i=0;i<=24;i++){const a=Math.PI/2+i*Math.PI/24;railPoints.push([Math.cos(a)*7.8,0,Math.sin(a)*7.8]);}
 for(let i=0;i<railPoints.length;i++){
  const [x,,z]=railPoints[i];
  if(i%6===0){box(x,1,z,.72,1.5,.72,stone);box(x,1.82,z,.93,.18,.93,cap);ball(x,2.02,z,.19,gold);}
  else {beam([x,.4,z],[x,1.9,z],.075,blue);ball(x,2,z,.12,gold);}
  if(i){const p=railPoints[i-1];for(const y of [.65,1.78])beam([p[0],y,p[2]],[x,y,z],.085,blue);if(i%3===0)beam([p[0],.65,p[2]],[x,1.78,z],.045,blue);}
 }
 // Rear and front low walls with planters, plus steps joining the promenade.
 for(const z of [-7,7]){box(3,1,z,5.8,1.3,.55,stone);box(3,1.72,z,6,.16,.7,cap);}
 for(let i=0;i<3;i++)box(6.45+i*.8,.25-i*.09,-1,1.0,.35-i*.09,3.5,cap);
 // Four-post open dining pavilion.
 for(const x of [-4.25,4.25])for(const z of [-3.8,3.8]){
  box(x,.62,z,.95,.5,.95,cap);box(x,3.8,z,.42,6.1,.42,wood);box(x,6.72,z,.72,.22,.72,gold);
  for(const side of [-1,1])beam([x,5.45,z],[x+side*1.1,6.65,z],.13,wood);
 }
 for(const z of [-4.55,4.55]){box(0,6.95,z,11,.36,.28,wood);box(0,7.17,z,11.1,.14,.33,gold);}
 for(const x of [-5.45,5.45]){box(x,6.95,0,.28,.36,9.1,wood);box(x,7.17,0,.33,.14,9.1,gold);}
 const corners=[[-5.5,7.25,-4.6],[5.5,7.25,-4.6],[5.5,7.25,4.6],[-5.5,7.25,4.6]],apex=[0,10.9,0];
 for(let i=0;i<4;i++){
  const a=corners[i],b=corners[(i+1)%4];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...apex,...b,...b,...apex,...a],3));geo.computeVertexNormals();mesh(geo,i%2?roof:roofShade);
  beam(a,apex,.065,gold);
  // Standing roof seams break up the broad blue roof faces.
  for(let j=1;j<6;j++){const t=j/6;beam([a[0]*(1-t)+b[0]*t,7.28,a[2]*(1-t)+b[2]*t],apex,.026,blue);}
 }
 mesh(new THREE.CylinderGeometry(.29,.36,.24,8),gold,0,11,0);ball(0,11.35,0,.3,gold);mesh(new THREE.ConeGeometry(.18,.9,8),gold,0,11.88,0);
 // Small gold-trimmed blue roof dormers on the two visible faces.
 for(const side of [-1,1]){
  const x=side*3.5,z=3.35;box(x,7.65,z,.85,.85,.4,gold);
  mesh(new THREE.ConeGeometry(.8,1.1,4),roof,x,8.5,z,Math.PI/4);box(x,7.8,z+.24,.4,.58,.06,blue);ball(x,9.1,z,.12,gold);
 }
 const chair=(x:number,z:number,angle:number)=>{
  const p=(dx:number,dz:number)=>[x+dx*Math.cos(angle)+dz*Math.sin(angle),z-dx*Math.sin(angle)+dz*Math.cos(angle)];
  box(x,1.05,z,.9,.17,.85,wood,angle);
  for(const dx of [-.34,.34])for(const dz of [-.3,.3]){const q=p(dx,dz);box(q[0],.68,q[1],.10,.72,.10,wood,angle);}
  for(const dx of [-.38,.38]){const q=p(dx,-.39);box(q[0],1.65,q[1],.10,1.35,.10,wood,angle);}
  const q=p(0,-.39);box(q[0],2.06,q[1],.86,.32,.1,wood,angle);
 };
 for(const [x,z] of [[-2.25,-1.8],[2.25,-1.8],[0,3.6]]){
  box(x,1,z,.20,1.25,.20,wood);box(x,1.64,z,2.2,.12,2.1,linen);
  for(const dx of [-1.08,1.08])box(x+dx,1.35,z,.06,.6,2.1,linen);
  for(const dz of [-1.04,1.04])box(x,1.35,z+dz,2.1,.6,.06,linen);
  mesh(new THREE.CylinderGeometry(.21,.15,.3,8),wood,x,1.86,z);ball(x,2.14,z,.27,green);
  chair(x-1.65,z,Math.PI/2);chair(x+1.65,z,-Math.PI/2);chair(x,z-1.65,Math.PI);
 }
 // Hanging lanterns on softly sagging strings beneath the eaves.
 for(const z of [-3.95,3.95])for(let i=0;i<6;i++){
  const x=-4+i*1.6,next=x+1.6,y=6.55-.6*Math.sin(i*Math.PI/5);
  if(i<5)beam([x,y,z],[next,6.55-.6*Math.sin((i+1)*Math.PI/5),z],.025,wood);
  beam([x,y,z],[x,y-.26,z],.035,gold);ball(x,y-.43,z,.22,glow);
 }
 // Flower-filled wooden boxes: green foliage and five-petal pink blooms.
 for(const [x,z] of [[-6.8,-3.5],[-6.8,3.5],[-3.5,-6.4],[3.6,6.5],[4.8,-6.3]]){
  box(x,.9,z,1.9,.8,1,wood);box(x,1.32,z,1.7,.06,.8,soil);
  for(let i=0;i<3;i++){
   const shrub=renderPlant(createShrub(i+61));shrub.geometry=shrub.geometry.clone();shrub.scale.set(.43,.55,.4);shrub.position.set(x+(i-1)*.53,1.34,z);root.add(shrub);
   const bloom=renderPlant(createFlower(i+17));bloom.geometry=bloom.geometry.clone();bloom.position.set(x+(i-1)*.52,1.72,z+.15);root.add(bloom);
  }
 }
 const lx=-5.6,lz=5.1;
 mesh(new THREE.CylinderGeometry(.14,.24,4.7,8),blue,lx,2.7,lz);mesh(new THREE.CylinderGeometry(.38,.48,.25,8),blue,lx,.5,lz);
 mesh(new THREE.CylinderGeometry(.36,.23,.9,4),glow,lx,5.4,lz,Math.PI/4);
 for(const dx of [-.28,.28])for(const dz of [-.28,.28])beam([lx+dx,4.95,lz+dz],[lx+dx,5.85,lz+dz],.04,blue);
 mesh(new THREE.ConeGeometry(.65,.45,4),blue,lx,6,lz,Math.PI/4);ball(lx,6.3,lz,.11,gold);
 // Merge by material so flowers, furniture and railings remain inexpensive to draw/highlight.
 root.updateMatrixWorld(true);
 const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
 for(const child of [...root.children]){const m=child as THREE.Mesh;const material=m.material as THREE.Material;const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);g.deleteAttribute('uv');if(!batches.has(material))batches.set(material,[]);batches.get(material)!.push(g);m.geometry.dispose();root.remove(m);}
 for(const [material,geometries] of batches){const merged=mergeGeometries(geometries,false)!;const part=new THREE.Mesh(merged,material);part.castShadow=part.receiveShadow=true;root.add(part);geometries.forEach(g=>g.dispose());}
 root.position.y=GROUND_Y;root.userData.details={tables:3,chairs:9,flowerBoxes:5,hangingLights:12,curvedTerrace:true};world.add(root);
}
