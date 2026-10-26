import {STATION_ORIGIN} from './coastalStationPlan';
import {terrainHeight,ZONES} from './layout';
import {surfaceHeight} from './terrainSurface';
import * as THREE from 'three';
import { camera, controls, world } from "./scene";
import { labelObjs } from "./labels";

const housing=world.userData.residential?.courts?.find(c=>c.homes.length===5),busStop=world.userData.busStops?.[0];
const housingView=housing?{pos:[housing.garden[0]+42,surfaceHeight(housing.garden[0],housing.garden[1])+35,housing.garden[1]+48],target:[housing.garden[0],surfaceHeight(housing.garden[0],housing.garden[1])+3,housing.garden[1]]}:{pos:[90,55,25],target:[60,4,-20]};
const busStopView=busStop?{pos:[busStop.x+Math.sin(busStop.heading)*17,busStop.y+10,busStop.z+Math.cos(busStop.heading)*17],target:[busStop.x,busStop.y+1.5,busStop.z]}:housingView;
const parkingLots=world.userData.streetLife?.parkingLots??[];
const lot=parkingLots.find(p=>p.z>40)??parkingLots[0];
const parkingView=(()=>{if(!lot)return {pos:[-64,140,-3],target:[70,42,-126]};const dx=lot.x-lot.serves[0],dz=lot.z-lot.serves[1],length=Math.hypot(dx,dz),y=surfaceHeight(lot.x,lot.z);return {pos:[lot.x+dx/length*33,y+28,lot.z+dz/length*33],target:[lot.x,y+2,lot.z]};})();
const hillStation=world.children.filter(o=>o.name==='elevated-rail-station').sort((a,b)=>b.position.z-a.position.z)[0]?.position;
export const VIEWS = {
 police:{pos:[43,26,173],target:[12,7,137]},
 commercial:{pos:[130,69,-39],target:[77,24,-102]},
 commercialStreet:{pos:[122,10,-96],target:[77,10,-102]},
 station:{pos:[hillStation.x-48,hillStation.y+32,hillStation.z+50],target:[hillStation.x,hillStation.y+2,hillStation.z]},
 parking:parkingView,
 coaststation:{pos:[STATION_ORIGIN.x-30,STATION_ORIGIN.y+24,STATION_ORIGIN.z+36],target:[STATION_ORIGIN.x+7,STATION_ORIGIN.y+3,STATION_ORIGIN.z-2]},
 housing:housingView,busStop:busStopView,
 traffic:{pos:[65,53,86],target:[22,4,40]},
 crossing:{pos:[-92,24,80],target:[-58,2,57]},
 hero:{pos:[-225,225,320],target:[80,13,8]},top:{pos:[75,600,3.01],target:[75,0,3]},
 park:{pos:[-109,76,20],target:[-20,12,-87.4]},market:{pos:[-78,45,70],target:[-18,8,15]},hall2:{pos:[-59,29,100],target:[-18,5,57]},
 fishmarket:{pos:[-42,30,97],target:[-87,3,57]},
 hall1:{pos:[-54,29,18],target:[-20,7,-20]},hall3:{pos:[35,40,-79],target:[ZONES.hall3.x,20,ZONES.hall3.z]},hall4:{pos:[144,34,7],target:[174,12,-32]},hall5:{pos:[143,30,128],target:[112,7,167]},
 hotel:{pos:[-64,45,187],target:[-17,14,140]},civic:{pos:[-24,78,103],target:[60,14,16]},
 hospital:{pos:[87,52,10],target:[138,13,-48]},cafe:{pos:[22,59,193],target:[93,9,125]},
 promenade:{pos:[-96,29,127],target:[-67,4,98]},
 restaurant:{pos:[62,62,210],target:[141,10,137]},port:{pos:[48,78,279],target:[155,8,182]},
 speedboats:{pos:[-240,60,-40],target:[-168,1,-140]},
 tunnels:{pos:[-96,48,-112],target:[-47,7,-166]},
 cargo:{pos:[-173,65,-76],target:[-95,7,-140]},passenger:{pos:[-166,46,210],target:[-90,6,151]},
 cruise:{pos:[-170,54,242],target:[-106,12,180]},
 skyline:{pos:[-64,140,-3],target:[70,42,-126]},residential:{pos:[207,94,86],target:[ZONES.villa.x,terrainHeight(ZONES.villa.x,ZONES.villa.z)+5,ZONES.villa.z]},
 lighthouse:{pos:[301,93,104],target:[254,terrainHeight(254,50)+10,50]}

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
