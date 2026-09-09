import './styles.css';
import * as THREE from 'three';
import { RescueGame, type Point, type TargetId } from './game/rescue';
import { isLevelId, type Cardinal, type LevelId } from './game/levels';
import { createIsland } from './art/island';
import { loadCharacter, type Crew, type Character } from './art/companions';
import { GameUI, COMPANIONS, icon } from './ui';
import { AudioSystem } from './systems/AudioSystem';

const requestedLevel = new URLSearchParams(location.search).get('level');
const game = new RescueGame(isLevelId(requestedLevel) ? requestedLevel : 'bramblebrook');
document.title = `Axie Rescue Club · ${game.level.name}`;
const audio = new AudioSystem();
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const events = new AbortController();
const eventOptions = { signal: events.signal };
let queuedTarget: TargetId | null = null;
let selectedTarget: TargetId | null = null;
let loaded = false;
let ended = false;
let puzzleOverview = false;
let worldTime = 0;
let previousFrame = performance.now();
let animationFrame = 0;
let crew: Crew;
let traveler: Character;
let campVisitor: Character;
const keys = new Set<string>();
const gameUI = new GameUI(game, {
  start: () => { if (!loaded) return; void audio.unlock(); game.start(); audio.chime(); },
  select: (id) => { if (!loaded) return; void audio.unlock(); game.select(id); audio.chime(); },
  interact: () => interact(),
  pause: () => { game.pause(); keys.clear(); },
  resume: () => { gameUI.closeHelp(); game.resume(); },
  restart: () => { queuedTarget = null; selectedTarget = null; keys.clear(); gameUI.closeHelp(); game.restart(); resetCrew(); },
  mute: () => { void audio.unlock(); return audio.toggle(); },
  help: () => { gameUI.showHelp(); keys.clear(); },
  journal: () => { gameUI.showJournal(); keys.clear(); },
  inspectTarget: (id) => navigateTo(id),
  hint: () => { gameUI.closeHelp(); game.resume(); game.getHint(); },
  resetPaths: () => { gameUI.closeHelp(); game.resume(); if (game.resetConstructions()) { queuedTarget = null; selectedTarget = null; resetCrew(); audio.chime(); } },
  setTalent: (id) => { if (game.setTalent(id)) audio.chime(); },
  expeditions: () => { gameUI.showExpeditions(); keys.clear(); },
  chooseLevel: (id) => changeLevel(id),
  standSide: (id, side) => navigateTo(id, side),
  undo: () => { if (game.undoPuzzle()) { keys.clear(); audio.chime(); } },
  overview: () => { puzzleOverview = !puzzleOverview; resize(); updateCamera(10); return puzzleOverview; },
});

let renderer: THREE.WebGLRenderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch { gameUI.error('This adventure needs WebGL 2. Please try a browser with hardware acceleration enabled.'); throw new Error('WebGL renderer unavailable'); }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.23;
renderer.setClearColor('#f4edda', 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const hemisphere = new THREE.HemisphereLight('#fff4d7', '#7e9f84', 2.7); scene.add(hemisphere);
const sunlight = new THREE.DirectionalLight('#fff0cf', 3.1);
sunlight.position.set(-8, 18, 9);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
Object.assign(sunlight.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 1, far: 50 });
sunlight.shadow.normalBias = .06;
sunlight.shadow.bias = -.0001;
scene.add(sunlight);
const fill = new THREE.DirectionalLight('#cbe7e6', .7); fill.position.set(10, 6, -10); scene.add(fill);
let island = createIsland(game.level); scene.add(island.root);
function applyLevelLighting() {
  const marsh = game.level.theme === 'marsh';
  hemisphere.color.set(marsh ? '#e4dcff' : '#fff4d7'); hemisphere.groundColor.set(marsh ? '#547d86' : '#7e9f84'); hemisphere.intensity = marsh ? 1.8 : 2.7;
  sunlight.color.set(marsh ? '#c9bbef' : '#fff0cf'); sunlight.intensity = marsh ? 2 : 3.1;
  fill.color.set(marsh ? '#b0e6e4' : '#cbe7e6'); fill.intensity = marsh ? .8 : .7;
  renderer.toneMappingExposure = marsh ? 1.16 : 1.23;
}
applyLevelLighting();
const camera = new THREE.OrthographicCamera(-15, 15, 10, -10, .1, 150);
const cameraTarget = new THREE.Vector3(0, -.25, 0);
const cameraOffset = new THREE.Vector3(16, 23, 22);
const raycaster = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const mouse = new THREE.Vector2();
const hit = new THREE.Vector3();
const projected = new THREE.Vector3();
let width = innerWidth; let height = innerHeight;
let mobile = width <= 700;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize() {
  width = innerWidth; height = innerHeight; mobile = width <= 700;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(width, height);
  const aspect = width / height;
  const halfHeight = mobile ? puzzleOverview ? 22 : 11 : Math.max(11.15, 7.7 * height / Math.max(220, height - 310), 18.1 / aspect);
  camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
  camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize, eventOptions);
