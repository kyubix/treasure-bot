import * as THREE from 'three';
import {TILES,boardTiles} from '../engine/types.ts';
import type {GameState,Player,TileType} from '../engine/types.ts';
import {galleryNumberAt} from '../engine/gallery.ts';
import {boardTileBaseColor} from '../engine/player-palette.ts';
import {boardScenery,BOARD_BIOME_PALETTE} from './board-environment.ts';
import type {BoardBiome} from './board-environment.ts';
import {buildBoardBackdrop,makeBoardLandmark,disposeEnvironment} from './board-view-environment.ts';
import {createOriginalActor,disposeActorModel,styleAvatarModel} from './world-map-models.ts';
import type {ActorModel,ActorKind} from './world-map-models.ts';
import {loadActorAsset} from './world-map-actor-assets.ts';

export interface ThreeBoardVisual {
 draw(state:GameState|null,width:number,height:number,focus:number,
  travelingPlayer:string|null,launchProgress:number|null,launchPlayerId:string|null):boolean;
 visible(value:boolean):void;
 dispose():void;
}
export const BOARD_CELL_WIDTH=1.25;
/** Constant angular framing prevents a 38°→44° zoom jump and leaves
 * room for the upper numbered tiles and scenery in portrait view. */
export const BOARD_CAMERA_FOV=46;
const NUM_SLOTS=17;
/** A neutral, physically lit white number plate above a vivid colored plate. */
export const BOARD_NUMBER_PLATE_DEPTH=1.47;
export const BOARD_COLOR_PLATE_DEPTH=2.42;
/** A forward logical step appears at negative X (LEFT). */
export function boardVisualTile(focus:number,offset:number,state?:GameState|null):number{
 const n=boardTiles(state).length;
 return ((Math.floor(focus)-offset)%n+n)%n;
}
export function boardVisualXForIndex(tile:number,focus:number,state?:GameState|null):number{
 const n=boardTiles(state).length;
 const delta=((tile-focus+n/2)%n+n)%n-n/2;
 return -delta*BOARD_CELL_WIDTH;
}
/**
 * Buildings and encounter landmarks appear only when the active avatar has
 * FINISHED moving onto a matching tile. In particular, the authoritative
 * state can already contain the destination while its movement tween runs.
 */
export function stoppedEncounterTile(
 state:GameState|null,focus:number,travelingPlayer:string|null
):number|null{
 if(!state||state.phase!=='playing'||travelingPlayer!==null||
   !Number.isFinite(focus))return null;
 const active=state.players[state.currentPlayerIndex];
 if(!active)return null;
 const tiles=boardTiles(state);
 const wrapped=((focus%tiles.length)+tiles.length)%tiles.length;
 const distance=Math.abs(wrapped-active.position);
 if(Math.min(distance,tiles.length-distance)>.001)return null;
 const type=tiles[active.position];
 return type==='GALLERY'||type==='SHOP'||type==='EVENT'||type==='SUPPORT'
   ?active.position:null;
}
export function boardVisualColor(index:number,state?:GameState|null):string{
 return boardTileBaseColor(index,state);
}
function asNumber(v:number):number{return Number.isFinite(v)?v:0;}
function safeText(s:string):string{
 return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));
}
type Rig={
 root:THREE.Group;model:ActorModel;mixer:THREE.AnimationMixer;
 actions:Map<string,THREE.AnimationAction>;active:string;
 kind:ActorKind;color:string;avatarId?:string
};
type Actors={player:Rig;robot:Rig};
type Cell={root:THREE.Group;top:THREE.Mesh;number:THREE.Mesh;
 colorPanel:THREE.Mesh;highlight:THREE.Mesh;tile:number};
