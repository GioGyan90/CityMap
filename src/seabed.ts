import * as THREE from 'three';
import {westCoast,eastCoast} from './layout';
import {beachExtension} from './visualStyle';
import {toon} from './materials';
/** Signed distance to the same shoreline used by the ocean, including the working quay. */
export function oceanCoastDistance(x:number,z:number){
 const zz=THREE.MathUtils.clamp(z,-200,202),dx=Math.max(westCoast(zz)-beachExtension(z)-x,x-eastCoast(zz)),dz=Math.max(-200-z,z-202);
 const island=Math.hypot(Math.max(dx,0),Math.max(dz,0))+Math.min(Math.max(dx,dz),0);
 const qx=Math.max(120-x,x-190),qz=Math.max(144-z,z-182),quay=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0);
 return Math.min(island,quay);
}
export function continentalDepth(x:number,z:number,distance=oceanCoastDistance(x,z)){
 const d=Math.max(0,distance),width=40+9*Math.sin(z*.027)+6*Math.sin(x*.019+z*.014),shelf=THREE.MathUtils.smoothstep(d,0,width),drop=THREE.MathUtils.smoothstep(d,width,width+45);
 return .85+5.5*shelf+25*drop;
}
// Shared formula: ocean transmission follows the actual seabed profile.
export const continentalDepthGLSL=`float continentalDepth(vec2 p,float distanceToCoast){float d=max(0.,distanceToCoast);float width=40.+9.*sin(p.y*.027)+6.*sin(p.x*.019+p.y*.014);return .85+5.5*smoothstep(0.,width,d)+25.*smoothstep(width,width+45.,d);}`;
export function createContinentalShelf(){
 const geometry=new THREE.PlaneGeometry(760,680,152,136);geometry.rotateX(-Math.PI/2);geometry.translate(70,0,-5);
 const p=geometry.attributes.position,colors:number[]=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),depth=continentalDepth(x,z);p.setY(i,-.26-depth);
  const c=new THREE.Color(0xd8d2ac).lerp(new THREE.Color(0x789f93),THREE.MathUtils.smoothstep(depth,1,10));
  c.multiplyScalar(.95+.035*Math.sin(x*.28+Math.sin(z*.19)*2)+.025*Math.cos(z*.36-x*.15));colors.push(c.r,c.g,c.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,toon(0xffffff,{vertexColors:true}));mesh.name='submerged-continental-shelf';mesh.receiveShadow=true;mesh.userData={nearDepth:.85,shelfWidth:[25,55],outerDepth:31.35};return mesh;
}
