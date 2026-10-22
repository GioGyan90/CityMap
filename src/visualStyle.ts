/** Shared daylight palette: clean ivory walls, fresh greens, gold sand and cool shadows. */
export const DAY_LIGHTING={
 sun:{color:0xfff8ef,intensity:2.5,position:[-190,300,155] as [number,number,number]},
 hemi:{sky:0xc4e4ff,ground:0xa6b8cf,intensity:.70},
 fill:{color:0xb5d5ff,intensity:.22},fog:0xbce2f7
};
export const COAST_PALETTE={sand:0xffe5ad,wetSand:0xd9b875,grass:0x83c956,hill:0x69ad65,ridge:0x85b67d,rock:0xc4c2a2,quay:0xebe0c7};
export const SEA_PALETTE={shallow:'#23c5c6',deep:'#086b9e'};
/** Broaden the sandy foreshore, leaving the restaurant's waterfront inlet open. */
export function beachExtension(z:number){
 const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 return smooth(-196,-168,z)*(1-smooth(160,196,z))*(9.5+3.5*Math.sin(z*.026)+1.5*Math.cos(z*.063))*(1-Math.exp(-Math.pow((z-98)/17,2)));
}
