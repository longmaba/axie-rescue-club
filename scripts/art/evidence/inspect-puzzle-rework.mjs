import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import * as THREE from 'three';

const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {createIsland}=await server.ssrLoadModule('/src/art/island.ts');
  const {LEVELS,ORCHARD_BOARD,orchardPoint,MOONBEAM_LAYOUT}=await server.ssrLoadModule('/src/game/levels.ts');
  const {createOrchardState,actOnPod}=await server.ssrLoadModule('/src/game/orchard.ts');
  const {createMoonbeamState,traceMoonbeam}=await server.ssrLoadModule('/src/game/moonbeam.ts');
  const close=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`),reports=[];
  for(const level of LEVELS.slice(1)) {
    const art=createIsland(level),state={logRolled:false,bridge:false,bloom:false,leafGrown:false,leafLaunched:false,ferryProgress:0,ferrySide:'west',transport:null,talent:'root',gate:false,rescued:false,keepsakes:[],orchard:createOrchardState(),moonbeam:createMoonbeamState(),moonbeamView:{segments:[],rootLit:false,exitLit:false}};
    const settle=()=>{state.moonbeamView=traceMoonbeam(state.moonbeam);for(let i=0;i<160;i++)art.update(1/60,i/60,state);art.root.updateMatrixWorld(true);};
    const object=name=>{const obj=art.root.getObjectByName(name);assert(obj,name);return obj;};
    settle();
    for(const id of level.supportedTargets){close(art.interactables[id].position.x,level.targets[id].x);close(art.interactables[id].position.z,level.targets[id].z);}
    for(const name of ['ferry','log-bridge','curled-leaf-cradle','waterwheel','orchard-sluice','marsh-lantern-mast'])assert.equal(art.root.getObjectByName(name),undefined);
    assert.equal(art.interactables.ferry,undefined);assert.equal(art.interactables.ferrySeat0,undefined);
    if(level.puzzle==='seed-pods') {
      ORCHARD_BOARD.walls.forEach((cell,i)=>{
        const bounds=new THREE.Box3().setFromObject(object(`orchard-hedge-${i}`)),p=orchardPoint(cell);
        assert(bounds.min.x>=p.x-.9-.001&&bounds.max.x<=p.x+.9+.001);
        assert(bounds.min.z>=p.z-.9-.001&&bounds.max.z<=p.z+.9+.001);
      });
      const corner=actOnPod(state.orchard,0,'kibo',orchardPoint({column:2,row:2}));assert(corner.success);state.orchard=corner.state;settle();
      close(object('orchard-pod-0').position.z,-3.6);
      state.orchard=createOrchardState();settle();close(object('orchard-pod-0').position.z,-1.8);
      const stances=[[2,0],[2,1],[1,3],[4,4],[2,3],[3,3],[5,4],[5,3],[4,1],[3,3]],indices=[0,0,0,1,0,0,0,0,1,1];
      for(let i=0;i<stances.length;i++){
        const [column,row]=stances[i],next=actOnPod(state.orchard,indices[i],'kibo',orchardPoint({column,row}));assert(next.success,next.message);state.orchard=next.state;settle();
        const p=orchardPoint(state.orchard.pods[indices[i]]);close(object(`orchard-pod-${indices[i]}`).position.x,p.x);close(object(`orchard-pod-${indices[i]}`).position.z,p.z);
      }
      for(const i of [0,1]) {
        const wet=actOnPod(state.orchard,i,'bing',{x:0,z:0});assert(wet.success);state.orchard=wet.state;settle();
        assert(object(`orchard-pod-water-${i}`).visible);assert(object(`orchard-pod-growth-${i}`).scale.x<.002);
        const grow=actOnPod(state.orchard,i,'pomodoro',{x:0,z:0});assert(grow.success);state.orchard=grow.state;settle();close(object(`orchard-pod-growth-${i}`).scale.x,1);
      }
      state.gate=true;settle();assert.equal(object('orchard-exit-trellis').visible,false);
      state.orchard=createOrchardState();state.gate=false;settle();assert(object('orchard-exit-trellis').visible);close(object('orchard-exit-trellis').scale.y,1);
      for(const i of [0,1])assert.equal(object(`orchard-pod-water-${i}`).visible,false);
    } else {
      const assertRays=()=>{
        const rays=object('moonbeam-live-segments');assert.equal(rays.count,state.moonbeamView.segments.length);
        state.moonbeamView.segments.forEach((s,i)=>{
          const matrix=new THREE.Matrix4();rays.getMatrixAt(i,matrix);
          const a=new THREE.Vector3(0,-.5,0).applyMatrix4(matrix),b=new THREE.Vector3(0,.5,0).applyMatrix4(matrix);
          close(a.x,s.from.x);close(a.z,s.from.z);close(b.x,s.to.x);close(b.z,s.to.z);close(a.y,.9);close(b.y,.9);
        });
      };
      assert.equal(object('rooted-moonwalk').visible,false);assertRays();
      state.moonbeam={powered:true,mirrors:[1,0,1],rooted:false};settle();assert(state.moonbeamView.rootLit);assertRays();
      const light=object('moonbeam-root-receiver').children.find(o=>o.isMesh&&o.material.emissive?.getHex());assert(light.material.emissiveIntensity>1.6);
      state.moonbeam.rooted=true;state.moonbeam.mirrors[1]=1;settle();assert.equal(state.moonbeamView.rootLit,false);assertRays();
      assert(object('rooted-moonwalk').visible);close(object('rooted-moonwalk').scale.x,1);assert(light.material.emissiveIntensity<.1);
      const link=object('rooted-moonwalk');close(link.position.x,MOONBEAM_LAYOUT.connector.minX);
      state.moonbeam.mirrors[2]=0;settle();assert(state.moonbeamView.exitLit);state.gate=true;settle();assertRays();assert.equal(object('moonbeam-exit-barrier').visible,false);
      for(const i of [0,1,2])close(object(`moonbeam-mirror-turn-${i}`).rotation.y,state.moonbeam.mirrors[i]===0?Math.PI/4:-Math.PI/4);
      state.moonbeam=createMoonbeamState();state.gate=false;settle();assert.equal(object('rooted-moonwalk').visible,false);assert(object('moonbeam-exit-barrier').visible);assertRays();
    }
    const resources=new Set(),instances=[];let triangles=0,meshes=0;
    art.root.traverse(o=>{
      if(o.geometry)resources.add(o.geometry);
      if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{resources.add(m);if(m.map)resources.add(m.map);});}
      if(o.isInstancedMesh)instances.push(o);
      if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}
    });
    const disposed=new Map([...resources,...instances].map(o=>[o,0]));disposed.forEach((_,o)=>o.addEventListener('dispose',()=>disposed.set(o,disposed.get(o)+1)));
    art.dispose();assert.equal(art.root.children.length,0);assert([...disposed.values()].every(n=>n===1),'all rendered resources and instance buffers disposed once');
    reports.push({level:level.id,meshes,sourceTriangles:triangles,resourcesDisposed:resources.size,instanceBuffersDisposed:instances.length,checks:'supported anchors; no retired crossing props; physical states and undo; live rules rays; exact resource disposal',passed:true});
  }
  await writeFile('scripts/art/evidence/puzzle-rework-state.json',JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports,null,2));
} finally {await server.close();}