function updateCamera(dt: number) {
  const target = new THREE.Vector3(0, .5, 0);
  if (mobile && puzzleOverview) target.y = 2.5;
  else if (mobile && game.state.phase !== 'intro') target.set(game.state.position.x * .87, -.2, game.state.position.z * .65);
  cameraTarget.lerp(target, reducedMotion ? 1 : 1 - Math.exp(-3 * dt));
  camera.position.copy(cameraTarget).add(cameraOffset); camera.lookAt(cameraTarget); camera.updateMatrixWorld();
}
updateCamera(1);

const labels = document.querySelector('#world-labels')!;
const markers = new Map<TargetId, HTMLButtonElement>();
for (const id of Object.keys(game.targets) as TargetId[]) {
  const marker = document.createElement('button'); marker.className = 'world-marker'; marker.dataset.target = id;
  marker.addEventListener('click', () => navigateTo(id), eventOptions);
  labels.append(marker); markers.set(id, marker);
}
const helpCall = document.createElement('span'); helpCall.className = 'traveler-call'; helpCall.textContent = '!'; labels.append(helpCall);
const campLabel = document.createElement('span'); campLabel.className = 'world-location'; campLabel.innerHTML = `${icon('home')} CLUB CAMP`; labels.append(campLabel);
const labelIcons: Record<TargetId, string> = { bridge: 'bridge', bloom: 'flower', gate: 'drop', traveler: 'heart', camp: 'home', leaf: 'leaf', dockWest: 'boat', dockEast: 'boat', podBerry: 'berry', podSun: 'sun', source: 'drop', mirrorA: 'mirror', mirrorB: 'mirror', mirrorC: 'mirror', rootReceiver: 'flower', exitReceiver: 'lantern' };
function navigateTo(id: TargetId, side?: Cardinal) {
  if (!loaded || game.state.phase !== 'playing' || game.state.transport) return;
  void audio.unlock();
  selectedTarget = id; queuedTarget = id;
  gameUI.focusTarget(id);
  const approach = game.getApproachPoint(id, side);
  if (!approach || !game.moveTo(approach)) { queuedTarget = null; if (!approach) game.inspect(id); }
}
function screenPoint(p: Point, y = 0) {
  projected.set(p.x, y, p.z).project(camera);
  return { x: (projected.x * .5 + .5) * width, y: (-projected.y * .5 + .5) * height };
}
function positionLabel(el: HTMLElement, p: Point, y: number, clamp = false) {
  const screen = screenPoint(p, y);
  let x = screen.x; let z = screen.y;
  if (clamp) { x = THREE.MathUtils.clamp(x, mobile ? 112 : 295, width - (mobile ? 112 : 160)); z = THREE.MathUtils.clamp(z, mobile ? 250 : 145, height - (mobile ? 230 : 240)); }
  el.style.left = `${x}px`; el.style.top = `${z}px`;
}
function updateLabels() {
  const s = game.state;
  const available = game.getAvailableTargets();
  const navigation = document.querySelector<HTMLElement>(game.level.puzzle === 'brook' ? '.route-notes' : '#feature-notes')!;
  const markerTop = mobile ? Math.max(260, navigation.getBoundingClientRect().bottom + 26) : 155;
  const occupied: { x: number; y: number }[] = [];
  const ordered = [...markers].sort(([a], [b]) => (a === selectedTarget ? -1 : b === selectedTarget ? 1 : Math.hypot(game.targets[a].x - s.position.x, game.targets[a].z - s.position.z) - Math.hypot(game.targets[b].x - s.position.x, game.targets[b].z - s.position.z)));
  for (const [id, marker] of ordered) {
    const label = game.getTargetLabel(id);
    const p = screenPoint(game.targets[id], .75);
    const inFrame = p.x > (mobile ? 55 : 305) && p.x < width - 65 && p.y > markerTop && p.y < height - (mobile ? 240 : 215);
    const overlaps = occupied.some(other => Math.abs(p.x - other.x) < 125 && Math.abs(p.y - other.y) < 46);
    marker.hidden = s.phase !== 'playing' || !!s.transport || !available.includes(id) || (id === 'camp' && !s.rescued) || !inFrame || overlaps;
    if (!marker.hidden) occupied.push(p);
    if (marker.dataset.label !== label) { marker.innerHTML = `${icon(labelIcons[id])}<span>${label}</span>`; marker.dataset.label = label; }
    marker.setAttribute('aria-label', `Inspect ${label}`);
    marker.classList.toggle('inspected', selectedTarget === id);
    positionLabel(marker, game.targets[id], .75);
  }
  helpCall.hidden = s.rescued || (mobile && s.phase !== 'intro'); positionLabel(helpCall, game.targets.traveler, 2.3);
  campLabel.hidden = mobile; positionLabel(campLabel, { x: game.targets.camp.x - .2, z: game.targets.camp.z + 2.1 }, .12);
}

