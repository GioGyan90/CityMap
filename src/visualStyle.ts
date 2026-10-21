/** Shared daylight palette: cream walls, cerulean glazing, gold sand and cool shadows. */
export const DAY_LIGHTING={
 sun:{color:0xffedc7,intensity:1.8,position:[-190,300,155] as [number,number,number]},
 hemi:{sky:0xcbeaff,ground:0xf4d79d,intensity:.76},
 fill:{color:0x9bd5f7,intensity:.3},fog:0xbce2f7
};
export const COAST_PALETTE={sand:0xffdfa0,wetSand:0xe5bd72,grass:0xa0c45b,hill:0x81aa51,ridge:0xa2b46a,rock:0xc6b58c,quay:0xe0ceab};
export const SEA_PALETTE={shallow:'#23c5c6',deep:'#0677ad'};
/** Broaden the sandy foreshore, leaving the restaurant's waterfront inlet open. */
export function beachExtension(z:number){
 const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 return smooth(-196,-168,z)*(1-smooth(160,196,z))*(7.5+2*Math.sin(z*.026))*(1-Math.exp(-Math.pow((z-98)/17,2)));
}
