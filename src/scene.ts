import { Sky } from 'three/addons/objects/Sky.js';
import {twilightSkyFragment} from './twilight';
import {DAY_LIGHTING} from './visualStyle';
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
scene.fog = new THREE.Fog(DAY_LIGHTING.fog, 780, 1600);

export const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.5, 4000);
camera.position.set(-225, 225, 320);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(80, 13, 8);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.maxPolarAngle = 1.45;
controls.minDistance = 40;
controls.maxDistance = 950;
controls.panSpeed = 0.85;

export const world = new THREE.Group();
scene.add(world);

/* 灯光 */
export const hemi = new THREE.HemisphereLight(DAY_LIGHTING.hemi.sky, DAY_LIGHTING.hemi.ground, DAY_LIGHTING.hemi.intensity);
scene.add(hemi);

export const sun = new THREE.DirectionalLight(DAY_LIGHTING.sun.color, DAY_LIGHTING.sun.intensity);
sun.position.fromArray(DAY_LIGHTING.sun.position);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -230;
sun.shadow.camera.right = 330;
sun.shadow.camera.top = 230;
sun.shadow.camera.bottom = -230;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 850;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.2;
scene.add(sun);

export const fill = new THREE.DirectionalLight(DAY_LIGHTING.fill.color, DAY_LIGHTING.fill.intensity);
fill.position.set(120, 90, -120);
scene.add(fill);

/* Preetham analytical sky, supplied by the pinned Three.js r160 addon. */
export const sky=new Sky();sky.name='solar-atmosphere';sky.scale.setScalar(3000);
const skyMaterial=sky.material as THREE.ShaderMaterial;
skyMaterial.uniforms.nightBlend={value:0};skyMaterial.uniforms.horizonColor={value:new THREE.Color(DAY_LIGHTING.fog)};skyMaterial.uniforms.daylight={value:1};
skyMaterial.uniforms.twilightStrength={value:0};
for(const name of ['twilightHorizon','twilightRose','twilightZenith'])skyMaterial.uniforms[name]={value:new THREE.Color()};
skyMaterial.uniforms.turbidity.value=3.5;skyMaterial.uniforms.rayleigh.value=1.8;skyMaterial.uniforms.mieCoefficient.value=.003;skyMaterial.uniforms.mieDirectionalG.value=.78;
skyMaterial.fragmentShader='uniform float nightBlend;uniform float daylight;uniform vec3 horizonColor;uniform float twilightStrength;uniform vec3 twilightHorizon;uniform vec3 twilightRose;uniform vec3 twilightZenith;\n'+skyMaterial.fragmentShader;
skyMaterial.fragmentShader=skyMaterial.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );',twilightSkyFragment);
scene.add(sky);
