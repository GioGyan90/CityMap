import {installPackedCloudDensity} from './cloudModel';
/** Gzip bytes are self-decoded so static Pages hosting needs no custom content-encoding. */
export async function preloadCloudDensity(){
 if(typeof DecompressionStream==='undefined')return false;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
 try{const response=await fetch(new URL('cache/cloud-density-v1.bin',document.baseURI),{signal:controller.signal});if(!response.ok||!response.body)return false;
  const data=new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());installPackedCloudDensity(data);return true;
 }catch{return false;}finally{clearTimeout(timeout);}
}
