import * as THREE from 'three';
import {createGreyPreview} from './greyPreview';
import {renderer,scene,camera,controls,world} from './scene';
import {configureLoading} from './loadingScheduler';

/** The preview owns only its own resources; controls/camera survive the handover. */
export function startLoadingPreview(){
 const {root,materials,terrain,sea,roads,boxes}=createGreyPreview();scene.add(root);
 let active=true,frame=0,lastYield=performance.now(),busyUntil=0;
 const began=performance.now(),oldPixelRatio=renderer.getPixelRatio();
 renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.shadowMap.enabled=false;
 const status=document.getElementById('loading')!;status.classList.add('loading-progress');
 const text=document.createElement('span');text.textContent='灰模预览 · 可拖拽、缩放、平移';status.replaceChildren(text);
 const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.toolbar button'));const disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);
 const onStart=()=>{busyUntil=performance.now()+160;};const onEnd=()=>{busyUntil=performance.now()+100;};
 controls.addEventListener('start',onStart);controls.addEventListener('end',onEnd);
 const onInput=()=>{busyUntil=performance.now()+100;};renderer.domElement.addEventListener('pointermove',onInput);renderer.domElement.addEventListener('wheel',onInput,{passive:true});
 const resize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);};addEventListener('resize',resize);
 const render=()=>{if(!active)return;controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(render);};render();
 performance.mark('citymap-preview-visible');
 // Two rAFs ensure a painted, interactive preview before heavy module evaluation.
 const paint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{performance.mark('citymap-preview-interactive');performance.measure('citymap-to-preview','citymap-boot-start','citymap-preview-interactive');resolve();})));
 const report:{label:string;ms:number}[]=[];
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4();
 world.userData.progressivePriority=(x:number,z:number)=>{
  camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
  const p=new THREE.Vector3(x,10,z);return (frustum.containsPoint(p)?0:1000000)+p.distanceToSquared(controls.target);
 };
 configureLoading(async label=>{
  const now=performance.now();if(now-lastYield<6)return;
  report.push({label,ms:now-lastYield});text.textContent=`正在恢复${/[A-Za-z]/.test(label)?'城市设施':label} · 可继续操作地图`;
  await new Promise<void>(resolve=>requestAnimationFrame(()=>setTimeout(resolve,performance.now()<busyUntil?40:0)));
  lastYield=performance.now();
 });
 return {
  paint,
  groundReady(){terrain.visible=false;sea.visible=false;roads.forEach(m=>m.visible=false);},
  facilityReady(id:string){boxes.get(id)?.forEach(m=>m.visible=false);},
  finish(){
   active=false;cancelAnimationFrame(frame);configureLoading();delete world.userData.progressivePriority;
   controls.removeEventListener('start',onStart);controls.removeEventListener('end',onEnd);renderer.domElement.removeEventListener('pointermove',onInput);renderer.domElement.removeEventListener('wheel',onInput);removeEventListener('resize',resize);
   scene.remove(root);root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());
   renderer.setPixelRatio(oldPixelRatio);renderer.shadowMap.enabled=true;buttons.forEach((b,i)=>b.disabled=disabled[i]);
   world.userData.loadingReport={previewStartedAt:began,checkpointIntervals:report};performance.mark('citymap-full-ready');performance.measure('citymap-to-full','citymap-boot-start','citymap-full-ready');
  },
  fail(){
   configureLoading();text.textContent='部分地图恢复失败，仍可操作预览。';
   const retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=()=>location.reload();status.append(retry);
  }
 };
}
