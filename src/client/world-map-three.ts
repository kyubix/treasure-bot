import * as THREE from 'three';
import {boardTiles} from '../engine/types.ts';
import type {GameState} from '../engine/types.ts';
import {createWorldBoard3D,BOARD_SURFACE_Y,tileBoardCorners} from './world-map-board.ts';
import {boardPathFrame} from '../engine/map-shapes.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';
import {createCascadingWaterfall} from './world-map-waterfall.ts';
import {createWorldAmbience} from './world-map-environment.ts';
import {createWorldActors} from './world-map-actors.ts';
import {createAnimatedOcean,WAVE_INTERVAL_MS} from './world-map-water.ts';
import {createTerrainMesh, addTerrainDetail, terrainHeight, terrainRadius} from './world-map-terrain.ts';
import {createStageFoundation,createStageApron,createStageDecorations} from './world-map-stage.ts';
import {createDetailedForest} from './world-map-vegetation.ts';
import {createDetailedStageLandmarks} from './world-map-landmarks.ts';
import type {DetailedLandmarkStage} from './world-map-landmarks.ts';

/**
 * One original, camera-orbitable island shared by WebGL scenery and Phaser's
 * interactive overlay. Every marker and board tile is projected by THIS camera.
 * This optional layer never owns gameplay or changes GameState.
 */
export type ScreenPoint={x:number;y:number};

/** The one shared mapping between authoritative logical coordinates and 3D. */
export function siteWorldPosition(x:number,y:number,elevation?:number,shape:MapShapeId='RING'):THREE.Vector3{
  const wx=(x-2)*1.16,wz=(y-2)*1.16;
  // The interactive target is a point ON the island surface, not inside
  // a mountain. The explicit elevation override remains available.
  const surfaceY=Math.max(.48,terrainHeight(wx,wz,shape)+.10);
  return new THREE.Vector3(wx,elevation??surfaceY,wz);
}
export function boardTileWorldPosition(index:number,radius=3.48,elevation=BOARD_SURFACE_Y+.015,
 count=28,shape:MapShapeId='RING'):THREE.Vector3{
  const point=boardPathFrame(index/count,shape,radius);
  return new THREE.Vector3(point.x,elevation,point.z);
}
export interface WorldThreeLayer {
  readonly actors3D:true;
  readonly board3D:true;
  syncActors(state:GameState|null):void;
  draw(width:number,height:number):boolean;
  projectSite(x:number,y:number,elevation?:number):ScreenPoint;
  projectTile(index:number,elevation?:number):ScreenPoint;
  tilePolygon(index:number):ScreenPoint[];
  orbit(deltaX:number,deltaY:number):void;
  zoom(amount:number):void;
  rotateBy(radians:number):void;
  visible(value:boolean):void;
  dispose():void;
}

const sandy = new THREE.MeshStandardMaterial({color:0xf4d49a,roughness:1});
const rim = new THREE.MeshStandardMaterial({color:0xc29d63,roughness:.94});
const water = new THREE.MeshStandardMaterial({color:0x28a1bf,roughness:.32,metalness:.09,flatShading:true});
const foam = new THREE.MeshBasicMaterial({color:0xb7e9dc,transparent:true,opacity:.70,side:THREE.DoubleSide});
const temple = new THREE.MeshStandardMaterial({color:0xe7ddbc,roughness:1,flatShading:true});
const white = new THREE.MeshStandardMaterial({color:0xf2eee1,roughness:1});
const red = new THREE.MeshStandardMaterial({color:0xd35f5d,roughness:1});

