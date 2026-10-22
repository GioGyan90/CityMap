import {ZONES} from './layout';
import {nearestRoad} from './roadNetwork';
import {paintGroundPath} from './groundRoadMaterial';
import {parkingAccessPaths} from './parking';
export function buildBilliardsAccess(){
 for(const id of ['market','hall2']){
  const s=ZONES[id],front=s.z+(id==='market'?14:10.5)*s.sz-.3,side=s.x+s.w/2+2,road=nearestRoad(side,front);
  const points:[number,number][]=[[s.x,front],[side,front],[road.x,road.z]];
  paintGroundPath(points,2.4,'walk');
  for(let i=1;i<points.length;i++)parkingAccessPaths.push({points:[points[i-1],points[i]],width:2.4});
 }
}
