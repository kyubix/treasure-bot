import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {DICE_THROW_DURATION_MS,DICE_SETTLE_DURATION_MS} from './dice-timing.ts';

export type DicePhase='holding'|'throwing'|'waiting'|'result';
export function diceThrowHeight(progress:number):number{
 const t=THREE.MathUtils.clamp(progress,0,1);
 // Arc rises from the avatar's hand, then accelerates onto the floor.
 return 1.34*(1-t)+.54*Math.sin(Math.PI*t);
}
export function diceFloorBounce(progress:number):number{
 const t=THREE.MathUtils.clamp(progress,0,1);
 return Math.abs(Math.sin(t*3*Math.PI))*.28*(1-t);
}
export type DiceFace=1|2|3|4|5|6;
export interface DiceThreeVisual{
 setPhase(phase:DicePhase,faces?:readonly [number,number],throwStartedAt?:number):void;
 pause():void;
 dispose():void;
}
/** Three BoxGeometry material order: +X,-X,+Y,-Y,+Z,-Z.
 * Paired faces total seven, just like a physical six-sided die.
 */
export const DIE_FACE_MATERIAL_ORDER=[3,4,2,5,1,6] as const;
const PIPS:Record<DiceFace,readonly (readonly [number,number])[]>={
 1:[[0,0]],
 2:[[-1,-1],[1,1]],
 3:[[-1,-1],[0,0],[1,1]],
 4:[[-1,-1],[1,-1],[-1,1],[1,1]],
 5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],
 6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]
};
export function pipPositions(face:number):readonly (readonly [number,number])[]{
 return PIPS[face as DiceFace]??PIPS[1];
}
export function normalizedDiceFace(face:number):DiceFace{
 return Number.isInteger(face)&&face>=1&&face<=6?face as DiceFace:1;
}
export function faceNormal(face:number):THREE.Vector3{
 switch(normalizedDiceFace(face)){
  case 1:return new THREE.Vector3(0,0,1);
  case 2:return new THREE.Vector3(0,1,0);
  case 3:return new THREE.Vector3(1,0,0);
  case 4:return new THREE.Vector3(-1,0,0);
  case 5:return new THREE.Vector3(0,-1,0);
  case 6:return new THREE.Vector3(0,0,-1);
 }
}
/** Final result face points toward the front camera (+Z). */
export function diceResultQuaternion(face:number):THREE.Quaternion{
 return new THREE.Quaternion().setFromUnitVectors(
  faceNormal(face),new THREE.Vector3(0,0,1));
}
function diceFaceTexture(face:DiceFace):THREE.CanvasTexture|null{
 const canvas=document.createElement('canvas');
 canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');
 if(!ctx)return null;
 const grad=ctx.createLinearGradient(0,0,256,256);
 grad.addColorStop(0,'#e7f9ff');grad.addColorStop(.55,'#8cd6f0');
 grad.addColorStop(1,'#398bbf');
 ctx.fillStyle=grad;ctx.fillRect(0,0,256,256);
 ctx.strokeStyle='rgba(17,65,115,.48)';ctx.lineWidth=7;
 ctx.strokeRect(8,8,240,240);
 for(const [x,y] of pipPositions(face)){
  const px=128+x*66,py=128+y*66;
  ctx.beginPath();ctx.arc(px+2,py+4,19,0,Math.PI*2);
  ctx.fillStyle='#0f4b84';ctx.fill();
  ctx.beginPath();ctx.arc(px,py,19,0,Math.PI*2);
  ctx.fillStyle='#ffffff';ctx.fill();
  ctx.beginPath();ctx.arc(px-5,py-6,5,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,.72)';ctx.fill();
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=2;
 texture.needsUpdate=true;
 return texture;
}
export function createDiceThreeVisual(host:HTMLElement):DiceThreeVisual|null{
 let renderer:THREE.WebGLRenderer;
 try{
  renderer=new THREE.WebGLRenderer({
   alpha:true,antialias:true,powerPreference:'low-power',
   preserveDrawingBuffer:false
  });
 }catch{return null;} // No WebGL: retain original numeric dice.
 const resources:{geometries:THREE.BufferGeometry[];materials:THREE.Material[];
  textures:THREE.Texture[]}={geometries:[],materials:[],textures:[]};
 let destroyed=false,phase:DicePhase='holding',raf=0,visible=false;
 let lastTime=0,startTime=0,resultStart=0;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.12;
 renderer.setPixelRatio(Math.min(1.5,Math.max(1,window.devicePixelRatio||1)));
 // A fixed logical size keeps a tiny HUD renderer from triggering any
 // Board/World layout resize or repeatedly reallocating GPU buffers.
 renderer.setSize(320,194,false);
 const canvas=renderer.domElement;
 canvas.setAttribute('aria-hidden','true');
 canvas.className='dice-three-canvas';
 canvas.style.cssText='width:100%;height:100%;display:block;pointer-events:none';
 host.appendChild(canvas);
 const scene=new THREE.Scene();
 const camera=new THREE.OrthographicCamera(-2.30,2.30,1.52,-1.34,.1,25);
 camera.position.set(0,0,8);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xf8fbff,0x907556,2.5));
 const key=new THREE.DirectionalLight(0xffdfaa,3.8);
 key.position.set(-3.5,5.5,7);scene.add(key);
 const fill=new THREE.DirectionalLight(0xa2dff2,1.1);
 fill.position.set(4,2,-4);scene.add(fill);
 const geometry=new RoundedBoxGeometry(1.18,1.18,1.18,4,.17);
 resources.geometries.push(geometry);
 const textures=new Map<DiceFace,THREE.CanvasTexture>();
 const materials=new Map<DiceFace,THREE.MeshStandardMaterial>();
 for(let i=1;i<=6;i++){
  const face=i as DiceFace,texture=diceFaceTexture(face);
  if(texture){textures.set(face,texture);resources.textures.push(texture);}
  const material=new THREE.MeshStandardMaterial({
   color:0x8dd9f3,
   map:texture,
   roughness:.22,metalness:.045
  });
  // CanvasTexture already holds the ivory palette; avoid multiplying it
  // by the non-white material factor and dimming the faces.
  if(texture)material.color.setHex(0xffffff);
  materials.set(face,material);resources.materials.push(material);
 }
 const dice:THREE.Mesh[]=[];
 for(let i=0;i<2;i++){
  const die=new THREE.Mesh(geometry,DIE_FACE_MATERIAL_ORDER.map(n=>materials.get(n)!));
  die.position.set(i===0?-.83:.83,.46,0);
  die.rotation.set(i*.25+.35,.2+i*.8,-.12);
  scene.add(die);dice.push(die);
  const shadowMaterial=new THREE.MeshBasicMaterial({
   color:0x143963,transparent:true,opacity:.35,
   depthWrite:false
  });
  const shadowGeometry=new THREE.CircleGeometry(.76,20);
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);
  shadow.position.set(i===0?-.83:.83,-.89,-.5);
  shadow.scale.set(1,.22,1);
  scene.add(shadow);
  resources.geometries.push(shadowGeometry);
  resources.materials.push(shadowMaterial);
 }
 const from=[dice[0].quaternion.clone(),dice[1].quaternion.clone()];
 const floorY=-.30;
 const floorX=[-.87,.87];
 let throwStartedAt=0,settleStartedAt=0,queuedFaces:readonly [number,number]|null=null;
 const shadows=scene.children.filter(
  o=>o instanceof THREE.Mesh&&o.geometry instanceof THREE.CircleGeometry
 ) as THREE.Mesh[];
 const targets=[diceResultQuaternion(1),diceResultQuaternion(1)];
 const frontFaces:[DiceFace,DiceFace]=[1,1];
 const stop=()=>{
  visible=false;
  if(raf)cancelAnimationFrame(raf);
  raf=0;
 };
 const draw=()=>{
  try{renderer.render(scene,camera);}
  catch{stop();canvas.style.visibility='hidden';}
 };
 const beginSettle=(now:number)=>{
  phase='result';
  settleStartedAt=now;
  dice.forEach((die,i)=>{
   from[i].copy(die.quaternion);
   targets[i].copy(diceResultQuaternion(
    normalizedDiceFace(queuedFaces?.[i]??1)));
  });
 };
 const step=(now:number)=>{
  raf=0;
  if(destroyed||!visible||document.hidden)return;
  const dt=lastTime?Math.min(.05,(now-lastTime)/1000):0;
  lastTime=now;
  if(phase==='throwing'||phase==='waiting'){
   const p=THREE.MathUtils.clamp(
    (now-throwStartedAt)/DICE_THROW_DURATION_MS,0,1);
   dice.forEach((die,i)=>{
    // Arc from the lifted hand toward the visible board floor.
    const ease=1-Math.pow(1-p,2);
    die.position.x=(i===0?-.57:.57)*(1-ease)+floorX[i]*ease;
    die.position.y=floorY+diceThrowHeight(p)+(i===1?.12*(1-p):0);
    die.rotation.x+=dt*(i===0?12:-13);
    die.rotation.y+=dt*(i===0?-11:9);
    die.rotation.z+=dt*7;
    if(shadows[i])shadows[i].scale.set(
      1.08-diceThrowHeight(p)*.21,.20-diceThrowHeight(p)*.03,1);
   });
   if(p>=1){
    if(queuedFaces)beginSettle(now);
    else phase='waiting';
   }
  }else if(phase==='result'){
   const p=reduced?1:Math.min(1,(now-settleStartedAt)/DICE_SETTLE_DURATION_MS);
   const eased=1-Math.pow(1-p,3);
   dice.forEach((die,i)=>{
    die.quaternion.copy(from[i]).slerp(targets[i],eased);
    die.position.x=floorX[i];
    die.position.y=floorY+(reduced?0:diceFloorBounce(p));
    if(shadows[i])shadows[i].scale.set(1,.20,1);
   });
   draw();
   if(p>=1){stop();return;}
  }else{
   startTime+=dt;
   dice.forEach((die,i)=>{
    die.rotation.x+=dt*(i===0?8:-9);
    die.rotation.y+=dt*(i===0?-6:7);
    die.rotation.z+=dt*4;
    die.position.x=i===0?-.55:.55;
    die.position.y=.56+.12*Math.abs(Math.sin(startTime*12+i));
   });
  }
  if(phase!=='result')draw();
  if(reduced&&phase==='holding'){stop();return;}
  raf=requestAnimationFrame(step);
 };
 const start=()=>{
  if(destroyed)return;
  if(raf)cancelAnimationFrame(raf);
  visible=true;lastTime=0;
  raf=requestAnimationFrame(step);
 };
 const contextLost=(event:Event)=>{
  event.preventDefault();stop();canvas.style.visibility='hidden';
  host.closest('.dice-overlay')?.classList.remove('has-three-dice');
  host.closest('.dice-overlay')?.classList.add('dice-render-fallback');
 };
 const contextRestored=()=>{
  if(destroyed)return;
  canvas.style.visibility='visible';
  host.closest('.dice-overlay')?.classList.add('has-three-dice');
  host.closest('.dice-overlay')?.classList.remove('dice-render-fallback');
  start();
 };
 canvas.addEventListener('webglcontextlost',contextLost);
 canvas.addEventListener('webglcontextrestored',contextRestored);
 // Render an initial face immediately so lazy-loading does not flash blank.
 draw();
 return {
  setPhase(next,faces,startedAt){
   if(destroyed)return;
   if(next==='holding'){
    queuedFaces=null;
    phase='holding';
    startTime=0;
    start();
    return;
   }
   if(next==='throwing'||next==='waiting'){
    queuedFaces=null;
    phase='throwing';
    throwStartedAt=startedAt??performance.now();
    start();
    return;
   }
   // Results are authoritative; never settle until the throw reaches
   // the floor. Fast server responses are queued while dice are airborne.
   queuedFaces=[normalizedDiceFace(faces?.[0]??1),
    normalizedDiceFace(faces?.[1]??1)];
   if(phase==='throwing'&&
      performance.now()-throwStartedAt<DICE_THROW_DURATION_MS){
    start();return;
   }
   beginSettle(performance.now());
   if(reduced){
    dice.forEach((die,i)=>{
     die.quaternion.copy(targets[i]);die.position.set(floorX[i],floorY,0);
    });
    draw();stop();return;
   }
   start();
  },
  pause(){stop();},
  dispose(){
   if(destroyed)return;
   destroyed=true;stop();
   canvas.removeEventListener('webglcontextlost',contextLost);
   canvas.removeEventListener('webglcontextrestored',contextRestored);
   for(const geometry of resources.geometries)geometry.dispose();
   for(const material of resources.materials)material.dispose();
   for(const texture of resources.textures)texture.dispose();
   renderer.dispose();
   renderer.forceContextLoss();
   canvas.remove();
  }
 };
}
