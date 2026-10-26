import * as THREE from 'three';
import {terrainHeight,ZONES} from './layout';
export interface HillApproach {id:string;width:number;curve:THREE.CatmullRomCurve3;points:THREE.Vector3[];maxGrade:number}
function nearest(curve:THREE.Curve<THREE.Vector3>,x:number,z:number){let t=0,d=Infinity;for(let i=0;i<=1500;i++){const p=curve.getPoint(i/1500),dd=(p.x-x)**2+(p.z-z)**2;if(dd<d){d=dd;t=i/1500;}}return curve.getPoint(t);}
function approach(id:string,width:number,plan:number[][],startY:number,endY:number):HillApproach{
 const planar=new THREE.CatmullRomCurve3(plan.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');planar.arcLengthDivisions=2000;planar.updateArcLengths();const length=planar.getLength(),n=Math.ceil(length/.7),points:THREE.Vector3[]=[];
 const ease=6,landing=id==='villa'?8:0,run=length-landing,integral=(station:number)=>{const s=Math.max(0,station-landing);return s<ease?s*s/(2*ease):s>run-ease?run-ease-(run-s)**2/(2*ease):s-ease/2;};
 for(let i=0;i<=n;i++){const s=length*i/n,p=planar.getPointAt(i/n);p.y=startY+(endY-startY)*integral(s)/(run-ease);points.push(p);}
 const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');curve.arcLengthDivisions=2000;curve.updateArcLengths();let maxGrade=0;for(let i=1;i<points.length;i++)maxGrade=Math.max(maxGrade,Math.abs(points[i].y-points[i-1].y)/Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));return {id,width,curve,points,maxGrade};
}
export function createHillApproaches(eastRoad:THREE.Curve<THREE.Vector3>){
 const join=nearest(eastRoad,235,-13),villa=ZONES.villa,lighthouse=ZONES.lighthouse;
 const drive=approach('villa',3.6,[[join.x,join.z],[242,join.z],[245,-33],[259,-62],[275,-58],[280,-35],[264,-22],[251,-7],[254,7],[270,12],[268,34],[266,40],[villa.x,40],[villa.x,34]],join.y-.2+.025,terrainHeight(villa.x,villa.z)+.1);
 const branch=nearest(drive.curve,villa.x,40),walk=approach('lighthouse',2.4,[[branch.x,branch.z],[247,39],[247,61],[254,61],[254,52.5]],branch.y,terrainHeight(lighthouse.x,lighthouse.z)+.1);
 return [drive,walk];
}
