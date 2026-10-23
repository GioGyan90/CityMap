import * as THREE from 'three';
export interface RailStop {id:string;distance:number;dwell:number}
export interface RailState {distance:number;remaining:number;nextStop:number}
/** Event-based forward-only travel; stops are distances around a closed circuit. */
export function advanceRail(state:RailState,dt:number,speed:number,length:number,stops:RailStop[]):RailState{
 let {distance,remaining,nextStop}=state;dt=Number.isFinite(dt)?Math.max(0,dt):0;if(speed<=0||!Number.isFinite(speed))return {...state};
 while(dt>1e-8){if(remaining>0){const t=Math.min(dt,remaining);remaining-=t;dt-=t;continue;}const stop=stops[nextStop],gap=stop?(stop.distance-distance+length)%length:Infinity,time=gap/speed;if(dt<time){distance=(distance+dt*speed)%length;dt=0;}else{distance=stop.distance;dt-=time;remaining=stop.dwell;nextStop=(nextStop+1)%stops.length;}}
 return {distance,remaining,nextStop};
}
export function carPose(curve:THREE.Curve<THREE.Vector3>,distance:number,wheelbase:number){const len=curve.getLength(),at=(d:number)=>curve.getPointAt(((d%len)+len)%len/len),a=at(distance-wheelbase/2),b=at(distance+wheelbase/2),p=a.clone().add(b).multiplyScalar(.5),t=b.clone().sub(a).normalize();return {position:p,tangent:t,heading:Math.atan2(t.x,t.z),pitch:-Math.atan2(t.y,Math.hypot(t.x,t.z))};}
