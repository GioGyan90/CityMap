import * as THREE from 'three';
import {terrainHeight,ZONES} from './layout';
export interface HillApproach {id:string;width:number;curve:THREE.CatmullRomCurve3;points:THREE.Vector3[];maxGrade:number;junction?:{x:number;z:number;y:number;dx:number;dz:number;slope:number}}
function nearest(curve:THREE.Curve<THREE.Vector3>,x:number,z:number){let t=0,d=Infinity;for(let i=0;i<=1500;i++){const p=curve.getPoint(i/1500),dd=(p.x-x)**2+(p.z-z)**2;if(dd<d){d=dd;t=i/1500;}}return curve.getPoint(t);}
function approach(id:string,width:number,plan:number[][],startY:number,endY:number,initialSlope?:number):HillApproach{
 const planar=new THREE.CatmullRomCurve3(plan.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');planar.arcLengthDivisions=2000;planar.updateArcLengths();const length=planar.getLength(),n=Math.ceil(length/.7),points:THREE.Vector3[]=[];
 const ease=6,landing=id==='villa'?8:5,run=length-landing,integral=(station:number)=>{const s=Math.max(0,station-landing);return s<ease?s*s/(2*ease):s>run-ease?run-ease-(run-s)**2/(2*ease):s-ease/2;};
 for(let i=0;i<=n;i++){const s=length*i/n,p=planar.getPointAt(i/n);const u=i/n;p.y=initialSlope===undefined?startY+(endY-startY)*integral(s)/(run-ease):startY+(endY-startY)*(3*u*u-2*u*u*u)+initialSlope*length*(u*u*u-2*u*u+u);points.push(p);}
 const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');curve.arcLengthDivisions=2000;curve.updateArcLengths();let maxGrade=0;for(let i=1;i<points.length;i++)maxGrade=Math.max(maxGrade,Math.abs(points[i].y-points[i-1].y)/Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));return {id,width,curve,points,maxGrade};
}
export function createHillApproaches(eastRoad:THREE.Curve<THREE.Vector3>){
 const join=nearest(eastRoad,235,-13),villa=ZONES.villa,lighthouse=ZONES.lighthouse;
 const drive=approach('villa',3.6,[[join.x,join.z],[242,join.z],[245,-33],[259,-62],[275,-58],[280,-35],[264,-22],[251,-7],[254,7],[270,12],[268,34],[266,40],[villa.x,40],[villa.x,34]],join.y-.2+.025,terrainHeight(villa.x,villa.z)+.1);
 const branch=nearest(drive.curve,268,34);let index=0;for(let i=1;i<drive.points.length;i++)if(Math.hypot(drive.points[i].x-branch.x,drive.points[i].z-branch.z)<Math.hypot(drive.points[index].x-branch.x,drive.points[index].z-branch.z))index=i;
 const tangent=drive.points[Math.min(index+1,drive.points.length-1)].clone().sub(drive.points[Math.max(0,index-1)]),horizontal=Math.hypot(tangent.x,tangent.z),dx=tangent.x/horizontal,dz=tangent.z/horizontal,slope=tangent.y/horizontal,heading=new THREE.Vector2(266-branch.x,42-branch.z).normalize();
 const walk=approach('lighthouse',2.4,[[branch.x,branch.z],[266,42],[261,53],[258,61],[254,61],[254,52.5]],branch.y,terrainHeight(lighthouse.x,lighthouse.z)+.1,slope*(dx*heading.x+dz*heading.y));
 walk.junction=drive.junction={x:branch.x,z:branch.z,y:branch.y,dx,dz,slope};
 return [drive,walk];
}
