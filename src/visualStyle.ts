/** Shared daylight palette: clean ivory walls, fresh greens, gold sand and cool shadows. */
export const DAY_LIGHTING={
 sun:{color:0xfff8ef,intensity:2.5,position:[-190,300,155] as [number,number,number]},
 hemi:{sky:0xc4e4ff,ground:0xa6b8cf,intensity:.70},
 fill:{color:0xb5d5ff,intensity:.22},fog:0xbce2f7
};
// Option C: clear cobalt water, seafoam shallows and green terrain; accents stay localized.
export const COAST_PALETTE={sand:0xffe3ae,wetSand:0xd7ad79,grass:0x78c450,hill:0x579f58,ridge:0x79b86b,rock:0xc5bd9e,quay:0xebe0c7};
export const SEA_PALETTE={shallow:'#48d6c7',deep:'#1053a4'};
export const RESORT_ACCENTS={seafoam:0x6dd8c4,apricot:0xfab583,coral:0xf1825d,lavender:0xa76ad7,magenta:0xe44799,cobalt:0x165eae};
/** Broaden the sandy foreshore, leaving the restaurant's waterfront inlet open. */
export function beachExtension(z:number){
 const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 return smooth(-196,-168,z)*(1-smooth(160,196,z))*(9.5+3.5*Math.sin(z*.026)+1.5*Math.cos(z*.063))*(1-Math.exp(-Math.pow((z-98)/17,2)));
}
