import {cutFacade} from './carvedGeometry';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import {toon} from './materials';
import {tunnelCurve,tunnelLength,tunnelFrame,tunnelPortals,TUNNEL} from './tunnelPlan';
const stone=toon(0xe0d6b9),trim=toon(0xb4b7ad),inside=toon(0x718593,{emissive:0x122333,emissiveIntensity:.16}),road=toon(0x526d87),line=toon(0xffefc7),dark=toon(0x394f65);
const lamp=toon(0xffe4ad,{emissive:0xffc879,emissiveIntensity:.3});lamp.userData.lightingRole='station-light';
function box(root:THREE.Group,name:string,w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
/** Open-bottom arch strip, extruded with end reveals; never a black face. */
export function createTunnelArch(depth=3.8,r=TUNNEL.innerRadius,thickness=.9){
 const s=new THREE.Shape(),spring=TUNNEL.spring;s.moveTo(-r-thickness,-.45);s.lineTo(-r-thickness,spring);s.absarc(0,spring,r+thickness,Math.PI,0,true);s.lineTo(r+thickness,-.45);s.lineTo(r,-.45);s.lineTo(r,spring);s.absarc(0,spring,r,0,Math.PI,false);s.lineTo(-r,-.45);s.closePath();
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:24});const mesh=new THREE.Mesh(g,stone);mesh.name='tunnel-arch-solid-open';mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
export function createTunnelPortal(){
 const root=new THREE.Group();root.name='tunnel-portal';root.add(createTunnelArch());
 const face=new THREE.Mesh(cutFacade(14.2,10.5,3.4,[{x:0,y:.4,w:12,h:8.6}]),stone);face.position.set(0,-1,.2);face.name='pierced-portal-spandrel';face.castShadow=face.receiveShadow=true;root.add(face);
 box(root,'independent-cornice',14.7,.4,4.2,0,9.65,1.7,trim);
 for(const side of [-1,1]){
  box(root,'grounded-abutment',1.3,3,3.4,side*6.25,1.05,1,stone);
  const wing=box(root,'wing-wall',.6,2.5,6,side*6.5,.8,-2,trim);wing.rotation.y=side*-.18;
  box(root,'wing-foundation',1.2,.7,6.4,side*6.5,-.6,-2,stone);
  box(root,'portal-light',.28,.22,1.3,side*4.85,3.3,.9,lamp);
  for(let z=-4;z<=2;z+=2){box(root,'amber-reflector',.09,.24,.14,side*5.65,.85,z,line);}
 }
 return root;
}
/** Sweep complete inner/outer arch rings, including the bottom edges and both end reveals. */
export function createTunnelLining(){
 const root=new THREE.Group();root.name='continuous-tunnel-lining';const shape:[number,number][]=[];
 const r=TUNNEL.innerRadius,h=TUNNEL.spring;
 shape.push([-r,-.35],[-r,h]);for(let j=1;j<=32;j++){const a=Math.PI-j*Math.PI/32;shape.push([Math.cos(a)*r,h+Math.sin(a)*r]);}shape.push([r,-.35]);
 shape.push([r+TUNNEL.thickness,-.35],[r+TUNNEL.thickness,h]);for(let j=1;j<=32;j++){const a=j*Math.PI/32;shape.push([Math.cos(a)*(r+TUNNEL.thickness),h+Math.sin(a)*(r+TUNNEL.thickness)]);}shape.push([-r-TUNNEL.thickness,-.35]);
 const verts:number[]=[],indices:number[]=[],n=150,m=shape.length;
 for(let i=0;i<=n;i++){const {p,right}=tunnelFrame((3.8+(tunnelLength-7.6)*i/n)/tunnelLength);for(const [x,y]of shape)verts.push(p.x+right.x*x,p.y+y,p.z+right.z*x);}
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=i*m+j,b=i*m+(j+1)%m,c=a+m,d=b+m;indices.push(a,c,b,b,c,d);}
 const cap=THREE.ShapeUtils.triangulateShape(shape.map(p=>new THREE.Vector2(...p)),[]);for(const [a,b,c]of cap){indices.push(c,b,a,n*m+a,n*m+b,n*m+c);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
 const shell=new THREE.Mesh(geo,inside);shell.name='swept-hollow-shell';shell.castShadow=shell.receiveShadow=true;root.add(shell);return root;
}
function ribbon(width:number,y:number,offset:number,mat:THREE.Material){const v:number[]=[],ix:number[]=[],n=180;for(let i=0;i<=n;i++){const f=tunnelFrame(i/n);for(const s of [-1,1])v.push(f.p.x+f.right.x*(offset+s*width/2),f.p.y+y,f.p.z+f.right.z*(offset+s*width/2));}for(let i=0;i<n;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;return m;}
/** Close a two-vertex strip into a slab, including underside and every boundary edge. */
function solidStrip(mesh:THREE.Mesh,depth:number){
 const g=mesh.geometry,p=g.attributes.position,count=p.count,v=Array.from(p.array as Float32Array),ix=Array.from(g.index!.array);
 for(let i=0;i<count;i++)v.push(p.getX(i),p.getY(i)-depth,p.getZ(i));
 for(let i=0;i<g.index!.count;i+=3)ix.push(g.index!.getX(i+2)+count,g.index!.getX(i+1)+count,g.index!.getX(i)+count);
 const edge=(a:number,b:number)=>ix.push(a,b+count,b,a,a+count,b+count);
 for(let i=0;i<count-2;i+=2){edge(i,i+2);edge(i+3,i+1);}edge(1,0);edge(count-2,count-1);
 g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return mesh;
}
export function createRoadTunnel(){
 const root=createTunnelLining();root.name='harbor-road-tunnel';
 const foundation=solidStrip(ribbon(10.4,-.1,0,stone),.5);foundation.name='continuous-road-foundation';root.add(foundation);
 const surface=ribbon(9,.025,0,road);surface.name='independent-underground-road';root.add(surface);
 for(const side of [-1,1]){root.add(solidStrip(ribbon(.6,.15,side*4.8,trim),.25),ribbon(.08,.032,side*4.25,line),ribbon(.12,.028,side*4.47,dark));}
 for(let s=2;s<tunnelLength-1;s+=5){const f=tunnelFrame(s/tunnelLength),dash=box(root,'tunnel-center-dash',.12,.018,2, f.p.x,f.p.y+.04,f.p.z,line);dash.rotation.y=Math.atan2(f.forward.x,f.forward.z);}
 for(let s=7;s<tunnelLength-6;s+=7){const f=tunnelFrame(s/tunnelLength),rib=createTunnelArch(.09,5.15,.18);rib.material=trim;rib.name='lining-construction-joint';rib.position.copy(f.p);rib.rotation.y=Math.atan2(f.forward.x,f.forward.z);root.add(rib);}
 for(let s=4;s<tunnelLength-3;s+=6){const f=tunnelFrame(s/tunnelLength);for(const side of [-1,1]){const m=box(root,'tunnel-wall-light',.16,.22,1.6,f.p.x+f.right.x*side*5.08,f.p.y+3.1,f.p.z+f.right.z*side*5.08,lamp);m.rotation.y=Math.atan2(f.forward.x,f.forward.z);}}
 for(const f of tunnelPortals){const portal=createTunnelPortal();portal.position.copy(f.p);portal.rotation.y=Math.atan2(f.into.x,f.into.z);
 const near=tunnelFrame(f.t===0?1/tunnelLength:1-1/tunnelLength).p,slope=near.y-f.p.y;
 portal.traverse(o=>{if(o instanceof THREE.Mesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+slope*p.getZ(i));o.geometry.computeVertexNormals();o.position.y+=slope*o.position.z;}});root.add(portal);
 // Close the excavated side faces all the way from the road foundation to the real slope.
 for(const side of [-1,1]){const shape=new THREE.Shape(),bottom=-.65;shape.moveTo(-6,bottom);shape.lineTo(3.6,bottom);
 for(let i=24;i>=0;i--){const z=-6+i*.4,q=f.p.clone().addScaledVector(f.into,z).addScaledVector(f.right,side*7.1);shape.lineTo(z,Math.max(bottom+.2,surfaceHeight(q.x,q.z)-f.p.y)+.12);}shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.5,bevelEnabled:false});const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const z=pos.getX(i),x=side*(7.1+pos.getZ(i));pos.setXYZ(i,x,pos.getY(i),z);}if(side===1){for(let i=0;i<pos.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,i),b=new THREE.Vector3().fromBufferAttribute(pos,i+1);pos.setXYZ(i,b.x,b.y,b.z);pos.setXYZ(i+1,a.x,a.y,a.z);}}geo.computeVertexNormals();
 const wall=new THREE.Mesh(geo,trim);wall.name='terrain-cut-retaining-wall';wall.position.copy(f.p);wall.rotation.y=portal.rotation.y;wall.castShadow=wall.receiveShadow=true;root.add(wall);}

 // Approach floor replaces removed heightfield triangles; thickness closes the underside.
 const approach=new THREE.Group();approach.position.copy(f.p);approach.rotation.y=portal.rotation.y;
 // Grade both the slab and asphalt to the actual existing surface at the outer edge.
 const makeApron=(width:number,mat:THREE.Material,offset:number)=>{const v:number[]=[],ix:number[]=[],n=12;
 for(let i=0;i<=n;i++){const z=-6+i*.5,t=(z+6)/6;
 for(const side of [-1,1]){const w=THREE.MathUtils.lerp(width,width<9?9:width,t),local=new THREE.Vector3(side*w/2,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),approach.rotation.y).add(f.p);
 const y=THREE.MathUtils.lerp(surfaceHeight(local.x,local.z),f.p.y,t);v.push(side*w/2,y-f.p.y+offset,z);}}
 for(let i=0;i<n;i++){const a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const mesh=new THREE.Mesh(g,mat);if(width>10)solidStrip(mesh,.5);mesh.name='graded-portal-apron';approach.add(mesh);};
 makeApron(14.2,stone,-.015);makeApron(f.t===0?5:9,road,.025);root.add(approach);
 }
 root.userData.alignment=tunnelCurve.getSpacedPoints(80).map(p=>p.toArray());return root;
}
