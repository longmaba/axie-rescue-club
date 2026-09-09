import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createServer } from 'vite';

const sourceServer = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { createIsland } = await sourceServer.ssrLoadModule('/src/art/island.ts');

const art = createIsland();
const state = {
  logRolled: false, bridge: false, bloom: false, leafGrown: false, leafLaunched: false,
  ferryProgress: 0, ferrySide: 'west', transport: null, talent: 'root',
  gate: false, rescued: false, keepsakes: [], campKeepsakes: 3, campVisitor: true,
  orchard: { pods: [{ column: 2, row: 1 }, { column: 4, row: 3 }], watered: [false, false], grown: [false, false], pushes: 0 },
  moonbeam: { powered: false, mirrors: [0, 1, 1], rooted: false }, moonbeamView: { segments: [], rootLit: false, exitLit: false },
};
const settle = () => { for (let i = 0; i < 240; i++) art.update(1 / 60, i / 60, state); art.root.updateMatrixWorld(true); };
const close = (actual, expected) => assert(Math.abs(actual - expected) < 0.001, `${actual} != ${expected}`);
const object = name => { const value = art.root.getObjectByName(name); assert(value, name); return value; };
const evidence = {};
settle();
assert.equal(art.interactables.ferry.visible, false);
close(object('log-bridge').position.x, -2.6);
state.logRolled = true;
settle();
close(object('log-bridge').position.x, 0);
assert.equal(object('living-bridge-roots').visible, false);
state.bridge = state.bloom = state.leafGrown = true;
settle();
assert.equal(object('living-bridge-roots').visible, true);
assert.equal(object('rose-bud-bridge-garden-connection').visible, true);
close(art.interactables.ferry.position.x, -2.3);
state.leafLaunched = true;
settle();
close(art.interactables.ferry.position.x, -0.6);
const boatSize = new THREE.Box3().setFromObject(art.interactables.ferry).getSize(new THREE.Vector3());
assert(boatSize.x <= 1.8 && boatSize.z >= 5 && boatSize.z <= 5.2);
evidence.boatSize = boatSize.toArray();
evidence.seatOffsets = [0, 1, 2, 3].map(i => art.interactables[`ferrySeat${i}`].position.toArray());
assert.deepEqual(evidence.seatOffsets, [[0, .275, -1.8], [-.12, .275, -.6], [.12, .275, .6], [0, .275, 1.8]]);
state.ferryProgress = .5;
state.transport = { from: 'west', to: 'east', phase: 'sailing', progress: .5, empty: false };
settle();
close(art.interactables.ferry.position.x, 0);
assert.equal(object('ferry-splash-wake').visible, true);
state.ferryProgress = 1; state.ferrySide = 'east'; state.transport = null;
settle();
close(art.interactables.ferry.position.x, .6);
evidence.keepsakes = [0, 1, 2].map(i => {
  const value = art.interactables[`keepsake${i}`];
  return { name: value.name, x: value.position.x, z: value.position.z, height: value.position.y };
});
assert.deepEqual(evidence.keepsakes.map(({ x, z }) => [x, z]), [[7, 1.2], [0, -2.5], [3, -4.4]]);
assert(evidence.keepsakes[1].height > 1);
let meshes = 0, triangles = 0;
art.root.traverse(value => { if (value.isMesh) { meshes++; triangles += (value.geometry.index?.count ?? value.geometry.attributes.position.count) / 3; } });
evidence.geometry = { meshes, triangles };
state.logRolled = state.bridge = state.leafGrown = state.leafLaunched = false;
settle();
assert.equal(art.interactables.ferry.visible, false);
close(object('log-bridge').position.x, -2.6);
for (let i = 0; i < 3; i++) assert.equal(object(`camp-souvenir-${i}`).visible, true);
assert.equal(object('camp-returning-friend-badge').visible, true);
evidence.passed = ['independent push/root states', 'grown/launch/midstream/east positions', 'four full-size seat offsets', 'hull bounds', 'keepsake order/height', 'camp memories preserved on construction reset'];
await writeFile('scripts/art/evidence/two-ways-state.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
art.dispose();
await sourceServer.close();
