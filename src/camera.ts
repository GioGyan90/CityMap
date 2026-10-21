import * as THREE from 'three';
import { camera, controls } from "./scene";
import { labelObjs } from "./labels";

export const VIEWS = {
  hero:   { pos: [-215, 172, 205], target: [8, 4, 6] },
  top:    { pos: [10, 330, 6.01],    target: [10, 0, 6] },
  park:   { pos: [-72, 34, 26],    target: [-20, 8, -24] },
  port:   { pos: [-150, 52, 145],  target: [-78, 6, 82] },
  hospital: { pos: [0, 48, 24], target: [36, 8, -24] },
  hotel: { pos: [-65, 45, 85], target: [-20, 10, 32] },
  market: { pos: [-24, 38, 76], target: [8, 5, 32] },
  cafe: { pos: [0, 32, 73], target: [36, 5, 32] },
  restaurant: { pos: [-60, 34, 102], target: [-20, 5, 60] },
  civic:  { pos: [-6, 40, 66],     target: [8, 10, 6] }
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
