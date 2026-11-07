import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type ActorKind='avatar'|'robot';
export type ActorAnimation='idle'|'walk'|'run'|'search'|'return';
export const ACTOR_ANIMATIONS:ActorAnimation[]=['idle','walk','run','search','return'];
export interface ActorModel {scene:THREE.Group;animations:THREE.AnimationClip[]}

/** Original rigid-joint models. Shared source for shipped glTF and instant fallback.
 * Vertex-colored parts merge per joint/material: <= 11 draws per actor, no textures.
 */
export function createOriginalActor(kind:ActorKind):ActorModel{
  const scene=new THREE.Group();scene.name='Motion';
  const neutral=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
  neutral.name='Palette';
  const paint=neutral.clone();paint.name='PlayerPaint';
  const bins=new Map<THREE.Object3D,Map<THREE.Material,THREE.BufferGeometry[]>>();
  const joint=(name:string,x:number,y:number,z:number)=>{
    const node=new THREE.Group();node.name=name;node.position.set(x,y,z);scene.add(node);return node;
  };
  const add=(parent:THREE.Object3D,geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number,tint=false)=>{
    const g=geometry.index?geometry.toNonIndexed():geometry;
    if(g!==geometry)geometry.dispose();
    g.translate(x,y,z);
    const c=new THREE.Color(color),count=g.getAttribute('position').count;
    const colors=new Float32Array(count*3);
    for(let i=0;i<count;i++)c.toArray(colors,i*3);
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const material=tint?paint:neutral;
    let groups=bins.get(parent);if(!groups){groups=new Map();bins.set(parent,groups);}
    const parts=groups.get(material)??[];parts.push(g);groups.set(material,parts);
  };
  const box=(p:THREE.Object3D,w:number,h:number,d:number,c:number,x:number,y:number,z:number,t=false)=>add(p,new THREE.BoxGeometry(w,h,d),c,x,y,z,t);
  const ball=(p:THREE.Object3D,r:number,c:number,x:number,y:number,z:number,t=false)=>add(p,new THREE.IcosahedronGeometry(r,0),c,x,y,z,t);
  const robot=kind==='robot';
  const body=joint('Body',0,robot?.25:.30,0);
  const head=joint('Head',0,robot?.43:.55,0);
  if(robot){
    box(body,.25,.20,.18,0xffffff,0,0,0,true);
    box(body,.18,.075,.025,0x27384f,0,.01,.104);
    box(body,.08,.025,.03,0xffcc67,0,.01,.122);
    box(body,.19,.16,.07,0x344862,0,.01,-.12);
    box(head,.30,.20,.23,0xd5dfd8,0,0,0);
    box(head,.245,.09,.026,0x172c48,0,-.015,.127);
    for(const s of [-1,1])box(head,.045,.035,.015,0x8ceaff,s*.075,-.012,.147);
    add(head,new THREE.CylinderGeometry(.012,.015,.14,5),0x344862,.08,.16,0);
    ball(head,.034,0xffd36d,.08,.24,0);
    box(head,.32,.04,.24,0xffffff,0,.075,0,true);
  }else{
    add(body,new THREE.CylinderGeometry(.13,.16,.24,6),0xffffff,0,0,0,true);
    box(body,.26,.045,.22,0x695038,0,-.09,0);
    box(body,.045,.04,.018,0xe8c878,0,-.09,.12);
    box(body,.18,.20,.09,0x57473c,0,.02,-.15);
    box(body,.13,.13,.025,0x9f7950,0,.03,-.21);
    add(head,new THREE.SphereGeometry(.18,8,6),0xf3c99b,0,0,0);
    add(head,new THREE.SphereGeometry(.184,8,4,0,Math.PI*2,0,Math.PI*.48),0x513b32,0,.025,-.012);
    for(const s of [-1,1]){
      box(head,.037,.044,.018,0x273449,s*.061,.006,.164);
      box(head,.013,.015,.009,0xffffff,s*.065,.017,.175);
      ball(head,.035,0xf3c99b,s*.175,-.015,0);
    }
    box(head,.055,.012,.014,0x925646,0,-.065,.162);
    add(head,new THREE.CylinderGeometry(.17,.19,.085,8),0xffffff,0,.16,-.014,true);
    box(head,.23,.025,.12,0xffffff,0,.12,.13,true);
    box(body,.20,.045,.05,0xe8c878,0,.105,.10);
  }
  for(const s of [-1,1]){
    const side=s<0?'Left':'Right';
    const arm=joint(`${side}Arm`,s*(robot?.19:.185),robot?.32:.38,0);
    box(arm,robot?.085:.075,.14,.085,0xffffff,0,-.06,0,true);
    ball(arm,robot?.055:.048,robot?0x344862:0xf3c99b,0,-.16,.012);
    const leg=joint(`${side}Leg`,s*.075,robot?.15:.18,0);
    box(leg,.085,.11,.09,0x344862,0,-.045,0);
    box(leg,.10,.065,.15,robot?0x53667c:0x493e39,0,-.12,.025);
  }
  for(const [node,groups] of bins)for(const [material,parts] of groups){
    const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;node.add(mesh);
  }
  return {scene,animations:animationClips(robot)};
}
function animationClips(robot:boolean):THREE.AnimationClip[]{
  return ACTOR_ANIMATIONS.map(name=>{
    const moving=name==='walk'||name==='run'||name==='return';
    const duration=name==='run'?.40:name==='walk'?.65:name==='return'?.55:name==='search'?1.4:1.8;
    const times=[0,duration*.25,duration*.5,duration*.75,duration];
    const amplitude=name==='run'?.8:moving?.48:0;
    // glTF translation channels require VEC3, not scalar component tracks.
    const heights=moving?[0,.035,0,.035,0]:name==='search'?[0,-.025,-.01,-.025,0]:[0,.012,.025,.012,0];
    const tracks:THREE.KeyframeTrack[]=[new THREE.VectorKeyframeTrack('.position',times,
      heights.flatMap(y=>[0,y,0]))];
    const rotation=(node:string,axis:THREE.Vector3,values:number[])=>{
      const q=new THREE.Quaternion();const values4:number[]=[];
      values.forEach(a=>q.setFromAxisAngle(axis,a).toArray(values4,values4.length));
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node}.quaternion`,times,values4));
    };
    for(const [node,sign] of [['LeftLeg',1],['RightLeg',-1],['LeftArm',-1],['RightArm',1]] as const){
      const searchArm=name==='search'&&node.endsWith('Arm');
      rotation(node,new THREE.Vector3(1,0,0),searchArm?[-.3,-1,-.6,-1,-.3]:
        [0,amplitude*sign,0,-amplitude*sign,0]);
    }
    rotation('Head',new THREE.Vector3(0,1,0),name==='search'?[0,.5,0,-.5,0]:[0,.04,0,-.04,0]);
    rotation('Body',new THREE.Vector3(1,0,0),name==='search'?[0,.16,.08,.16,0]:
      moving?[robot?.08:.04,robot?.08:.04,robot?.08:.04,robot?.08:.04,robot?.08:.04]:[0,0,0,0,0]);
    return new THREE.AnimationClip(name,duration,tracks);
  });
}

/** Real lightweight accessories for four selectable 3D avatar silhouettes. */
export function styleAvatarModel(model:ActorModel,avatarId:string|undefined):void{
 if(!avatarId||avatarId==='H01')return;
 const head=model.scene.getObjectByName('Head');
 if(!head||head.getObjectByName('AvatarAccessory'))return;
 const accessory=new THREE.Group();accessory.name='AvatarAccessory';head.add(accessory);
 const mesh=(geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number)=>{
  const part=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.72,flatShading:true}));
  part.position.set(x,y,z);part.castShadow=true;accessory.add(part);
 };
 if(avatarId==='H02'){
  mesh(new THREE.CylinderGeometry(.205,.215,.085,8),0x3c8257,0,.18,0);
  mesh(new THREE.BoxGeometry(.27,.032,.19),0xe1c475,0,.155,.14);
 }else if(avatarId==='H03'){
  mesh(new THREE.SphereGeometry(.205,8,5,0,Math.PI*2,0,Math.PI*.54),0xd9e7f1,0,.055,0);
  mesh(new THREE.BoxGeometry(.07,.23,.095),0xe45d66,0,.27,-.015);
 }else if(avatarId==='H04'){
  mesh(new THREE.CylinderGeometry(0,.20,.36,8),0x5945b3,0,.34,0);
  mesh(new THREE.CylinderGeometry(.23,.23,.045,8),0xe6bf63,0,.16,0);
 }
}
export function disposeActorModel(model:ActorModel):void{
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  model.scene.traverse(o=>{if(o instanceof THREE.Mesh){
    geometries.add(o.geometry);
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));
  }});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
