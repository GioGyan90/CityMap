import * as THREE from 'three';
import { camera, controls, renderer, world } from './scene';
import { GROUND_Y } from './config';
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
// Edge geometry follows each individual building part, including moving rides.
const edgeMaterial=new THREE.LineBasicMaterial({color:0xffcc69,transparent:true,opacity:.95,depthWrite:false});
const outlines=new Map<string,THREE.LineSegments[]>();
for(const entry of specialBuildings) {
  const lines:THREE.LineSegments[]=[];
  const meshes:THREE.Mesh[]=[];
  entry.group.traverse(obj=>{if(obj instanceof THREE.Mesh)meshes.push(obj)});
  for(const mesh of meshes) {
    if(new THREE.Box3().setFromObject(mesh).max.y<GROUND_Y+1)continue;
    const line=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,35),edgeMaterial);
    line.name='focus-building-outline';line.visible=false;line.renderOrder=5;
    mesh.add(line);lines.push(line);
  }
  outlines.set(entry.id,lines);
}

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
  if(event.pointerType!=='mouse' && !dragging) {
    const rect=canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    const id=hitTarget();pinnedTarget=pinnedTarget===id?null:id;
  }
  down=null;dragging=false;
});
canvas.addEventListener('pointercancel',()=>{down=null;dragging=false;pointerActive=false;});
window.addEventListener('blur',()=>{pointerActive=false;labelTarget=null;pinnedTarget=null;});
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
  selectedSpecial=next;
  for(const group of groups) {
    const muted=!!next && group!==next.group;
    group.traverse(obj=>{
      const material=originalMaterials.get(obj);
      if(material && (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments)) obj.material=muted?(obj instanceof THREE.LineSegments?grayLine:gray):material;
    });
  }
  canvas.style.cursor=next?'pointer':'';
  card.hidden=!next;
  for(const [id,lines] of outlines)for(const line of lines)line.visible=id===next?.id;
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
  const id=labelTarget??pinnedTarget??(pointerActive&&!dragging?hitTarget():null);
  select(id);
  const alpha=1-Math.exp(-10*dt);
  for(const group of groups) {
    const target=originalHeights.get(group)!*(selectedSpecial && group!==selectedSpecial.group ? .88:1);
    // All selectable roots are independent siblings; shrink around their ground-level pivot.
    group.scale.y=THREE.MathUtils.lerp(group.scale.y,target,alpha);
    if(Math.abs(group.scale.y-target)<.0001)group.scale.y=target;
  }
}
