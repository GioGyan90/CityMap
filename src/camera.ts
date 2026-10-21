import * as THREE from 'three';
import { camera, controls } from "./scene";
import { labelObjs } from "./labels";

export const VIEWS = {
 hero:{pos:[-225,225,320],target:[80,13,8]},top:{pos:[75,600,3.01],target:[75,0,3]},
 park:{pos:[-109,76,20],target:[-20,12,-65]},market:{pos:[-89,67,109],target:[-18,9,35]},
 hotel:{pos:[-99,70,219],target:[-12,11,140]},civic:{pos:[-24,78,103],target:[60,14,16]},
 hospital:{pos:[53,82,44],target:[138,15,-40]},cafe:{pos:[22,59,193],target:[93,9,125]},
 restaurant:{pos:[62,62,210],target:[141,10,137]},port:{pos:[48,78,279],target:[155,8,182]},
 skyline:{pos:[-64,140,-3],target:[70,42,-126]},residential:{pos:[104,111,157],target:[193,18,35]}

};

export let camTween = null;
export function flyTo(view, dur = 1.15) {
  const v = VIEWS[view] || view;
  camTween = {
    fp: camera.position.clone(),
    tp: new THREE.Vector3().fromArray(v.pos),
    ft: controls.target.clone(),
    tt: new THREE.Vector3().fromArray(v.target),
    t: 0,
    dur
  };
}

document.querySelectorAll('.toolbar button[data-view]').forEach(btn => {
  btn.addEventListener('click', () => flyTo((btn as HTMLButtonElement).dataset.view!));
});

export let labelsOn = true;
document.getElementById('toggleLabels').addEventListener('click', e => {
  labelsOn = !labelsOn;
  labelObjs.forEach(o => o.visible = labelsOn);
  (e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(labelsOn));
  (e.currentTarget as HTMLButtonElement).textContent = labelsOn ? '隐藏地名' : '显示地名';
});


export function updateCamera(dt: number) {
  /* 相机缓动 */
  if (camTween) {
    camTween.t += dt / camTween.dur;
    const k = camTween.t >= 1 ? 1 : (1 - Math.pow(1 - camTween.t, 3));
    camera.position.lerpVectors(camTween.fp, camTween.tp, k);
    controls.target.lerpVectors(camTween.ft, camTween.tt, k);
    if (camTween.t >= 1) camTween = null;
  }

}
controls.addEventListener("start", () => { camTween = null; });
