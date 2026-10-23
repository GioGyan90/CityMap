import * as THREE from 'three';
/** Track centrelines, independent of terrain/build order. +X is inland along the coast. */
export const COAST_SPINE:[number,number][]=[[-55,-135],[-54,-120],[-62,-90],[-47,-50],[-49,0],[-61,40],[-46,80],[-39,100]];
export const EXPRESS_SPINE:[number,number][]=[[-10,-153],[65,-157],[147,-142],[189,-84],[189,-5],[180,66],[170,114]];
export interface RailPlan {id:string;name:string;spine:[number,number][];spacing:number;turnDepth:number;elevated:boolean;carLength:number;carPitch:number;cars:number;color:number;speed:number;stops:number[]}
export const RAIL_PLANS:RailPlan[]=[
 {id:'coast',name:'海岸环行电车',spine:COAST_SPINE,spacing:14,turnDepth:12,elevated:false,carLength:3.6,carPitch:4.2,cars:3,color:0xe9b753,speed:5,stops:[.08,.39,.955]},
 {id:'express',name:'山麓环行列车',spine:EXPRESS_SPINE,spacing:24,turnDepth:16,elevated:true,carLength:5.8,carPitch:6.9,cars:3,color:0x469cb9,speed:8,stops:[.05,.36,.73,.95]}
];
export function railSpine(plan:RailPlan){return new THREE.CatmullRomCurve3(plan.spine.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');}
export function railSidePoint(spine:THREE.Curve<THREE.Vector3>,t:number,offset:number){const p=spine.getPointAt(t),v=spine.getTangentAt(t),l=Math.hypot(v.x,v.z);return p.add(new THREE.Vector3(v.z/l,0,-v.x/l).multiplyScalar(offset));}
export function railCircuit(plan:RailPlan,height:(x:number,z:number)=>number=()=>0){
 const spine=railSpine(plan),n=Math.ceil(spine.getLength()/2),points:THREE.Vector3[]=[];
 for(let i=0;i<=n;i++)points.push(railSidePoint(spine,i/n,0));
 const cap=(end:number)=>{const p=spine.getPointAt(end),t=spine.getTangentAt(end).normalize(),right=new THREE.Vector3(t.z,0,-t.x),direction=end?1:-1;for(let i=1;i<=48;i++){const a=Math.PI*i/48,offset=end?1-Math.cos(a):1+Math.cos(a);points.push(p.clone().addScaledVector(right,plan.spacing/2*offset).addScaledVector(t,direction*plan.turnDepth*Math.sin(a)));}};
 cap(1);for(let i=n-1;i>=0;i--)points.push(railSidePoint(spine,i/n,plan.spacing));cap(0);points.pop();
 for(const p of points)p.y=height(p.x,p.z);
 const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');curve.arcLengthDivisions=4000;curve.updateArcLengths();return curve;
}
export function railStationReservations(){return RAIL_PLANS.flatMap(plan=>{const spine=railSpine(plan);return plan.stops.map(t=>{const p=railSidePoint(spine,t,plan.spacing/2),v=spine.getTangentAt(t),angle=Math.atan2(v.x,v.z);return {x:p.x,z:p.z,angle,w:plan.spacing+14,d:(plan.elevated?24:17)+4};});});}
const stationReservations=railStationReservations();
const corridorSamples=RAIL_PLANS.map(p=>({plan:p,points:railCircuit(p).getSpacedPoints(650)}));
export function railClearance(x:number,z:number){let best=Infinity;for(const {points}of corridorSamples)for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);best=Math.min(best,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return best;}
export function inRailReservation(x:number,z:number,margin=4.3){return railClearance(x,z)<margin||stationReservations.some(p=>{const dx=x-p.x,dz=z-p.z;return Math.abs(dx*Math.cos(p.angle)-dz*Math.sin(p.angle))<p.w/2&&Math.abs(dx*Math.sin(p.angle)+dz*Math.cos(p.angle))<p.d/2;});}
