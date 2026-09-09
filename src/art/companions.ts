import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { CompanionId } from '../game/rescue';
import { COMPANIONS } from '../ui';

export type Character = { root: THREE.Group; mixer: THREE.AnimationMixer; clips: string[]; play: (name: string, once?: boolean) => void; update: (dt: number) => void; skill: () => void; duplicate: (height?: number) => Character; dispose: () => void };

export async function loadCharacter(name: string, height = 1.65): Promise<Character> {
  const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/characters/${name}.glb`);
  return createCharacter(name, gltf.scene, gltf.animations, height);
}

function createCharacter(name: string, template: THREE.Group, clips: THREE.AnimationClip[], height: number, ownsResources = true): Character {
  const model = clone(template);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = height / size.y;
  const center = bounds.getCenter(new THREE.Vector3());
  model.scale.multiplyScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  const root = new THREE.Group();
  root.add(model);
  root.name = name;
  model.traverse(o => {
    if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; }
  });
  const mixer = new THREE.AnimationMixer(model);
  const animations = new Map(clips.map(c => [c.name, mixer.clipAction(c)]));
  let active = '';
  let skillRemaining = 0;
  const play = (name: string, once = false) => {
    if (active === name || (!once && skillRemaining > 0)) return;
    const next = animations.get(name) ?? animations.get('Idle');
    if (!next) return;
    animations.get(active)?.fadeOut(0.16);
    next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(0.16).play();
    active = name;
  };
  play('Idle');
  return { root, mixer, clips: clips.map(c => c.name), play,
    update(dt) { skillRemaining = Math.max(0, skillRemaining - dt); mixer.update(dt); },
    skill() { const c = COMPANIONS.find(c => c.id === name); if (c) { skillRemaining = 0; play(c.clip, true); skillRemaining = 1.1; } },
    duplicate: (newHeight = height) => createCharacter(name, template, clips, newHeight, false),
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); if (ownsResources) model.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose(); m.dispose(); } } }); }
  };
}

export type Crew = Record<CompanionId, Character>;