const place=(o:THREE.Object3D,x:number,y:number,z:number)=>{
  o.position.set(x,y,z);return o;
};
function seeded(n:number):number{return (Math.sin(n*74.37+11.27)*25711.71)%1 + (Math.sin(n*74.37+11.27)*25711.71 < 0 ? 1 : 0);}
function disk(radius:number,material:THREE.Material,y:number,x:number,z:number):THREE.Mesh{
  const m=new THREE.Mesh(new THREE.CircleGeometry(radius,48),material);
  m.rotation.x=-Math.PI/2;
  m.position.set(x,y,z);
  return m;
}
function ruins(root:THREE.Group,x:number,z:number):void{
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.37,.43,.13,8),rim);
  place(base,x,.13,z);root.add(base);
  for(let k=0;k<4;k++){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.049,.063,.48,6),temple);
    place(col,x+(k%2? .22:-.22),.43,z+(k<2?.20:-.20));root.add(col);
  }
  const roof=new THREE.Mesh(new THREE.BoxGeometry(.59,.11,.58),temple);
  place(roof,x,.73,z);root.add(roof);
}
function lighthouse(root:THREE.Group,x:number,z:number):void{
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(.085,.14,.63,9),white);
  place(tower,x,.37,z);root.add(tower);
  const stripe=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.15,9),red);
  place(stripe,x,.39,z);root.add(stripe);
  const top=new THREE.Mesh(new THREE.ConeGeometry(.20,.18,9),red);
  place(top,x,.80,z);root.add(top);
}
function island(scene:THREE.Scene,shape:MapShapeId='RING'):THREE.Group{
  const root=new THREE.Group();
  root.name='stage-island-'+shape.toLowerCase();
  scene.add(root);

  // A solid platform follows the EXACT board path, including its four
  // lobes/ellipse. The foundation closes the previously exposed ocean seam.
  // One apron joins the organic terrain edge to the inner board trim.
  root.add(createStageFoundation(shape));
  root.add(createStageApron(shape));
  root.add(createTerrainMesh(shape));
  addTerrainDetail(root,shape);

  // Single compact turquoise lagoon in a clearing with a real shoreline.
  root.add(disk(.69,sandy,.446,.75,.61));
  root.add(disk(.59,water,.459,.75,.61));
  const pondFoam=new THREE.Mesh(new THREE.RingGeometry(.54,.62,36),foam);
  pondFoam.rotation.x=-Math.PI/2;place(pondFoam,.75,.464,.61);root.add(pondFoam);
  // V6 waterfall follows the same heightfield as the cliff and ends inside
  // the lagoon. The previous free-standing vertical blue boxes are removed.

  // Two instanced, sculpted canopy types replace the old many-draw-call
  // primitive forests; every trunk still anchors to the live heightfield.
  root.add(createDetailedForest(shape));
  // More scenic differentiation with only ONE additional draw call.
  // Coastal boulders on Clover; pale shells and reeds on Lagoon.
  if(shape!=='RING'){
    const palette=shape==='LAGOON'?[0xe6d0a4,0x8bc9a7,0x72b3b5]:
      [0x7a9b75,0x6f826a,0xb6bc8a];
    const amount=shape==='LAGOON'?28:32;
    const geometry=shape==='LAGOON'?
      new THREE.IcosahedronGeometry(.105,0):
      new THREE.DodecahedronGeometry(.145,0);
    const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true});
    const props=new THREE.InstancedMesh(geometry,material,amount);
    props.name='stage-coast-details-'+shape.toLowerCase();
    const instance=new THREE.Object3D(),colour=new THREE.Color();
    for(let i=0;i<amount;i++){
      const a=i*2.3999632297;
      const radius=terrainRadius(a,shape)-.48-(i%3)*.08;
      const x=Math.cos(a)*radius,z=Math.sin(a)*radius;
      instance.position.set(x,terrainHeight(x,z,shape)+.04,z);
      instance.rotation.set(0,i*.79,0);
      instance.scale.setScalar(.65+(i%5)*.12);
      instance.updateMatrix();props.setMatrixAt(i,instance.matrix);
      props.setColorAt(i,colour.setHex(palette[i%palette.length]));
    }
    props.instanceMatrix.needsUpdate=true;
    if(props.instanceColor)props.instanceColor.needsUpdate=true;
    props.frustumCulled=false;root.add(props);
  }

  // Keep all legacy stage landmarks grouped as a guaranteed fallback.
  // Modern same-origin GLB landmarks replace this group atomically only
  // after every asset for the stage loads successfully.
  const fallback=new THREE.Group();
  fallback.name='stage-legacy-landmarks';
  if(shape==='RING'){
    const ruinBase=new THREE.Group();
    ruinBase.position.y=terrainHeight(2.10,-1.50,shape)-.16;
    fallback.add(ruinBase);
    ruins(ruinBase,2.10,-1.50);
    const lightBase=new THREE.Group();
    lightBase.position.y=terrainHeight(1.86,2.28,shape)-.05;
    fallback.add(lightBase);
    lighthouse(lightBase,1.86,2.28);
  }
  fallback.add(createStageDecorations(shape));
  root.add(fallback);
  root.userData.landmarkController=createDetailedStageLandmarks(root,shape,fallback);

  // Sparse rocks and flowers stay decorative, independent from site IDs.
  const stone = new THREE.MeshStandardMaterial({color:0xb4a581,roughness:1,flatShading:true});
  for(let i=0;i<20;i++){
    const a=i*2.4,r=.95+1.80*seeded(i+4);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x-.75,z-.61)<.85)continue;
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.085+.055*seeded(i*5+2),0),stone);
    place(m,x,terrainHeight(x,z,shape)+.09,z);root.add(m);
  }
  return root;
}

