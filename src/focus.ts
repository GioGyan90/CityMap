import * as THREE from 'three';
import { camera, controls, renderer, world, scene } from './scene';
import { backgroundBuildings, specialBuildings, pickTargets, type SpecialBuilding } from './specialBuildings';

const gray = new THREE.MeshToonMaterial({color:0xb5bdc5,transparent:true,opacity:.80,depthWrite:false});
const grayLine = new THREE.LineBasicMaterial({color:0x9da7b1,transparent:true,opacity:.32});
const originalMaterials=new Map<THREE.Object3D,THREE.Material|THREE.Material[]>();
const originalHeights=new Map<THREE.Group,number>();
const groups=[backgroundBuildings,...specialBuildings.map(s=>s.group)];
for(const group of groups) {
  originalHeights.set(group,group.scale.y);
  group.traverse(obj=>{
    if(obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) originalMaterials.set(obj,obj.material);
  });
}
// One screen-space mask for the entire selected facility. Touching/overlapping
// meshes merge in the mask, so roof seams, windows and furniture edges disappear.
const maskTarget=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
const maskMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
const outlineScene=new THREE.Scene(),outlineCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const outlineMaterial=new THREE.ShaderMaterial({
 uniforms:{mask:{value:maskTarget.texture},texel:{value:new THREE.Vector2()},color:{value:new THREE.Color(0xffcc69)}},
 vertexShader:`varying vec2 uvPos;void main(){uvPos=uv;gl_Position=vec4(position.xy,0.,1.);}`,
 fragmentShader:`uniform sampler2D mask;uniform vec2 texel;uniform vec3 color;varying vec2 uvPos;
 void main(){float center=texture2D(mask,uvPos).r;float outer=0.;
 for(int i=0;i<16;i++){float a=float(i)*6.2831853/16.;outer=max(outer,texture2D(mask,uvPos+vec2(cos(a),sin(a))*texel*2.3).r);}
 float alpha=outer*(1.-center);if(alpha<.03)discard;gl_FragColor=vec4(color,alpha*.95);}`,
 transparent:true,depthTest:false,depthWrite:false,toneMapped:false
});
outlineScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),outlineMaterial));
const bufferSize=new THREE.Vector2(),savedColor=new THREE.Color();
export function renderFocusOutline(){
 if(!selectedSpecial)return;
 renderer.getDrawingBufferSize(bufferSize);
 if(maskTarget.width!==bufferSize.x||maskTarget.height!==bufferSize.y){maskTarget.setSize(bufferSize.x,bufferSize.y);outlineMaterial.uniforms.texel.value.set(1/bufferSize.x,1/bufferSize.y);}
 const target=renderer.getRenderTarget(),autoClear=renderer.autoClear,alpha=renderer.getClearAlpha(),layers=camera.layers.mask;
 const override=scene.overrideMaterial,shadows=renderer.shadowMap.autoUpdate;
 renderer.getClearColor(savedColor);
 try{
  camera.layers.set(1);scene.overrideMaterial=maskMaterial;renderer.shadowMap.autoUpdate=false;
  renderer.setRenderTarget(maskTarget);renderer.setClearColor(0x000000,1);renderer.autoClear=true;renderer.render(scene,camera);
  scene.overrideMaterial=override;camera.layers.mask=layers;
  renderer.setRenderTarget(target);renderer.autoClear=false;renderer.render(outlineScene,outlineCamera);
 }finally{
  scene.overrideMaterial=override;camera.layers.mask=layers;renderer.setRenderTarget(target);
  renderer.setClearColor(savedColor,alpha);renderer.autoClear=autoClear;renderer.shadowMap.autoUpdate=shadows;
 }
}
world.userData.focusOutline='unified-silhouette';

