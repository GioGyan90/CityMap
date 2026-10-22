import * as THREE from 'three';
import {toon} from './materials';
import {eastCoast,isLand} from './layout';
import {surfaceHeight} from './terrainSurface';
import {roadEdgeDistance} from './roadNetwork';
import {seededRandom} from './proceduralGeometry';
import {RESIDENTIAL_CLIFF,cliffEnvelope,cliffNormal} from './residentialCliffPlan';

/** A closed continuous core supports all the irregular face blocks. */
export function createResidentialCliff(){
 const root=new THREE.Group();root.name='residential-coastal-cliff';
 const face=new THREE.Group();face.name='continuous-rock-core';
 const blocks=new THREE.Group();blocks.name='fractured-cliff-blocks';
 const reefs=new THREE.Group();reefs.name='nearshore-reef-clusters';
 root.add(face,blocks,reefs);
 const random=seededRandom(RESIDENTIAL_CLIFF.seed),rr=(a:number,b:number)=>a+(b-a)*random();
 const palette=[0xb8b1a0,0xa4a99d,0xc5bea9,0x8f9b98,0xd0c6ae];
 const stone=toon(0xffffff,{vertexColors:true});
 const rock=(sx:number,sy:number,sz:number,seed:number)=>{
  const geometry=new THREE.DodecahedronGeometry(1,0);
  const p=geometry.attributes.position,colors:number[]=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   const jitter=1+.13*Math.sin(x*9+y*11+z*7+seed);
   p.setXYZ(i,x*sx*jitter,y*sy*(1+.1*Math.sin(x*8+z*6+seed)),z*sz*jitter);
   const color=new THREE.Color(palette[Math.floor(i/9+seed)%palette.length]);colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingBox();
  const mesh=new THREE.Mesh(geometry,stone);mesh.castShadow=mesh.receiveShadow=true;return mesh;
 };
 // Each row follows the actual boundary vertices of the shared terrain mesh.
 // The rock top is embedded, never laid coplanar over the grass/road surface.
 const rows:number[][][]=[],positions:number[]=[],indices:number[]=[],colors:number[]=[];
 for(let z=RESIDENTIAL_CLIFF.startZ;z<=RESIDENTIAL_CLIFF.endZ+.01;z+=.5){
  const x=eastCoast(z),n=cliffNormal(z,eastCoast),top=surfaceHeight(x,z),envelope=cliffEnvelope(x,z);
  const jag=(.7+.6*Math.sin(z*1.9)+.35*Math.cos(z*4.3))*envelope;
  const section=[[-.6,top-.12],[.05,top-.10],[.75+jag,top*.52],[1.0+jag,-1.1],[-.6,-1.1]].map(([out,y])=>[x+n.x*out,y,z+n.z*out]);
  rows.push(section);section.forEach(([px,y,pz],j)=>{positions.push(px,y,pz);const c=new THREE.Color(palette[j===2?1:j===3?3:2]);colors.push(c.r,c.g,c.b);});
 }
 const ring=5;
 for(let i=0;i<rows.length-1;i++)for(let j=0;j<ring;j++){
  const a=i*ring+j,b=i*ring+(j+1)%ring,c=(i+1)*ring+j,d=(i+1)*ring+(j+1)%ring;indices.push(a,c,b,b,c,d);
 }
 for(let j=1;j<ring-1;j++){indices.push(0,j,j+1);const a=(rows.length-1)*ring;indices.push(a,a+j+1,a+j);}
 const core=new THREE.BufferGeometry();core.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));core.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));core.setIndex(indices);core.computeVertexNormals();
 const coreMesh=new THREE.Mesh(core,toon(0xffffff,{vertexColors:true,side:THREE.DoubleSide}));coreMesh.name='closed-stratified-cliff-core';coreMesh.castShadow=coreMesh.receiveShadow=true;face.add(coreMesh);
 // Three staggered strata, with variable spacing, sizes and bedding angles.
 let seed=0;
 for(let z=177;z<195;z+=rr(.65,1.15)){
  const x=eastCoast(z),n=cliffNormal(z,eastCoast),top=surfaceHeight(x,z),strength=cliffEnvelope(x,z);
  if(strength<.16)continue;
  for(let layer=0;layer<3;layer++){
   const sy=rr(.75,1.35),sx=rr(2.4,4.4),sz=rr(1.2,2.2),out=.7;
   const px=x+n.x*out,pz=z+n.z*out;if(roadEdgeDistance(px,pz)<Math.max(sx,sz)+2)continue;
   const block=rock(sx,sy,sz,seed++);block.name='embedded-cliff-rock';
   block.rotation.set(rr(-.18,.18),Math.atan2(n.x,n.z)+rr(-.35,.35),rr(-.18,.18));
   // Embed the lower stratum into the bedrock below the waterline.
   block.position.set(px,layer===0?-.35:Math.min(top-.45,top*(layer===1?.35:.73)),pz);
   block.userData.layer=layer;blocks.add(block);
  }
 }
 // Restrict reefs to this headland: south of the working harbor, far from
 // passenger/cruise berths. Every rock is submerged to a common seabed.
 for(const [i,z] of [183,186,189,192].entries()){
  const n=cliffNormal(z,eastCoast),out=rr(7,12),cluster=new THREE.Group();cluster.name='reef-cluster-'+i;reefs.add(cluster);
  const cx=eastCoast(z)+n.x*out,cz=z+n.z*out;
  for(let j=0;j<3;j++){
   const sx=rr(1.1,2.4),sy=rr(1.8,2.5),sz=rr(1.3,2.8),m=rock(sx,sy,sz,seed++);
   m.name='partly-submerged-reef';m.rotation.y=rr(0,Math.PI*2);
   m.position.set(cx+rr(-2.2,2.2),-3-m.geometry.boundingBox!.min.y,cz+rr(-2.2,2.2));
   if(isLand(m.position.x,m.position.z))continue;
   m.userData.seabed=-3;cluster.add(m);
  }
 }
 root.userData={seed:RESIDENTIAL_CLIFF.seed,terrainGroup:'irregular-elevated-terrain',lift:RESIDENTIAL_CLIFF.lift,roadSurface:'shared-graded-terrain',rockBlocks:blocks.children.length,reefs:reefs.children.reduce((n,c)=>n+c.children.length,0)};
 return root;
}
