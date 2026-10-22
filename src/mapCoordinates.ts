export const MAP_GRID={originX:-260,originZ:-220,cellSize:20,columns:30,rows:23};
export function columnLabel(value:number){let n=value+1,s='';if(n<1)return 'OUT';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
export function gridCell(x:number,z:number){const col=Math.floor((x-MAP_GRID.originX)/MAP_GRID.cellSize),row=Math.floor((z-MAP_GRID.originZ)/MAP_GRID.cellSize);return {col,row,id:col<0||row<0||col>=MAP_GRID.columns||row>=MAP_GRID.rows?'OUT':columnLabel(col)+String(row+1).padStart(2,'0')};}
export interface PositionDraft {id:string;x:number;y:number;z:number}
export function validatePositions(value:unknown,ids:Set<string>):PositionDraft[]{
 if(!Array.isArray(value)||value.length>1000)throw Error('位置列表格式不正确');
 const seen=new Set<string>();return value.map(p=>{if(!p||!ids.has(p.id)||seen.has(p.id)||!['x','y','z'].every(k=>Number.isFinite(p[k]))||Math.abs(p.x)>1000||Math.abs(p.z)>1000||p.y< -100||p.y>500)throw Error('位置记录含未知资产、重复编号或无效坐标');seen.add(p.id);return {id:p.id,x:p.x,y:p.y,z:p.z};});
}
