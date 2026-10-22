import {RECLAIMED_FILL_TOP} from './harborPlan';
import {terrainRows,terrainCols,terrainPositions,surfaceHeight} from './terrainSurface';
import {createGroundMaterial} from './groundRoadMaterial';
import {COAST_PALETTE as palette,beachExtension} from './visualStyle';
import * as THREE from 'three';
import { toon } from './materials';
import { world } from './scene';
import { westCoast,eastCoast,terrainHeight } from './layout';
import './water';

const positions:number[]=[],colors:number[]=[],indices:number[]=[];
const rows=terrainRows,cols=terrainCols;
for(let row=0;row<=rows;row++){
 const z=-200+402*row/rows,left=westCoast(z),right=eastCoast(z);
 for(let col=0;col<=cols;col++){
  const index=(row*(cols+1)+col)*3,x=terrainPositions[index],y=terrainPositions[index+1];positions.push(x,y,z);
  const coastDistance=Math.min(x-left,right-x),patch=(Math.sin(x*.043+z*.017)+Math.cos(z*.071-x*.025))*.25+.5;
  const color=new THREE.Color(coastDistance<12?palette.sand:y>49?palette.ridge:y>23?palette.hill:palette.grass);
  if(coastDistance>=12)color.lerp(new THREE.Color(y>23?0x90bd78:0x70b950),patch*.27);
  color.multiplyScalar(1+.045*Math.sin(x*.23+z*.17));colors.push(color.r,color.g,color.b);
 }
}
for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
 const a=row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);
}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
const terrain=new THREE.Mesh(geometry,createGroundMaterial());terrain.name='irregular-elevated-terrain';terrain.receiveShadow=true;world.add(terrain);
// Rock-faced coastal side walls expose the elevation difference at the shore.
for(const edge of [westCoast,eastCoast]){
 const verts:number[]=[];
 for(let z=-200;z<202;z+=2){const zz=Math.min(z+2,202),x=edge(z),xx=edge(zz),y=surfaceHeight(x,z),yy=surfaceHeight(xx,zz);verts.push(x,-.7,z,x,y,z,xx,yy,zz,x,-.7,z,xx,yy,zz,xx,-.7,zz);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();
 const m=new THREE.Mesh(g,toon(palette.rock,{side:THREE.DoubleSide}));m.name='coastal-rock-wall';world.add(m);
}
// Reclaimed harbor quay joins the natural peninsula and supports the terminal.
const quay=new THREE.Mesh(new THREE.BoxGeometry(70,1.8,38),toon(palette.quay));quay.name='reclaimed-quay-fill';quay.position.set(155,RECLAIMED_FILL_TOP-.9,163);quay.receiveShadow=true;world.add(quay);
world.userData.terrain={minimum:1.06,maximum:Math.max(...positions.filter((_,i)=>i%3===1)),rows,cols};

// Gently sloping gold foreshore. This leaves roads and landmark sites in place.
const beachPositions:number[]=[],beachColors:number[]=[],beachIndices:number[]=[];
const beachRows=201,beachCols=8;
for(let row=0;row<=beachRows;row++){
 const z=-200+402*row/beachRows,edge=westCoast(z),width=beachExtension(z);
 for(let col=0;col<=beachCols;col++){
  const t=col/beachCols,x=edge-width*(1-t)+.35*t,y=-.24+1.305*t;beachPositions.push(x,y,z);
  const color=new THREE.Color(palette.wetSand).lerp(new THREE.Color(palette.sand),Math.min(1,t*2));color.multiplyScalar(1+.035*Math.sin(z*.51+x*.6));beachColors.push(color.r,color.g,color.b);
 }
}
for(let row=0;row<beachRows;row++)for(let col=0;col<beachCols;col++){const a=row*(beachCols+1)+col,b=a+beachCols+1;beachIndices.push(a,b,a+1,a+1,b,b+1);}
const beachGeo=new THREE.BufferGeometry();beachGeo.setAttribute('position',new THREE.Float32BufferAttribute(beachPositions,3));beachGeo.setAttribute('color',new THREE.Float32BufferAttribute(beachColors,3));beachGeo.setIndex(beachIndices);beachGeo.computeVertexNormals();
const beach=new THREE.Mesh(beachGeo,toon(0xffffff,{vertexColors:true}));beach.name='sunlit-golden-foreshore';beach.receiveShadow=true;world.add(beach);
world.userData.visualStyle='terraced-sunny-coast-v2';

world.userData.roadSurface={mode:'shared-terrain-material',groundLayers:1,markings:'integrated'};
