import * as THREE from 'three';
import {createFleetVehicle} from './fleetAssets';
import {createVehicle,batchVehicle} from './vehicles';
import {kit} from './referenceArchitecture';
export type PoliceCarKind='short'|'long';
export const POLICE_CAR_PARTS:Record<string,string>={'police-body':'车身与轮组','police-chassis':'底盘与车轴','police-equipment':'盾徽、后视镜与防撞架','police-lightbar':'红蓝灯桥及支架','long-wheelbase-van-shell':'长轴厢体、轮组与双后门','long-police-equipment':'长车底盘与警用配件','long-police-lightbar':'长车红蓝灯桥'};
export const POLICE_CAR_TITLES={short:'短款 · 巡逻轿车',long:'长款 · 警用勤务厢车'};
export function createPoliceBadge(){const root=new THREE.Group();root.name='police-shield-emblem';const k=kit(root),shape=new THREE.Shape([new THREE.Vector2(-.7,.65),new THREE.Vector2(.7,.65),new THREE.Vector2(.58,-.35),new THREE.Vector2(0,-.85),new THREE.Vector2(-.58,-.35)]);k.mesh(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.05,bevelThickness:.03,bevelSegments:1}),0xe2b95d);const star=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.19:.44;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i)star.lineTo(x,y);else star.moveTo(x,y);}star.closePath();k.mesh(new THREE.ExtrudeGeometry(star,{depth:.07,bevelEnabled:false}),0x244c74,0,0,.14);return root;}
export function createPoliceCar(kind:PoliceCarKind,optimized=false){
 if(kind==='short'){const car=createFleetVehicle('police',optimized);car.name='police-short-patrol';car.userData.policeVariant=kind;return car;}
 const root=new THREE.Group();root.name='police-long-duty-van';const shell=createVehicle('ambulance',0xf4f1df,{width:1.9,length:5.4});shell.name='long-wheelbase-van-shell';
 for(const o of [...shell.children]){if(['medical-cross','ambulance-stripe','emergency-light'].includes(o.name))shell.remove(o);else if(o instanceof THREE.Mesh&&o.name==='recessed-lamp'){const m=o.material as THREE.MeshToonMaterial;if([0xffe6a8,0xce5744].includes(m.color.getHex())){o.material=m.clone();o.material.emissive.copy(m.color);o.material.emissiveIntensity=.1;o.material.userData.lightingRole='vehicle-light';}}}root.add(shell);
 const equipment=new THREE.Group();equipment.name='long-police-equipment';root.add(equipment);const k=kit(equipment);
 k.box(1.6,.18,4.5,0x28485d,0,.35,0);
 for(const side of [-1,1]){k.box(.028,.22,4.5,0x28485d,side*.95,1.02,0);const shield=createPoliceBadge();shield.scale.setScalar(.25);shield.rotation.y=side*Math.PI/2;shield.position.set(side*.975,1.5,.4);equipment.add(shield);k.rod(new THREE.Vector3(side*.94,1.42,2.1),new THREE.Vector3(side*1.08,1.55,2.2),.025,0x28485d);k.box(.14,.2,.25,0x28485d,side*1.08,1.55,2.2);k.box(.09,.5,.1,0x28485d,side*.6,.58,2.77);}
 k.box(1.4,.09,.1,0x28485d,0,.83,2.77);k.rod(new THREE.Vector3(.6,2.25,-1.7),new THREE.Vector3(.6,2.94,-1.85),.018,0x28485d);
 const bar=createFleetVehicle('police').getObjectByName('police-lightbar')!.clone(true);bar.name='long-police-lightbar';bar.position.set(0,2.46,.8);root.add(bar);
 root.userData={policeVariant:kind,vehicleKind:'police',nominalSize:{width:2.3,length:5.65,height:2.96},forward:'+Z',contact:'wheel-bottom'};
 return optimized?batchVehicle(root):root;
}
export function policeSign(){const g=new THREE.Group();g.name='police-station-sign';const k=kit(g);k.box(7,.9,.2,0x244c74);
 // Geometric lettering keeps the sign legible without a font/texture dependency.
 const glyphs=['11110/10001/10001/11110/10000/10000/10000','01110/10001/10001/10001/10001/10001/01110','10000/10000/10000/10000/10000/10000/11111','11111/00100/00100/00100/00100/00100/11111','01111/10000/10000/10000/10000/10000/01111','11111/10000/10000/11110/10000/10000/11111'];
 for(const [letter,glyph]of glyphs.entries())for(const [row,line]of glyph.split('/').entries())for(let col=0;col<5;col++)if(line[col]==='1')k.box(.095,.095,.035,0xfff5d7,-2.2+letter*.78+col*.11,.33-row*.11,.13);
 return g;
}
