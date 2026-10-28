export type RenderStyle='manga'|'original';
export const RENDER_STYLE_KEY='citymap-render-style-v1';
export function initialRenderStyle(search:string,saved:string|null):RenderStyle{
 const query=new URLSearchParams(search).get('style');
 if(query==='original'||query==='manga')return query;
 return saved==='original'?'original':'manga';
}
export function isStyleShortcut(e:{key:string;ctrlKey?:boolean;metaKey?:boolean;altKey?:boolean;repeat?:boolean;target?:EventTarget|null}){
 const target=e.target as HTMLElement|null;
 return e.key.toLowerCase()==='m'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.repeat&&!target?.isContentEditable&&!target?.matches?.('input,textarea,select');
}
/** Cap the additional HDR/depth target rather than growing with a 4K/HiDPI canvas. */
export function comicTargetSize(width:number,height:number){
 const scale=Math.min(1,Math.sqrt(2500000/Math.max(1,width*height)));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
