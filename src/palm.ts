import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {toon} from './materials';
import {seededRandom,circularProfile,sweepProfile,cutLeafGeometry} from './proceduralGeometry';

export type PalmOptions={seed?:number;height?:number;bend?:number;fronds?:number;heading?:number;trunkScale?:number};
const barkMaterials=[0x974d2d,0x854126,0xa35a34,0x904329].map(c=>toon(c)),leafMaterials=[toon(0xa4cd58,{side:THREE.DoubleSide}),toon(0x8fbe46,{side:THREE.DoubleSide}),toon(0x79a83c,{side:THREE.DoubleSide})],nutMaterial=toon(0xbbcc44);
function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,name:string){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=m.receiveShadow=true;return m;}
export function palmPath(height=7,bend=1,heading=0){const offset=new THREE.Vector3(Math.cos(heading),0,Math.sin(heading)).multiplyScalar(bend);return new THREE.CubicBezierCurve3(new THREE.Vector3(),new THREE.Vector3(0,height*.32,0),offset.clone().multiplyScalar(.48).setY(height*.7),offset.clone().setY(height));}

/** A broad leaf with real subtracted edge notches, curved after cutting. */
export function createPalmFrond(seed=41,length=3.5,rise=.65,drop=1.6,layer=1){
 const random=seededRandom(seed),root=new THREE.Group();root.name='palm-frond';root.userData={part:'frond',seed,length};
 const path=new THREE.CubicBezierCurve3(new THREE.Vector3(),new THREE.Vector3(length*.20,rise,0),new THREE.Vector3(length*.73,rise*.45,(random()-.5)*.6),new THREE.Vector3(length,-drop,(random()-.5)*.7));
 const width=length*(.17+random()*.075),blade=cutLeafGeometry(path,length,width,random);
 root.add(mesh(blade,leafMaterials[layer],'notched-leaf-blade'));
 root.add(mesh(sweepProfile(path,circularProfile(5),12,u=>.046*(1-u)+.006),leafMaterials[Math.max(0,layer-1)],'frond-midrib'));
 root.userData.width=width;return root;
}

class CurveSlice extends THREE.Curve<THREE.Vector3>{
 constructor(private path:THREE.Curve<THREE.Vector3>,private from:number,private to:number){super();}
 getPoint(t:number,target=new THREE.Vector3()){return target.copy(this.path.getPointAt(this.from+(this.to-this.from)*t));}
}
export function createPalmTrunk(path:THREE.Curve<THREE.Vector3>,seed=41,radiusScale=1){
 const random=seededRandom(seed+1709),trunk=new THREE.Group();trunk.name='palm-trunk';
 const count=9,weights=Array.from({length:count},()=>.65+random()*.9),total=weights.reduce((a,b)=>a+b,0),reductions=Array.from({length:count-1},()=>.7+random()*1.2),reductionTotal=reductions.reduce((a,b)=>a+b,0);let start=0,nominal=.63;
 for(let i=0;i<count;i++){
  const end=start+weights[i]/total;
  const profile=circularProfile(8).map(p=>p.multiplyScalar(.94+random()*.12).rotateAround(new THREE.Vector2(),(i%2?.1:-.08)));
  const profileMaximum=Math.max(...profile.map(p=>p.length()));profile.forEach(p=>p.divideScalar(profileMaximum));
  const factors=[1.2,1.08,1.15,1.09,.96,.91],segment=sweepProfile(new CurveSlice(path,Math.max(0,start-.006),Math.min(1,end)),profile,5,t=>{const at=t*5,j=Math.min(4,Math.floor(at));return nominal*radiusScale*THREE.MathUtils.lerp(factors[j],factors[j+1],at-j);});
  const barrel=mesh(segment,barkMaterials[i%4],'palm-trunk-barrel');barrel.userData={from:start,to:end,radius:nominal*radiusScale};trunk.add(barrel);start=end;if(i<count-1)nominal-=.32*reductions[i]/reductionTotal;
 }
 return trunk;
}

