/** Low headland below the hotel/cafe residential district; port stays flat. */
export const RESIDENTIAL_CLIFF={startZ:175,endZ:197,lift:3.8,blendWidth:38,seed:72419};
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function cliffEnvelope(x:number,z:number){
 return smooth(175,182,z)*(1-smooth(191,197,z))*smooth(0,18,x);
}
export function cliffNormal(z:number,edge:(z:number)=>number){
 const slope=(edge(z+.1)-edge(z-.1))/.2,length=Math.hypot(1,slope);
 return {x:1/length,z:-slope/length};
}
export function residentialCliffLift(x:number,z:number,edge:(z:number)=>number){
 if(x>edge(z))return 0;
 const n=cliffNormal(z,edge),distance=(edge(z)-x)*n.x;
 return RESIDENTIAL_CLIFF.lift*cliffEnvelope(x,z)*(1-smooth(0,RESIDENTIAL_CLIFF.blendWidth,distance));
}
