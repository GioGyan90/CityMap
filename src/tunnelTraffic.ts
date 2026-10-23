import {apronRoadHeight} from './tunnelAprons';
import * as THREE from 'three';
import {roadProfiles} from './roadNetwork';
import {tunnelCurve,tunnelLocation,tunnelPortals} from './tunnelPlan';
/** Stable original road IDs are retained for signal phases; road 9 now joins road 0. */
export function tunnelTrafficSources(){
 const a=roadProfiles[0].curve,b=roadProfiles[9].curve;
 const deckPoints=(curve:THREE.Curve<THREE.Vector3>,n:number)=>curve.getSpacedPoints(n).map(p=>{p.y-=.2;return p;});
 const joined=new THREE.CatmullRomCurve3([...deckPoints(a,180).reverse(),...tunnelCurve.getSpacedPoints(120).reverse().slice(1),...deckPoints(b,220).slice(1)],false,'centripetal');
 joined.arcLengthDivisions=5000;joined.updateArcLengths();
 return roadProfiles.flatMap((r,id)=>id===9?[]:[{id,curve:id===0?joined:r.curve}]);
}
/** Road contact uses the underground deck or graded apron, never the ridge above it. */
export function tunnelDrivingHeight(x:number,z:number){
 for(const f of tunnelPortals){const y=apronRoadHeight(f,x,z);if(y!==undefined)return y;}
 const n=tunnelLocation(x,z);
 if(n.distance>5.35)return undefined;
 for(const f of tunnelPortals){const s=(x-f.p.x)*f.into.x+(z-f.p.z)*f.into.z;if((f.t===0?n.t<.02:n.t>.98)&&s<0)return undefined;}
 return n.y+.025;
}
