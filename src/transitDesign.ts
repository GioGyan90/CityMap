import * as THREE from 'three';
export const COMMUTER_POINTS:[number,number][]=[[4,-158],[83,-162],[172,-146],[208,-85],[208,-5],[199,68],[191,126]];
/** Centre positions stop a whole two-car train before its terminal buffer. */
export function trainProgress(curve:THREE.Curve<THREE.Vector3>,phase:number){
 const clearance=9,span=curve.getLength(),usable=Math.max(0,span-2*clearance);
 const progress=phase<.5?phase*2:2-phase*2;
 return (clearance+usable*progress)/span;
}

/** Stop at either terminal before reversing; preserve leftover frame time without drift. */
export function advanceTrainPhase(offset:number,remaining:number,seconds:number,speed:number,dwell=0){
 if(!Number.isFinite(speed)||speed<=0)return {offset,remaining};
 let dt=Number.isFinite(seconds)?Math.max(0,seconds):0;
 while(dt>1e-8){if(remaining>0){const used=Math.min(dt,remaining);remaining-=used;dt-=used;continue;}const boundary=offset<.5?.5:1,time=(boundary-offset)/speed;if(dt<time){offset+=dt*speed;dt=0;}else{dt-=time;offset=boundary===1?0:.5;remaining=Math.max(0,dwell);}}
 return {offset,remaining};
}
