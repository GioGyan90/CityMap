import { updateFocus } from './focus';
import * as THREE from 'three';
import { renderer, scene, camera, controls, world } from "./scene";
import { waveTex } from "./environment";
import { spinWheels, movingCarts } from "./amusement";
import { boats } from "./port";
import { cars } from "./traffic";
import { labelRenderer } from "./labels";
import { updateCamera } from "./camera";

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

  const frameDt = Math.min(clock.getDelta(), 0.05);
  const dt = motionPaused ? 0 : frameDt;
  simulationTime += dt;
  const t = simulationTime;

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
    const tan = c.curve.getTangentAt(c.offset);
    c.mesh.rotation.y = Math.atan2(tan.x, tan.z);
  }

  /* 海浪 */
  waveTex.offset.x = t * 0.006;
  waveTex.offset.y = -t * 0.004;

  /* 帆船 */
  for (const b of boats) {
    b.mesh.position.y = Math.sin(t * 1.1 + b.phase) * 0.35;
    b.mesh.rotation.z = Math.sin(t * 0.9 + b.phase) * 0.045;
    b.mesh.position.x += b.dir * b.speed * dt;
    if (b.mesh.position.x > -100) b.dir = -1;
    if (b.mesh.position.x < -230) b.dir = 1;
    b.mesh.rotation.y = b.dir > 0 ? 0 : Math.PI;
  }

  /* 汽车 */
  for (const c of cars) {
    c.t += c.dir * c.speed * dt;
    if (c.t > 1) c.t = 0;
    if (c.t < 0) c.t = 1;

    const r = c.route;
    if (r.type === 'x') {
      c.mesh.position.x = r.from + (r.to - r.from) * c.t;
      c.mesh.position.z = r.line + c.dir * 1.6;
      c.mesh.rotation.y = c.dir > 0 ? 0 : Math.PI;
    } else {
      c.mesh.position.z = r.from + (r.to - r.from) * c.t;
      c.mesh.position.x = r.line - c.dir * 1.6;
      c.mesh.rotation.y = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
  }

  /* 灯塔光束旋转 */
  const beaconLight = world.getObjectByName('lighthouse-beacon');
  if (beaconLight instanceof THREE.PointLight) beaconLight.intensity = 4 + Math.sin(t * 2.2) * 3;

  controls.update();
  updateFocus(frameDt);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

/* 自适应 */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});
