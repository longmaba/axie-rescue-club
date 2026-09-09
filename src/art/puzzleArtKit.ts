import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Bounds, LevelDefinition, Point } from '../game/levels';
import type { IslandState } from './island';

/** Shared authoring tools for the two puzzle courts. Bramblebrook keeps its original kit. */
export function createPuzzleKit(name: string, moon = false) {
  const root = new THREE.Group(); root.name = name;
  const landscape = new THREE.Group(); root.add(landscape);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const geo = <T extends THREE.BufferGeometry>(g: T): T => { geometries.add(g); return g; };
  const mat = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: .87, ...extra }); materials.add(m); return m;
  };
  const m = {
    grass: mat(moon ? '#547e78' : '#b2bf6b'), grassLight: mat(moon ? '#739590' : '#c8cd87'),
    soil: mat(moon ? '#535d73' : '#a67650'), soilLight: mat(moon ? '#798692' : '#d0a678'),
    stone: mat(moon ? '#adb4c4' : '#dfcf9f'), dark: mat(moon ? '#4c526d' : '#70553d'),
    wood: mat(moon ? '#777081' : '#926d45'), woodLight: mat(moon ? '#b3a4b8' : '#d7ac75'),
    leaf: mat(moon ? '#397276' : '#578d52'), leafLight: mat(moon ? '#71a9a4' : '#8eb568'),
    cream: mat('#fff0d0'), gold: mat('#eabe58'), berry: mat('#aa648b'),
    pink: mat(moon ? '#c1acdd' : '#e59d99'), orange: mat('#e59a59'),
    water: mat(moon ? '#3d7e92' : '#58b8b2', { roughness: .28, metalness: .08 }),
    metal: mat('#c7ad78', { roughness: .4, metalness: .4 }),
  };
  const boxGeo = geo(new THREE.BoxGeometry(1, 1, 1));
  const sphereGeo = geo(new THREE.IcosahedronGeometry(1, 1));
  const smoothGeo = geo(new THREE.SphereGeometry(1, 12, 8));
  const cylinderGeo = geo(new THREE.CylinderGeometry(1, 1, 1, 12));
  const ringGeo = geo(new THREE.TorusGeometry(1, .065, 5, 32));
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
    x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => {
    const obj = new THREE.Mesh(geometry, material); obj.position.set(x, y, z); obj.scale.set(sx, sy, sz);
    obj.castShadow = obj.receiveShadow = true; parent.add(obj); return obj;
  };
  const box = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => mesh(parent, boxGeo, material, x, y, z, sx, sy, sz);
  const ball = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => mesh(parent, sphereGeo, material, x, y, z, sx, sy, sz);
  const oval = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => mesh(parent, smoothGeo, material, x, y, z, sx, sy, sz);
  const cylinder = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz = sx) => mesh(parent, cylinderGeo, material, x, y, z, sx, sy, sz);
  const ring = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, radius: number) => mesh(parent, ringGeo, material, x, y, z, radius);
  const beam = (parent: THREE.Object3D, a: number[], b: number[], radius: number, material: THREE.Material = m.wood) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const center = start.clone().add(end).multiplyScalar(.5);
    const obj = cylinder(parent, material, center.x, center.y, center.z, radius, delta.length());
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return obj;
  };
  const curve = (parent: THREE.Object3D, points: number[][], radius: number, material: THREE.Material, segments = 12) => {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(parent, geo(new THREE.TubeGeometry(path, segments, radius, 5, false)), material, 0, 0, 0);
  };
  const leaf = (parent: THREE.Object3D, x: number, y: number, z: number, size: number, angle = 0, material: THREE.Material = m.leafLight) => {
    const obj = oval(parent, material, x, y, z, size, size * .19, size * .43); obj.rotation.set(0, angle, .2); return obj;
  };
  const flower = (parent: THREE.Object3D, x: number, y: number, z: number, size: number, material: THREE.Material = m.pink) => {
    cylinder(parent, m.leaf, x, y + size * .5, z, size * .05, size);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      oval(parent, material, x + Math.cos(a) * size * .23, y + size, z + Math.sin(a) * size * .23, size * .2, size * .08, size * .2);
    }
    ball(parent, m.gold, x, y + size * 1.05, z, size * .12, size * .065);
    leaf(parent, x + size * .2, y + size * .42, z, size * .22);
  };
  const batch = (group: THREE.Group) => {
    group.updateMatrixWorld(true); const inverse = group.matrixWorld.clone().invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    group.traverse(o => {
      if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
      let part = o.geometry.clone();
      if (part.index) { const flat = part.toNonIndexed(); part.dispose(); part = flat; }
      part.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      for (const a of Object.keys(part.attributes)) if (a !== 'position' && a !== 'normal') part.deleteAttribute(a);
      const bucket = buckets.get(o.material) ?? []; bucket.push(part); buckets.set(o.material, bucket);
    });
    group.clear();
    for (const [material, parts] of buckets) {
      const combined = mergeGeometries(parts); parts.forEach(p => p.dispose());
      if (combined) mesh(group, geo(combined), material, 0, 0, 0);
    }
  };
  const anchor = (name: string, point: Point) => {
    const o = new THREE.Object3D(); o.name = `${name}-interaction-anchor`; o.position.set(point.x, 0, point.z); root.add(o); return o;
  };
  /** Tile a union of rectangles without overlapping faces or false internal cliff walls. */
  const floor = (floors: readonly Bounds[], topMaterial: THREE.Material = m.grass) => {
    const xs = [...new Set(floors.flatMap(f => [f.minX, f.maxX]))].sort((a, b) => a - b);
    const zs = [...new Set(floors.flatMap(f => [f.minZ, f.maxZ]))].sort((a, b) => a - b);
    const occupied = (x: number, z: number) => floors.some(f => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ);
    const edges: { a: Point; b: Point }[] = [];
    const surface: number[] = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1], x = (x0 + x1) / 2, z = (z0 + z1) / 2;
      if (!occupied(x, z)) continue;
      surface.push(x0,0,z0, x0,0,z1, x1,0,z0, x1,0,z0, x0,0,z1, x1,0,z1);
      if (!occupied(x0 - .001, z)) edges.push({ a: { x: x0, z: z1 }, b: { x: x0, z: z0 } });
      if (!occupied(x1 + .001, z)) edges.push({ a: { x: x1, z: z0 }, b: { x: x1, z: z1 } });
      if (!occupied(x, z0 - .001)) edges.push({ a: { x: x0, z: z0 }, b: { x: x1, z: z0 } });
      if (!occupied(x, z1 + .001)) edges.push({ a: { x: x1, z: z1 }, b: { x: x0, z: z1 } });
    }
    const faces = (vertices: number[], material: THREE.Material) => {
      const g = geo(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.computeVertexNormals();
      return mesh(landscape, g, material, 0, 0, 0);
    };
    faces(surface, topMaterial).name = 'puzzle-floor-union';
    for (const [top, bottom, material] of [[0,-.15,topMaterial],[-.15,-.36,m.soilLight],[-.36,-.78,m.soil],[-.78,-.9,m.dark]] as const) {
      const sides: number[] = [];
      for (const { a, b } of edges) sides.push(a.x,top,a.z, b.x,top,b.z, a.x,bottom,a.z, b.x,top,b.z, b.x,bottom,b.z, a.x,bottom,a.z);
      faces(sides, material);
    }
    for (const { a, b } of edges) {
      const length = Math.hypot(a.x - b.x, a.z - b.z);
      for (let i = 0; i < Math.ceil(length / .55); i++) {
        const t = (i + .5) / Math.ceil(length / .55), x = THREE.MathUtils.lerp(a.x, b.x, t), z = THREE.MathUtils.lerp(a.z, b.z, t);
        ball(landscape, m.stone, x, -.34, z, .18 + (i % 3) * .04, .11, .15);
      }
    }
    return edges;
  };
  const dispose = () => {
    root.traverse(o => { if (o instanceof THREE.InstancedMesh) o.dispose(); });
    root.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); root.clear();
  };
  return { root, landscape, m, geo, mat, mesh, box, ball, oval, cylinder, ring, beam, curve, leaf, flower, batch, anchor, floor, dispose, materials, textures };
}

