import * as THREE from 'three';
import { ORCHARD_BOARD, orchardPoint, type Bounds, type LevelDefinition } from '../game/levels';
import type { IslandArt } from './island';
import { addPuzzleCamp, createPuzzleKit } from './puzzleArtKit';

/** A single enclosed growing court: all cell and barrier footprints come from rules data. */
export function createSunseedOrchard(level: LevelDefinition): IslandArt {
  const k = createPuzzleKit(level.name), { root, landscape, m, box, ball, oval, beam, ring, leaf, flower, batch } = k;
  const { cellSize, columns, rows } = ORCHARD_BOARD;
  k.floor(level.layout.floors ?? [], m.grass);
  const board = new THREE.Group(); board.name = 'orchard-puzzle-court'; root.add(board);
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const p = orchardPoint({ column, row });
    box(board, (row + column) % 2 ? m.stone : m.cream, p.x, .015, p.z, cellSize - .075, .03, cellSize - .075);
    box(board, (row + column) % 2 ? m.soilLight : m.stone, p.x, .034, p.z, cellSize - .18, .012, cellSize - .18);
    // Inset corner marks preserve the grid read without a bright full-screen wireframe.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(board, m.cream, p.x + sx * .7, .044, p.z + sz * .67, .11, .009, .028);
      box(board, m.cream, p.x + sx * .67, .044, p.z + sz * .7, .028, .009, .11);
    }
  }
  batch(board);
  const wall = (parent: THREE.Group, bounds: Bounds, height: number) => {
    const x = (bounds.minX + bounds.maxX) / 2, z = (bounds.minZ + bounds.maxZ) / 2;
    const width = bounds.maxX - bounds.minX, depth = bounds.maxZ - bounds.minZ;
    box(parent, m.wood, x, height / 2, z, width, height, depth);
    box(parent, m.woodLight, x, height + .035, z, width + .07, .07, depth + .07);
    const alongZ = depth > width, count = Math.ceil(Math.max(width, depth) / .7);
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count;
      ball(parent, m.leafLight, alongZ ? x : THREE.MathUtils.lerp(bounds.minX, bounds.maxX, t), height + .13,
        alongZ ? THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, t) : z, .16, .13, .17);
    }
  };
  const courtWalls = new THREE.Group(); courtWalls.name = 'orchard-court-walls'; root.add(courtWalls);
  for (const solid of level.layout.solids ?? []) wall(courtWalls, solid, .63);
  wall(courtWalls, { minX: -6.3, maxX: 6.3, minZ: -4.57, maxZ: -4.5 }, .24);
  wall(courtWalls, { minX: -6.3, maxX: 6.3, minZ: 4.5, maxZ: 4.57 }, .24);
  batch(courtWalls);
  for (const [i, cell] of ORCHARD_BOARD.walls.entries()) {
    const p = orchardPoint(cell), hedge = new THREE.Group(); hedge.name = `orchard-hedge-${i}`; hedge.position.set(p.x, 0, p.z); root.add(hedge);
    box(hedge,m.dark,0,.14,0,1.7,.27,1.7); box(hedge,m.woodLight,0,.3,0,1.77,.08,1.77);
    for (const x of [-.43,.43]) for (const z of [-.43,.43]) {
      ball(hedge,m.leaf,x,.65,z,.46,.44,.46); ball(hedge,m.leafLight,x-.07,.88,z-.05,.38,.25,.38);
    }
    for (let n=0;n<5;n++) leaf(hedge,Math.sin(n*2.3)*.64,.96,Math.cos(n*2.3)*.6,.16,n);
    batch(hedge);
  }
  const symbol = (parent: THREE.Group, index: number, y: number, scale = 1) => {
    const icon = new THREE.Group(); icon.position.y = y; icon.scale.setScalar(scale); parent.add(icon);
    if (index === 0) {
      for (const [x,z] of [[-.14,-.1],[.14,-.1],[0,.14]]) oval(icon,m.berry,x,.03,z,.18,.065,.18);
      leaf(icon,.12,.08,-.26,.15,-.3);
    } else {
      for (let n=0;n<8;n++) { const a=n*Math.PI/4; oval(icon,m.gold,Math.cos(a)*.28,.03,Math.sin(a)*.28,.105,.035,.105); }
      oval(icon,m.orange,0,.05,0,.2,.08,.2);
    }
    return icon;
  };
  const beds = ORCHARD_BOARD.beds.map((cell,index) => {
    const p=orchardPoint(cell), bed=new THREE.Group(); bed.name=`orchard-bed-${index}`; bed.position.set(p.x,0,p.z); root.add(bed);
    box(bed,m.dark,0,.055,0,1.48,.07,1.48);
    for (const s of [-1,1]) {
      box(bed,index?m.gold:m.berry,s*.77,.085,0,.08,.11,1.61);
      box(bed,index?m.gold:m.berry,0,.085,s*.77,1.61,.11,.08);
    }
    for (const x of [-.45,0,.45]) box(bed,m.soil, x,.101,0,.06,.03,1.32);
    symbol(bed,index,.13,1.3); batch(bed);
    return bed;
  });
  const wetMat = k.mat('#82d8cb', { roughness:.24, metalness:.1, emissive:'#53a9a9', emissiveIntensity:.12 });
  const pods = ORCHARD_BOARD.starts.map((cell,index) => {
    const point=orchardPoint(cell), pod=new THREE.Group(); pod.name=`orchard-pod-${index}`; pod.position.set(point.x,0,point.z); root.add(pod);
    // Two runners and a ribbed seed case communicate that this is a pushable object.
    for (const x of [-.4,.4]) {
      box(pod,m.wood,x,.16,0,.15,.12,1.15);
      oval(pod,m.woodLight,x,.19,-.53,.08,.07,.16); oval(pod,m.woodLight,x,.19,.53,.08,.07,.16);
    }
    oval(pod,index?m.gold:m.berry,0,.59,0,.54,.47,.52);
    for(let n=0;n<6;n++) {
      const a=n*Math.PI/3;
      k.curve(pod,[[Math.cos(a)*.16,.23,Math.sin(a)*.16],[Math.cos(a)*.54,.53,Math.sin(a)*.52],[Math.cos(a)*.27,.94,Math.sin(a)*.26]],.028,m.woodLight,9);
    }
    for(const z of [-.59,.59]) beam(pod,[-.27,.35,z],[.27,.35,z],.045,m.wood);
    oval(pod,m.cream,0,1.02,0,.35,.065,.32); symbol(pod,index,1.08,.9);
    batch(pod);
    const water = new THREE.Group(); water.name=`orchard-pod-water-${index}`; pod.add(water);
    ring(water,wetMat,0,.2,0,.61).rotation.x=Math.PI/2;
    for(let i=0;i<3;i++) oval(water,wetMat,-.28+i*.28,.91+(i%2)*.06,.38,.045,.08,.035);
    batch(water); water.visible=false;
    const growth = new THREE.Group(); growth.name=`orchard-pod-growth-${index}`; growth.position.y=.85; pod.add(growth);
    for(let n=0;n<5;n++) {
      const a=n*Math.PI*2/5;
      k.curve(growth,[[0,0,0],[Math.cos(a)*.22,.28,Math.sin(a)*.22],[Math.cos(a)*.44,.51,Math.sin(a)*.44]],.025,m.leaf,9);
      leaf(growth,Math.cos(a)*.35,.31,Math.sin(a)*.35,.27,-a,index?m.leafLight:m.leaf);
      if(index) flower(growth,Math.cos(a)*.37,.33,Math.sin(a)*.37,.3,m.gold);
      else for(const dx of [-.05,.05]) ball(growth,m.berry,Math.cos(a)*.4+dx,.57,Math.sin(a)*.4,.09,.1,.08);
    }
    batch(growth); growth.scale.setScalar(.001);
    return {pod,water,growth};
  });
  const exit = new THREE.Group(); exit.name='orchard-exit-trellis'; root.add(exit);
  const barrier=level.layout.exitBarrier!; const gx=(barrier.minX+barrier.maxX)/2;
  for(const z of [barrier.minZ+.09,barrier.maxZ-.09]) {
    box(exit,m.wood,gx,.68,z,.19,1.36,.19); ball(exit,m.woodLight,gx,1.42,z,.15,.1,.15);
  }
  for(let i=0;i<6;i++) box(exit,m.woodLight,gx,.6,barrier.minZ+.23+i*.4,.12,1.12,.08);
  for(const y of [.35,.84]) box(exit,m.wood,gx,y,(barrier.minZ+barrier.maxZ)/2,.17,.065,barrier.maxZ-barrier.minZ);
  for(let i=0;i<7;i++) leaf(exit,gx,1.03+Math.sin(i)*.1,barrier.minZ+.2+i*.33,.18,i);
  batch(exit);
  // Raised border planters support the decorative trees outside the walkable court.
  for (const z of [-4.98,4.98]) {
    box(landscape,m.soil,0,-.39,z,12.55,.78,.83);
    box(landscape,m.woodLight,0,.025,z,12.65,.08,.89);
    box(landscape,m.grass,0,.08,z,12.45,.07,.73);
  }
  // Espalier trees live beyond the board boundary, never inside a legal push cell.
  for (const [x,z,size] of [[-4.8,-5.03,.8],[-1.6,-5.05,.78],[1.65,-5.04,.83],[4.7,-5,.78],[-3.8,5.08,.65],[.8,5.06,.64]]) {
    beam(landscape,[x,-.1,z],[x,size*1.4,z],.085,m.wood);
    for(const side of [-1,1]) {
      beam(landscape,[x,.6,z],[x+side*.5,size*1.3,z],.045,m.wood);
      ball(landscape,m.leaf,x+side*.36,size*1.32,z,.54,.46,.34);
      ball(landscape,m.leafLight,x+side*.32,size*1.62,z,.43,.37,.3);
      for(let i=0;i<3;i++) {ball(landscape,i%2?m.orange:m.gold,x+side*(.2+i*.16),size*(1.14+i*.08),z+.29,.11,.13,.1);}
    }
  }
  // The terraced courtyard has no water crossing; trim and planted margins define its silhouette.
  for(let i=0;i<20;i++) {
    const x=-5.8+i*.6;
    if(i%2) flower(landscape,x,0,4.76,.25,m.gold);
    leaf(landscape,x,.08,-4.76,.19,i*.4);
  }
  const camp=addPuzzleCamp(k,level); batch(landscape);
  const interactables:Record<string,THREE.Object3D>={};
  for(const id of level.supportedTargets) interactables[id]=k.anchor(id,level.targets[id]);
  camp.keepsakes.forEach((o,i)=>{interactables[`keepsake${i}`]=o;});
  const grown=[0,0],watered=[0,0]; let gateProgress=0;
  return {
    root,interactables,
    update(dt,time,state) {
      const blend=1-Math.exp(-dt*10);
      pods.forEach(({pod,water,growth},i)=>{
        const p=orchardPoint(state.orchard.pods[i]);
        pod.position.x=THREE.MathUtils.lerp(pod.position.x,p.x,blend); pod.position.z=THREE.MathUtils.lerp(pod.position.z,p.z,blend);
        const distance=Math.hypot(pod.position.x-p.x,pod.position.z-p.z);
        pod.rotation.z=Math.sin(time*18)*Math.min(.045,distance*.04);
        grown[i]=THREE.MathUtils.lerp(grown[i],state.orchard.grown[i]?1:0,blend);
        watered[i]=THREE.MathUtils.lerp(watered[i],state.orchard.watered[i]?1:0,blend);
        water.visible=watered[i]>.02; water.scale.setScalar(.92+watered[i]*.08);
        growth.scale.setScalar(Math.max(.001,grown[i]));
        beds[i].userData.grown=state.orchard.grown[i];
        interactables[i?'podSun':'podBerry'].position.set(p.x,0,p.z);
      });
      gateProgress=THREE.MathUtils.lerp(gateProgress,state.gate?1:0,blend);
      exit.scale.y=Math.max(.001,1-gateProgress);exit.visible=gateProgress<.995;
      camp.update(time,state);
    },
    dispose:k.dispose,
  };
}
