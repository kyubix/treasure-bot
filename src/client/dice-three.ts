import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export type DicePhase='holding'|'waiting'|'result';
export type DiceFace=1|2|3|4|5|6;
export interface DiceThreeVisual{
 setPhase(phase:DicePhase,faces?:readonly [number,number]):void;
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
 grad.addColorStop(0,'#fffef0');grad.addColorStop(.58,'#f6e3b8');
 grad.addColorStop(1,'#dfbf86');
 ctx.fillStyle=grad;ctx.fillRect(0,0,256,256);
 ctx.strokeStyle='rgba(129,89,49,.20)';ctx.lineWidth=5;
 ctx.strokeRect(8,8,240,240);
 for(const [x,y] of pipPositions(face)){
  const px=128+x*66,py=128+y*66;
  ctx.beginPath();ctx.arc(px+2,py+4,19,0,Math.PI*2);
  ctx.fillStyle='#8c754d';ctx.fill();
  ctx.beginPath();ctx.arc(px,py,19,0,Math.PI*2);
  ctx.fillStyle='#203b55';ctx.fill();
  ctx.beginPath();ctx.arc(px-5,py-6,5,0,Math.PI*2);
  ctx.fillStyle='rgba(155,215,235,.55)';ctx.fill();
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
 renderer.toneMappingExposure=1.18;
 renderer.setPixelRatio(Math.min(1.5,Math.max(1,window.devicePixelRatio||1)));
 // A fixed logical size keeps a tiny HUD renderer from triggering any
 // Board/World layout resize or repeatedly reallocating GPU buffers.
 renderer.setSize(320,166,false);
 const canvas=renderer.domElement;
 canvas.setAttribute('aria-hidden','true');
 canvas.className='dice-three-canvas';
 canvas.style.cssText='width:100%;height:100%;display:block;pointer-events:none';
 host.appendChild(canvas);
 const scene=new THREE.Scene();
 const camera=new THREE.OrthographicCamera(-2.25,2.25,1.15,-1.15,.1,25);
 camera.position.set(0,0,8);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xf8fbff,0x907556,2.5));
 const key=new THREE.DirectionalLight(0xffdfaa,3.8);
 key.position.set(-3.5,5.5,7);scene.add(key);
 const fill=new THREE.DirectionalLight(0xa2dff2,1.1);
 fill.position.set(4,2,-4);scene.add(fill);
 const geometry=new RoundedBoxGeometry(1.23,1.23,1.23,4,.145);
 resources.geometries.push(geometry);
 const textures=new Map<DiceFace,THREE.CanvasTexture>();
 const materials=new Map<DiceFace,THREE.MeshStandardMaterial>();
 for(let i=1;i<=6;i++){
  const face=i as DiceFace,texture=diceFaceTexture(face);
  if(texture){textures.set(face,texture);resources.textures.push(texture);}
  const material=new THREE.MeshStandardMaterial({
   color:0xf8eaca,
   map:texture,
   roughness:.28,metalness:.035
  });
  // CanvasTexture already holds the ivory palette; avoid multiplying it
  // by the non-white material factor and dimming the faces.
  if(texture)material.color.setHex(0xffffff);
  materials.set(face,material);resources.materials.push(material);
 }
 const dice:THREE.Mesh[]=[];
 for(let i=0;i<2;i++){
  const die=new THREE.Mesh(geometry,DIE_FACE_MATERIAL_ORDER.map(n=>materials.get(n)!));
  die.position.set(i===0?-.83:.83,0,0);
  die.rotation.set(i*.25+.35,.2+i*.8,-.12);
  scene.add(die);dice.push(die);
  const shadowMaterial=new THREE.MeshBasicMaterial({
   color:0x253650,transparent:true,opacity:.18,
   depthWrite:false
  });
  const shadowGeometry=new THREE.CircleGeometry(.76,20);
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);
  shadow.position.set(i===0?-.83:.83,-.77,-.5);
  shadow.scale.set(1,.22,1);
  scene.add(shadow);
  resources.geometries.push(shadowGeometry);
  resources.materials.push(shadowMaterial);
 }
 const from=[dice[0].quaternion.clone(),dice[1].quaternion.clone()];
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
 const step=(now:number)=>{
  raf=0;
  if(destroyed||!visible||document.hidden)return;
  const dt=lastTime?Math.min(.05,(now-lastTime)/1000):0;
  lastTime=now;
  if(phase==='result'){
   const progress=reduced?1:Math.min(1,(now-resultStart)/650);
   const eased=1-Math.pow(1-progress,3);
   dice.forEach((die,i)=>{
    die.quaternion.copy(from[i]).slerp(targets[i],eased);
    die.position.y=reduced?0:Math.sin(progress*Math.PI)*.22*(1-progress);
   });
   draw();
   if(progress>=1){stop();return;}
  }else{
   startTime+=dt;
   const spin=phase==='holding'?7.6:11.5;
   dice.forEach((die,i)=>{
    die.rotation.x+=dt*spin*(i===0?1:-1);
    die.rotation.y+=dt*spin*.74*(i===0?-1:1);
    die.rotation.z+=dt*spin*.39;
    die.position.y=.12*Math.abs(Math.sin(startTime*12+i*1.8));
   });
   draw();
   if(reduced){stop();return;}
  }
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
 };
 const contextRestored=()=>{
  if(destroyed)return;
  canvas.style.visibility='visible';
  host.closest('.dice-overlay')?.classList.add('has-three-dice');
  start();
 };
 canvas.addEventListener('webglcontextlost',contextLost);
 canvas.addEventListener('webglcontextrestored',contextRestored);
 // Render an initial face immediately so lazy-loading does not flash blank.
 draw();
 return {
  setPhase(next,faces){
   if(destroyed)return;
   phase=next;
   if(next==='result'){
    frontFaces[0]=normalizedDiceFace(faces?.[0]??1);
    frontFaces[1]=normalizedDiceFace(faces?.[1]??1);
    resultStart=performance.now();
    dice.forEach((die,i)=>{
     from[i].copy(die.quaternion);
     targets[i].copy(diceResultQuaternion(frontFaces[i]));
    });
    if(reduced){
     dice.forEach((die,i)=>{die.quaternion.copy(targets[i]);die.position.y=0;});
     draw();stop();return;
    }
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
