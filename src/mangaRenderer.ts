import * as THREE from 'three';
import {renderer,scene,camera,world,sky} from './scene';
import {setMangaRamp} from './materials';
import {mangaVertex,mangaFragment} from './mangaShader';
import {initialRenderStyle,isStyleShortcut,comicTargetSize,RENDER_STYLE_KEY,type RenderStyle} from './renderStyle';
let style:RenderStyle='original',failed=false,button:HTMLButtonElement|undefined;
let target:THREE.WebGLRenderTarget|undefined,material:THREE.ShaderMaterial|undefined;
let postScene:THREE.Scene|undefined,postCamera:THREE.OrthographicCamera|undefined,quad:THREE.Mesh|undefined;
const buffer=new THREE.Vector2();let buttonState='',targetNeedsCheck=false;
function dispose(){target?.dispose();material?.dispose();quad?.geometry.dispose();target=undefined;material=undefined;postScene=undefined;postCamera=undefined;quad=undefined;}
function supported(){return renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float')&&!failed;}
function updateButton(){if(!button)return;const asset=!!world.userData.assetView,state=[style,supported(),asset].join(':');if(state===buttonState)return;buttonState=state;button.disabled=!supported()||asset;button.textContent=asset?'资产原色':style==='manga'&&supported()?'漫画':'原版';button.setAttribute('aria-pressed',String(style==='manga'&&supported()&&!asset));button.title=!supported()?'当前设备使用原版渲染':asset?'资产查看保持原始材质':style==='manga'?'漫画试验：点击切回原版（M）':'原版渲染：点击试用漫画效果（M）';}
export function setRenderStyle(next:RenderStyle,persist=true){style=next;if(style==='original'){setMangaRamp(false);dispose();}if(persist){try{localStorage.setItem(RENDER_STYLE_KEY,style);}catch{}try{if(new URLSearchParams(location.search).has('style')){const url=new URL(location.href);url.searchParams.set('style',style);history.replaceState(history.state,'',url);}}catch{}}updateButton();}
export function initMangaControls(){
 let saved:string|null=null;try{saved=localStorage.getItem(RENDER_STYLE_KEY);}catch{}
 button=document.createElement('button');button.id='toggleComic';button.setAttribute('aria-label','切换漫画与原版渲染');document.body.appendChild(button);
 button.onclick=()=>setRenderStyle(style==='manga'?'original':'manga');
 window.addEventListener('keydown',event=>{if(isStyleShortcut(event)&&supported()&&!world.userData.assetView){event.preventDefault();button!.click();}});
 setRenderStyle(initialRenderStyle(location.search,saved),false);
}
function prepare(){
 renderer.getDrawingBufferSize(buffer);const size=comicTargetSize(buffer.x,buffer.y);
 if(!target){
  target=new THREE.WebGLRenderTarget(size.width,size.height,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
  targetNeedsCheck=true;target.texture.name='manga-beauty-linear';target.depthTexture=new THREE.DepthTexture(size.width,size.height,THREE.UnsignedIntType);
  material=new THREE.ShaderMaterial({vertexShader:mangaVertex,fragmentShader:mangaFragment,depthTest:false,depthWrite:false,toneMapped:false,
   uniforms:{inverseViewProjection:{value:new THREE.Matrix4()},tColor:{value:target.texture},tDepth:{value:target.depthTexture},texel:{value:new THREE.Vector2()},nearPlane:{value:camera.near},farPlane:{value:camera.far},daylight:{value:1},inkColor:{value:new THREE.Color(0x314f69)},fogColor:{value:new THREE.Color()}}});
  postScene=new THREE.Scene();postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);quad.frustumCulled=false;postScene.add(quad);
  const old=renderer.debug.onShaderError;let shaderFailed=false;
  try{renderer.debug.onShaderError=(...args)=>{shaderFailed=true;old?.(...args);};renderer.compile(postScene,postCamera);}finally{renderer.debug.onShaderError=old;}
  if(shaderFailed)throw Error('Manga shader compilation failed');
 }
 if(target.width!==size.width||target.height!==size.height){target.setSize(size.width,size.height);targetNeedsCheck=true;}
 camera.updateMatrixWorld();const u=material!.uniforms;u.inverseViewProjection.value.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse);u.texel.value.set(1/size.width,1/size.height);u.nearPlane.value=camera.near;u.farPlane.value=camera.far;
 u.daylight.value=(sky.material as THREE.ShaderMaterial).uniforms.daylight.value;u.fogColor.value.copy(scene.fog?.color??new THREE.Color(0xbce2f7));
}
/** Original mode and the asset viewer use the old direct render path without any target. */
export function renderCity(){
 const active=style==='manga'&&supported()&&!world.userData.assetView;
 setMangaRamp(active);updateButton();const displayed=active?'manga':'original';if(document.body.dataset.renderStyle!==displayed)document.body.dataset.renderStyle=displayed;
 if(!active){if(world.userData.assetView)dispose();renderer.render(scene,camera);return;}
 const previous=renderer.getRenderTarget();
 try{prepare();renderer.setRenderTarget(target!);if(targetNeedsCheck){const gl=renderer.getContext();if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Manga target is not renderable');targetNeedsCheck=false;}renderer.render(scene,camera);renderer.setRenderTarget(previous);renderer.render(postScene!,postCamera!);}
 catch(error){console.error('漫画试验已退回原版',error);failed=true;renderer.setRenderTarget(previous);setMangaRamp(false);dispose();updateButton();document.body.dataset.renderStyle='original';renderer.render(scene,camera);}
 finally{renderer.setRenderTarget(previous);}
}
