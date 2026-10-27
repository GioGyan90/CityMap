import {createAirliner,airlinerPass} from './airliner';
import {solarClock} from './night';
import {civilParts} from './solarCycle';
import {updateFountains} from './fountains';
import {updateMarineFleet} from './marineTraffic';
import {updateTrafficInfrastructure} from './trafficInfrastructure';
import {updateClouds} from './clouds';
import {updateDayNight} from './night';
import { updateFocus, renderFocusOutline } from './focus';
import * as THREE from 'three';
import { renderer, scene, camera, controls, world } from "./scene";
import { updateWater } from './water';
import { spinWheels, movingCarts } from "./amusement";
import { boats } from "./port";
import { updateTraffic } from './traffic';
import { updateTransport } from './transport';
import { labelRenderer } from "./labels";
import { updateCamera } from "./camera";

const airliner=createAirliner();
world.add(airliner);
let motionPaused = false;
let simulationTime = 0;
document.getElementById('toggleMotion')!.addEventListener('click', (event) => {
  motionPaused = !motionPaused;
  const button = event.currentTarget as HTMLButtonElement;
  button.textContent = motionPaused ? '继续动画' : '暂停动画';
  button.setAttribute('aria-pressed', String(motionPaused));
});
export const clock = new THREE.Clock();

export function animate() {
  requestAnimationFrame(animate);

  const rawDt=clock.getDelta();
  const frameDt = Math.min(rawDt, 0.05);
  updateDayNight(rawDt);
  const dt = motionPaused||world.userData.assetView ? 0 : frameDt;
  simulationTime += dt;
  const t = simulationTime;

  const flight=airlinerPass(civilParts(solarClock.timestamp).minutes+(solarClock.timestamp%1000)/60000);
  airliner.visible=flight!==null && !world.userData.assetView;
  if(flight!==null){airliner.position.set(flight.x,flight.height,flight.z);airliner.rotation.y=flight.heading;}
  updateCamera(frameDt);
  /* 摩天轮 & 旋转木马 */
  for (const ride of spinWheels) {
    ride.rotor.rotation[ride.axis] = (ride.rotor.rotation[ride.axis] + dt * ride.speed) % (Math.PI * 2);
    for (const cabin of ride.cabins) cabin.rotation.z = -ride.rotor.rotation.z;
  }

  /* 过山车 */
  for (const c of movingCarts) {
    c.offset = (c.offset + dt * c.speed) % 1;
    const p = c.curve.getPointAt(c.offset);
    c.mesh.position.copy(p);
    const source=c.mesh.parent.userData.sourceCenter;
    if(source)c.mesh.position.sub(new THREE.Vector3().fromArray(source));
    const tan = c.curve.getTangentAt(c.offset);
    c.mesh.rotation.set(-Math.atan2(tan.y,Math.hypot(tan.x,tan.z)),Math.atan2(tan.x,tan.z),0,'YXZ');
  }

  /* 海浪 */
  updateWater(t);
  updateFountains(dt);
  updateClouds(dt);

  /* 中型作业船：保留水线以上的干舷，沿原海上走廊往返。 */
  for (const b of boats) {
    b.mesh.position.y = .12 + Math.sin(t * 1.1 + b.phase) * 0.04;
    b.mesh.rotation.z = Math.sin(t * 0.9 + b.phase) * 0.045;
    b.mesh.position.x += b.dir * b.speed * dt;
    if (b.mesh.position.x > -155) b.dir = -1;
    if (b.mesh.position.x < -220) b.dir = 1;
    b.mesh.rotation.y = b.dir > 0 ? 0 : Math.PI;
  }

  updateMarineFleet(dt);
  updateTransport(dt);
  updateTrafficInfrastructure(dt);
  updateTraffic(dt);

  /* 灯塔光束旋转 */
  const beaconLight = world.getObjectByName('lighthouse-beacon');
  if (beaconLight instanceof THREE.PointLight) beaconLight.intensity = 4 + Math.sin(t * 2.2) * 3;

  controls.update();
  if(!world.userData.assetView)updateFocus(frameDt);
  renderer.render(scene, camera);
  if(!world.userData.assetView)renderFocusOutline();
  if(!world.userData.assetView)labelRenderer.render(scene, camera);
}
animate();

/* 自适应 */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});
