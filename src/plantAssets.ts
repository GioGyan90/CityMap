import * as THREE from 'three';
import {toon} from './materials';
import {seededRandom,sweepProfile,circularProfile,leafRibbon} from './proceduralGeometry';
import {bakePalm,palmSamples} from './palm';

export type TreeStyle='shade'|'slender'|'flowering'|'pine';
const bark=toon(0x91643d),foliage=toon(0xffffff,{vertexColors:true}),grassMaterial=toon(0x77a63f,{side:THREE.DoubleSide}),soil=toon(0x675033),stone=toon(0xe7d1a1),pink=toon(0xef9eb3,{side:THREE.DoubleSide}),gold=toon(0xf2c85b);
export const plantBatchMaterial=toon(0xffffff,{vertexColors:true,side:THREE.DoubleSide});
function part(g:THREE.BufferGeometry,m:THREE.Material,name:string){const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;return mesh;}
/** Continuous lobed crown: ring profiles, not intersecting primitive balls. */
export function crownGeometry(seed:number,radius:number,height:number,color:number,pine=false){
 const random=seededRandom(seed),phases=Array.from({length:4},()=>random()*Math.PI*2),vertices:number[]=[],colors:number[]=[],indices:number[]=[];
 const rings=pine?16:9,sides=14,base=new THREE.Color(color),light=new THREE.Color(pine?0x83be69:0xb4da78),dark=new THREE.Color(pine?0x376b48:0x538947);
 for(let i=0;i<=rings;i++)for(let j=0;j<sides;j++){
  const u=i/rings,a=j/sides*Math.PI*2;
  let r:number;
  if(pine){const layer=i%4;r=(1-u)*(.55+(layer===1?.65:layer===2?.42:.1));if(i===0)r=.12;if(i===rings)r=.008;}
  else r=Math.pow(Math.sin(Math.PI*u),.6)*(.93+.11*Math.sin(a*3+phases[0]+u*1.6)+.065*Math.cos(a*5+phases[1]-u*2));
  const y=height*(u+Math.sin(Math.PI*u)*(.026*Math.sin(a*3+phases[2]))),drift=Math.sin(Math.PI*u)*radius*.14;
  vertices.push(Math.cos(a)*radius*r+drift*Math.sin(phases[0]),y,Math.sin(a)*radius*r+drift*Math.cos(phases[1]));
  const c=base.clone().lerp(u>.55?light:dark,u>.55?(u-.55)*.38:(.55-u)*.4);c.multiplyScalar(.96+.055*Math.sin(a*4+phases[3]));colors.push(c.r,c.g,c.b);
 }
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d);}
 // Close the tiny pine tips as well as the zero-radius broadleaf poles.
 for(const end of [0,rings]){const center=vertices.length/3;vertices.push(0,end?height:0,0);colors.push(base.r,base.g,base.b);for(let j=0;j<sides;j++){const a=end*sides+j,b=end*sides+(j+1)%sides;indices.push(...(end?[center,b,a]:[center,a,b]));}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function branch(root:THREE.Group,from:THREE.Vector3,to:THREE.Vector3,radius:number,name='tree-branch'){
 const path=new THREE.QuadraticBezierCurve3(from,from.clone().lerp(to,.45).add(new THREE.Vector3(0,.3,0)),to);
 root.add(part(sweepProfile(path,circularProfile(6),4,u=>radius*(1-u*.8)),bark,name));
}
export function createTree(style:TreeStyle='shade',seed=51){
 const root=new THREE.Group();root.name='tree-'+style;root.userData={style,seed};const random=seededRandom(seed);
 const height=style==='slender'?7.4:style==='pine'?8:style==='flowering'?5.8:6.8,stem=style==='pine'?height*.5:style==='slender'?3.5:style==='flowering'?2.55:2.85;
 const tip=new THREE.Vector3((random()-.5)*.5,stem,(random()-.5)*.5),trunk=new THREE.Group();trunk.name='tree-trunk';root.add(trunk);
 const path=new THREE.CubicBezierCurve3(new THREE.Vector3(),new THREE.Vector3(0,stem*.25,0),tip.clone().multiplyScalar(.6),tip);
 trunk.add(part(sweepProfile(path,circularProfile(7),8,u=>(.13+.22*Math.pow(1-u,1.2))+.11*Math.exp(-u*20)),bark,'flared-tree-trunk'));
 const fork=new THREE.Group();fork.name='tree-branches';root.add(fork);const canopy=new THREE.Group();canopy.name='tree-crown';root.add(canopy);
 if(style==='pine'){
  const crown=part(crownGeometry(seed+31,2.2,height-1.1,0x5c9650,true),foliage,'sculpted-evergreen-crown');crown.position.y=1.1;canopy.add(crown);return root;
 }
 const specs=style==='slender'?[[0,0,1.35,3.0,4.4]]:style==='flowering'?[[-.95,.15,1.65,2.75,2.65],[1,.3,1.55,3.05,2.75],[.05,-.9,1.7,3.0,2.7]]:[[-1.05,.3,1.8,3.1,2.9],[1.1,.35,1.65,3.3,3.25],[.05,-1.0,1.9,3.35,3.45]];
 for(const [i,[x,z,r,y,h]] of specs.entries()){
  const color=style==='flowering'?[0x72ad49,0x91bb50,0x5e9c48][i%3]:style==='slender'?0x89c454:[0x86b94b,0x9bc34e,0x73a746][i%3];
  const crown=part(crownGeometry(seed+31+i*73,r,h,color),foliage,'sculpted-crown-cluster');crown.position.set(x+tip.x*.6,y,z+tip.z*.6);canopy.add(crown);
  branch(fork,new THREE.Vector3(tip.x*.65,stem*.76,tip.z*.65),new THREE.Vector3(crown.position.x,y+h*.38,crown.position.z),.14-i*.015);
  if(style==='slender')for(const side of [-1,1])branch(fork,tip.clone().multiplyScalar(.85),new THREE.Vector3(side*.65,4.2,.3),.085);

 }
 return root;
}
export function createShrub(seed=17){const root=new THREE.Group();root.name='shrub';const r=seededRandom(seed);
 for(let i=0;i<3;i++){const a=i*2.4,x=Math.cos(a)*.3,z=Math.sin(a)*.3,h=.75+r()*.45;branch(root,new THREE.Vector3(x,0,z),new THREE.Vector3(x,h*.6,z),.045,'shrub-stem');const crown=part(crownGeometry(seed+i*13,.55+r()*.25,h,0x77a63f),foliage,'shrub-foliage');crown.position.set(x,.15,z);root.add(crown);}return root;}
export function createGrassClump(seed=15){const root=new THREE.Group();root.name='grass-clump';const r=seededRandom(seed);
 for(let i=0;i<7;i++){const a=i*2.399+r()*.4,h=.4+r()*.75,reach=.25+r()*.4,path=new THREE.QuadraticBezierCurve3(new THREE.Vector3(),new THREE.Vector3(Math.cos(a)*reach*.4,h,Math.sin(a)*reach*.4),new THREE.Vector3(Math.cos(a)*reach,h*.6,Math.sin(a)*reach));root.add(part(leafRibbon(path,.06+r()*.055,4),grassMaterial,'curved-grass-blade'));}return root;}
export function createFlower(seed=11,heightScale=1){const root=new THREE.Group();root.name='five-petal-flower';const r=seededRandom(seed),h=(.35+r()*.3)*heightScale;
 branch(root,new THREE.Vector3(),new THREE.Vector3(.03,h,0),.018,'flower-stem');(root.children[0] as THREE.Mesh).material=grassMaterial;
 for(const side of [-1,1]){const leaf=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,h*.35,0),new THREE.Vector3(side*.1,h*.65,0),new THREE.Vector3(side*.18,h*.56,.03));root.add(part(leafRibbon(leaf,.035,2),grassMaterial,'flower-leaf'));}
 const weights=Array.from({length:5},()=>.7+r()*.6),sum=weights.reduce((a,b)=>a+b,0);let angle=r()*Math.PI*2;
 for(let i=0;i<5;i++){
  angle+=weights[i]/sum*Math.PI*2;const length=.18+r()*.13,width=.055+r()*.05,curl=.035+r()*.1,drop=(r()-.5)*.09,sideBend=(r()-.5)*.06;
  const direction=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),side=new THREE.Vector3(-direction.z,0,direction.x),base=new THREE.Vector3(.03,h,0);
  const control=base.clone().addScaledVector(direction,length*.5).addScaledVector(side,sideBend).add(new THREE.Vector3(0,curl,0)),tip=base.clone().addScaledVector(direction,length).addScaledVector(side,sideBend*.5).add(new THREE.Vector3(0,drop,0));
  const petal=part(leafRibbon(new THREE.QuadraticBezierCurve3(base,control,tip),width,5),pink,'flower-petal');petal.userData={length,width,angle,curl,drop};root.add(petal);
 }
 const center=part(new THREE.IcosahedronGeometry(.07,0),gold,'flower-center');center.position.set(.03,h+.025,0);root.add(center);return root;}
