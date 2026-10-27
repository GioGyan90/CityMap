import * as THREE from 'three';

// Coordinates: the nose points along +Z; dimensions are stylised for the map.
export const AIRLINER_PARTS: Record<string,string> = {
 fuselage:'机身与驾驶舱', wings:'主翼', engines:'双发动机', tail:'尾翼', details:'舷窗与涂装'
};
export function createAirliner() {
 const root=new THREE.Group(); root.name='civil-airliner';
 const white=new THREE.MeshStandardMaterial({color:0xf8f4e9,roughness:.7});
 const blue=new THREE.MeshStandardMaterial({color:0x18549b,roughness:.65});
 const dark=new THREE.MeshStandardMaterial({color:0x243c59,roughness:.7});
 const coral=new THREE.MeshStandardMaterial({color:0xe86b69,roughness:.7});
 const part=(name:string)=>{const g=new THREE.Group();g.name=name;root.add(g);return g;};
 const add=(g:THREE.Group,geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
 const body=part('fuselage');const hull=add(body,new THREE.CapsuleGeometry(2.1,14,6,12),white,0,0,0);hull.rotation.x=Math.PI/2;
 const cockpit=add(body,new THREE.SphereGeometry(1,12,8),dark,0,1.85,7.35);cockpit.scale.set(1.55,.52,1.3);
 const wings=part('wings');
 // Extruded swept planforms: real thickness, with mirrored, connected roots.
 const wing=(points:[number,number][],group:THREE.Group,material:THREE.Material,y:number)=>{const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const geom=new THREE.ExtrudeGeometry(s,{depth:.4,bevelEnabled:false});geom.rotateX(Math.PI/2);const m=add(group,geom,material,0,y,0);return m;};
 for(const side of [-1,1]) wing([[0,2],[side*3,1.2],[side*14,-4.2],[side*14,-5.3],[side*3,-3],[0,-3]],wings,white,0);
 const engines=part('engines');for(const side of [-1,1]){const engine=add(engines,new THREE.CylinderGeometry(1,1,3.8,12),white,side*6,-1.3,-1.6);engine.rotation.x=Math.PI/2;const inlet=add(engines,new THREE.CircleGeometry(.78,12),dark,side*6,-1.3,.31);inlet.rotation.y=0;}
 const tail=part('tail');for(const side of [-1,1])wing([[0,-6],[side*5,-8.4],[side*5,-9],[0,-8.6]],tail,white,.7);
 const finShape=new THREE.Shape();finShape.moveTo(9,0);finShape.lineTo(8,4.1);finShape.lineTo(6.8,4.1);finShape.lineTo(5.5,0);finShape.closePath();const finGeo=new THREE.ExtrudeGeometry(finShape,{depth:.45,bevelEnabled:false});finGeo.rotateY(Math.PI/2);add(tail,finGeo,blue,.22,.7,0);
 const details=part('details');for(const side of [-1,1])for(let z=-5;z<=5;z+=1.2){const w=add(details,new THREE.SphereGeometry(.19,8,6),dark,side*2.03,.35,z);w.scale.set(.35,1,1.3);}const stripe=add(details,new THREE.BoxGeometry(3.3,.22,3),coral,0,.85,-7);stripe.rotation.x=.1;
 return root;
}
// Each pass occupies 36 simulated minutes. The aircraft is outside the map at both endpoints.
export function airlinerPass(minutes:number) {
 for(const start of [9*60,15*60]){const p=(minutes-start)/36;if(p>=0&&p<1)return p;}
 return null;
}