function textureLabel(text:string,dark=true,small=false):THREE.CanvasTexture{
 const canvas=document.createElement('canvas');
 canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');
 if(ctx){
  ctx.clearRect(0,0,256,256);
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=dark?'#263c51':'#fff9df';
  ctx.shadowColor=dark?'#b0bdc5':'#26435b';
  ctx.shadowBlur=3;
  ctx.font=(small?'900 56px':'900 154px')+' system-ui,Arial,sans-serif';
  ctx.fillText(text,128,130,240);
 }
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=4;
 return tex;
}
function createActor(kind:ActorKind,colour:string,asset?:ActorModel,avatarId?:string):Rig{
 const model=asset?cloneAsset(asset):createOriginalActor(kind);
 if(kind==='avatar')styleAvatarModel(model,avatarId);
 const root=new THREE.Group();root.add(model.scene);
 root.scale.setScalar(kind==='avatar'?1.30:1.20);
 model.scene.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  o.castShadow=true;
  for(const m of (Array.isArray(o.material)?o.material:[o.material]))
   if(m.name==='PlayerPaint'&&m instanceof THREE.MeshStandardMaterial)
    m.color.set(colour);
 });
 const mixer=new THREE.AnimationMixer(model.scene);
 const actions=new Map(model.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 actions.get('idle')?.play();
 return {root,model,mixer,actions,active:'idle',kind,color:colour,avatarId};
}
function cloneAsset(source:ActorModel):ActorModel{
 const scene=source.scene.clone(true);
 scene.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  o.geometry=o.geometry.clone();
  o.material=Array.isArray(o.material)?
   o.material.map(m=>m.clone()):o.material.clone();
 });
 return {scene,animations:source.animations};
}
function pose(r:Rig,name:string):void{
 if(name===r.active)return;
 const old=r.actions.get(r.active),next=r.actions.get(name);
 next?.reset().play();
 if(old&&next)next.crossFadeFrom(old,.16,false);
 r.active=name;
}
function disposeRig(r:Rig):void{
 r.mixer.stopAllAction();r.mixer.uncacheRoot(r.model.scene);
 r.root.removeFromParent();disposeActorModel(r.model);
}
function createCell(root:THREE.Group,number:number,shared:{
 frame:THREE.Material;paper:THREE.Material;materials:Map<string,THREE.Material>;
 textures:Map<string,THREE.Texture>;geos:THREE.BufferGeometry[]
}):Cell{
 const group=new THREE.Group();root.add(group);
 const box=(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number)=>{
  const g=new THREE.BoxGeometry(w,h,d);shared.geos.push(g);
  const o=new THREE.Mesh(g,m);o.position.set(x,y,z);
  o.receiveShadow=true;group.add(o);return o;
 };
 box(BOARD_CELL_WIDTH-.012,.15,4.18,shared.frame,0,.075,-.08);
 // Raised enamel frame and inset ivory number plate are separate surfaces.
 box(BOARD_CELL_WIDTH-.034,.075,1.53,shared.frame,0,.174,-1.38);
 box(BOARD_CELL_WIDTH-.065,.07,BOARD_NUMBER_PLATE_DEPTH,shared.paper,0,.218,-1.38);
 const top=box(BOARD_CELL_WIDTH-.069,.08,BOARD_COLOR_PLATE_DEPTH,shared.paper,0,.18,.65);
 // Brass separator makes the two tiers legible at narrow Android widths.
 box(BOARD_CELL_WIDTH-.015,.07,.07,shared.frame,0,.23,-.60);
 const highlight=box(BOARD_CELL_WIDTH-.085,.015,2.30,
  new THREE.MeshBasicMaterial({color:0xf8e79a,transparent:true,opacity:0}),
  0,.229,.65);
 const labelGeometry=new THREE.PlaneGeometry(BOARD_CELL_WIDTH*.75,1.24);
 shared.geos.push(labelGeometry);
 const label=new THREE.Mesh(labelGeometry,new THREE.MeshBasicMaterial({
  transparent:true,depthWrite:false,side:THREE.DoubleSide
 }));
 label.rotation.x=-Math.PI/2;
 label.position.set(0,.262,-1.38);
 group.add(label);
 return {root:group,top,number:label,colorPanel:top,highlight,tile:-1};
}
export function createThreeBoardView(host:HTMLElement):ThreeBoardVisual|null{
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});}
 catch{return null;}
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.18;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio||1,1),1.65));
 const canvas=renderer.domElement;
 canvas.className='board-view-three';
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none';
 canvas.setAttribute('aria-hidden','true');
 if(getComputedStyle(host).position==='static')host.style.position='relative';
 host.insertBefore(canvas,host.firstChild);
 const hud=document.createElement('div');
 hud.className='board3d-hud';
 hud.style.cssText='position:absolute;inset:0;z-index:2;pointer-events:none;display:none';
 host.insertAdjacentElement('beforeend',hud);
 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0xa5d5df);
 scene.fog=new THREE.Fog(0xa5d5df,19,67);
 scene.add(new THREE.HemisphereLight(0xf8fbff,0x71877c,2.4));
 const sun=new THREE.DirectionalLight(0xfff1d1,2.9);
 sun.position.set(-7,16,10);
 sun.castShadow=true;
 sun.shadow.mapSize.set(768,768);
 sun.shadow.camera.left=-14;sun.shadow.camera.right=14;
 sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;
 sun.shadow.camera.far=55;
 sun.shadow.bias=-.0003;
 scene.add(sun);
 const camera=new THREE.PerspectiveCamera(BOARD_CAMERA_FOV,1,.1,130);
 // Higher camera and deeper two-tier track give the numbered top panels and
 // vivid lower tiles the strong perspective seen in the supplied references.
 camera.position.set(0,9.35,12.9);
 camera.lookAt(0,2.55,-2.8);
 const world=new THREE.Group();
 scene.add(world);
 const frame=new THREE.MeshStandardMaterial({color:0x354f67,roughness:.34,metalness:.45});
 const paper=new THREE.MeshPhysicalMaterial({color:0xf8fbff,roughness:.24,metalness:.02,clearcoat:.9,clearcoatRoughness:.18});
 const shared={frame,paper,materials:new Map<string,THREE.Material>(),
  textures:new Map<string,THREE.Texture>(),geos:[] as THREE.BufferGeometry[]};
 const board=new THREE.Group();
 board.name='board-3d-two-layer-track';
 world.add(board);
 const cells:Array<Cell>=[];
 for(let i=-Math.floor(NUM_SLOTS/2);i<=Math.floor(NUM_SLOTS/2);i++){
  const cell=createCell(board,i,shared);
  cell.root.position.x=i*BOARD_CELL_WIDTH;
  cells.push(cell);
 }
 // Slightly elevated stage lip and shadow under the board.
 const under=new THREE.Mesh(new THREE.BoxGeometry(35,.21,4.35),
  new THREE.MeshStandardMaterial({color:0x99734f,roughness:.84}));
 under.position.set(0,-.13,-.08);
 board.add(under);
 const backdropRoot=new THREE.Group();
 world.add(backdropRoot);
 let env:THREE.Group|null=null;
 let currentBiome:BoardBiome|null=null;
 const landmarkRoot=new THREE.Group();
 landmarkRoot.position.set(0,.1,-4.25);
 world.add(landmarkRoot);
 let landmark:THREE.Group|null=null;
 let currentLandmark='';
 const actorsRoot=new THREE.Group();world.add(actorsRoot);
 const actors=new Map<string,Actors>();
 const loaded=new Map<ActorKind,ActorModel>();
 let destroyed=false,visible=false,contextLost=false;
 let sizeW=0,sizeH=0,raf=0,lastTime=0,lastRender=0;
 let animate=true;
 const handleLost=(event:Event)=>{event.preventDefault();contextLost=true;stop();canvas.style.display='none';hud.style.display='none';};
 const handleRestored=()=>{contextLost=false;if(visible)start();};
 canvas.addEventListener('webglcontextlost',handleLost);
 canvas.addEventListener('webglcontextrestored',handleRestored);
 const updateMaterial=(color:string)=>{
  let m=shared.materials.get(color);
  if(!m){m=new THREE.MeshPhysicalMaterial({color,roughness:.24,clearcoat:.88,
   clearcoatRoughness:.12,metalness:.025});shared.materials.set(color,m);}
  return m;
 };
 const numeral=(text:string)=>{
  let texture=shared.textures.get(text);
  if(!texture){texture=textureLabel(text,text!=='SHOP',text.length>=3);
   shared.textures.set(text,texture);}
  return texture;
 };
 const setCell=(cell:Cell,index:number,focus:boolean,state:GameState|null)=>{
  if(cell.tile!==index){
   cell.tile=index;
   const type=boardTiles(state)[index],number=galleryNumberAt(index,state);
   (cell.colorPanel as THREE.Mesh).material=updateMaterial(boardVisualColor(index,state));
   const label=number?String(number):type==='SHOP'?'SHOP':
    type==='START'?'★':type==='EVENT'?'!':type==='SUPPORT'?'+':'·';
   const prev=cell.number.material as THREE.MeshBasicMaterial;
   prev.map=numeral(label);prev.needsUpdate=true;
  }
  const glow=cell.highlight.material as THREE.MeshBasicMaterial;
  glow.opacity=focus?.19:0;
 };
 const refreshAssets=(kind:ActorKind,source:ActorModel)=>{
  loaded.set(kind,source);
  for(const pair of actors.values()){
   const old=kind==='avatar'?pair.player:pair.robot;
   const rig=createActor(kind,old.color,source,old.avatarId);
   rig.root.position.copy(old.root.position);
   rig.root.rotation.copy(old.root.rotation);
   actorsRoot.add(rig.root);
   disposeRig(old);
   if(kind==='avatar')pair.player=rig;else pair.robot=rig;
  }
 };
 for(const kind of ['avatar','robot'] as const){
  void loadActorAsset(kind).then(model=>{
   if(destroyed){disposeActorModel(model);return;}
   refreshAssets(kind,model);
  }).catch(()=>{/* Original procedural animated model stays visible. */});
 }
 function stop():void{
  animate=false;
  if(raf)cancelAnimationFrame(raf);
  raf=0;
 }
 function start():void{
  if(!visible||destroyed||contextLost||document.hidden)return;
  if(raf)return;
  animate=true;lastTime=0;lastRender=0;
  raf=requestAnimationFrame(tick);
 }
 const onVisibility=()=>{if(document.hidden)stop();else if(visible)start();};
 document.addEventListener('visibilitychange',onVisibility);
 function tick(timestamp:number):void{
  raf=0;
  if(!visible||destroyed||contextLost||document.hidden)return;
  const delta=lastTime?Math.min(.05,(timestamp-lastTime)/1000):0;
  lastTime=timestamp;
  if(timestamp-lastRender>=1000/30){
   lastRender=timestamp;
   for(const pair of actors.values()){
    pair.player.mixer.update(delta);
    pair.robot.mixer.update(delta);
   }
   if(landmark&&currentLandmark==='event'){
    const obj=landmark.children[1];
    if(obj)obj.rotation.y=timestamp*.00035;
   }
   try{renderer.render(scene,camera);}
   catch{visible=false;stop();canvas.style.display='none';hud.style.display='none';return;}
  }
  raf=requestAnimationFrame(tick);
 }
 function setEnvironment(biome:BoardBiome):void{
  if(currentBiome===biome)return;
  if(env){disposeEnvironment(env);env=null;}
  env=buildBoardBackdrop(biome);
  backdropRoot.add(env);currentBiome=biome;
  const sky=BOARD_BIOME_PALETTE[biome].sky;
  scene.background=new THREE.Color(sky);
  scene.fog=new THREE.Fog(sky,20,65);
 }
 const makeLabel=(word:string)=>{
  const tex=textureLabel(word,false,true);shared.textures.set('sign:'+word,tex);
  const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,
   side:THREE.DoubleSide,depthWrite:false});
  const geo=new THREE.PlaneGeometry(1.9,.42);shared.geos.push(geo);
  const mesh=new THREE.Mesh(geo,material);
  mesh.position.set(0,2.18,-.115);
  landmark!.add(mesh);
 };
 function setLandmark(type:TileType,number:number|null):void{
  const kind:'gallery'|'shop'|'event'|'support'|'plain'=
   type==='GALLERY'?'gallery':type==='SHOP'?'shop':
    type==='EVENT'?'event':type==='SUPPORT'?'support':'plain';
  const key=kind+':'+String(number??'');
  if(key===currentLandmark)return;
  if(landmark){disposeEnvironment(landmark);landmark=null;}
  landmark=makeBoardLandmark(kind,number);
  landmarkRoot.add(landmark);currentLandmark=key;
  if(landmark.userData.sign)makeLabel(String(landmark.userData.sign));
 }
 const syncActors=(state:GameState,focus:number,traveler:string|null,
  launch:number|null,launchOwner:string|null)=>{
  const present=new Set(state.players.map(p=>p.id));
  for(const [id,pair] of actors)if(!present.has(id)){
   disposeRig(pair.player);disposeRig(pair.robot);actors.delete(id);
  }
  for(let i=0;i<state.players.length;i++){
   const p=state.players[i];
   let pair=actors.get(p.id);
   if(!pair){
    const player=createActor('avatar',p.color,loaded.get('avatar'),p.avatarId);
    const robot=createActor('robot',p.color,loaded.get('robot'));
    actorsRoot.add(player.root,robot.root);
    pair={player,robot};actors.set(p.id,pair);
   }
   let offset=p.position-focus;
   const count=boardTiles(state).length;
   if(offset>count/2)offset-=count;
   if(offset< -count/2)offset+=count;
   if(p.id===traveler)offset=0;
   const crowd=state.players.filter(q=>q.position===p.position);
   const order=crowd.findIndex(q=>q.id===p.id);
   const walking=p.id===traveler;
   const direction=state.movementDirection===-1?-1:1;
   // Facing and local stride follow the move captured at roll time,
   // not a reverse event that may activate on its landing space.
   const stride=walking?-direction*.24*Math.sin(Math.PI*(focus-Math.floor(focus)))*BOARD_CELL_WIDTH:0;
   const x=-offset*BOARD_CELL_WIDTH+stride+
     (crowd.length>1?(order-(crowd.length-1)/2)*.27:0);
   pair.player.root.position.set(x,.27,.72+(order%2)*.14);
   pair.player.root.rotation.y=walking?(direction===1?-Math.PI/2:Math.PI/2):0;
   pair.robot.root.position.set(x+.32,.27,1.24);
   pair.robot.root.rotation.y=walking?(direction===1?-Math.PI/2:Math.PI/2):0;
   pair.robot.root.visible=!p.robot.mission&&!(launch!==null&&launchOwner===p.id);
   pose(pair.player,walking?'walk':'idle');
   pose(pair.robot,walking?'walk':'idle');
   pair.player.root.visible=Math.abs(offset)<8.5;
   pair.robot.root.visible=pair.robot.root.visible&&Math.abs(offset)<8.5;
  }
 };
 const portal=new THREE.Group();world.add(portal);
 portal.position.set(0,.26,-2.82);
 const portalMat=new THREE.MeshStandardMaterial({color:0x62c9d8,metalness:.25,
  roughness:.26,emissive:0x22738b,emissiveIntensity:.7});
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.76,.15,12,28),portalMat);
 ring.position.y=1.14;portal.add(ring);
 const portalGlow=new THREE.PointLight(0x81e9ec,2,6,2);
 portalGlow.position.set(0,1.1,.1);portal.add(portalGlow);
 portal.visible=false;
 const drawHud=(state:GameState|null,focus:number)=>{
  if(!state){hud.innerHTML='';return;}
  const current=state.players[state.currentPlayerIndex];
  const tile=boardVisualTile(focus,0,state),n=galleryNumberAt(tile,state);
  const type=boardTiles(state)[tile];
  const label=n?'GALLERY No.'+n:type==='SHOP'?'ROBOT SHOP':
   type==='EVENT'?'EVENT':type==='SUPPORT'?'SUPPORT':'ISLAND ROAD';
  const tiles=boardTiles(state);
  const circles=tiles.map((type,i)=>{
   const a=i/tiles.length*Math.PI*2-Math.PI/2;
   const x=62+47*Math.cos(a),y=57+40*Math.sin(a);
   const player=state.players.find(p=>p.position===i);
   const selected=i===tile;
   const fill=player?.color??(selected?'#ffec95':boardVisualColor(i,state));
   return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+
    (player?4.5:selected?3.4:1.8)+'" fill="'+safeText(fill)+'" stroke="'+
    (selected?'#fff':'#183d56')+'" stroke-width="'+(selected?2:0.6)+'"/>';
  }).join('');
  hud.innerHTML='<div class="board3d-plaque"><span>TURN '+state.turn+
    ' · '+safeText(label)+'</span><strong>'+safeText(current?.name??'EXPLORER')+
    '</strong></div><div class="board3d-minimap"><svg viewBox="0 0 124 114" aria-hidden="true">'+
    '<ellipse cx="62" cy="57" rx="49" ry="42" fill="#265c63" fill-opacity=".38" '+
    'stroke="#fcdb99" stroke-width="2"/>'+circles+'</svg></div>';
 };
 return {
  draw(state,width,height,focus,traveler,launch,launchId){
   if(destroyed||contextLost)return false;
   const w=Math.round(width),h=Math.round(height);
   if(w<40||h<40)return false;
   try{
    if(w!==sizeW||h!==sizeH){
     sizeW=w;sizeH=h;renderer.setSize(w,h,false);
     camera.aspect=w/h;
     // The aspect can change; zoom and FOV must not jump after first paint.
     camera.updateProjectionMatrix();
    }
    const current=state?.players[state.currentPlayerIndex];
    const view=asNumber(focus);
    const integer=Math.floor(view),fract=view-integer;
    for(let i=0;i<cells.length;i++){
     const offset=i-Math.floor(NUM_SLOTS/2);
     const index=boardVisualTile(view,offset,state);
     const cell=cells[i];
     cell.root.position.x=(offset+fract)*BOARD_CELL_WIDTH;
     setCell(cell,index,offset===0,state);
    }
    const biome=boardScenery(view).biome;
    setEnvironment(biome);
    // No Gallery/Shop/building while the camera follows walking steps.
    // The game state has already advanced to the final tile during the tween.
    const encounter=stoppedEncounterTile(state,view,traveler);
    landmarkRoot.visible=encounter!==null;
    if(encounter!==null)
      setLandmark(boardTiles(state)[encounter],galleryNumberAt(encounter,state));
    // Background moves at a lower rate for an actual 3D parallax effect.
    backdropRoot.position.x=(view%4)*.12;
    syncActors(state??({players:[],currentPlayerIndex:0} as unknown as GameState),view,traveler,launch,launchId);
    portal.visible=launch!==null;
    if(launch!==null){
     const p=Math.max(0,Math.min(1,launch));
     portal.scale.setScalar(.7+.5*p);
     ring.rotation.z=p*2.7;
     portalGlow.intensity=(1-p)*3+.4;
    }
    drawHud(state,view);
    renderer.render(scene,camera);
    canvas.style.display='block';hud.style.display='block';
    visible=true;start();
    return true;
   }catch{
    visible=false;stop();
    canvas.style.display='none';hud.style.display='none';
    return false;
   }
  },
  visible(value){
   visible=value&&!contextLost;
   canvas.style.display=visible?'block':'none';
   hud.style.display=visible?'block':'none';
   if(visible)start();else stop();
  },
  dispose(){
   if(destroyed)return;
   destroyed=true;visible=false;stop();
   document.removeEventListener('visibilitychange',onVisibility);
   canvas.removeEventListener('webglcontextlost',handleLost);
   canvas.removeEventListener('webglcontextrestored',handleRestored);
   for(const pair of actors.values()){disposeRig(pair.player);disposeRig(pair.robot);}
   actors.clear();
   loaded.forEach(m=>disposeActorModel(m));loaded.clear();
   if(env)disposeEnvironment(env);
   if(landmark)disposeEnvironment(landmark);
   const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>();
   scene.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    gs.add(o.geometry);
    for(const m of (Array.isArray(o.material)?o.material:[o.material]))ms.add(m);
   });
   gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());
   shared.geos.forEach(g=>g.dispose());
   shared.materials.forEach(m=>m.dispose());
   shared.textures.forEach(t=>t.dispose());
   renderer.dispose();renderer.forceContextLoss();
   canvas.remove();hud.remove();
  }
 };
}