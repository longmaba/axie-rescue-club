import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

declare global {
  interface Window {
    portraitReady: boolean;
    portraitInfo: { id: string; frames: number; calls: number; triangles: number };
  }
}

const id = new URLSearchParams(location.search).get('id') ?? 'kibo';
if (!['kibo', 'pomodoro', 'bing'].includes(id)) throw new Error(`Unsupported portrait character: ${id}`);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(384, 384);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#ffffff', '#668071', 2.4));
const key = new THREE.DirectionalLight('#fff1d6', 3);
key.position.set(-3, 6, 5);
scene.add(key);

const gltf = await new GLTFLoader().loadAsync(`/assets/characters/${id}.glb`);
const model = gltf.scene;
const holder = new THREE.Group();
holder.add(model);
scene.add(holder);
model.traverse(object => {
  if (object instanceof THREE.Mesh) object.frustumCulled = false;
});
const mixer = new THREE.AnimationMixer(model);
const idle = gltf.animations.find(clip => clip.name === 'Idle');
if (!idle) throw new Error(`${id}: no Idle animation`);
mixer.clipAction(idle).play();
mixer.setTime(0.18);
// Measure the deformed Idle pose, because its silhouette differs from the bind pose.
model.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(model, true);
const scale = 1.65 / bounds.getSize(new THREE.Vector3()).y;
const center = bounds.getCenter(new THREE.Vector3());
model.scale.multiplyScalar(scale);
model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
holder.rotation.y = -0.2;
holder.updateMatrixWorld(true);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
camera.position.set(0, 1.6, 3.6);
camera.lookAt(0, 0.83, 0);
await renderer.compileAsync(scene, camera);

// Keep presenting a fixed pose to the browser compositor. The artifact is captured
// from the actual visible canvas, avoiding the intermittent render-target readback.
let frames = 0;
function render() {
  renderer.render(scene, camera);
  frames++;
  window.portraitInfo = { id, frames, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  window.portraitReady = frames >= 12;
  requestAnimationFrame(render);
}
render();
