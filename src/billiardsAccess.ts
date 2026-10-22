import {ZONES} from './layout';
import {nearestRoad} from './roadNetwork';
import {paintGroundPath} from './groundRoadMaterial';
import {parkingAccessPaths} from './parking';
export function buildBilliardsAccess(){
 for(const id of ['market','hall1','hall2','hall3','hall4','hall5']){
  const s=ZONES[id],front=s.z+Math.cos(s.ry??0)*(id==='market'?14:10.5)*s.sz,side=s.x+s.w/2+2,road=nearestRoad(side,front);
  const near=nearestRoad(s.x,front);
  const points:[number,number][]=id==='hall5'?[[s.x,front],[near.x,near.z]]:[[s.x,front],[side,front],[road.x,road.z]];
  paintGroundPath(points,2.4,'walk');
  for(let i=1;i<points.length;i++)parkingAccessPaths.push({points:[points[i-1],points[i]],width:2.4});
 }
}
