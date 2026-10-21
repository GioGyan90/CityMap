import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app').appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd2e9ff, 520, 1150);

export const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.5, 4000);
camera.position.set(-215, 172, 205);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(8, 4, 6);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.maxPolarAngle = 1.45;
controls.minDistance = 40;
controls.maxDistance = 640;
controls.panSpeed = 0.85;

export const world = new THREE.Group();
scene.add(world);

/* 灯光 */
export const hemi = new THREE.HemisphereLight(0xdff0ff, 0xffd9a8, 0.85);
scene.add(hemi);

export const sun = new THREE.DirectionalLight(0xfff4dd, 1.05);
sun.position.set(-130, 185, 130);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -230;
sun.shadow.camera.right = 230;
sun.shadow.camera.top = 230;
sun.shadow.camera.bottom = -230;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 640;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.5;
scene.add(sun);

export const fill = new THREE.DirectionalLight(0xa8d8ff, 0.35);
fill.position.set(120, 90, -120);
scene.add(fill);

/* 天空球（渐变贴图） */
export function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#1f6ecb');
  grad.addColorStop(0.34, '#5cb0ee');
  grad.addColorStop(0.62, '#a8dcf8');
  grad.addColorStop(0.86, '#e2f4ff');
  grad.addColorStop(1.00, '#fff2d8');
  g.fillStyle = grad; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1700, 24, 16),
  new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false, fog: false })
);
scene.add(sky);
