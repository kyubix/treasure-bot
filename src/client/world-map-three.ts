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

const grass = new THREE.MeshStandardMaterial({color:0x72b85f,roughness:1,flatShading:true});
const darkGrass = new THREE.MeshStandardMaterial({color:0x4d9861,roughness:1,flatShading:true});
const sandy = new THREE.MeshStandardMaterial({color:0xf4d49a,roughness:1,flatShading:true});
const rock = new THREE.MeshStandardMaterial({color:0x98714c,roughness:1,flatShading:true});
const rockShade = new THREE.MeshStandardMaterial({color:0x674f3d,roughness:1,flatShading:true});
const rim = new THREE.MeshStandardMaterial({color:0xc29d63,roughness:1,flatShading:true});
const bark = new THREE.MeshStandardMaterial({color:0x78563e,roughness:1});
const leafA = new THREE.MeshStandardMaterial({color:0x286e4f,roughness:1,flatShading:true});
const leafB = new THREE.MeshStandardMaterial({color:0x41895b,roughness:1,flatShading:true});
const leafC = new THREE.MeshStandardMaterial({color:0x62a96e,roughness:1,flatShading:true});
const water = new THREE.MeshStandardMaterial({color:0x28a1bf,roughness:.32,metalness:.09,flatShading:true});
const foam = new THREE.MeshBasicMaterial({color:0xb7e9dc,transparent:true,opacity:.70,side:THREE.DoubleSide});
const temple = new THREE.MeshStandardMaterial({color:0xe7ddbc,roughness:1,flatShading:true});
const white = new THREE.MeshStandardMaterial({color:0xf2eee1,roughness:1});
const red = new THREE.MeshStandardMaterial({color:0xd35f5d,roughness:1});
const foliageMaterials = [leafA,leafB,leafC];

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
function mesa(root:THREE.Group,x:number,z:number,radius:number,height:number):void{
  const group=new THREE.Group();
  root.add(group);group.position.set(x,0,z);
  const baseShadow=disk(radius*1.22,new THREE.MeshBasicMaterial({
    color:0x1d4c3d,transparent:true,opacity:.32,depthWrite:false
  }),.423,0,0);
  baseShadow.scale.y=.78;group.add(baseShadow);
  group.add(disk(radius*1.24,darkGrass,.04,0,0));
  const tiers=[
    {y:.09,h:height*.45,r:radius*1.04,top:radius*.91},
    {y:.09+height*.45,h:height*.35,r:radius*.78,top:radius*.68},
    {y:.09+height*.80,h:height*.20,r:radius*.48,top:radius*.42}
  ];
  for(let i=0;i<tiers.length;i++){
    const t=tiers[i];
    const geo=new THREE.CylinderGeometry(t.top,t.r,t.h,11,1,false);
    const body=new THREE.Mesh(geo,[i%2?rock:rockShade,rock,rockShade]);
    body.position.y=t.y+t.h/2;body.rotation.y=i*.22;
    body.castShadow=true;
    group.add(body);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(t.top*.99,t.top*1.015,.105,11),
      [grass,grass,darkGrass]
    );
    cap.position.y=t.y+t.h+.024;group.add(cap);
    const ledge = new THREE.Mesh(
      new THREE.TorusGeometry(t.r*.86,.036,5,24),
      rim
    );
    ledge.rotation.x=Math.PI/2;
    ledge.position.y=t.y+.07;group.add(ledge);
  }
  for(let j=0;j<5;j++){
    const theta=j*2.40,r=radius*(1.03+.14*(j%2));
    const rubble=new THREE.Mesh(new THREE.DodecahedronGeometry(.10+.035*(j%3),0),j%2?rock:rim);
    rubble.position.set(Math.cos(theta)*r,.12,Math.sin(theta)*r);
    rubble.rotation.y=theta;
    group.add(rubble);
  }
}
function broadTree(root:THREE.Group,x:number,z:number,size:number,n:number):void{
  const shadow=disk(.42*size,new THREE.MeshBasicMaterial({
    color:0x1e5841,transparent:true,opacity:.19,depthWrite:false
  }),.424,x,z);
  shadow.scale.y=.70;root.add(shadow);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055*size,.08*size,.42*size,6),bark);
  place(trunk,x,.66*size,z);root.add(trunk);
  const crown=new THREE.Group();
  crown.userData.swayPhase=n*1.7;
  place(crown,x,.94*size,z);root.add(crown);
  const leaf=foliageMaterials[n%3];
  const bits=[
    [-.16,.02,-.03,.34],[.17,.02,.09,.31],[.01,.22,-.04,.37],[-.04,.08,.19,.31]
  ];
  for(const [dx,dy,dz,r] of bits){
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r*size,1),leaf);
    m.position.set(dx*size,dy*size,dz*size);
    m.castShadow=true;
    crown.add(m);
  }
}
function pine(root:THREE.Group,x:number,z:number,size:number,n:number):void{
  const shadow=disk(.30*size,new THREE.MeshBasicMaterial({
    color:0x175644,transparent:true,opacity:.20,depthWrite:false
  }),.425,x,z);shadow.scale.y=.70;root.add(shadow);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.044*size,.068*size,.52*size,5),bark);
  place(trunk,x,.70*size,z);root.add(trunk);
  for(let layer=0;layer<3;layer++){
    const cone=new THREE.Mesh(new THREE.ConeGeometry((.38-layer*.07)*size,.58*size,7),
      foliageMaterials[(n+layer)%3]);
    place(cone,x,(.84+layer*.23)*size,z);
    cone.castShadow=true;
    cone.userData.swayPhase=n*1.7+layer*.2;
    root.add(cone);
  }
}
function forest(root:THREE.Group,x:number,z:number,count:number,seed:number,shape:MapShapeId='RING'):void{
  for(let i=0;i<count;i++){
    const a=i*2.39996,r=.14+.45*Math.sqrt((i+.5)/count);
    const tx=x+Math.cos(a)*r, tz=z+Math.sin(a)*r;
    // Keep stands off the central lagoon and the main mesa ledges.
    if(Math.hypot(tx-.66,tz-.72)<.73)continue;
    if(Math.hypot(tx-.1,tz+1.18)<.75)continue;
    if(Math.hypot(tx+.61,tz-.82)<.79)continue;
    const size=.72+.43*seeded(seed+i*3.7);
    // Each tree stands on the actual heightfield, never floats above a hill.
    const ground=new THREE.Group();
    ground.position.y=terrainHeight(tx,tz,shape)-.421;
    root.add(ground);
    if(shape==='CLOVER'?i%3===0:shape==='LAGOON'?i%8===0:i%5===3)
      pine(ground,tx,tz,size,seed+i);
    else broadTree(ground,tx,tz,size,seed+i);
  }
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

  forest(root,-1.64,-.52,11,7,shape);
  forest(root,-2.02,1.25,11,18,shape);
  forest(root,.78,-2.22,13,32,shape);
  forest(root,1.92,1.23,12,45,shape);
  forest(root,-.26,2.10,11,58,shape);
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

  // Unique stage landmarks rather than reusing the same two structures
  // in Ring/Lagoon/Clover. Shapes can be recognized even on small phones.
  if(shape==='RING'){
    const ruinBase=new THREE.Group();
    ruinBase.position.y=terrainHeight(2.10,-1.50,shape)-.16;
    root.add(ruinBase);
    ruins(ruinBase,2.10,-1.50);
    const lightBase=new THREE.Group();
    lightBase.position.y=terrainHeight(1.86,2.28,shape)-.05;
    root.add(lightBase);
    lighthouse(lightBase,1.86,2.28);
  }
  root.add(createStageDecorations(shape));

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
      alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false
    });
  }catch{return null;} // WebGL unavailable: full procedural Phaser fallback.
  // PS1-inspired fixed visual language. No toggle or additional UI control:
  // only the 3D background is rendered coarsely; Phaser/HUD remain sharp.
  renderer.setPixelRatio(.85);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const canvas=renderer.domElement;
  canvas.className='world-map-three';
  canvas.style.imageRendering='pixelated';
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none';
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
      1.86,terrainHeight(1.86,2.28,stage)+.63,2.28),stage==='RING');
  let ambience=makeAmbience(land,shapeId);
  /** Rebuild terrain once when the stage changes, NEVER per draw/update. */
  const syncEnvironment=(nextShape:MapShapeId)=>{
    if(shapeId===nextShape)return;
    const old=land;
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
    // Azimuth offset matches the PS1-inspired default angle: tile 0 is at
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
