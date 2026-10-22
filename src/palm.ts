import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {toon} from './materials';
import {seededRandom,circularProfile,sweepProfile,leafRibbon,radialPlacements} from './proceduralGeometry';

export type PalmOptions={seed?:number;height?:number;bend?:number;fronds?:number};
const bark=toon(0xb68a58),scar=toon(0x987044),leafMaterials=[toon(0x88b93e,{side:THREE.DoubleSide}),toon(0x65a538,{side:THREE.DoubleSide}),toon(0x4d8c38,{side:THREE.DoubleSide})],nutMaterial=toon(0x805337);
function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,name:string){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=m.receiveShadow=true;return m;}
export function palmPath(height=7,bend=1,heading=0){const offset=new THREE.Vector3(Math.cos(heading),0,Math.sin(heading)).multiplyScalar(bend);return new THREE.CubicBezierCurve3(new THREE.Vector3(),new THREE.Vector3(0,height*.32,0),offset.clone().multiplyScalar(.48).setY(height*.7),offset.clone().setY(height));}

/** One complete feathered frond, with its origin at the attachment point. */
export function createPalmFrond(seed=41,length=3.5,rise=.65,drop=.8,layer=1){
 const random=seededRandom(seed),root=new THREE.Group();root.name='palm-frond';root.userData={part:'frond',seed,length};
 const path=new THREE.CubicBezierCurve3(new THREE.Vector3(),new THREE.Vector3(length*.28,rise,0),new THREE.Vector3(length*.7,rise*.6,0),new THREE.Vector3(length,-drop,(random()-.5)*.25));
 root.add(mesh(sweepProfile(path,circularProfile(5),9,u=>.055*(1-u)+.009),leafMaterials[layer],'frond-midrib'));
 const blades=new THREE.Group();blades.name='paired-leaflets';root.add(blades);
 for(let i=0;i<12;i++)for(const side of [-1,1]){
  const u=.10+i*.076+(side>0?.013:0),base=path.getPointAt(u),tangent=path.getTangentAt(u),across=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(0,1,0)).normalize().multiplyScalar(side);
  const reach=length*(.045+.18*Math.pow(Math.sin(Math.PI*u),.8))*(.9+random()*.2),sweep=length*.11;
  const end=base.clone().addScaledVector(across,reach).addScaledVector(tangent,sweep).add(new THREE.Vector3(0,-reach*.18,0));
  const p=new THREE.QuadraticBezierCurve3(base,base.clone().lerp(end,.52).add(new THREE.Vector3(0,reach*.12,0)),end);
  const blade=mesh(leafRibbon(p,length*.020*(.8+random()*.25),3),leafMaterials[layer],'palm-leaflet');blade.userData.attachment=base.toArray();blades.add(blade);
 }
 return root;
}

/** Editable assembly: trunk, leaf scars, crown/fronds, fruit remain separate groups. */
export function createPalm(options:PalmOptions={}){
 const {seed=41,height=7,bend=1,fronds=12}=options,random=seededRandom(seed),heading=random()*Math.PI*2,path=palmPath(height,bend,heading);
 const tree=new THREE.Group();tree.name='palm-tree';tree.userData={seed,height,bend,fronds};
 const trunk=new THREE.Group();trunk.name='palm-trunk';tree.add(trunk);
 const radius=(u:number)=>(.19+.17*Math.pow(1-u,.8))+.11*Math.exp(-u*24);
 trunk.add(mesh(sweepProfile(path,circularProfile(8),16,radius),bark,'continuous-tapered-trunk'));
 const scars=new THREE.Group();scars.name='palm-leaf-scars';trunk.add(scars);
 for(let i=1;i<=13;i++){
  const u=i/14,center=path.getPointAt(u),tangent=path.getTangentAt(u),ring=mesh(new THREE.TorusGeometry(radius(u)+.008,.016,3,8),scar,'trunk-leaf-scar');
  ring.position.copy(center);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tangent);scars.add(ring);
 }
 const crown=new THREE.Group();crown.name='palm-crown';crown.position.copy(path.getPointAt(1));crown.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),path.getTangentAt(1));tree.add(crown);
 const hub=mesh(new THREE.IcosahedronGeometry(.3,1),leafMaterials[1],'crown-heart');hub.scale.set(.85,1.7,.85);crown.add(hub);
 const count=Math.max(6,Math.min(24,Math.round(fronds)));
 const layers=[{count:Math.max(1,Math.round(count*.25)),length:2.3,rise:1.4,drop:-.35},{count:Math.max(1,Math.round(count*.42)),length:3.65,rise:.9,drop:.5},{count:0,length:3.25,rise:.2,drop:1.5}];layers[2].count=count-layers[0].count-layers[1].count;
 layers.forEach((layer,k)=>{const group=new THREE.Group();group.name=['young-fronds','spread-fronds','drooping-fronds'][k];crown.add(group);
  for(const [i,p] of radialPlacements(layer.count,random,k*.67,.22).entries()){
   const frond=createPalmFrond(seed+101+k*37+i,layer.length*p.scale,layer.rise*(.9+random()*.2),layer.drop,k);frond.rotation.y=p.angle;frond.position.y=.12-k*.16;group.add(frond);
  }
 });
 const fruit=new THREE.Group();fruit.name='palm-coconuts';crown.add(fruit);
 for(let i=0;i<3;i++){const a=i/3*Math.PI*2+.4,nut=mesh(new THREE.IcosahedronGeometry(.24+random()*.035,1),nutMaterial,'hanging-coconut');nut.scale.set(.9,1.2,.85);nut.position.set(Math.cos(a)*.35,-.3-random()*.14,Math.sin(a)*.35);fruit.add(nut);}
 return tree;
}

/** Bake vertex colors once per variant; every placed palm then shares this geometry. */
export function bakePalm(tree:THREE.Group){
 const parts:THREE.BufferGeometry[]=[];tree.updateWorldMatrix(true,true);const inverse=tree.matrixWorld.clone().invert();
 tree.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));const color=(o.material as THREE.MeshToonMaterial).color,colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.deleteAttribute('uv');parts.push(g);});
 const result=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());result.computeBoundingBox();result.computeBoundingSphere();return result;
}
export const palmVariantOptions:PalmOptions[]=[{seed:41,height:7,bend:1.0},{seed:127,height:7.5,bend:1.65},{seed:269,height:6.5,bend:.55}];
let samples:THREE.Group[]|null=null;
export function palmSamples(){return samples??=(palmVariantOptions.map(options=>createPalm(options)));}