const selectRing = new THREE.Mesh(new THREE.RingGeometry(.56, .62, 48), new THREE.MeshBasicMaterial({ color: '#f0d07f', side: THREE.DoubleSide, transparent: true, opacity: .95, depthWrite: false }));
selectRing.rotation.x = -Math.PI / 2; selectRing.position.y = .075; scene.add(selectRing);
const destination = new THREE.Mesh(new THREE.RingGeometry(.13, .2, 24), new THREE.MeshBasicMaterial({ color: '#fff6c6', transparent: true, opacity: .8, depthWrite: false }));
destination.rotation.x = -Math.PI / 2; destination.visible = false; scene.add(destination);
let destinationLife = 0;
type Particle = { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number };
const particleGeometry = new THREE.IcosahedronGeometry(.065, 0);
const particles: Particle[] = [];
const particleMaterials = ['#f4c366', '#d9e49d', '#fff4c9', '#a0d7d4'].map(color => new THREE.MeshBasicMaterial({ color }));
function burst(p: Point, count = 22) {
  if (reducedMotion) count = 6;
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(particleGeometry, particleMaterials[i % 4]); mesh.position.set(p.x, .5, p.z); scene.add(mesh);
    particles.push({ mesh, velocity: new THREE.Vector3((Math.random() - .5) * 2.8, 1.3 + Math.random() * 2, (Math.random() - .5) * 2.8), life: 1.1 + Math.random() * .5 });
  }
}
function interact(target?: TargetId) {
  if (!loaded) return;
  void audio.unlock();
  const selectedIsNear = selectedTarget && Math.hypot(game.targets[selectedTarget].x - game.state.position.x, game.targets[selectedTarget].z - game.state.position.z) <= game.getActionRange(selectedTarget) && game.getAvailableTargets().includes(selectedTarget);
  const result = game.interact(target ?? (selectedIsNear ? selectedTarget! : undefined));
  if (result.success) { crew[game.state.active].skill(); audio.chime(result.kind === 'camp' ? 'win' : 'action'); burst(game.state.position, result.kind === 'camp' ? 60 : 24); }
}
function resetCrew() {
  if (!loaded) return;
  const p = game.state.position;
  // A northward line fits the full party throughout the camp's reset area.
  facing = 0;
  trail.length = 0;
  if (game.level.puzzle === 'brook') trail.push({ ...p }, { x: p.x, z: p.z - TRAVELER_GAP });
  else trail.push(...game.getFormationTrail(TRAVELER_GAP));
  COMPANIONS.forEach((c, i) => { const point = trailPoint(i * WALKING_GAP); crew[c.id].root.position.set(point.x, 0, point.z); crew[c.id].root.rotation.y = facing; });
  COMPANIONS.forEach((c, i) => { crewOffsets[c.id] = i * WALKING_GAP; });
  travelerJoined = game.state.rescued;
  lastTransportStage = '';
  wasTransporting = false;
  travelerTrail.length = 0;
  if (game.state.rescued) {
    const point = trailPoint(TRAVELER_GAP); traveler.root.position.set(point.x, 0, point.z);
    travelerTrail.push({ ...p });
  } else traveler.root.position.set(game.targets.traveler.x, 0, game.targets.traveler.z);
  lastX = p.x; lastZ = p.z;
  destination.visible = false;
  lastNavigationRevision = game.state.navigationRevision;
}

