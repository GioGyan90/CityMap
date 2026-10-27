/** Hide UI without changing the user's label, animation, time or camera settings. */
export function initImmersive(){
 const enter=document.getElementById('toggleImmersive') as HTMLButtonElement;
 const exit=document.getElementById('exitImmersive') as HTMLButtonElement;
 const set=(enabled:boolean)=>{
  document.body.dataset.immersive=String(enabled);
  enter.setAttribute('aria-pressed',String(enabled));exit.hidden=!enabled;
  window.dispatchEvent(new Event('citymap-immersive'));
  if(enabled)exit.focus({preventScroll:true});else enter.focus({preventScroll:true});
 };
 enter.addEventListener('click',()=>set(true));exit.addEventListener('click',()=>set(false));
 window.addEventListener('keydown',e=>{
  const target=e.target as HTMLElement|null;
  if(e.key==='Escape'&&document.body.dataset.immersive==='true'){e.preventDefault();set(false);return;}
  if(e.key.toLowerCase()==='h'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!(target?.isContentEditable||target?.matches?.('input,textarea,select'))){e.preventDefault();set(document.body.dataset.immersive!=='true');}
 });
}