/** Create lazily to avoid allocating WebGL contexts in standard Phaser mode. */
export function createThreeWorldLayer(host:HTMLElement):WorldThreeLayer|null{
  let renderer:THREE.WebGLRenderer;
  try{
    renderer=new THREE.WebGLRenderer({
      alpha:false,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false
    });
  }catch{return null;} // WebGL unavailable: full procedural Phaser fallback.
  // Stylized detailed 3D art direction; maintain crisp mobile rasterization.
  // Phaser/HUD remain independently sharp and interactive.
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio||1,1),1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const canvas=renderer.domElement;
  canvas.className='world-map-three';
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none';
  // Smooth native-resolution rasterization avoids blurry/pixelated upscaling.
  canvas.style.imageRendering='auto';
  host.insertBefore(canvas,host.firstChild);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x1c7baa);
  scene.add(new THREE.HemisphereLight(0xedf8fa,0x745a3c,2.0));
  scene.add(new THREE.AmbientLight(0xffffff,.23));
  const sun=new THREE.DirectionalLight(0xffeed0,2.4);
  sun.position.set(-5,10,6);
  sun.castShadow=true;
  sun.shadow.mapSize.set(768,768);
  sun.shadow.camera.left=-5;sun.shadow.camera.right=5;
  sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;
  sun.shadow.camera.near=1;sun.shadow.camera.far=23;
  sun.shadow.bias=-.0003;
  scene.add(sun);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const ocean=createAnimatedOcean(scene);
  let land=island(scene);
  let waterfall=createCascadingWaterfall(land);
  const board3D=createWorldBoard3D(scene);
  let tileCount=28,shapeId:MapShapeId='RING';
  const makeAmbience=(root:THREE.Group,stage:MapShapeId)=>
    createWorldAmbience(root,new THREE.Vector3(
      1.86,terrainHeight(1.86,2.28,stage)+.88,2.28),stage==='RING');
  let ambience=makeAmbience(land,shapeId);
  /** Rebuild terrain once when the stage changes, NEVER per draw/update. */
  const syncEnvironment=(nextShape:MapShapeId)=>{
    if(shapeId===nextShape)return;
    const old=land;
    (old.userData.landmarkController as DetailedLandmarkStage|undefined)?.dispose();
    scene.remove(old);
    const geometries=new Set<THREE.BufferGeometry>();
    const materials=new Set<THREE.Material>();
    old.traverse(node=>{
      if(node instanceof THREE.InstancedMesh)node.dispose();
      if(node instanceof THREE.Mesh){
        geometries.add(node.geometry);
        for(const mat of Array.isArray(node.material)?node.material:[node.material])materials.add(mat);
      }
    });
    for(const geometry of geometries)geometry.dispose();
    // Some static materials are shared. Disposal simply forces a clean
    // re-upload when the new island is rendered; it does not destroy them.
    for(const material of materials)material.dispose();
    land=island(scene,nextShape);
    waterfall=createCascadingWaterfall(land,nextShape);
    ambience=makeAmbience(land,nextShape);
    ocean.setShape(nextShape);
    shapeId=nextShape;
  };
  // The same coordinates drive both the 3D characters and the 2D overlays.
  // No per-angle screenspace offsets or actor images are needed.
  const actors=createWorldActors(scene,{
    tile:index=>boardTileWorldPosition(index,3.48,BOARD_SURFACE_Y+.015,tileCount,shapeId),
    site:(x,y)=>siteWorldPosition(x,y,undefined,shapeId)
  });
  const camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,100);
  let yaw=Math.PI/4;
  let pitch=56*Math.PI/180;
  let zoom=1;
  const distance=15;
  const focus=new THREE.Vector3(0,.38,0);
  let lastW=0,lastH=0,dead=false,contextIsLost=false;
  let waterFrame=0,waterRunning=false,lastWaterPaint=-Infinity;
  let lastActorFrame=-Infinity;
  let viewVisible=false;
  let animationTime=0;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const stopWater=()=>{
    waterRunning=false;
    actors.pause(true);
    if(waterFrame)cancelAnimationFrame(waterFrame);
    waterFrame=0;
    lastActorFrame=-Infinity;
  };
  // The sea and the chibi rigs move on the Three canvas only; Phaser hit
  // targets do not need
  // repainting or event re-binding every 24 fps.
  const waterTick=(timeMs:number)=>{
    waterFrame=0;
    if(!waterRunning||dead||contextIsLost||document.hidden)return;
    if(timeMs-lastWaterPaint>=WAVE_INTERVAL_MS){
      lastWaterPaint=timeMs;
      const delta=Number.isFinite(lastActorFrame)?
        Math.min(.06,(timeMs-lastActorFrame)/1000):0;
      lastActorFrame=timeMs;
      actors.update(delta,!reducedMotion.matches);
      if(!reducedMotion.matches){
        animationTime+=delta;
        ambience.update(animationTime);
        waterfall.update(animationTime);
        ocean.update(animationTime);
      }
      try{renderer.render(scene,camera);}
      catch{stopWater();canvas.style.display='none';return;}
    }
    waterFrame=requestAnimationFrame(waterTick);
  };
  const startWater=()=>{
    if(waterRunning||dead||contextIsLost||document.hidden||!viewVisible)return;
    waterRunning=true;
    actors.pause(false);
    lastWaterPaint=-Infinity;
    waterFrame=requestAnimationFrame(waterTick);
  };
  const visibilityChanged=()=>{
    if(document.hidden)stopWater();
    else if(viewVisible)startWater();
  };
  document.addEventListener('visibilitychange',visibilityChanged);
  const adjustCamera=()=>{
    // Board never crops: horizontal radius >= 4.7 world units even on
    // portrait phones. Zoom range is deliberately limited for tap safety.
    const aspect=Math.max(.4,lastW/Math.max(1,lastH));
    const halfH=Math.max(5.2,4.85/aspect)/zoom;
    camera.left=-halfH*aspect;camera.right=halfH*aspect;
    camera.top=halfH;camera.bottom=-halfH;
    camera.position.set(
      focus.x+distance*Math.sin(yaw)*Math.cos(pitch),
      focus.y+distance*Math.sin(pitch),
      focus.z+distance*Math.cos(yaw)*Math.cos(pitch)
    );
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  };
  const screen=(x:number,y:number,z:number):ScreenPoint=>{
    const p=new THREE.Vector3(x,y,z).project(camera);
    return {x:(p.x+1)*lastW*.5,y:(1-p.y)*lastH*.5};
  };
  // Game model coordinates are mapped ONCE onto the Three island. They are
  // never rotated independently of the orbit camera.
  const sitePoint=(x:number,y:number,elevation?:number)=>{
    const p=siteWorldPosition(x,y,elevation,shapeId);
    return screen(p.x,p.y,p.z);
  };
  const tileWorld=(angle:number,radius:number,elevation=.48)=>{
    // Azimuth offset matches the original default angle: tile 0 is at
    // the near / bottom edge of the island, not the back or water.
    const a=angle-Math.PI/4;
    return new THREE.Vector3(Math.cos(a)*radius,elevation,Math.sin(a)*radius);
  };
  const contextLost=(e:Event)=>{
    e.preventDefault();contextIsLost=true;stopWater();canvas.style.display='none';
  };
  const contextRestored=()=>{
    contextIsLost=false;
    if(viewVisible&&lastW>0&&lastH>0){
      ocean.update(animationTime);
      renderer.render(scene,camera);
      canvas.style.display='block';
      startWater();
    }
  };
  canvas.addEventListener('webglcontextlost',contextLost);
  canvas.addEventListener('webglcontextrestored',contextRestored);

  const stage:WorldThreeLayer={
    actors3D:true,
    board3D:true,
    syncActors(state){
      if(dead)return;
      tileCount=boardTiles(state).length;
      syncEnvironment(state?.board?.shapeId??'RING');
      actors.sync(state);
      board3D.sync(state);
    },
    draw(width,height){
      if(dead||contextIsLost)return false;
      const w=Math.round(width),h=Math.round(height);
      if(w<40||h<40)return false;
      try{
        if(w!==lastW||h!==lastH){
          lastW=w;lastH=h;
          renderer.setSize(w,h,false);
        }
        adjustCamera();
        renderer.render(scene,camera);
        canvas.style.display='block';
        viewVisible=true;
        startWater();
        return true;
      }catch{
        viewVisible=false;
        stopWater();
        canvas.style.display='none';return false;
      }
    },
    projectSite(x,y,elevation){return sitePoint(x,y,elevation);},
    projectTile(index,elevation=BOARD_SURFACE_Y+.015){
      const v=boardTileWorldPosition(index,3.48,elevation,tileCount,shapeId);
      return screen(v.x,v.y,v.z);
    },
    tilePolygon(index){
      const points=tileBoardCorners(index,tileCount,shapeId,BOARD_SURFACE_Y,3.29,3.68);
      return points.map(v=>screen(v.x,v.y,v.z));
    },
    orbit(deltaX,deltaY){
      yaw+=deltaX*.0078;
      pitch=THREE.MathUtils.clamp(pitch+deltaY*.0055,28*Math.PI/180,76*Math.PI/180);
    },
    zoom(amount){zoom=THREE.MathUtils.clamp(zoom*Math.exp(amount),.82,1.38);},
    rotateBy(radians){yaw+=radians;},
    visible(value){
      if(dead)return;
      viewVisible=value;
      canvas.style.display=value&&!contextIsLost?'block':'none';
      if(value)startWater();
      else stopWater();
    },
    dispose(){
      if(dead)return;
      dead=true;
      stopWater();
      document.removeEventListener('visibilitychange',visibilityChanged);
      canvas.removeEventListener('webglcontextlost',contextLost);
      canvas.removeEventListener('webglcontextrestored',contextRestored);
      // Actors dispose their private geometry/materials and detach from
      // the scene before the static-environment disposal walk.
      actors.dispose();
      (land.userData.landmarkController as DetailedLandmarkStage|undefined)?.dispose();
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(o=>{
        if(o instanceof THREE.InstancedMesh)o.dispose();
        if(o instanceof THREE.Mesh || o instanceof THREE.Line){
          geometries.add(o.geometry);
          const m=o.material;
          if(Array.isArray(m))for(const entry of m)materials.add(entry);
          else materials.add(m);
        }
      });
      for(const geometry of geometries)geometry.dispose();
      for(const material of materials)material.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    }
  };
  return stage;
}