function changeLevel(id: LevelId) {
  if (!loaded || !isLevelId(id) || !game.loadLevel(id)) return;
  keys.clear(); queuedTarget = null; selectedTarget = null;
  gameUI.prepareLevel();
  puzzleOverview = false; resize();
  scene.remove(island.root); island.dispose(); island = createIsland(game.level); scene.add(island.root);
  applyLevelLighting();
  for (const particle of particles) scene.remove(particle.mesh);
  particles.length = 0; worldTime = 0; lastKeepsakes = 0; destinationLife = 0;
  campVisitor.root.position.set(game.targets.camp.x - .6, 0, game.targets.camp.z - .7);
  resetCrew(); updateCamera(10);
  document.title = `Axie Rescue Club · ${game.level.name}`;
  const address = new URL(location.href); address.searchParams.set('level', id); history.replaceState(null, '', address);
  void audio.unlock(); audio.chime();
}

canvas.addEventListener('pointerdown', event => {
  if (game.state.phase !== 'playing' || event.button > 0) return;
  void audio.unlock(); queuedTarget = null; selectedTarget = null;
  mouse.set(event.clientX / width * 2 - 1, -(event.clientY / height) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.ray.intersectPlane(ground, hit) && game.moveTo({ x: hit.x, z: hit.z })) { destination.position.set(hit.x, .1, hit.z); destinationLife = 1.3; destination.visible = true; }
}, eventOptions);
window.addEventListener('keydown', event => {
  if ((event.target as HTMLElement).matches('input,textarea')) return;
  const code = event.code;
  if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','Space','KeyZ','Escape','Digit1','Digit2','Digit3'].includes(code)) event.preventDefault();
  if (event.repeat) return;
  if (code === 'Escape') { if (!document.querySelector<HTMLElement>('#modal-layer')!.hidden) { gameUI.closeHelp(); game.resume(); } else game.pause(); keys.clear(); }
  if (game.state.phase !== 'playing') return;
  void audio.unlock();
  if (code === 'KeyE' || code === 'Space') { queuedTarget = null; interact(); }
  if (code === 'KeyZ' && game.undoPuzzle()) { keys.clear(); audio.chime(); }
  if (/^Digit[123]$/.test(code)) { game.select(COMPANIONS[Number(code.slice(-1)) - 1].id); audio.chime(); }
  keys.add(code);
}, eventOptions);
window.addEventListener('keyup', event => keys.delete(event.code), eventOptions);
window.addEventListener('blur', () => { keys.clear(); game.pause(); }, eventOptions);
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); game.pause(); } }, eventOptions);

