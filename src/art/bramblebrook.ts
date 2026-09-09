import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { LevelDefinition } from '../game/levels';
import type { IslandArt } from './island';

/** An authored, miniature garden island. Rules and collision live in rescue.ts. */
export function createBramblebrook(level: LevelDefinition): IslandArt {
  const root = new THREE.Group();
  root.name = level.name;
  const { targets, layout } = level;
  const bridgeZ = (layout.bridge.minZ + layout.bridge.maxZ) / 2;
  const gardenZ = (layout.garden.minZ + layout.garden.maxZ) / 2;
  const ferryZ = level.ferryCenters.west.z;
  const campOffset = new THREE.Vector3(targets.camp.x + 7, 0, targets.camp.z - 3.5);
  const landscape = new THREE.Group();
  root.add(landscape);
  const materials: THREE.Material[] = [];
  const geometryPool = new Set<THREE.BufferGeometry>();
  const material = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...extra });
    materials.push(result);
    return result;
  };
  const m = {
    grass: material('#91bb64'), meadow: material('#a5c774'), darkGrass: material('#779f52'),
    soil: material('#a57351'), soilLight: material('#c99b6c'), stone: material('#d3c6a2'),
    stoneDark: material('#8f9d8b'), sand: material('#d9cc95'), wood: material('#916047'),
    bark: material('#6e503d'), endgrain: material('#d0a578'), rope: material('#ead3a0'),
    leaves: material('#3e8567'), leavesLight: material('#5f9e67'), leavesGold: material('#a8be62'),
    water: material('#45b8ab', { roughness: 0.26, metalness: 0.08 }),
    waterLight: material('#9fe9d6', { roughness: 0.35 }),
    cream: material('#fff0c9'), orange: material('#e69a63'), flower: material('#f7ce66'),
    pink: material('#ea9d97'), berry: material('#c26777'), teal: material('#438b81'),
    leafShadow: material('#315f50'), metal: material('#c1a471', { roughness: 0.45, metalness: 0.4 }),
    boatLeaf: material('#8ebc66', { side: THREE.DoubleSide }),
    boatRim: material('#4a9466'),
  };
  let randomSeed = 74309;
  const random = () => {
    randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  };
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometryPool.add(value); return value; };
  const sphere = geometry(new THREE.IcosahedronGeometry(1, 1));
  const smoothSphere = geometry(new THREE.SphereGeometry(1, 12, 8));
  const cube = geometry(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 10));
  const cone = geometry(new THREE.ConeGeometry(1, 1, 7));
  const ring = geometry(new THREE.TorusGeometry(1, 0.06, 5, 28));
  const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material,
    x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => {
    const value = new THREE.Mesh(geo, mat);
    value.position.set(x, y, z);
    value.scale.set(sx, sy, sz);
    value.castShadow = true;
    value.receiveShadow = true;
    parent.add(value);
    return value;
  };
  const ball = (parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number,
    sx: number, sy = sx, sz = sx) => mesh(parent, sphere, mat, x, y, z, sx, sy, sz);
  const box = (parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number,
    sx: number, sy: number, sz: number) => mesh(parent, cube, mat, x, y, z, sx, sy, sz);
  const beam = (parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, width: number, mat = m.wood) => {
    const delta = b.clone().sub(a);
    const center = a.clone().add(b).multiplyScalar(0.5);
    const value = mesh(parent, cylinder, mat, center.x, center.y, center.z, width, delta.length(), width);
    value.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return value;
  };
  const curve = (parent: THREE.Object3D, points: number[][], radius: number, mat: THREE.Material, segments = 14) => {
    const line = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    return mesh(parent, geometry(new THREE.TubeGeometry(line, segments, radius, 5, false)), mat, 0, 0, 0);
  };
  // All repeated static geometry is combined by material. Small props do not add draw calls.
  const batch = (group: THREE.Group) => {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      let part = object.geometry.clone();
      if (part.index) { const flat = part.toNonIndexed(); part.dispose(); part = flat; }
      part.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      for (const attribute of Object.keys(part.attributes)) if (attribute !== 'position' && attribute !== 'normal') part.deleteAttribute(attribute);
      const list = buckets.get(object.material) ?? [];
      list.push(part);
      buckets.set(object.material, list);
    });
    group.clear();
    for (const [mat, parts] of buckets) {
      const merged = mergeGeometries(parts);
      parts.forEach(part => part.dispose());
      if (!merged) continue;
      const combined = mesh(group, geometry(merged), mat, 0, 0, 0);
      combined.name = `batched-${mat.uuid.slice(0, 8)}`;
    }
  };
  const shape = (points: number[][]) => {
    const value = new THREE.Shape();
    points.forEach(([x, z], i) => i === 0 ? value.moveTo(x, -z) : value.lineTo(x, -z));
    value.closePath();
    return value;
  };
  const left = [[-9.1, -5.7], [-8.6, -6.2], [-4.3, -6.2], [-1.5, -6.05], [-1.5, 6.05], [-6.8, 6.2], [-8.8, 5.8], [-9.3, 4.4], [-9.3, -3.5]];
  const right = [[1.5, -6.05], [6.7, -6.2], [8.8, -5.8], [9.3, -4.8], [9.3, 4.8], [8.8, 5.9], [5.4, 6.2], [1.5, 6.05]];
  for (const [index, points] of [left, right].entries()) {
    const top = geometry(new THREE.ShapeGeometry(shape(points)));
    top.rotateX(-Math.PI / 2);
    mesh(landscape, top, index === 0 ? m.grass : m.meadow, 0, -0.025, 0);
    // Deliberate stepped strata and tapered base create the floating island silhouette.
    for (let layer = 0; layer < 3; layer++) {
      const topY = -0.05 - layer * 0.55;
      const bottomY = topY - 0.58;
      const positions: number[] = [];
      const shrinkA = 1 - layer * 0.035;
      const shrinkB = 1 - (layer + 1) * 0.035;
      const centerX = index === 0 ? -5.1 : 5.1;
      const at = (p: number[], y: number, scale: number) => [centerX + (p[0] - centerX) * scale, y, p[1] * scale];
      points.forEach((p, i) => {
        const next = points[(i + 1) % points.length];
        const a = at(p, topY, shrinkA), b = at(next, topY, shrinkA);
        const c = at(next, bottomY, shrinkB), d = at(p, bottomY, shrinkB);
        positions.push(...a, ...b, ...d, ...b, ...c, ...d);
      });
      const sides = geometry(new THREE.BufferGeometry());
      sides.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      sides.computeVertexNormals();
      const sideMat = [m.soilLight, m.soil, m.wood][layer];
      const side = mesh(landscape, sides, sideMat, 0, 0, 0);
      side.material.side = THREE.DoubleSide;
    }
    for (let i = 0; i < 23; i++) {
      const x = centerEdge(index, random());
      const z = 5.8 + random() * 0.15;
      ball(landscape, i % 3 === 0 ? m.stone : m.stoneDark, x, -0.35 - random() * 0.95, z, 0.2 + random() * 0.17, 0.15, 0.12);
    }
  }
  function centerEdge(index: number, t: number) { return index === 0 ? -8.5 + t * 6.6 : 1.9 + t * 6.6; }

  // Shallow jade river; animated glints flow into the suspended waterfall.
  const river = box(landscape, m.water, 0, -0.18, 0, 3.05, 0.16, 12.15);
  river.name = 'jade-river';
  box(landscape, m.water, 0, -0.91, 6.075, 3, 1.5, 0.1);
  const flow = new THREE.Group();
  root.add(flow);
  for (let i = 0; i < 14; i++) {
    const glint = mesh(flow, smoothSphere, m.waterLight, -1.25 + random() * 2.5, -0.08, -6 + random() * 12,
      0.045 + random() * 0.06, 0.012, 0.18 + random() * 0.18);
    glint.castShadow = false;
    glint.userData.startZ = glint.position.z;
  }
  for (let i = 0; i < 8; i++) {
    box(landscape, i % 2 ? m.waterLight : m.water, -1.26 + i * 0.36, -0.9, 6.145, 0.12 + random() * 0.12, 1.3 + random() * 0.45, 0.02);
  }

  const steppingStone = (x: number, z: number, size = 0.35) => {
    const pebble = ball(landscape, m.sand, x, 0.01, z, size, 0.035, size * 0.73);
    pebble.rotation.y = random() * 6;
  };
  const path = (points: number[][]) => {
    const line = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0, p[1])));
    const length = line.getLength();
    for (let i = 0; i < length / 0.47; i++) {
      const p = line.getPointAt(i / Math.ceil(length / 0.47));
      steppingStone(p.x + (random() - 0.5) * 0.12, p.z + (random() - 0.5) * 0.15, 0.25 + random() * 0.13);
    }
  };
  path([[targets.camp.x, targets.camp.z + .2], [-6.4, 2.5], [-4.9, bridgeZ - .5], [targets.bridge.x + .2, bridgeZ]]);
  path([[-6.3, 2], [-6, 0], [-4.4, ferryZ + .7], [targets.leaf.x, targets.leaf.z]]);
  path([[1.9, bridgeZ], [3.4, bridgeZ - .3], [targets.bloom.x, targets.bloom.z + .15], [targets.gate.x, targets.gate.z], [5.7, -2.4], [targets.traveler.x, targets.traveler.z + .5]]);
  path([[4.8, -2], [3.7, -3.2], [3, -4.4]]);
  path([[targets.dockEast.x, ferryZ], [3.3, ferryZ + .35], [targets.gate.x - .75, targets.gate.z - .2]]);

  const leaf = (parent: THREE.Object3D, x: number, y: number, z: number, size: number, angle: number, mat = m.leavesLight) => {
    const value = mesh(parent, smoothSphere, mat, x, y, z, size, size * 0.23, size * 0.43);
    value.rotation.set(0, angle, 0.3);
    return value;
  };
  const flower = (parent: THREE.Object3D, x: number, y: number, z: number, size: number, color: THREE.Material = m.flower) => {
    mesh(parent, cylinder, m.leaves, x, y + size * 0.55, z, size * 0.05, size, size * 0.05);
    for (let petal = 0; petal < 5; petal++) {
      const angle = petal * Math.PI * 2 / 5;
      const part = mesh(parent, smoothSphere, color,
        x + Math.cos(angle) * size * 0.25, y + size, z + Math.sin(angle) * size * 0.25,
        size * 0.22, size * 0.1, size * 0.18);
      part.rotation.y = -angle;
    }
    ball(parent, m.orange, x, y + size * 1.02, z, size * 0.14, size * 0.08);
    leaf(parent, x + size * 0.2, y + size * 0.5, z, size * 0.23, 0.2);
  };
  const tree = (x: number, z: number, size: number, gold = false) => {
    const crown = gold ? m.leavesGold : m.leavesLight;
    const trunk = beam(landscape, new THREE.Vector3(x, 0, z), new THREE.Vector3(x - 0.1, size * 1.5, z), size * 0.12, m.bark);
    trunk.name = 'curved-orchard-trunk';
    for (let branch = 0; branch < 3; branch++) {
      const angle = branch * 2.2;
      beam(landscape, new THREE.Vector3(x, size * 0.8, z), new THREE.Vector3(x + Math.cos(angle) * size * 0.6, size * 1.5, z + Math.sin(angle) * size * 0.5), size * 0.065, m.bark);
    }
    ball(landscape, gold ? m.leavesLight : m.leaves, x, size * 1.5, z, size * 0.84, size * 0.66, size * 0.85);
    ball(landscape, crown, x - size * 0.34, size * 1.92, z - 0.06, size * 0.72, size * 0.7, size * 0.66);
    ball(landscape, crown, x + size * 0.45, size * 1.75, z + size * 0.18, size * 0.68, size * 0.58, size * 0.65);
    ball(landscape, crown, x + 0.05, size * 2.2, z - size * 0.22, size * 0.63, size * 0.57, size * 0.61);
    for (let i = 0; i < 3; i++) {
      const angle = i * 2.1;
      beam(landscape, new THREE.Vector3(x, 0.25, z), new THREE.Vector3(x + Math.cos(angle) * size * 0.45, 0.02, z + Math.sin(angle) * size * 0.4), size * 0.09, m.bark);
    }

  };
  [[-8.25, -4.9, 1.0], [-7.3, -5.3, 1.15], [-4.8, -5.25, 1.1], [-2.85, -5.35, 0.95],
    [-8.6, -1.7, 0.85], [-8.65, 0.8, 0.72], [-3.15, 5.4, 0.6],
    [2.5, -5.5, 0.85], [4.4, -5.4, 0.8], [8.5, -5.0, 0.7], [8.65, 4.85, 0.85], [6.6, 5.5, 0.72]]
    .forEach(([x, z, size], i) => tree(x, z, size, i % 4 === 0));

  // Edge dressing deliberately leaves every game corridor and keepsake clear.
  for (let i = 0; i < 200; i++) {
    const x = -8.9 + random() * 17.8, z = -5.75 + random() * 11.5;
    if (Math.abs(x) < 1.7 || (Math.abs(z) < 4.6 && Math.abs(x) < 8.25)) continue;
    if ((x < -5.8 && z > 2) || (x > 5.8 && z < -2.8)) continue;
    const size = 0.13 + random() * 0.22;
    if (i % 4 === 0) {
      ball(landscape, i % 8 === 0 ? m.stone : m.stoneDark, x, size * 0.45, z, size * 1.3, size * 0.75, size);
    } else if (i % 3 === 0) flower(landscape, x, 0.01, z, size * 1.6, i % 2 ? m.cream : m.flower);
    else {
      for (let blade = 0; blade < 3; blade++) {
        const grass = mesh(landscape, cone, i % 2 ? m.darkGrass : m.leavesLight,
          x + (blade - 1) * 0.08, size * 0.5, z + blade * 0.04, size * 0.13, size, size * 0.12);
        grass.rotation.z = (blade - 1) * 0.3;
      }
    }
  }
  // Clusters around the river show its boundary without making navigation noisy.
  for (const side of [-1, 1]) for (const z of [-5, -3.4, -1.8, 4.2, 5.4]) {
    const x = side * 1.8;
    for (let i = 0; i < 3; i++) ball(landscape, i % 2 ? m.stone : m.stoneDark,
      x + side * i * 0.13, 0.04 + i * 0.02, z + i * 0.17, 0.16 + i * 0.04, 0.1 + i * 0.03, 0.22);
    flower(landscape, x + side * 0.4, 0, z + 0.25, 0.35, m.cream);
  }

  // Camp: a cloth A-frame, ropes, picnic rug, stacked supplies, and a little pennant line.
  const campStart = landscape.children.length;
  const tent = new THREE.Group();
  tent.position.set(-7.4, 0.02, 4.65);
  const tentVertices = new Float32Array([
    -1.08, 0, -0.8, 0, 1.45, -0.8, -1.08, 0, 0.8, 0, 1.45, -0.8, 0, 1.45, 0.8, -1.08, 0, 0.8,
    0, 1.45, -0.8, 1.08, 0, -0.8, 0, 1.45, 0.8, 1.08, 0, -0.8, 1.08, 0, 0.8, 0, 1.45, 0.8,
    -1.08, 0, 0.8, 0, 1.45, 0.8, -0.25, 0, 0.8, 0, 1.45, 0.8, 1.08, 0, 0.8, 0.25, 0, 0.8,
  ]);
  const tentGeo = geometry(new THREE.BufferGeometry());
  tentGeo.setAttribute('position', new THREE.BufferAttribute(tentVertices, 3));
  tentGeo.computeVertexNormals();
  m.orange.side = THREE.DoubleSide;
  mesh(tent, tentGeo, m.orange, 0, 0, 0);
  box(tent, m.cream, 0, 0.015, 0, 2, 0.03, 1.5);
  beam(tent, new THREE.Vector3(0, 0, 0.81), new THREE.Vector3(0, 1.58, 0.81), 0.045, m.wood);
  beam(tent, new THREE.Vector3(0, 1.48, -0.88), new THREE.Vector3(0, 1.48, 0.94), 0.045, m.wood);
  for (const side of [-1, 1]) {
    curve(tent, [[side * 0.72, 0.52, 0.7], [side * 1.2, 0.27, 1.0], [side * 1.4, 0.06, 1.16]], 0.018, m.rope);
    box(tent, m.wood, side * 1.4, 0.11, 1.16, 0.04, 0.2, 0.06);
  }
  landscape.add(tent);
  box(landscape, m.teal, -7, 0.006, 3.2, 1.4, 0.025, 1.2).rotation.y = 0.1;
  for (let i = 0; i < 5; i++) box(landscape, m.cream, -7.53 + i * 0.27, 0.025, 3.2, 0.03, 0.009, 1.04).rotation.y = 0.1;
  for (let i = 0; i < 3; i++) {
    const crate = box(landscape, m.wood, -8.1 + i * 0.4, 0.19, 2.05, 0.34, 0.36, 0.4);
    crate.rotation.y = i * 0.13;
    box(landscape, m.endgrain, -8.1 + i * 0.4, 0.32, 2.26, 0.27, 0.04, 0.025);
  }
  for (const x of [-8.35, -5.6]) beam(landscape, new THREE.Vector3(x, 0, 4.15), new THREE.Vector3(x, 2.1, 4.15), 0.037, m.wood);
  curve(landscape, [[-8.35, 2, 4.15], [-7, 1.76, 4.15], [-5.6, 2, 4.15]], 0.015, m.rope);
  for (let i = 0; i < 7; i++) {
    const x = -8.16 + i * 0.37;
    const y = 1.75 + Math.pow((x + 7) / 1.5, 2) * 0.22;
    const flagGeo = geometry(new THREE.BufferGeometry());
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([x - 0.12, y, 4.16, x + 0.12, y, 4.16, x, y - 0.27, 4.16], 3));
    flagGeo.computeVertexNormals();
    const flag = mesh(landscape, flagGeo, i % 2 ? m.cream : m.flower, 0, 0, 0);
    flag.material.side = THREE.DoubleSide;
  }
  const campScenery = new THREE.Group();
  for (const part of landscape.children.slice(campStart)) campScenery.add(part);
  campScenery.position.copy(campOffset);
  landscape.add(campScenery);

  // The bridge starts as a rolled-up bundle beside the bank and settles across the river.
  const bridge = new THREE.Group();
  bridge.name = 'log-bridge';
  root.add(bridge);
  for (const z of [-0.5, 0, 0.5]) {
    beam(bridge, new THREE.Vector3(-1.85, 0.05, z), new THREE.Vector3(1.85, 0.05, z), 0.27, m.wood);
    for (const end of [-1, 1]) {
      const face = mesh(bridge, cylinder, m.endgrain, end * 1.858, 0.05, z, 0.242, 0.02, 0.242);
      face.rotation.z = Math.PI / 2;
      const line = mesh(bridge, ring, m.wood, end * 1.872, 0.05, z, 0.14);
      line.rotation.y = Math.PI / 2;
    }
  }
  for (const x of [-1.25, 1.25]) {
    for (const z of [-0.52, 0, 0.52]) {
      const binding = mesh(bridge, ring, m.rope, x, 0.05, z, 0.285);
      binding.rotation.y = Math.PI / 2;
    }
  }
  for (let i = 0; i < 9; i++) box(bridge, m.endgrain, -1.55 + i * 0.39, 0.285, 0, 0.29, 0.055, 1.35);
  batch(bridge);
  bridge.position.set(targets.bridge.x - .1, 0.12, bridgeZ);
  bridge.rotation.y = Math.PI / 2;

  const bridgeRoots = new THREE.Group();
  bridgeRoots.name = 'living-bridge-roots';
  bridgeRoots.position.z = bridgeZ;
  root.add(bridgeRoots);
  for (const side of [-1, 1]) {
    curve(bridgeRoots, [[-2.25, 0.02, side * 0.86], [-1.65, 0.17, side * 0.65], [-0.85, 0.37, side * 0.58],
      [0, 0.21, side * 0.69], [0.95, 0.37, side * 0.56], [1.7, 0.17, side * 0.68], [2.25, 0.02, side * 0.85]], 0.075, m.leaves);
    for (const x of [-1.55, 1.55]) {
      curve(bridgeRoots, [[x - 0.3, 0.01, side * 0.95], [x - 0.08, 0.27, side * 0.78], [x + 0.1, 0.35, side * 0.45], [x + 0.2, 0.04, side * 0.2]], 0.05, m.leavesLight, 10);
      leaf(bridgeRoots, x, 0.31, side * 0.84, 0.2, side * 0.8);
    }
  }
  batch(bridgeRoots);
  bridgeRoots.scale.y = 0.001;
  const rootLessonFlowers = new THREE.Group();
  rootLessonFlowers.name = 'rose-bud-bridge-garden-connection';
  root.add(rootLessonFlowers);
  for (let i = 0; i < 6; i++) {
    const x = 1.9 + i * 0.54, z = bridgeZ + .35 - i * (bridgeZ - .55) / 5;
    flower(rootLessonFlowers, x, 0, z, 0.29 + (i % 2) * 0.08, m.pink);
    leaf(rootLessonFlowers, x - 0.12, 0.08, z, 0.15, i);
  }
  batch(rootLessonFlowers);

  // A narrow four-seat leaf ferry grows on the west cradle, then floats between fixed docks.
  for (const side of [-1, 1]) {
    const dockX = level.ferryDocks[side < 0 ? 'west' : 'east'].x;
    for (let plank = 0; plank < 6; plank++) {
      box(landscape, plank % 2 ? m.endgrain : m.wood, dockX + side * (-.83 + plank * .19), 0.08, ferryZ, 0.16, 0.11, 1.02);
    }
    for (const z of [ferryZ - .58, ferryZ + .58]) {
      mesh(landscape, cylinder, m.wood, dockX - side * .75, 0.16, z, 0.085, 0.66, 0.085);
      const tie = mesh(landscape, ring, m.rope, dockX - side * .75, 0.36, z, 0.095);
      tie.rotation.x = Math.PI / 2;
      ball(landscape, m.endgrain, dockX - side * .75, 0.51, z, 0.1, 0.055, 0.1);
    }
  }
  const curledLeaf = new THREE.Group();
  curledLeaf.name = 'curled-leaf-cradle';
  curledLeaf.position.set(targets.leaf.x, 0.1, targets.leaf.z);
  root.add(curledLeaf);
  const curlPositions: number[] = [];
  for (let step = 0; step < 24; step++) {
    const angleA = -1.2 + step / 24 * 4.6, angleB = -1.2 + (step + 1) / 24 * 4.6;
    const curlPoint = (angle: number, side: number) => [side * 0.38, 0.45 + Math.sin(angle) * 0.41, Math.cos(angle) * 0.58];
    const a = curlPoint(angleA, -1), b = curlPoint(angleA, 1), c = curlPoint(angleB, -1), d = curlPoint(angleB, 1);
    curlPositions.push(...a, ...c, ...b, ...b, ...c, ...d);
  }
  const curlGeo = geometry(new THREE.BufferGeometry());
  curlGeo.setAttribute('position', new THREE.Float32BufferAttribute(curlPositions, 3));
  curlGeo.computeVertexNormals();
  mesh(curledLeaf, curlGeo, m.boatLeaf, 0, 0, 0);
  curve(curledLeaf, [[0, 0.12, 0.76], [0, 0.02, 0.4], [0, 0.28, -0.5], [0, 0.78, -0.29], [0, 0.66, 0.35]], 0.027, m.leavesGold);
  leaf(curledLeaf, -0.45, 0.06, 0.1, 0.24, -0.5);
  batch(curledLeaf);

  const ferry = new THREE.Group();
  ferry.name = 'leaf-ferry';
  root.add(ferry);
  const leafPositions: number[] = [];
  const deckPoint = (row: number, col: number) => {
    const t = row / 20 * 2 - 1, u = col / 8 * 2 - 1;
    const width = 0.83 * Math.sqrt(Math.max(0, 1 - t * t));
    return [width * u, 0.16 + Math.pow(Math.abs(u), 4) * 0.2 + Math.pow(Math.abs(t), 6) * 0.2, t * 2.45];
  };
  for (let row = 0; row < 20; row++) for (let col = 0; col < 8; col++) {
    const a = deckPoint(row, col), b = deckPoint(row, col + 1), c = deckPoint(row + 1, col), d = deckPoint(row + 1, col + 1);
    leafPositions.push(...a, ...c, ...b, ...b, ...c, ...d);
  }
  const deckGeo = geometry(new THREE.BufferGeometry());
  deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(leafPositions, 3));
  deckGeo.computeVertexNormals();
  mesh(ferry, deckGeo, m.boatLeaf, 0, 0, 0);
  mesh(ferry, deckGeo, m.leafShadow, 0, -0.055, 0);
  const rimPoints = Array.from({ length: 33 }, (_, i) => {
    const angle = i / 32 * Math.PI * 2;
    return [Math.sin(angle) * 0.83, 0.37 + Math.pow(Math.abs(Math.cos(angle)), 6) * 0.17, Math.cos(angle) * 2.45];
  });
  curve(ferry, rimPoints, 0.05, m.boatRim, 36);
  curve(ferry, [[0, 0.43, -2.35], [0, 0.2, -1.3], [0, 0.19, 0], [0, 0.2, 1.3], [0, 0.44, 2.36]], 0.026, m.leavesGold, 20);
  for (const z of [-1.7, -0.8, 0.1, 1, 1.7]) for (const side of [-1, 1]) {
    const width = 0.77 * Math.sqrt(1 - Math.pow(z / 2.45, 2));
    curve(ferry, [[0, 0.215, z - 0.18], [side * width * 0.45, 0.235, z], [side * width, 0.32, z + 0.16]], 0.017, m.leavesGold, 8);
  }
  const seatLocations = [[0, -1.8], [-0.12, -0.6], [0.12, 0.6], [0, 1.8]];
  for (const [x, z] of seatLocations) {
    for (const dz of [-0.18, 0.18]) box(ferry, m.endgrain, x, 0.235, z + dz, 0.68, 0.075, 0.31);
    for (const dx of [-0.26, 0.26]) box(ferry, m.rope, x + dx, 0.275, z, 0.025, 0.012, 0.67);
  }
  curve(ferry, [[0, 0.43, 2.3], [0.07, 0.53, 2.48], [0.06, 0.72, 2.39]], 0.045, m.boatRim, 10);
  batch(ferry);
  ferry.visible = false;
  const ferrySeats = seatLocations.map(([x, z], i) => {
    const seat = new THREE.Object3D();
    seat.name = `ferry-seat-${i}`;
    seat.position.set(x, 0.275, z);
    ferry.add(seat);
    return seat;
  });
  const ferryWake = new THREE.Group();
  ferryWake.name = 'ferry-splash-wake';
  root.add(ferryWake);
  for (const side of [-1, 1]) {
    curve(ferryWake, [[side * 0.94, -0.04, -1.05], [side * 1.03, -0.04, -0.4], [side * 1.03, -0.04, 0.4], [side * 0.94, -0.04, 1.05]], 0.024, m.waterLight, 10);
  }
  batch(ferryWake);

  const bramble = new THREE.Group();
  const blossoms = new THREE.Group();
  root.add(bramble, blossoms);
  bramble.name = 'sleeping-vines';
  blossoms.name = 'awakened-blooms';
  bramble.position.z = blossoms.position.z = gardenZ;
  for (let i = 0; i < Math.ceil((layout.garden.maxX - layout.garden.minX) / .75); i++) {
    const x = layout.garden.minX + .35 + i * 0.75;
    curve(bramble, [[x - 0.4, 0.15, 0], [x - 0.18, 0.67, -0.1], [x + 0.15, 0.42, 0.12], [x + 0.4, 0.16, 0]], 0.07, m.leafShadow, 8);
    ball(bramble, m.leaves, x, 0.3, 0, 0.48, 0.32, 0.32);
    for (let j = 0; j < 3; j++) {
      const bud = mesh(bramble, cone, m.berry, x - 0.24 + j * 0.23, 0.67 + (j % 2) * 0.14, 0, 0.11, 0.25, 0.11);
      bud.rotation.z = (j - 1) * 0.55;
    }
    if (Math.abs(x - targets.bloom.x) > 0.9) {
      flower(blossoms, x, 0.04, 0.06, 0.52 + (i % 3) * 0.14, i % 2 ? m.pink : m.flower);
      leaf(blossoms, x, 0.15, 0.27, 0.28, i * 0.7);
    }
  }
  batch(bramble);
  batch(blossoms);
  blossoms.scale.setScalar(0.001);

  // A garden waterwheel powers the rescue gate. Its axle and paddles have their own pivot.
  const wheel = new THREE.Group();
  wheel.position.set(targets.gate.x + .03, .98, targets.gate.z - 1.05);
  wheel.name = 'waterwheel';
  root.add(wheel);
  for (const z of [-0.24, 0.24]) {
    mesh(wheel, ring, m.wood, 0, 0, z, 0.84);
    mesh(wheel, ring, m.endgrain, 0, 0, z + 0.01, 0.7);
  }
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI * 2 / 10;
    const paddle = box(wheel, m.wood, Math.cos(angle) * 0.8, Math.sin(angle) * 0.8, 0, 0.32, 0.1, 0.65);
    paddle.rotation.z = angle + Math.PI / 2;
    beam(wheel, new THREE.Vector3(0, 0, 0.19), new THREE.Vector3(Math.cos(angle) * 0.78, Math.sin(angle) * 0.78, 0.19), 0.035, m.endgrain);
  }
  const hub = mesh(wheel, cylinder, m.metal, 0, 0, 0, 0.2, 0.75, 0.2);
  hub.rotation.x = Math.PI / 2;
  batch(wheel);
  const wheelBaseStart = landscape.children.length;
  for (const z of [-2.91, -2.12]) {
    beam(landscape, new THREE.Vector3(4.7, 0, z), new THREE.Vector3(5.03, 1.08, z), 0.08, m.wood);
    beam(landscape, new THREE.Vector3(5.36, 0, z), new THREE.Vector3(5.03, 1.08, z), 0.08, m.wood);
  }
  box(landscape, m.stone, 5.04, 0.025, -2.56, 2.1, 0.1, 1.4);
  box(landscape, m.water, 5.04, 0.095, -2.56, 1.9, 0.05, 1.2);
  curve(landscape, [[5, 0.08, -2.9], [5.65, 0.07, -3.0], [6.1, 0.08, -3.15]], 0.06, m.rope);
  const wheelBase = new THREE.Group();
  for (const part of landscape.children.slice(wheelBaseStart)) wheelBase.add(part);
  wheelBase.position.set(targets.gate.x - 5, 0, targets.gate.z + 1.5);
  landscape.add(wheelBase);

  const penFencing = new THREE.Group();
  penFencing.name = 'retractable-rescue-fencing';
  root.add(penFencing);
  const post = (x: number, z: number) => {
    box(penFencing, m.wood, x, 0.51, z, 0.13, 1.02, 0.13);
    ball(penFencing, m.endgrain, x, 1.04, z, 0.12);
  };
  const pen = layout.pen;
  for (const [a, b] of [
    [[pen.minX, pen.minZ], [pen.maxX, pen.minZ]], [[pen.minX, pen.minZ], [pen.minX, pen.maxZ]], [[pen.maxX, pen.minZ], [pen.maxX, pen.maxZ]],
  ]) {
    for (let i = 0; i <= 4; i++) post(a[0] + (b[0] - a[0]) * i / 4, a[1] + (b[1] - a[1]) * i / 4);
    for (const y of [0.34, 0.75]) beam(penFencing, new THREE.Vector3(a[0], y, a[1]), new THREE.Vector3(b[0], y, b[1]), 0.035, m.rope);
  }
  batch(penFencing);
  for (const [x, z] of [[pen.minX + .04, pen.maxZ - .06], [pen.maxX - .05, pen.maxZ - .06], [pen.minX + .08, pen.minZ + .06], [pen.maxX - .07, pen.minZ + .06]]) {
    flower(landscape, x, 0, z, 0.24, m.cream);
    leaf(landscape, x + 0.08, 0.04, z + 0.06, 0.15, x);
  }
  const gate = new THREE.Group();
  gate.position.set(pen.minX, 0, pen.maxZ);
  gate.name = 'rescue-gate';
  root.add(gate);
  for (let i = 0; i < 7; i++) box(gate, m.endgrain, 0.18 + i * 0.35, 0.46, 0, 0.17, 0.86, 0.1);
  for (const y of [0.22, 0.68]) box(gate, m.wood, 1.25, y, -0.06, 2.48, 0.09, 0.08);
  beam(gate, new THREE.Vector3(0.14, 0.16, 0.07), new THREE.Vector3(2.37, 0.79, 0.07), 0.04, m.wood);
  mesh(gate, ring, m.metal, 2.14, 0.57, 0.08, 0.1);
  batch(gate);
  gate.scale.x = (pen.maxX - pen.minX) / 2.5;
  // Tiny picnic and broken supply box give the stranded traveler a story.
  const travelerPropsStart = landscape.children.length;
  box(landscape, m.cream, 7, 0.013, -4, 1.25, 0.025, 1).rotation.y = -0.11;
  box(landscape, m.orange, 8, 0.18, -4.6, 0.48, 0.35, 0.4).rotation.y = 0.17;
  box(landscape, m.endgrain, 8.23, 0.04, -4.2, 0.57, 0.04, 0.34).rotation.y = -0.38;
  flower(landscape, 6.25, 0, -4.7, 0.53, m.pink);
  const travelerProps = new THREE.Group();
  for (const part of landscape.children.slice(travelerPropsStart)) travelerProps.add(part);
  travelerProps.position.set(targets.traveler.x - 7, 0, targets.traveler.z + 4);
  landscape.add(travelerProps);

  const keepsakes: THREE.Group[] = [];
  for (const [i, point] of level.keepsakes.entries()) {
    const item = new THREE.Group();
    item.position.set(point.x, 0.56, point.z);
    item.name = ['flower-keepsake', 'sun-shell-keepsake', 'camp-bell-keepsake'][i];
    if (i === 1) {
      // Ribbed fan shell.
      for (let rib = 0; rib < 7; rib++) {
        const angle = -0.9 + rib * 0.3;
        const lobe = mesh(item, smoothSphere, rib % 2 ? m.orange : m.flower,
          Math.sin(angle) * 0.15, 0.12 + Math.cos(angle) * 0.1, 0,
          0.07, 0.28, 0.07);
        lobe.rotation.z = -angle;
      }
      ball(item, m.cream, 0, -0.08, 0, 0.1, 0.07, 0.08);
    } else if (i === 0) {
      flower(item, 0, -0.18, 0, 0.5, m.pink);
      const pin = mesh(item, ring, m.metal, 0, 0, 0, 0.28);
      pin.rotation.x = -0.7;
    } else {
      const points = [new THREE.Vector2(0, 0.31), new THREE.Vector2(0.11, 0.3), new THREE.Vector2(0.17, 0.21), new THREE.Vector2(0.19, 0.05), new THREE.Vector2(0.26, -0.03)];
      mesh(item, geometry(new THREE.LatheGeometry(points, 14)), m.flower, 0, 0, 0);
      ball(item, m.wood, 0, -0.07, 0, 0.055);
      mesh(item, ring, m.metal, 0, 0.36, 0, 0.07);
    }
    batch(item);
    keepsakes.push(item);
    root.add(item);
    const pad = mesh(landscape, ring, m.cream, point.x, i === level.ferryKeepsakeIndex ? -0.06 : 0.035, point.z, 0.43);
    pad.rotation.x = -Math.PI / 2;
    pad.castShadow = false;
  }
  // Saved postcards become small physical keepsakes at camp on later visits.
  const memoryBoard = new THREE.Group();
  memoryBoard.name = 'camp-memory-board';
  memoryBoard.position.set(-5.2 + campOffset.x, 0, 4.8 + campOffset.z);
  root.add(memoryBoard);
  for (const x of [-0.68, 0.68]) box(memoryBoard, m.wood, x, 0.53, 0, 0.08, 1.06, 0.1);
  box(memoryBoard, m.wood, 0, 0.9, 0, 1.72, 0.7, 0.12);
  box(memoryBoard, m.endgrain, 0, 1.27, 0, 1.88, 0.09, 0.18);
  for (let i = 0; i < 3; i++) {
    box(memoryBoard, m.cream, (i - 1) * 0.51, 0.9, 0.075, 0.43, 0.5, 0.016).rotation.z = (i - 1) * 0.055;
    mesh(memoryBoard, cylinder, m.metal, (i - 1) * 0.51, 1.11, 0.1, 0.023, 0.023, 0.023).rotation.x = Math.PI / 2;
  }
  batch(memoryBoard);
  const campMemories = keepsakes.map((item, i) => {
    const souvenir = item.clone(true);
    souvenir.name = `camp-souvenir-${i}`;
    souvenir.position.set((i - 1) * 0.51, 0.86, 0.16);
    souvenir.scale.setScalar(0.55);
    memoryBoard.add(souvenir);
    return souvenir;
  });
  const visitorBadge = new THREE.Group();
  visitorBadge.name = 'camp-returning-friend-badge';
  ball(visitorBadge, m.orange, -0.055, 0.04, 0, 0.08, 0.08, 0.035);
  ball(visitorBadge, m.orange, 0.055, 0.04, 0, 0.08, 0.08, 0.035);
  mesh(visitorBadge, cone, m.orange, 0, -0.05, 0, 0.1, 0.16, 0.032).rotation.z = Math.PI;
  leaf(visitorBadge, 0.04, 0.15, 0, 0.07, 0.3);
  batch(visitorBadge);
  visitorBadge.position.set(0, 1.46, 0.05);
  memoryBoard.add(visitorBadge);
  // Decorative mushrooms and curled ferns anchor the immediate foreground.
  for (const [x, z, s] of [[-4.4, 5.7, 0.6], [4.5, 5.65, 0.75], [7.6, 5.2, 0.45], [-8.4, -3.5, 0.4]]) {
    mesh(landscape, cylinder, m.cream, x, s * 0.32, z, s * 0.12, s * 0.62, s * 0.12);
    mesh(landscape, smoothSphere, m.orange, x, s * 0.61, z, s * 0.46, s * 0.21, s * 0.46);
    for (let i = 0; i < 3; i++) ball(landscape, m.cream, x + (i - 1) * s * 0.2, s * 0.78, z + (i % 2) * s * 0.15, s * 0.065, s * 0.018);
    for (let i = 0; i < 4; i++) leaf(landscape, x + 0.7, 0.12 + i * 0.035, z - 0.1, 0.24, i * 1.4);
  }

  batch(landscape);
  const anchor = (name: string, x: number, z: number) => {
    const value = new THREE.Object3D();
    value.name = `${name}-interaction-anchor`;
    value.position.set(x, 0, z);
    root.add(value);
    return value;
  };
  const interactables: Record<string, THREE.Object3D> = {
    ferry, ferrySeat0: ferrySeats[0], ferrySeat1: ferrySeats[1], ferrySeat2: ferrySeats[2], ferrySeat3: ferrySeats[3],
    keepsake0: keepsakes[0], keepsake1: keepsakes[1], keepsake2: keepsakes[2],
  };
  for (const id of level.supportedTargets) interactables[id] = anchor(id, targets[id].x, targets[id].z);
  let logProgress = 0, bridgeProgress = 0, bloomProgress = 0, gateProgress = 0, leafProgress = 0, launchProgress = 0;
  return {
    root, interactables,
    update(dt, time, state) {
      const blend = 1 - Math.exp(-dt * 5);
      logProgress = THREE.MathUtils.lerp(logProgress, state.logRolled ? 1 : 0, blend);
      bridgeProgress = THREE.MathUtils.lerp(bridgeProgress, state.bridge ? 1 : 0, blend);
      bloomProgress = THREE.MathUtils.lerp(bloomProgress, state.bloom ? 1 : 0, blend);
      gateProgress = THREE.MathUtils.lerp(gateProgress, state.gate ? 1 : 0, blend);
      leafProgress = THREE.MathUtils.lerp(leafProgress, state.leafGrown ? 1 : 0, blend);
      launchProgress = THREE.MathUtils.lerp(launchProgress, state.leafLaunched ? 1 : 0, blend);
      bridge.position.x = (targets.bridge.x - .1) * (1 - logProgress);
      bridge.rotation.y = Math.PI / 2 * (1 - logProgress);
      bridge.rotation.z = Math.sin(time * 1.3) * 0.025 * logProgress * (1 - bridgeProgress);
      bridge.position.y = 0.02 + Math.sin(logProgress * Math.PI) * 0.42;
      bridgeRoots.scale.y = Math.max(0.001, bridgeProgress);
      bridgeRoots.visible = bridgeProgress > 0.005;
      rootLessonFlowers.visible = state.talent === 'root' && bridgeProgress > 0.005;
      rootLessonFlowers.scale.y = Math.max(0.001, bridgeProgress);
      curledLeaf.visible = leafProgress < 0.99;
      curledLeaf.scale.setScalar(Math.max(0.001, 1 - leafProgress));
      ferry.visible = leafProgress > 0.005;
      ferry.scale.set(Math.max(0.001, leafProgress), Math.max(0.001, leafProgress), Math.max(0.001, leafProgress));
      const ferryX = THREE.MathUtils.lerp(level.ferryCenters.west.x, level.ferryCenters.east.x, THREE.MathUtils.clamp(state.ferryProgress, 0, 1));
      ferry.position.set(THREE.MathUtils.lerp(targets.leaf.x, ferryX, launchProgress), Math.sin(time * 1.9) * 0.016 * launchProgress, ferryZ);
      ferry.rotation.z = Math.sin(time * 1.4) * 0.012 * launchProgress;
      ferryWake.visible = state.transport?.phase === 'sailing';
      ferryWake.position.set(ferry.position.x, 0, ferryZ);
      ferryWake.scale.x = 1 + Math.sin(time * 6) * 0.025;
      bramble.scale.y = 1 - bloomProgress * 0.92;
      blossoms.scale.set(1, Math.max(0.001, bloomProgress), 1);
      gate.rotation.y = gateProgress * Math.PI / 2;
      // Unlocking releases the whole pen in the rules, so every visible rail retracts.
      penFencing.position.y = -gateProgress * 1.3;
      gate.position.y = -gateProgress * 1.3;
      if (state.gate) wheel.rotation.z -= dt * 0.85;
      else wheel.rotation.z = Math.sin(time * 0.7) * 0.025;
      for (const glint of flow.children) {
        glint.position.z = ((glint.userData.startZ + 6 + time * 0.68) % 12) - 6;
        glint.scale.x = 0.045 + (Math.sin(time * 1.3 + glint.id) + 1) * 0.02;
      }
      keepsakes.forEach((item, index) => {
        item.visible = !state.keepsakes[index];
        item.position.y = (index === level.ferryKeepsakeIndex ? 1.12 : 0.64) + Math.sin(time * 2 + index * 2) * 0.1;
        item.rotation.y = time * 0.75 + index;
      });
      campMemories.forEach((item, index) => { item.visible = index < (state.campKeepsakes ?? 0); });
      visitorBadge.visible = state.campVisitor ?? false;

    },
    dispose() {
      root.removeFromParent();
      geometryPool.forEach(resource => resource.dispose());
      materials.forEach(resource => resource.dispose());
      root.clear();
    },
  };
}
