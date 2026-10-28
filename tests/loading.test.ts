import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGreyPreview} from '../src/greyPreview';
import {configureLoading,runSteps} from '../src/loadingScheduler';
import {startLoadingPreview} from '../src/loadingPreview';
import {camera,controls,renderer,scene,world} from '../src/scene';

test('baked preview has bounded finite geometry, roads and real facility silhouettes',()=>{
 const {root,boxes,roads}=createGreyPreview();let vertices=0;
 root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.attributes.position;vertices+=p.count;for(const v of p.array)assert.ok(Number.isFinite(v));});
 assert.ok(vertices<20000);assert.ok(roads.length>=10);for(const id of ['park','hospital','campus','cargo','cruise'])assert.ok(boxes.has(id),id);
 root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
});

test('scheduler yields to host tasks between deterministic chunks and propagates failures',async()=>{
 const order:string[]=[];configureLoading(async()=>{await new Promise(r=>setImmediate(r));order.push('host');});
 function* steps(){order.push('a');yield;order.push('b');yield;order.push('c');}
 await runSteps(steps(),'test');assert.deepEqual(order,['a','host','b','host','c']);
 function* broken(){yield;throw Error('failed builder');}
 await assert.rejects(runSteps(broken(),'test'),/failed builder/);configureLoading();
});

test('preview failure stays operable; handoff preserves camera and disposes owned resources/loop',async()=>{
 const pending=new Map<number,FrameRequestCallback>();let next=0;
 const status:any={classList:{add(){}},replaceChildren(){},append(){}};
 const buttons=[{disabled:false},{disabled:true}];
 Object.assign(globalThis,{devicePixelRatio:2,innerWidth:1200,innerHeight:800,document:{getElementById:()=>status,querySelectorAll:()=>buttons,createElement:()=>({})},requestAnimationFrame:(cb:FrameRequestCallback)=>{pending.set(++next,cb);return next;},cancelAnimationFrame:(id:number)=>pending.delete(id),addEventListener(){},removeEventListener(){}});
 performance.mark('citymap-boot-start');
 camera.position.set(1,2,3);controls.target.set(4,5,6);const position=camera.position.clone(),target=controls.target.clone();
 const preview=startLoadingPreview();assert.equal(buttons[0].disabled,true);assert.equal(renderer.shadowMap.enabled,false);
 const root=scene.getObjectByName('loading-grey-preview')!;assert.ok(root);let disposed=0;root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.addEventListener('dispose',()=>disposed++);});
 preview.facilityReady('hospital');preview.groundReady();preview.fail();assert.ok(scene.getObjectByName('loading-grey-preview'));assert.ok(pending.size>0);
 preview.finish();assert.equal(pending.size,0);assert.equal(scene.getObjectByName('loading-grey-preview'),undefined);assert.ok(disposed>0);assert.ok(camera.position.equals(position));assert.ok(controls.target.equals(target));assert.equal(renderer.shadowMap.enabled,true);assert.deepEqual(buttons.map(b=>b.disabled),[false,true]);assert.equal(world.userData.progressivePriority,undefined);
});