export type PuzzleKit = ReturnType<typeof createPuzzleKit>;

export function addPuzzleCamp(k: PuzzleKit, level: LevelDefinition) {
  const { root, landscape, m, box, beam, oval, ring, flower, batch } = k;
  const c = level.targets.camp;
  box(landscape, m.cream, c.x, .015, c.z, 1.35, .03, .95);
  for (const x of [-.52, 0, .52]) box(landscape, m.pink, c.x + x, .033, c.z, .055, .008, .88);
  // Camp canopy sits behind the interaction pad, leaving the approach clear.
  const tent = new THREE.Group(); tent.position.set(c.x, 0, c.z + 1.05); root.add(tent);
  const cloth = k.geo(new THREE.BufferGeometry());
  cloth.setAttribute('position', new THREE.Float32BufferAttribute([
    -.8,0,-.42, 0,1.1,-.42, -.8,0,.42, 0,1.1,-.42, 0,1.1,.42, -.8,0,.42,
    0,1.1,-.42, .8,0,-.42, 0,1.1,.42, .8,0,-.42, .8,0,.42, 0,1.1,.42,
  ], 3)); cloth.computeVertexNormals();
  k.mesh(tent, cloth, k.mat('#dda268', { side: THREE.DoubleSide }), 0, 0, 0);
  beam(tent, [0,0,.48], [0,1.18,.48], .035); beam(tent, [0,1.13,-.48], [0,1.13,.55], .04);
  batch(tent);
  const keepsakes = level.keepsakes.map((p, index) => {
    const item = new THREE.Group(); item.name = `puzzle-keepsake-${index}`; item.position.set(p.x, .65, p.z); root.add(item);
    if (index === 0) { flower(item, 0, -.18, 0, .44); ring(item, m.metal, 0, 0, 0, .26).rotation.x = -.7; }
    else if (index === 1) {
      for (let i = 0; i < 7; i++) { const a = -.9 + i * .3; oval(item, i % 2 ? m.gold : m.orange, Math.sin(a) * .14, .1 + Math.cos(a) * .1, 0, .065, .26, .065).rotation.z = -a; }
    } else {
      const profile = [new THREE.Vector2(0,.3),new THREE.Vector2(.12,.28),new THREE.Vector2(.17,.1),new THREE.Vector2(.24,-.02)];
      k.mesh(item, k.geo(new THREE.LatheGeometry(profile, 14)), m.gold, 0, 0, 0); ring(item,m.metal,0,.34,0,.07); k.ball(item,m.wood,0,-.04,0,.055);
    }
    batch(item); ring(landscape, m.cream, p.x, .03, p.z, .35).rotation.x = Math.PI / 2; return item;
  });
  const board = new THREE.Group(); board.name = 'camp-memory-board'; board.position.set(c.x - .64, 0, c.z - .7); root.add(board);
  for (const x of [-.36,.36]) box(board,m.wood,x,.37,0,.07,.74,.08);
  box(board,m.woodLight,0,.66,0,.93,.48,.09); batch(board);
  const memories = keepsakes.map((o,i) => { const souvenir=o.clone(true); souvenir.position.set((i-1)*.26,.67,.1); souvenir.scale.setScalar(.36); board.add(souvenir); return souvenir; });
  const badge = k.ball(board,m.orange,0,1,0,.1,.08,.04);
  box(landscape,m.cream,level.targets.traveler.x,.012,level.targets.traveler.z,1.1,.025,.85);
  return {
    keepsakes,
    update(time: number, state: IslandState) {
      keepsakes.forEach((o,i) => { o.visible=!state.keepsakes[i]; o.position.y=.66+Math.sin(time*1.8+i)*.08; o.rotation.y=time*.5+i; });
      memories.forEach((o,i)=> {o.visible=i<(state.campKeepsakes??0);}); badge.visible=state.campVisitor??false;
    },
  };
}
