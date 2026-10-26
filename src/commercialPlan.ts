/** Shared city placement. The public hospital-ring road runs along local X. */
export const COMMERCIAL_PLAN={x:77,z:-102,y:4.93,rotation:-.12,deck:9,halfWidth:28,halfDepth:25,hall:{x:-13,z:-17,scale:.62}};
export function commercialPoint(x:number,z:number){const p=COMMERCIAL_PLAN,c=Math.cos(p.rotation),s=Math.sin(p.rotation);return {x:p.x+x*c+z*s,z:p.z-x*s+z*c};}
export const COMMERCIAL_HALL=commercialPoint(COMMERCIAL_PLAN.hall.x,COMMERCIAL_PLAN.hall.z);

export function commercialGroundOccupied(x:number,z:number){const p=COMMERCIAL_PLAN,dx=x-p.x,dz=z-p.z,c=Math.cos(p.rotation),s=Math.sin(p.rotation),lx=dx*c-dz*s,lz=dx*s+dz*c;return Math.abs(lx)<29&&Math.abs(lz)>8.2&&Math.abs(lz)<25.6;}