export function createPlanter(seed=71,radius=1){
 const root=new THREE.Group();root.name='planted-stone-bowl';const profile=[[0,0],[.72,0],[.92,.12],[1,.49],[.88,.51],[.78,.18],[0,.18]].map(([r,y])=>new THREE.Vector2(r*radius,y));
 const soilFloor=.18,soilTop=.385,rootY=soilTop-.015;
 root.add(part(new THREE.LatheGeometry(profile,16),stone,'hollow-planter-rim'));const earth=part(new THREE.CylinderGeometry(radius*.84,radius*.78,soilTop-soilFloor,16),soil,'planter-soil');earth.position.y=(soilTop+soilFloor)/2;root.add(earth);
 const shrub=createShrub(seed);shrub.scale.set(radius*.7,.7,radius*.7);shrub.position.y=rootY;root.add(shrub);
 const r=seededRandom(seed);for(let i=0;i<6;i++){const a=i*2.399,flower=createFlower(seed+i,1.5+r()*.7);flower.position.set(Math.cos(a)*radius*.6,rootY,Math.sin(a)*radius*.6);root.add(flower);}return root;
}
const baked=new WeakMap<THREE.Group,THREE.BufferGeometry>();
export function renderPlant(root:THREE.Group){if(!baked.has(root))baked.set(root,bakePalm(root));return part(baked.get(root)!,plantBatchMaterial,root.name);}
let trees:Map<string,THREE.Group>|null=null;
export function treeSamples(){if(!trees){trees=new Map();for(const style of ['shade','slender','flowering','pine'] as const)for(let i=0;i<3;i++)trees.set(style+'-'+i,createTree(style,51+i*137));}return trees;}
export const shrubSample=createShrub(),grassSample=createGrassClump(),flowerSample=createFlower(),planterSample=createPlanter();
export function createGardenCluster(){const root=new THREE.Group();root.name='layered-garden-cluster';const tree=createTree('shade',51);root.add(tree);
 for(let i=0;i<3;i++){const shrub=createShrub(31+i);shrub.position.set(-2+i*1.8,0,1.7+(i%2)*.7);root.add(shrub);const grass=createGrassClump(i+81);grass.position.set(-2+i*2,0,2.8);root.add(grass);}
 for(let i=0;i<5;i++){const flower=createFlower(i+17);flower.position.set(-2+i,0,3.15+(i%2)*.25);root.add(flower);}return root;}
/** Reuse the approved palm shape for landmark and promenade planting. */
export function landmarkPalm(seed=0,height=6){const tree=palmSamples()[Math.abs(seed)%3],m=renderPlant(tree);m.scale.setScalar(height/(tree.userData.height as number));return m;}
