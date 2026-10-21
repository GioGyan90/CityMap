import {ZONES,westCoast} from './layout';
/** Shared clearances keep generated buildings, planting and public spaces consistent. */
export const BEACH_ENTRIES=[-124,-42,38,142];
export function coastalPublicSpace(x:number,z:number,radius=0){
 return BEACH_ENTRIES.some(v=>Math.abs(z-v)<7+radius&&x>westCoast(z)-6-radius&&x<westCoast(z)+11+radius);
}
export function landmarkSetback(x:number,z:number,w:number,d:number){
 return ['civic','hospital','hotel','market'].some(id=>{const s=ZONES[id];return Math.abs(x-s.x)<(s.w+w)/2+7&&Math.abs(z-s.z)<(s.d+d)/2+7;});
}
export function skylineHeight(x:number,z:number){
 const distance=Math.hypot((x-70)/58,(z+126)/36);
 return Math.max(17,62-distance*28);
}
export function groveDensity(x:number,z:number){
 // Patches on the hills, breathing space on flat town ground.
 return x>205?.84:x>150?.35+.32*Math.sin(x*.09+z*.045)*Math.cos(z*.065):.22;
}
