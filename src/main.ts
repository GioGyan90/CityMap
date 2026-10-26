import './styles.css';
import './assetTools.css';
import {preloadCloudDensity} from './cloudCache';
async function boot() {
  try {
    const began=performance.now(),clouds=preloadCloudDensity();
    const {world}=await import('./scene');world.userData.deferClouds=true;
    await import('./environment');
    await import('./city');
    await import('./night');
    await import('./focus');
    await import('./labels');
    await import('./camera');
    const launch=document.createElement('button');launch.id='asset-lazy-launch';launch.className='asset-launch';launch.textContent='资产查看 / 网格规划';document.body.appendChild(launch);
    let tools:Promise<void>|undefined;
    const openTools=()=>tools??=(async()=>{launch.disabled=true;launch.textContent='正在打开资产…';try{const {initAssetTools}=await import('./assetTools');initAssetTools();launch.disabled=false;launch.click();}catch(error){tools=undefined;launch.disabled=false;launch.textContent='重试打开资产';console.error(error);}})();
    launch.onclick=()=>{void openTools();};
    const requested=new URLSearchParams(location.search).get('view')==='assets';
    let savedLayout=false;try{savedLayout=!!localStorage.getItem('citymap-layout-draft-v1');}catch{}
    if(requested||savedLayout){const {initAssetTools}=await import('./assetTools');initAssetTools();tools=Promise.resolve();}

    await import('./animation');
    document.getElementById('loading')?.remove();
    performance.measure('citymap-boot',{start:began,end:performance.now()});
    void clouds.then(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))).then(async()=>{const {buildClouds}=await import('./clouds');buildClouds();});
  } catch (error) {
    console.error(error);
    const loading = document.getElementById('loading')!;
    loading.textContent = '地图加载失败，请刷新重试，并确认浏览器已启用 WebGL / 硬件加速。';
  }
}
void boot();