async function load() {
  let count = 0;
  const results = await Promise.all([...COMPANIONS.map(c => c.id), 'sapidae-f-a'].map(async name => {
    const character = await loadCharacter(name, name === 'sapidae-f-a' ? 1.6 : 1.65); gameUI.loading(++count); return [name, character] as const;
  }));
  crew = Object.fromEntries(results.filter(([name]) => name !== 'sapidae-f-a')) as Crew;
  traveler = results.find(([name]) => name === 'sapidae-f-a')![1];
  campVisitor = traveler.duplicate(1.3); campVisitor.root.position.set(game.targets.camp.x - .6, 0, game.targets.camp.z - .7); campVisitor.root.rotation.y = .8;
  campVisitor.root.name = 'returning-camp-friend'; campVisitor.root.visible = gameUI.campSummary.visitor; scene.add(campVisitor.root);
  for (const c of COMPANIONS) { scene.add(crew[c.id].root); gameUI.setPortrait(c.id, `${import.meta.env.BASE_URL}assets/characters/${c.id}-portrait.png`); }
  scene.add(traveler.root); loaded = true; resetCrew();
  await renderer.compileAsync(scene, camera);
  gameUI.ready();
}
void load().catch(error => { console.error('Character loading failed', error); gameUI.error('A character could not finish loading. Check your connection and try again.'); });

let lastX = game.state.position.x; let lastZ = game.state.position.z;
let lastNavigationRevision = game.state.navigationRevision;
let lastKeepsakes = 0; let frameCount = 0; let frameTotal = 0;
let facing = .62;
const trail: Point[] = [];
const WALKING_GAP = 1.6;
const DOCK_GAP = 1.05;
const TRAVELER_GAP = WALKING_GAP * 3;
const crewOffsets: Record<string, number> = { kibo: 0, pomodoro: WALKING_GAP, bing: WALKING_GAP * 2 };
let travelerJoined = false;
const travelerTrail: Point[] = [];
let lastTransportStage = '';
let wasTransporting = false;
const boardingPositions = Array.from({ length: 4 }, () => new THREE.Vector3());
const deckPosition = new THREE.Vector3();
const landingOffsets = [{ x: 0, z: 0 }, { x: 0, z: -DOCK_GAP }, { x: 0, z: -DOCK_GAP * 2 }, { x: 0, z: .95 }];

