import * as THREE from 'three';
export const COMMUTER_POINTS:[number,number][]=[[4,-158],[83,-162],[172,-146],[208,-85],[208,-5],[199,68],[191,126]];
/** Centre positions stop a whole two-car train before its terminal buffer. */
export function trainProgress(curve:THREE.Curve<THREE.Vector3>,phase:number){
 const clearance=9,span=curve.getLength(),usable=Math.max(0,span-2*clearance);
 const progress=phase<.5?phase*2:2-phase*2;
 return (clearance+usable*progress)/span;
}
