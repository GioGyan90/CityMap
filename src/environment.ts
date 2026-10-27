import polygonClipping from 'polygon-clipping';
import {portalCuts} from './tunnelPlan';
import {attachCloudShadows} from './cloudShadows';
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
  if(coastDistance>=12)color.lerp(new THREE.Color(y>23?0x81b868:0x60b249),patch*.27);
  color.multiplyScalar(1+.045*Math.sin(x*.23+z*.17));colors.push(color.r,color.g,color.b);
 }
}
for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
 const a=row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);
}
// Clip the actual terrain triangles at each portal, preserving barycentric heights/colors.
const originalIndices=indices.splice(0);const cuts=portalCuts.map(p=>[[...p,p[0]]] as polygonClipping.Polygon);
for(let k=0;k<originalIndices.length;k+=3){
 const ids=originalIndices.slice(k,k+3),v=ids.map(i=>new THREE.Vector3().fromArray(positions,i*3));
 if(!v.some(p=>p.z< -145&&p.x< -25&&p.x> -80)){indices.push(...ids);continue;}
 const result=polygonClipping.difference([[...v.map(p=>[p.x,p.z] as [number,number]),[v[0].x,v[0].z]]],...cuts);
 for(const polygon of result){const rings=polygon.map(r=>r.slice(0,-1).map(p=>new THREE.Vector2(...p))),flat=rings.flat();
 const triangles=THREE.ShapeUtils.triangulateShape(rings[0],rings.slice(1)),base=positions.length/3;
 const [a,b,c]=v,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
 for(const p of flat){const u=((b.z-c.z)*(p.x-c.x)+(c.x-b.x)*(p.y-c.z))/den,w=((c.z-a.z)*(p.x-c.x)+(a.x-c.x)*(p.y-c.z))/den,q=1-u-w;
 positions.push(p.x,u*a.y+w*b.y+q*c.y,p.y);for(let channel=0;channel<3;channel++)colors.push(u*colors[ids[0]*3+channel]+w*colors[ids[1]*3+channel]+q*colors[ids[2]*3+channel]);}
 for(const tri of triangles){const [a,b,c]=tri.map(i=>flat[i]);if((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0)tri.reverse();indices.push(...tri.map(i=>base+i));}
 }
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
// Close the northern ridge at the actual heightfield vertices, not an open sheet.
{
 const verts:number[]=[],colors:number[]=[],idx:number[]=[],levels=5;
 for(let col=0;col<=cols;col++){
  const k=col*3,x=terrainPositions[k],top=terrainPositions[k+1],z=terrainPositions[k+2];
  for(let j=0;j<=levels;j++){const t=j/levels;verts.push(x,-.7+(top+.7)*t,z-Math.sin(Math.PI*t)*.55);
   const color=new THREE.Color(palette.rock).multiplyScalar(.79+.18*t+.035*Math.sin(x*.24+j*2));colors.push(color.r,color.g,color.b);}
 }
 for(let col=0;col<cols;col++)for(let j=0;j<levels;j++){const a=col*(levels+1)+j,b=a+levels+1;idx.push(a,a+1,b+1,a,b+1,b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
 const wall=new THREE.Mesh(g,toon(0xffffff,{vertexColors:true}));wall.name='northern-ridge-backwall';wall.castShadow=wall.receiveShadow=true;world.add(wall);
 // All coastal side walls terminate at the same sealed underside.
 const ring:THREE.Vector2[]=[];
 for(let row=0;row<=rows;row++){const k=(row*(cols+1)+cols)*3;ring.push(new THREE.Vector2(terrainPositions[k],terrainPositions[k+2]));}
 for(let row=rows-1;row>=0;row--){const k=row*(cols+1)*3;ring.push(new THREE.Vector2(terrainPositions[k],terrainPositions[k+2]));}
 const triangles=THREE.ShapeUtils.triangulateShape(ring,[]),bottom:number[]=[];
 for(const tri of triangles){const [a,b,c]=tri.map(i=>ring[i]);if((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)<0)tri.reverse();for(const i of tri)bottom.push(ring[i].x,-.7,ring[i].y);}
 const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(bottom,3));cap.computeVertexNormals();const underside=new THREE.Mesh(cap,toon(palette.rock));underside.name='sealed-terrain-underside';world.add(underside);
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
world.userData.visualStyle='coastal-resort-palette-c';

world.userData.roadSurface={mode:'shared-terrain-material',groundLayers:1,markings:'integrated'};

for(const surface of [beach,quay]){surface.material.onBeforeCompile=attachCloudShadows;surface.material.customProgramCacheKey=()=> 'coastal-ground-cloud-shadows-v1';}