function renderTransport(dt: number): boolean {
  const s = game.state; const transit = s.transport;
  if (!transit || transit.empty) {
    if (wasTransporting) {
      // Rebuild a trail along this bank so followers never chase the old river crossing.
      const dock = game.ferryDocks[s.ferrySide]; trail.length = 0;
      // Seed only the occupied, safe landing span; walking will extend it.
      trail.push({ ...dock }, { x: dock.x, z: dock.z - DOCK_GAP * 2 });
      [s.active, ...COMPANIONS.filter(c => c.id !== s.active).map(c => c.id)].forEach((id, i) => { crewOffsets[id] = i * DOCK_GAP; });
      travelerTrail.length = 0;
      lastX = s.position.x; lastZ = s.position.z;
    }
    wasTransporting = false; lastTransportStage = '';
    return false;
  }
  wasTransporting = true;
  const actorOrder = [crew[s.active], ...COMPANIONS.filter(c => c.id !== s.active).map(c => crew[c.id]), traveler];
  if (lastTransportStage !== transit.phase && transit.phase === 'boarding') actorOrder.forEach((actor, i) => boardingPositions[i].copy(actor.root.position));
  lastTransportStage = transit.phase;
  const t = transit.progress * transit.progress * (3 - 2 * transit.progress);
  actorOrder.forEach((actor, i) => {
    if (i === 3 && !s.rescued) return;
    const seat = island.interactables[`ferrySeat${i}`];
    if (seat) seat.getWorldPosition(deckPosition);
    else deckPosition.set(THREE.MathUtils.lerp(game.ferryCenters.west.x, game.ferryCenters.east.x, s.ferryProgress) + (i % 2 ? .37 : -.37), .275, game.ferryCenters.west.z + (i < 2 ? -.64 : .64));
    if (transit.phase === 'boarding') actor.root.position.lerpVectors(boardingPositions[i], deckPosition, t);
    else if (transit.phase === 'sailing') actor.root.position.copy(deckPosition);
    else {
      const dock = game.ferryDocks[transit.to]; const offset = landingOffsets[i];
      actor.root.position.set(THREE.MathUtils.lerp(deckPosition.x, dock.x + offset.x, t), THREE.MathUtils.lerp(deckPosition.y, 0, t), THREE.MathUtils.lerp(deckPosition.z, dock.z + offset.z, t));
    }
    const direction = transit.to === 'east' ? Math.PI / 2 : -Math.PI / 2;
    actor.root.rotation.y = direction;
    actor.play(transit.phase === 'sailing' ? 'Idle' : 'Walk'); actor.update(dt);
  });
  if (s.rescued) travelerJoined = true;
  return true;
}
function trailPoint(distance: number): Point {
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1]; const b = trail[i]; const segment = Math.hypot(b.x - a.x, b.z - a.z);
    if (segment >= distance) { const t = segment ? distance / segment : 0; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }; }
    distance -= segment;
  }
  return trail.at(-1) ?? game.state.position;
}
function frame(now: number) {
  if (ended) return;
  const realDt = (now - previousFrame) / 1000; const dt = Math.min(realDt, .05); previousFrame = now;
  if (game.state.phase !== 'paused') worldTime += dt;
  if (loaded) {
    if (lastNavigationRevision !== game.state.navigationRevision) {
      keys.clear(); queuedTarget = null; selectedTarget = null; gameUI.focusTarget(null); resetCrew();
    }
    let right = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    let forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    if (right || forward) { queuedTarget = null; selectedTarget = null; const length = Math.hypot(right, forward); right /= length; forward /= length; game.move(right * .809 - forward * .588, -right * .588 - forward * .809, dt); }
    game.update(dt);
    if (queuedTarget && game.state.phase === 'playing') { const t = game.targets[queuedTarget]; if (Math.hypot(t.x - game.state.position.x, t.z - game.state.position.z) < game.getActionRange(queuedTarget) - .05) { const target = queuedTarget; queuedTarget = null; game.inspect(target); } }
    island.update(game.state.phase === 'paused' ? 0 : dt, worldTime, { ...game.state, moonbeamView: game.getMoonbeamView(), campKeepsakes: gameUI.campSummary.keepsakes, campVisitor: gameUI.campSummary.visitor });
    const s = game.state; const dx = s.position.x - lastX; const dz = s.position.z - lastZ;
    const moving = Math.hypot(dx, dz) > .001;
    if (moving) facing = Math.atan2(dx, dz);
    if (!trail.length || Math.hypot(s.position.x - trail[0].x, s.position.z - trail[0].z) >= .06) { trail.unshift({ ...s.position }); if (trail.length > 120) trail.pop(); }
    const actorDt = s.phase === 'paused' ? 0 : dt;
    const riding = renderTransport(actorDt);
    if (!riding) {
    const followers = COMPANIONS.filter(c => c.id !== s.active);
    let trailLength = 0;
    for (let i = 1; i < trail.length; i++) trailLength += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].z - trail[i - 1].z);
    // Spread out as the leader builds a safe trail away from the narrow dock.
    const walkingGap = Math.min(WALKING_GAP, trailLength / followers.length);
    for (const c of COMPANIONS) {
      const actor = crew[c.id]; const followerIndex = followers.findIndex(f => f.id === c.id);
      const desiredOffset = followerIndex < 0 ? 0 : walkingGap * (followerIndex + 1);
      crewOffsets[c.id] = THREE.MathUtils.damp(crewOffsets[c.id], desiredOffset, 8, actorDt);
      const point = crewOffsets[c.id] < .025 ? s.position : trailPoint(crewOffsets[c.id]);
      const tx = point.x; const tz = point.z;
      const dist = Math.hypot(tx - actor.root.position.x, tz - actor.root.position.z);
      const yaw = dist > .025 ? Math.atan2(tx - actor.root.position.x, tz - actor.root.position.z) : facing;
      if (s.phase !== 'paused') actor.root.position.set(tx, 0, tz);
      let diff = yaw - actor.root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); actor.root.rotation.y += diff * (1 - Math.exp(-10 * actorDt));
      actor.play(s.phase === 'playing' && (moving || dist > .2) ? 'Run' : 'Idle'); actor.update(actorDt);
    }
    if (s.rescued) {
      if (!travelerJoined) { burst(game.targets.traveler, 12); travelerJoined = true; travelerTrail.push({ ...s.position }); }
      const latest = travelerTrail.at(-1);
      if (!latest || Math.hypot(latest.x - s.position.x, latest.z - s.position.z) > .08) travelerTrail.push({ ...s.position });
      let pathLength = 0; let from: Point = { x: traveler.root.position.x, z: traveler.root.position.z };
      for (const point of travelerTrail) { pathLength += Math.hypot(point.x - from.x, point.z - from.z); from = point; }
      let advance = Math.max(0, Math.min(pathLength - (s.phase === 'won' ? .4 : TRAVELER_GAP), actorDt * 4.5));
      const walking = advance > .001 && s.phase !== 'paused';
      while (advance > .001 && travelerTrail.length) {
        const point = travelerTrail[0]; const dx = point.x - traveler.root.position.x; const dz = point.z - traveler.root.position.z; const distance = Math.hypot(dx, dz);
        if (distance > .001) traveler.root.rotation.y = Math.atan2(dx, dz);
        if (distance <= advance) { traveler.root.position.set(point.x, 0, point.z); travelerTrail.shift(); advance -= distance; }
        else { traveler.root.position.x += dx / distance * advance; traveler.root.position.z += dz / distance * advance; advance = 0; }
      }
      traveler.play(walking ? 'Run' : 'Idle');
    } else traveler.play('Idle');
    traveler.update(s.phase === 'paused' ? 0 : dt);
    }
    campVisitor.root.visible = gameUI.campSummary.visitor;
    campVisitor.update(actorDt);
    lastX = s.position.x; lastZ = s.position.z;
    selectRing.position.x = crew[s.active].root.position.x; selectRing.position.z = crew[s.active].root.position.z;
    selectRing.scale.setScalar(1 + (reducedMotion ? 0 : Math.sin(worldTime * 3) * .035));
    const kept = s.keepsakes.filter(Boolean).length;
    if (kept > lastKeepsakes) { audio.chime('collect'); burst(s.position); } lastKeepsakes = kept;
  }
  if (!loaded) island.update(dt, worldTime, { ...game.state, moonbeamView: game.getMoonbeamView(), campKeepsakes: gameUI.campSummary.keepsakes, campVisitor: gameUI.campSummary.visitor });
  updateCamera(dt); updateLabels(); gameUI.update();
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); } else { p.velocity.y -= dt * 2.8; p.mesh.position.addScaledVector(p.velocity, dt); p.mesh.scale.setScalar(Math.min(1, p.life * 2)); } }
  destinationLife -= dt; if (destinationLife < 0) destination.visible = false;
  renderer.render(scene, camera);
  frameCount++; frameTotal += realDt;
  animationFrame = requestAnimationFrame(frame);
}
animationFrame = requestAnimationFrame(frame);

