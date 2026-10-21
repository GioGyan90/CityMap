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
  const obj = new CSS2DObject(div);
  obj.position.set(x, y, z);
  scene.add(obj);
  labelObjs.push(obj);
}

addLabel('游乐园', -20, 24, -24);
addLabel('政府大厅', 8, 27, 4);
addLabel('医院', 36, 24, -24);
addLabel('高档酒店', -20, 28, 32);
addLabel('市场', 8, 15, 32);
addLabel('咖啡馆', 36, 15, 32);
addLabel('餐厅', -20, 16, 60);
addLabel('海运码头', -74, 12, 86);
addLabel('灯塔', -56, 24, 100);
addLabel('住宅区', 62, 16, 20);
addLabel('海湾', -150, 6, 30, 'sea');
addLabel('山 脉', 130, 62, -10, 'mtn');