const card=document.createElement('div');card.className='focus-card';card.hidden=true;
const title=document.createElement('strong'),description=document.createElement('span');
card.append(title,description);document.body.append(card);
export let selectedSpecial: SpecialBuilding | null=null;
let labelTarget: string|null=null;
let pinnedTarget: string|null=null;
let pointerActive=false;
let dragging=false;
let down: {x:number;y:number}|null=null;
const pointer=new THREE.Vector2();const raycaster=new THREE.Raycaster();
const canvas=renderer.domElement;
function move(event: PointerEvent) {
  if(document.body.dataset.immersive==='true')return;
  if(down && Math.hypot(event.clientX-down.x,event.clientY-down.y)>6) dragging=true;
  if(event.pointerType==='touch') return;
  const rect=canvas.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  pointerActive=true;
}
canvas.addEventListener('pointermove',move);
canvas.addEventListener('pointerleave',()=>{pointerActive=false;});
canvas.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};dragging=false;});
canvas.addEventListener('pointerup',event=>{
  if(document.body.dataset.immersive==='true'){down=null;dragging=false;return;}
  if(event.pointerType!=='mouse' && !dragging) {
    const rect=canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    const id=hitTarget();pinnedTarget=pinnedTarget===id?null:id;
  }
  down=null;dragging=false;
});
canvas.addEventListener('pointercancel',()=>{down=null;dragging=false;pointerActive=false;});
window.addEventListener('blur',()=>{pointerActive=false;labelTarget=null;pinnedTarget=null;});
window.addEventListener('citymap-immersive',()=>{pointerActive=false;labelTarget=null;pinnedTarget=null;down=null;dragging=false;});
window.addEventListener('keydown',event=>{if(event.key==='Escape'){pointerActive=false;labelTarget=null;pinnedTarget=null;}});
controls.addEventListener('start',()=>{pointerActive=false;labelTarget=null;pinnedTarget=null;});

export function setLabelFocus(id: string|null) { labelTarget=id; }
export function togglePinnedFocus(id: string) { pinnedTarget=pinnedTarget===id?null:id; }
function hitTarget() {
  camera.updateMatrixWorld();world.updateMatrixWorld(true);
  raycaster.setFromCamera(pointer,camera);
  return raycaster.intersectObjects(pickTargets,false)[0]?.object.userData.specialId ?? null;
}
function select(id: string|null) {
  const next=specialBuildings.find(s=>s.id===id)??null;
  if(next===selectedSpecial)return;
  selectedSpecial?.group.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.layers.disable(1);});
  selectedSpecial=next;
  next?.group.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.layers.enable(1);});
  for(const group of groups) {
    const related=next?.id==='commercial'&&group.userData.hallId==='hall3'||next?.id==='hall3'&&group.name==='commercial-city-living';
    const muted=!!next && group!==next.group&&!related;
    group.traverse(obj=>{
      const material=originalMaterials.get(obj);
      if(material && (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments)) obj.material=muted?(obj instanceof THREE.LineSegments?grayLine:gray):material;
    });
  }
  canvas.style.cursor=next?'pointer':'';
  card.hidden=!next;
  if(next) {
    title.textContent=next.name;description.textContent=next.description;

  }
  document.querySelectorAll<HTMLElement>('[data-special]').forEach(el=>{
    el.classList.toggle('is-focused',el.dataset.special===next?.id);
    el.classList.toggle('is-muted',!!next && el.dataset.special!==next.id);
  });
  world.userData.selectedSpecial=next?.id??null;
}
export function updateFocus(dt: number) {
  const id=document.body.dataset.immersive==='true'?null:labelTarget??pinnedTarget??(pointerActive&&!dragging?hitTarget():null);
  select(id);
  const alpha=1-Math.exp(-10*dt);
  for(const group of groups) {
    const integrated=group.name==='commercial-city-living'||group.userData.hallId==='hall3';
    const target=originalHeights.get(group)!*(!integrated && selectedSpecial && group!==selectedSpecial.group ? .88:1);
    // All selectable roots are independent siblings; shrink around their ground-level pivot.
    group.scale.y=THREE.MathUtils.lerp(group.scale.y,target,alpha);
    if(Math.abs(group.scale.y-target)<.0001)group.scale.y=target;
  }
}
