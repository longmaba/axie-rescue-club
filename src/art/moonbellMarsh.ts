import * as THREE from 'three';
import { MOONBEAM_LAYOUT, type LevelDefinition, type Point } from '../game/levels';
import type { IslandArt } from './island';
import { addPuzzleCamp, createPuzzleKit } from './puzzleArtKit';

/** Live optics above a pond garden; visual rays always come from the rules' current view. */
export function createMoonbellMarsh(level: LevelDefinition): IslandArt {
  const k=createPuzzleKit(level.name,true),{root,landscape,m,box,ball,oval,ring,beam,curve,leaf,flower,batch}=k;
  const floors=level.layout.floors??[];
  const inFloor=(x:number,z:number)=>floors.some(f=>x>=f.minX&&x<=f.maxX&&z>=f.minZ&&z<=f.maxZ);
  const pondShape=new THREE.Shape();
  const outline=[[-8.9,-4.9],[-7.9,-6.0],[-4.8,-6.3],[-1.3,-5.85],[2.2,-6.15],[6.5,-5.9],[7.5,-4.1],[6.9,-1.4],[7.7,1.5],[6.1,4.6],[2.2,5.4],[-1.6,4.9],[-5.9,6.05],[-8.9,5.7],[-9.35,3.1],[-8.65,.2]];
  outline.forEach(([x,z],i)=>i?pondShape.lineTo(x,-z):pondShape.moveTo(x,-z)); pondShape.closePath();
  const inPond=(x:number,z:number)=>{
    let inside=false;
    for(let i=0,j=outline.length-1;i<outline.length;j=i++) {
      const [ax,az]=outline[i],[bx,bz]=outline[j];
      if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
    }
    return inside;
  };
  const base=k.geo(new THREE.ExtrudeGeometry(pondShape,{depth:.35,bevelEnabled:false})); base.rotateX(-Math.PI/2);
  k.mesh(landscape,base,m.dark,0,-1.14,0);
  const pondGeo=k.geo(new THREE.ShapeGeometry(pondShape)); pondGeo.rotateX(-Math.PI/2);
  k.mesh(landscape,pondGeo,m.water,0,-.24,0).name='moonlit-pond';
  const edges=k.floor(floors,m.grass);
  // Narrow stone caps describe the actual shore union, without a second false walkable shoreline.
  for(const {a,b} of edges) {
    const length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(length/.65);
    for(let i=0;i<count;i++) {
      const t=(i+.5)/count,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);
      oval(landscape,m.grassLight,x,-.04,z,.22,.07,.2);
    }
  }
  const willow=(x:number,z:number,size:number)=>{
    curve(landscape,[[x,0,z],[x-.12,.65*size,z],[x+.06,1.6*size,z-.1]],.085*size,m.wood);
    ball(landscape,m.leaf,x,1.65*size,z,.66*size,.33*size,.57*size);
    ball(landscape,m.leafLight,x+.14,1.83*size,z-.08,.56*size,.3*size,.51*size);
    for(let n=0;n<7;n++) {
      const a=n*Math.PI*2/7,dx=Math.cos(a)*size,dz=Math.sin(a)*size;
      curve(landscape,[[x,1.65*size,z],[x+dx*.6,1.79*size,z+dz*.5],[x+dx*.7,1.1*size,z+dz*.64],[x+dx*.57,.53*size,z+dz*.6]],.034*size,n%2?m.leafLight:m.leaf,11);
      leaf(landscape,x+dx*.56,.6*size,z+dz*.6,.12*size,a);
    }
  };
  for(const [x,z,s] of [[-7.9,4.67,.82],[-5.85,-4.8,.73],[-4.1,-4.77,.8],[-1.35,-4.72,.7],[1.95,-4.75,.8],[5.55,-4.8,.67]]) willow(x,z,s);
  for(let i=0;i<30;i++) {
    const x=-8.25+(i*2.73)%15.3,z=-5.5+(i*1.91)%10.7;
    if(inFloor(x,z)||!inPond(x,z)||!inPond(x+.25,z+.25))continue;
    if(i%3===0) {
      const padShape=new THREE.Shape();padShape.moveTo(0,0);padShape.absarc(0,0,1,.2,Math.PI*2-.2,false);padShape.closePath();
      const padGeo=k.geo(new THREE.ShapeGeometry(padShape));padGeo.rotateX(-Math.PI/2);
      k.mesh(landscape,padGeo,m.leafLight,x,-.22,z,.3+(i%2)*.1);
      flower(landscape,x-.05,-.21,z,.18,m.pink);
    } else {
      for(let n=0;n<3;n++) {
        const h=.28+n*.14;
        beam(landscape,[x+n*.06,-.4,z],[x+.07+n*.06,h,z],.015,m.leaf);
        oval(landscape,n%2?m.pink:m.woodLight,x+.07+n*.06,h,z,.035,.1,.035);
      }
    }
  }
  // Gentle ellipses live on open pond areas, separate from the illuminated ray paths.
  for(const [x,z,s] of [[0,-3,.7],[.1,.2,.5],[5.8,1.4,.55],[-4.1,4.5,.45]]) {
    const ripple=ring(landscape,m.grassLight,x,-.225,z,s);ripple.rotation.x=Math.PI/2;ripple.scale.y*=.48;ripple.castShadow=false;
  }
  const signal=k.mat('#fff4cb',{emissive:'#dfd3ac',emissiveIntensity:.2,roughness:.3});
  const silver=k.mat('#bfd8e3',{metalness:.65,roughness:.17});
  const source=new THREE.Group();source.name='moonbeam-source';source.position.set(MOONBEAM_LAYOUT.source.x,0,MOONBEAM_LAYOUT.source.z);root.add(source);
  k.cylinder(source,m.dark,0,.13,0,.58,.25);ring(source,m.stone,0,.29,0,.53).rotation.x=Math.PI/2;
  k.cylinder(source,m.water,0,.3,0,.47,.025);
  for(let n=0;n<6;n++) {const a=n*Math.PI/3;leaf(source,Math.cos(a)*.49,.36,Math.sin(a)*.49,.2,-a,m.pink);}
  curve(source,[[0,.25,0],[0,.66,0],[.3,.87,0]],.075,m.metal,10);
  oval(source,signal,.28,.86,0,.18,.15,.15);ring(source,m.metal,.41,.86,0,.16).rotation.y=Math.PI/2;
  batch(source);
  const mirrors=MOONBEAM_LAYOUT.mirrors.map((p,i)=>{
    const mount=new THREE.Group();mount.name=`moonbeam-mirror-${i}`;mount.position.set(p.x,0,p.z);root.add(mount);
    k.cylinder(mount,m.dark,0,.07,0,.55,.13);ring(mount,m.stone,0,.155,0,.51).rotation.x=Math.PI/2;
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
      box(mount,m.metal,Math.cos(a)*.55,.2,Math.sin(a)*.55,.09,.08,.09);
    }
    k.cylinder(mount,m.metal,0,.41,0,.085,.54);batch(mount);
    const pivot=new THREE.Group();pivot.name=`moonbeam-mirror-turn-${i}`;pivot.position.y=.88;mount.add(pivot);
    box(pivot,m.wood,0,0,0,1.15,.81,.13);box(pivot,silver,0,0,.076,.97,.64,.025);box(pivot,silver,0,0,-.076,.97,.64,.025);
    for(const x of [-.55,.55]) box(pivot,m.metal,x,0,0,.055,.83,.2);
    for(const y of [-.38,.38]) box(pivot,m.metal,0,y,0,1.19,.055,.2);
    // Top edge echoes the slash/backslash visible from the gameplay camera.
    box(pivot,m.cream,0,.423,0,1.1,.035,.12);
    for(let n=0;n<=i;n++) ball(pivot,m.gold,(n-i*.5)*.12,.53,0,.04,.05,.04);
    batch(pivot);pivot.rotation.y=i===0?Math.PI/4:-Math.PI/4;return pivot;
  });
  const receiver=(point:Point,name:string,isRoot:boolean)=>{
    const group=new THREE.Group();group.name=name;group.position.set(point.x,0,point.z);root.add(group);
    k.cylinder(group,m.dark,0,.055,0,.48,.11);ring(group,m.stone,0,.13,0,.42).rotation.x=Math.PI/2;
    curve(group,[[0,.1,0],[-.09,.44,0],[0,.79,0]],.047,isRoot?m.leaf:m.metal,9);
    for(const side of [-1,1])leaf(group,side*.21,.4,0,.29,side*.5);
    batch(group);
    const glow=k.mat(isRoot?'#9db97a':'#c4b4d5',{emissive:isRoot?'#b6f09c':'#e4d6fc',emissiveIntensity:.1});
    oval(group,glow,0,.91,0,.22,.18,.22);
    const petals:THREE.Group[]=[];
    for(let n=0;n<6;n++) {
      const p=new THREE.Group();p.position.y=.82;p.rotation.order='YXZ';p.rotation.y=n*Math.PI/3;group.add(p);
      const petal=oval(p,isRoot?m.leafLight:m.pink,0,.19,.17,.15,.3,.08);petal.rotation.x=.35;petals.push(p);
    }
    return {group,glow,petals};
  };
  const rootFlower=receiver(MOONBEAM_LAYOUT.rootReceiver,'moonbeam-root-receiver',true);
  const exitFlower=receiver(MOONBEAM_LAYOUT.exitReceiver,'moonbeam-exit-receiver',false);
  const connector=new THREE.Group();connector.name='rooted-moonwalk';root.add(connector);
  const link=MOONBEAM_LAYOUT.connector, length=link.maxX-link.minX, middleZ=(link.minZ+link.maxZ)/2;
  connector.position.set(link.minX,0,middleZ);
  for(let n=0;n<7;n++) {
    const z=-.66+n*.22;
    curve(connector,[[0,-.09,z],[length*.28,-.04,z+.035],[length*.72,-.055,z-.035],[length,-.09,z]],.092,n%2?m.woodLight:m.wood,14);
  }
  for(let n=0;n<7;n++) {
    const x=(n+.5)*length/7;
    oval(connector,n%2?m.leaf:m.leafLight,x,-.028,0,.34,.04,.72);
    box(connector,m.grassLight,x,.01,0,.025,.015,1.25);
  }
  for(const z of [-.73,.73])curve(connector,[[0,-.04,z],[length*.3,.025,z],[length*.7,.02,z],[length,-.04,z]],.047,m.leafLight,12);
  batch(connector);connector.scale.x=.001;
  const exit=new THREE.Group();exit.name='moonbeam-exit-barrier';root.add(exit);
  const gateBounds=level.layout.exitBarrier!, gateZ=(gateBounds.minZ+gateBounds.maxZ)/2;
  for(const x of [gateBounds.minX+.11,gateBounds.maxX-.11]) {
    box(exit,m.wood,x,.58,gateZ,.2,1.16,.24);oval(exit,m.pink,x,1.23,gateZ,.16,.12,.17);
  }
  for(let n=0;n<7;n++)box(exit,m.woodLight,gateBounds.minX+.2+n*.2,.5,gateZ,.09,.95,.11);
  for(const y of [.25,.75])box(exit,m.metal,(gateBounds.minX+gateBounds.maxX)/2,y,gateZ,gateBounds.maxX-gateBounds.minX,.045,.15);
  batch(exit);
  // Fixed pools reuse geometry as beams reroute; no GPU resource allocation during updates.
  const glowMat=new THREE.MeshBasicMaterial({color:'#c1dbfa',transparent:true,opacity:.16,depthWrite:false});
  const coreMat=new THREE.MeshBasicMaterial({color:'#fff3c9'});k.materials.add(glowMat);k.materials.add(coreMat);
  const rayGeo=k.geo(new THREE.CylinderGeometry(1,1,1,7));
  const beamGlow=new THREE.InstancedMesh(rayGeo,glowMat,16),beamCore=new THREE.InstancedMesh(rayGeo,coreMat,16);
  beamGlow.name='moonbeam-glow-segments';beamCore.name='moonbeam-live-segments';beamGlow.frustumCulled=beamCore.frustumCulled=false;beamGlow.count=beamCore.count=0;root.add(beamGlow,beamCore);
  const rayMatrix=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3();
  const pixels=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++) {
    const offset=(y*32+x)*4,alpha=Math.max(0,1-Math.hypot((x-15.5)/15.5,(y-15.5)/15.5));
    pixels[offset]=pixels[offset+1]=pixels[offset+2]=255;pixels[offset+3]=Math.round(alpha*alpha*255);
  }
  const glowTexture=new THREE.DataTexture(pixels,32,32,THREE.RGBAFormat);k.textures.add(glowTexture);
  glowTexture.needsUpdate=true;glowTexture.magFilter=glowTexture.minFilter=THREE.LinearFilter;
  const fireflyGeo=k.geo(new THREE.BufferGeometry()),flyPositions=[];
  for(let i=0;i<34;i++)flyPositions.push(-8+(i*2.47)%14,.5+(i*.19)%1.1,-5+(i*1.67)%10);
  fireflyGeo.setAttribute('position',new THREE.Float32BufferAttribute(flyPositions,3));
  const flyMat=new THREE.PointsMaterial({map:glowTexture,color:'#fff0aa',transparent:true,opacity:.85,size:7,sizeAttenuation:false,depthWrite:false});k.materials.add(flyMat);
  const fireflies=new THREE.Points(fireflyGeo,flyMat);root.add(fireflies);
  const camp=addPuzzleCamp(k,level);batch(landscape);
  const interactables:Record<string,THREE.Object3D>={};
  for(const id of level.supportedTargets)interactables[id]=k.anchor(id,level.targets[id]);
  camp.keepsakes.forEach((o,i)=>{interactables[`keepsake${i}`]=o;});
  let rooted=0,gateProgress=0,rootLight=0,exitLight=0;
  return {
    root,interactables,
    update(dt,time,state) {
      const blend=1-Math.exp(-dt*8),view=state.moonbeamView;
      mirrors.forEach((pivot,i)=>{pivot.rotation.y=THREE.MathUtils.lerp(pivot.rotation.y,state.moonbeam.mirrors[i]===0?Math.PI/4:-Math.PI/4,blend);});
      signal.emissiveIntensity=state.moonbeam.powered?1.5:.08;
      rooted=THREE.MathUtils.lerp(rooted,state.moonbeam.rooted?1:0,blend);
      connector.scale.x=Math.max(.001,rooted);connector.visible=rooted>.003;connector.position.y=-.2*(1-rooted);
      gateProgress=THREE.MathUtils.lerp(gateProgress,state.gate?1:0,blend);
      exit.scale.y=Math.max(.001,1-gateProgress);exit.visible=gateProgress<.995;
      rootLight=THREE.MathUtils.lerp(rootLight,view.rootLit?1:0,blend);exitLight=THREE.MathUtils.lerp(exitLight,view.exitLit?1:0,blend);
      rootFlower.glow.emissiveIntensity=.08+rootLight*1.6;exitFlower.glow.emissiveIntensity=.08+exitLight*1.6;
      rootFlower.petals.forEach(p=>{p.rotation.x=.15+Math.max(rooted,rootLight*.5)*1.1;});
      exitFlower.petals.forEach(p=>{p.rotation.x=.15+exitLight*1.1;});
      beamCore.count=beamGlow.count=Math.min(16,view.segments.length);
      view.segments.slice(0,16).forEach((segment,i)=>{
        delta.set(segment.to.x-segment.from.x,0,segment.to.z-segment.from.z);const length=delta.length();
        rayMatrix.position.set((segment.from.x+segment.to.x)/2,.9,(segment.from.z+segment.to.z)/2);
        rayMatrix.quaternion.setFromUnitVectors(up,delta.normalize());
        rayMatrix.scale.set(.034,length,.034);rayMatrix.updateMatrix();beamCore.setMatrixAt(i,rayMatrix.matrix);
        rayMatrix.scale.set(.095,length,.095);rayMatrix.updateMatrix();beamGlow.setMatrixAt(i,rayMatrix.matrix);
      });
      beamCore.instanceMatrix.needsUpdate=beamGlow.instanceMatrix.needsUpdate=true;
      fireflies.position.y=Math.sin(time*.8)*.09;camp.update(time,state);
    },
    dispose:k.dispose,
  };
}
