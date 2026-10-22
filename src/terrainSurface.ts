import {westCoast,eastCoast,terrainHeight} from './layout';
import {gradedTerrainHeight} from './roadNetwork';
/** The same triangles are used for rendering and contact with the terrain. */
export const terrainRows=201,terrainCols=180;
export const terrainPositions=new Float32Array((terrainRows+1)*(terrainCols+1)*3);
for(let row=0;row<=terrainRows;row++){
 const z=-200+402*row/terrainRows,left=westCoast(z),right=eastCoast(z);
 for(let col=0;col<=terrainCols;col++){const x=left+(right-left)*col/terrainCols,i=(row*(terrainCols+1)+col)*3;terrainPositions.set([x,gradedTerrainHeight(x,z),z],i);}
}
export function surfaceHeight(x:number,z:number){
 if(z< -200||z>202)return terrainHeight(x,z);
 const f=(z+200)/402*terrainRows,row=Math.min(terrainRows-1,Math.floor(f)),t=f-row,stride=terrainCols+1;
 const left0=terrainPositions[row*stride*3],left1=terrainPositions[(row+1)*stride*3],right0=terrainPositions[(row*stride+terrainCols)*3],right1=terrainPositions[((row+1)*stride+terrainCols)*3];
 const left=left0*(1-t)+left1*t,right=right0*(1-t)+right1*t;
 if(x<left||x>right)return terrainHeight(x,z);
 if(Math.abs(right-left)<.000001)return terrainHeight(x,z);
 const col=Math.min(terrainCols-1,Math.max(0,Math.floor((x-left)/(right-left)*terrainCols))),a=(row*stride+col)*3,b=a+stride*3,c=a+3,d=b+3;
 const interpolate=(i:number,j:number,k:number)=>{
  const ax=terrainPositions[i],az=terrainPositions[i+2],bx=terrainPositions[j],bz=terrainPositions[j+2],cx=terrainPositions[k],cz=terrainPositions[k+2];
  const den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz),u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den;
  return {inside:u>=-.00001&&v>=-.00001&&u+v<=1.00001,height:u*terrainPositions[i+1]+v*terrainPositions[j+1]+(1-u-v)*terrainPositions[k+1]};
 };
 const first=interpolate(a,b,c);return first.inside?first.height:interpolate(c,b,d).height;
}
