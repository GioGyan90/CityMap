import * as THREE from 'three';
import { toon } from './materials';
import { world } from './scene';
import { westCoast,eastCoast,terrainHeight } from './layout';
import './water';

const positions:number[]=[],colors:number[]=[],indices:number[]=[];
const rows=135,cols=110;
for(let row=0;row<=rows;row++){
 const z=-200+402*row/rows,left=westCoast(z),right=eastCoast(z);
 for(let col=0;col<=cols;col++){
  const x=left+(right-left)*col/cols,y=terrainHeight(x,z);positions.push(x,y,z);
  const coastDistance=Math.min(x-left,right-x);const color=new THREE.Color(coastDistance<10?0xdecba0:y>49?0x7d9273:y>23?0x5f9765:0x83b776);
  color.multiplyScalar(1+.035*Math.sin(x*.23+z*.17));colors.push(color.r,color.g,color.b);
 }
}
for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
 const a=row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);
}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
const terrain=new THREE.Mesh(geometry,toon(0xffffff,{vertexColors:true}));terrain.name='irregular-elevated-terrain';terrain.receiveShadow=true;world.add(terrain);
// Rock-faced coastal side walls expose the elevation difference at the shore.
for(const edge of [westCoast,eastCoast]){
 const verts:number[]=[];
 for(let z=-200;z<202;z+=2){const zz=Math.min(z+2,202),x=edge(z),xx=edge(zz),y=terrainHeight(x,z),yy=terrainHeight(xx,zz);verts.push(x,-.7,z,x,y,z,xx,yy,zz,x,-.7,z,xx,yy,zz,xx,-.7,zz);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();
 const m=new THREE.Mesh(g,toon(0xa39b83,{side:THREE.DoubleSide}));m.name='coastal-rock-wall';world.add(m);
}
// Reclaimed harbor quay joins the natural peninsula and supports the terminal.
const quay=new THREE.Mesh(new THREE.BoxGeometry(70,1.8,38),toon(0xb5b6a8));quay.position.set(155,.16,163);quay.receiveShadow=true;world.add(quay);
world.userData.terrain={minimum:1.06,maximum:Math.max(...positions.filter((_,i)=>i%3===1)),rows,cols};
