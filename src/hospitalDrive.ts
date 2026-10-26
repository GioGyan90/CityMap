import * as THREE from 'three';
import {kit} from './referenceArchitecture';
import {toon} from './materials';
import {surfaceHeight} from './terrainSurface';
import {nearestRoad} from './roadNetwork';
import {paintGroundPath} from './groundRoadMaterial';
import {parkingAccessPaths} from './parking';
import {world} from './scene';
import {specialBuildings} from './specialBuildings';
import {ZONES,terrainHeight} from './layout';
class QuarterTurn extends THREE.Curve<THREE.Vector3>{constructor(){super();}getPoint(t:number,target=new THREE.Vector3()){const a=t*Math.PI/2;return target.set(141.1+7*Math.cos(a),0,-11+7*Math.sin(a));}}
const join=nearestRoad(114,-4);
export const hospitalDriveCurve=new THREE.CurvePath<THREE.Vector3>();
hospitalDriveCurve.add(new THREE.LineCurve3(new THREE.Vector3(148.1,0,-27),new THREE.Vector3(148.1,0,-11)));
hospitalDriveCurve.add(new QuarterTurn());
hospitalDriveCurve.add(new THREE.LineCurve3(new THREE.Vector3(141.1,0,-4),new THREE.Vector3(join.x,0,join.z)));
export const HOSPITAL_DRIVE_WIDTH=6;
const base=terrainHeight(ZONES.hospital.x,ZONES.hospital.z);
export function hospitalDriveWidth(t:number){return THREE.MathUtils.lerp(9.2,6,THREE.MathUtils.smoothstep(t*hospitalDriveCurve.getLength(),0,11));}
export function hospitalDriveHeight(t:number){const p=hospitalDriveCurve.getPointAt(t),v=hospitalDriveCurve.getTangentAt(t),n=new THREE.Vector3(-v.z,0,v.x).normalize(),half=hospitalDriveWidth(t)/2;
 const ground=Math.max(...Array.from({length:13},(_,i)=>-half+2*half*i/12).map(s=>surfaceHeight(p.x+n.x*s,p.z+n.z*s))),outdoor=ground+.045,entry=base+.215;
 const floor=THREE.MathUtils.lerp(entry,outdoor,THREE.MathUtils.smoothstep(t*hospitalDriveCurve.getLength(),0,12));return THREE.MathUtils.lerp(surfaceHeight(p.x,p.z)+.025,floor,THREE.MathUtils.smoothstep((1-t)*hospitalDriveCurve.getLength(),0,8));
}
export function hospitalDrivePoint(t:number,across:number){const p=hospitalDriveCurve.getPointAt(t),v=hospitalDriveCurve.getTangentAt(t),n=new THREE.Vector3(-v.z,0,v.x).normalize();p.addScaledVector(n,across);const ground=surfaceHeight(p.x,p.z)+.025,blend=THREE.MathUtils.smoothstep((1-t)*hospitalDriveCurve.getLength(),0,8);p.y=THREE.MathUtils.lerp(ground,Math.max(ground,hospitalDriveHeight(t)),blend);return p;}
export function hospitalExitPose(t:number){
 // Outbound lane is the same side as the parked ambulance and the existing city circulation.
 const p=hospitalDriveCurve.getPointAt(t),v=hospitalDriveCurve.getTangentAt(t),n=new THREE.Vector3(-v.z,0,v.x).normalize();p.addScaledVector(n,1.5);p.y=hospitalDrivePoint(t,1.5).y;return {position:p,heading:Math.atan2(v.x,v.z)};
}
export function buildHospitalDrive(){
 const root=new THREE.Group();root.name='hospital-vehicle-access';world.add(root);const k=kit(root),steps=Math.ceil(hospitalDriveCurve.getLength()/.45),top:number[]=[],indices:number[]=[],walls:number[]=[];
 const edges:THREE.Vector3[][]=[];
 const across=12;
 for(let i=0;i<=steps;i++){const t=i/steps,half=hospitalDriveWidth(t)/2;for(let j=0;j<=across;j++)top.push(...hospitalDrivePoint(t,-half+2*half*j/across).toArray());edges.push([hospitalDrivePoint(t,-half),hospitalDrivePoint(t,half)]);if(i<steps)for(let j=0;j<across;j++){const a=i*(across+1)+j,b=a+across+1;indices.push(a,a+1,b,a+1,b+1,b);}}

 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(top,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,toon(0x526d87));mesh.name='continuous-hospital-drive-surface';mesh.receiveShadow=true;root.add(mesh);
 for(let i=1;i<edges.length;i++)for(const side of [0,1]){const a=edges[i-1][side],b=edges[i][side],low=(p:THREE.Vector3)=>new THREE.Vector3(p.x,surfaceHeight(p.x,p.z)-.08,p.z);for(const p of [a,low(a),b,b,low(a),low(b)])walls.push(...p.toArray());}
 const skirt=new THREE.BufferGeometry();skirt.setAttribute('position',new THREE.Float32BufferAttribute(walls,3));skirt.computeVertexNormals();const foundation=new THREE.Mesh(skirt,toon(0xb7b09b,{side:THREE.DoubleSide}));foundation.name='grounded-hospital-drive-edges';root.add(foundation);
 const points=hospitalDriveCurve.getSpacedPoints(Math.ceil(hospitalDriveCurve.getLength()/1.2)).map(p=>[p.x,p.z] as [number,number]);paintGroundPath(points,8.4,'walk');paintGroundPath(points,6,'asphalt');for(let i=1;i<points.length;i++)parkingAccessPaths.push({points:[points[i-1],points[i]],width:8.4});
 // Continuous narrow centre dashes follow the curve; no overlapping rectangular road panels.
 for(let d=20;d<hospitalDriveCurve.getLength()-4;d+=5){const t=d/hospitalDriveCurve.getLength(),p=hospitalDriveCurve.getPointAt(t),v=hospitalDriveCurve.getTangentAt(t),mark=k.box(.13,.012,1.6,0xffefc7,p.x,hospitalDriveHeight(t)+.012,p.z);mark.rotation.y=Math.atan2(v.x,v.z);}
 const sign=k.box(2.3,1.05,.12,0x367f92,join.x+7, surfaceHeight(join.x+7,join.z+5)+2,join.z+5);sign.name='emergency-drive-wayfinding';
 for(const x of [-.8,.8])k.box(.1,1.6,.1,0x667c7d,sign.position.x+x,sign.position.y-1.3,sign.position.z);
 k.box(.16,.65,.04,0xfff0dc,sign.position.x,sign.position.y,sign.position.z+.08);k.box(.65,.16,.05,0xfff0dc,sign.position.x,sign.position.y,sign.position.z+.09);
 root.userData={width:6,turnRadius:7,publicJoin:[join.x,join.z],points:hospitalDriveCurve.getSpacedPoints(120).map((p,i)=>[p.x,hospitalDriveHeight(i/120),p.z])};
 const entry=specialBuildings.find(s=>s.id==='hospital')!;entry.group.attach(root);
 // Landmark scale must not turn a normal ambulance into a five-metre-wide vehicle.
 const van=world.getObjectByName('hospital-ambulance');if(van){const scale=van.getWorldScale(new THREE.Vector3());van.scale.divide(scale);van.position.y=.67;van.userData.worldSizeNormalized=true;}
 world.userData.hospitalDrive=root.userData;
}
