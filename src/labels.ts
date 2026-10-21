import { setLabelFocus, togglePinnedFocus } from './focus';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { scene } from "./scene";

export const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

export const labelObjs = [];
export function addLabel(text, x, y, z, cls = '') {
  const div = document.createElement('div');
  div.className = 'lbl ' + cls;
  div.textContent = text;
  const ids: Record<string,string> = {'游乐园':'park','政府大厅':'civic','医院':'hospital','高档酒店':'hotel','市场':'market','咖啡馆':'cafe','餐厅':'restaurant','海运码头':'port','灯塔':'port','金融中心':'commercial','海岸学院':'campus','豪华邮轮':'cruise','台球用品市场':'market','海滨酒店':'hotel','港口餐饮区':'port','市中心商业区':'commercial'};
  if (ids[text]) {
    div.dataset.special=ids[text];div.tabIndex=0;div.setAttribute('role','button');div.setAttribute('aria-label',`聚焦${text}`);
    div.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')setLabelFocus(ids[text]);});
    div.addEventListener('pointerleave',()=>setLabelFocus(null));
    div.addEventListener('focus',()=>{if(div.matches(':focus-visible'))setLabelFocus(ids[text]);});
    div.addEventListener('blur',()=>setLabelFocus(null));
    div.addEventListener('click',()=>togglePinnedFocus(ids[text]));
    div.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePinnedFocus(ids[text]);}});
  }
  const obj = new CSS2DObject(div);
  obj.position.set(x, y, z);
  scene.add(obj);
  labelObjs.push(obj);
}

addLabel('游乐园', -20, 24, -24);
addLabel('政府大厅', 8, 27, 4);
addLabel('医院', 36, 24, -24);
addLabel('海滨酒店', -20, 28, 32);
addLabel('台球用品市场', 8, 15, 32);
addLabel('咖啡馆', 36, 15, 32);
addLabel('餐厅', -20, 16, 60);
addLabel('港口餐饮区', -74, 12, 86);
addLabel('灯塔', -56, 24, 100);
addLabel('山麓住宅', 172, 16, 102);
addLabel('海湾', -150, 6, 30, 'sea');
addLabel('山 脉', 258, 68, -10, 'mtn');


addLabel('市中心商业区', 36, 109, -108);
addLabel('海岸学院', 144, 27, 24);
addLabel('城市花园', 88, 12, 46);

addLabel('豪华邮轮',-101,30,72);
