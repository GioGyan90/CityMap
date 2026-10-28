import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initImmersive} from '../src/immersive';
class Button extends EventTarget {hidden=false;attrs=new Map<string,string>();focused=false;setAttribute(k:string,v:string){this.attrs.set(k,v);}focus(){this.focused=true;}matches(){return false;}}
test('immersive mode can be entered and exited without resetting view settings',()=>{
 const enter=new Button(),exit=new Button(),windowTarget=new EventTarget();
 const body={dataset:{time:'night',assetView:'true',labelsOn:'false'} as Record<string,string>};
 (globalThis as any).document={body,getElementById:(id:string)=>id==='toggleImmersive'?enter:exit};(globalThis as any).window=windowTarget;
 let changes=0;windowTarget.addEventListener('citymap-immersive',()=>changes++);initImmersive();assert.equal(body.dataset.immersive,'true');assert.equal(exit.hidden,false);
 enter.dispatchEvent(new Event('click'));assert.equal(body.dataset.immersive,'true');assert.equal(exit.hidden,false);assert.equal(enter.attrs.get('aria-pressed'),'true');
 const escape=Object.assign(new Event('keydown',{cancelable:true}),{key:'Escape',ctrlKey:false,metaKey:false,altKey:false});windowTarget.dispatchEvent(escape);
 assert.equal(body.dataset.immersive,'false');assert.equal(exit.hidden,true);assert.equal(enter.attrs.get('aria-pressed'),'false');
 assert.equal(body.dataset.time,'night');assert.equal(body.dataset.assetView,'true');assert.equal(body.dataset.labelsOn,'false');assert.equal(changes,3);
 const h=Object.assign(new Event('keydown',{cancelable:true}),{key:'h',ctrlKey:false,metaKey:false,altKey:false});windowTarget.dispatchEvent(h);assert.equal(body.dataset.immersive,'true');
 exit.dispatchEvent(new Event('click'));assert.equal(body.dataset.immersive,'false');
});
test('explicit asset mode can initialize with visible UI and default entry does not steal focus',()=>{
 const enter=new Button(),exit=new Button();const body={dataset:{}};
 (globalThis as any).document={body,getElementById:(id:string)=>id==='toggleImmersive'?enter:exit};(globalThis as any).window=new EventTarget();
 initImmersive(false);assert.equal((body.dataset as any).immersive,'false');assert.equal(exit.hidden,true);assert.equal(enter.focused,false);assert.equal(exit.focused,false);
});