const debugAllowed = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
if (debugAllowed) {
  Object.assign(window, { __RESCUE__: {
    snapshot: () => ({ ...structuredClone(game.state), loaded, nearby: game.getNearbyTarget(), objective: game.getObjective(), moonbeamView: game.getMoonbeamView(), canUndoPuzzle: game.canUndoPuzzle }),
    project: (x: number, z: number) => screenPoint({ x, z }),
    get targets() { return structuredClone(game.targets); }, get keepsakes() { return structuredClone(game.keepsakes); },
    diagnostics: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, fps: frameCount / frameTotal, dpr: renderer.getPixelRatio(), clips: loaded ? Object.fromEntries(COMPANIONS.map(c => [c.id, crew[c.id].clips])) : {}, audio: { muted: audio.muted }, actors: loaded ? [...COMPANIONS.map(c => ({ id: c.id, position: crew[c.id].root.position.toArray() })), { id: 'traveler', position: traveler.root.position.toArray() }] : [], camp: gameUI.campSummary }),
  } });
}
if (import.meta.hot) import.meta.hot.dispose(() => {
  ended = true; cancelAnimationFrame(animationFrame); events.abort(); gameUI.dispose(); audio.dispose(); island.dispose();
  if (loaded) { COMPANIONS.forEach(c => crew[c.id].dispose()); traveler.dispose(); campVisitor.dispose(); }
  particleGeometry.dispose(); particleMaterials.forEach(m => m.dispose()); renderer.dispose();
});