/** Editable assembly: individual barrel segments, notched leaves, crown and fruit. */
export function createPalm(options:PalmOptions={}){
 const {seed=41,height=7,bend=1,fronds=9}=options,random=seededRandom(seed),randomHeading=random()*Math.PI*2,heading=options.heading??randomHeading,path=palmPath(height,bend,heading);
 const tree=new THREE.Group();tree.name='palm-tree';tree.userData={seed,height,bend,fronds};
 const trunk=createPalmTrunk(path,seed,options.trunkScale??1);tree.add(trunk);
 const crown=new THREE.Group();crown.name='palm-crown';crown.position.copy(path.getPointAt(1));crown.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),path.getTangentAt(1));tree.add(crown);
 const hub=mesh(new THREE.IcosahedronGeometry(.3,1),leafMaterials[1],'crown-heart');hub.scale.set(.85,1.7,.85);crown.add(hub);
 const count=Math.max(6,Math.min(24,Math.round(fronds)));
 const layers=[{count:Math.max(1,Math.round(count*.25)),length:2.4,rise:1.8,drop:.0},{count:Math.max(1,Math.round(count*.42)),length:3.5,rise:1.2,drop:1.25},{count:0,length:2.9,rise:.55,drop:2.4}];layers[2].count=count-layers[0].count-layers[1].count;
 layers.forEach((layer,k)=>{const group=new THREE.Group();group.name=['young-fronds','spread-fronds','drooping-fronds'][k];crown.add(group);
  // Variable angular gaps retain coverage while breaking the regular pinwheel.
  const gaps=Array.from({length:layer.count},()=>.55+random()*1.2),sum=gaps.reduce((a,b)=>a+b,0);let angle=random()*Math.PI*2;
  for(let i=0;i<layer.count;i++){
   angle+=gaps[i]/sum*Math.PI*2;
   // Leave a small, irregular opening over the fruit cluster, as in the reference.
   let placed=angle;const delta=Math.atan2(Math.sin(angle+.9),Math.cos(angle+.9));if(k>0&&Math.abs(delta)<.5)placed=-.9+Math.sign(delta||1)*(.5+random()*.17);
   const scale=.72+random()*.58,frond=createPalmFrond(seed+101+k*37+i,layer.length*scale,layer.rise*(.65+random()*.7),layer.drop*(.7+random()*.6),k);
   frond.rotation.set((random()-.5)*.15,placed,(random()-.5)*.18);frond.position.y=.16-k*.16+(random()-.5)*.12;group.add(frond);
  }
 });
 const fruit=new THREE.Group();fruit.name='palm-coconuts';crown.add(fruit);
 for(let i=0;i<3;i++){const a=[.1,1.6,.85][i],distance=i===2?.85:.7,nut=mesh(new THREE.IcosahedronGeometry(.34+random()*.07,1),nutMaterial,'hanging-coconut');nut.scale.set(.9,1.15,.85);nut.position.set(Math.cos(a)*distance,(i===2?-.73:-.43)-random()*.10,Math.sin(a)*distance);fruit.add(nut);}
 return tree;
}

/** Bake vertex colors once per variant; every placed palm then shares this geometry. */
export function bakePalm(tree:THREE.Group){
 const parts:THREE.BufferGeometry[]=[];tree.updateWorldMatrix(true,true);const inverse=tree.matrixWorld.clone().invert();
 tree.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));const color=(o.material as THREE.MeshToonMaterial).color,colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.deleteAttribute('uv');parts.push(g);});
 const result=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());result.computeBoundingBox();result.computeBoundingSphere();return result;
}
/** Three separately editable trees on a shared sand mound. */
export function createPalmCluster(){
 const root=new THREE.Group();root.name='palm-three-tree-landscape';root.userData.assetKind='landscape';
 const profile=[[0,0],[1,0],[1.04,.08],[1.02,.22],[.94,.5],[.74,.85],[0,.85]].map(([r,y])=>new THREE.Vector2(r,y));
 const sand=mesh(new THREE.LatheGeometry(profile,32),toon(0xe9bd70),'palm-cluster-sand');sand.scale.set(4.5,1,3.7);root.add(sand);
 const specs=[
  {name:'cluster-palm-tall',seed:41,height:7.2,bend:1.7,heading:Math.PI*.9,trunkScale:1,fronds:9,x:-1.55,z:-.65,crown:1},
  {name:'cluster-palm-medium',seed:127,height:5.6,bend:1.45,heading:-.16,trunkScale:.88,fronds:8,x:1.55,z:-.2,crown:.87},
  {name:'cluster-palm-small',seed:269,height:3.9,bend:.9,heading:Math.PI*.58,trunkScale:.72,fronds:7,x:.15,z:1.35,crown:.7}
 ];
 for(const spec of specs){const tree=createPalm(spec);tree.name=spec.name;tree.position.set(spec.x,.85,spec.z);tree.getObjectByName('palm-crown')!.scale.setScalar(spec.crown);root.add(tree);}
 return root;
}

export const palmVariantOptions:PalmOptions[]=[{seed:41,height:6.4,bend:1.35},{seed:127,height:7,bend:1.9},{seed:269,height:5.6,bend:.8}];
let samples:THREE.Group[]|null=null;
export function palmSamples(){return samples??=(palmVariantOptions.map(options=>createPalm(options)));}
