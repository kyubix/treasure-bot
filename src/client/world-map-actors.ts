import * as THREE from 'three';
import type {GameState,Player} from '../engine/types.ts';
import type {IslandSpot} from '../engine/island.ts';
import {expeditionProgress} from '../engine/island.ts';
import {terrainHeight} from './world-map-terrain.ts';

/**
 * V4: real Three.js chibi players and companion/mission robots.
 * All positions are derived from authoritative GameState, not local movement.
 * Models are original lightweight low-poly geometry. A future GLB animation
 * asset can replace the rig without changing the server or the board renderer.
 */
type Anchors={
  tile:(index:number)=>THREE.Vector3;
  site:(x:number,y:number)=>THREE.Vector3;
};
type Rig={
  root:THREE.Group;
  motion:THREE.Group;
  mixer:THREE.AnimationMixer;
};
type Pair={player:Rig;robot:Rig;robotTarget:THREE.Vector3};
export interface AnimatedWorldActors{
  sync(state:GameState|null):void;
  update(deltaSeconds:number):void;
  dispose():void;
}
const TAU=Math.PI*2;
const bodyMaterial=(hex:number)=>new THREE.MeshStandardMaterial({
  color:hex,roughness:.91,flatShading:true
});
function part(parent:THREE.Object3D,g:THREE.BufferGeometry,
  m:THREE.Material,x:number,y:number,z:number):THREE.Mesh{
  const mesh=new THREE.Mesh(g,m);
  mesh.position.set(x,y,z);
  mesh.castShadow=true;
  parent.add(mesh);
  return mesh;
}
function animRig(root:THREE.Group, motion:THREE.Group,phase:number):Rig{
  const mixer=new THREE.AnimationMixer(motion);
  // Keyframes are on the figure, NOT on the server-controlled world anchor.
  const clip=new THREE.AnimationClip('idle',.8,[
    new THREE.NumberKeyframeTrack('.position[y]',[0,.2,.4,.6,.8],
      [0,.027,.048,.017,0])
  ]);
  const action=mixer.clipAction(clip);
  action.setLoop(THREE.LoopRepeat,Infinity);
  action.play();
  mixer.setTime(phase);
  return {root,motion,mixer};
}
function avatar(colour:string,phase:number):Rig{
  const root=new THREE.Group();
  const motion=new THREE.Group();root.add(motion);
  const main=bodyMaterial(new THREE.Color(colour).getHex());
  const skin=bodyMaterial(0xf2cb9b),hair=bodyMaterial(0x463c3a);
  const boot=bodyMaterial(0x374969),metal=bodyMaterial(0xe4dabc);
  const eye=bodyMaterial(0x24314c);
  // Chunky PS1-inspired big-head chibi with two distinct feet and arms.
  part(motion,new THREE.CylinderGeometry(.125,.15,.23,7),main,0,.265,0);
  for(const side of [-1,1]){
    part(motion,new THREE.BoxGeometry(.085,.16,.10),boot,side*.073,.09,0);
    const arm=part(motion,new THREE.CylinderGeometry(.045,.058,.20,6),main,
      side*.19,.29,0);
    arm.rotation.z=side*.19;
  }
  part(motion,new THREE.IcosahedronGeometry(.18,1),skin,0,.525,0);
  part(motion,new THREE.SphereGeometry(.16,7,5),hair,0,.64,-.018);
  // A colored short cap makes players identifiable even from the back.
  part(motion,new THREE.CylinderGeometry(.173,.172,.05,9),main,0,.679,0);
  part(motion,new THREE.BoxGeometry(.13,.024,.07),main,0,.67,.17);
  for(const side of [-1,1])
    part(motion,new THREE.SphereGeometry(.021,5,4),eye,
      side*.066,.53,.168);
  part(motion,new THREE.BoxGeometry(.14,.045,.014),metal,0,.31,.147);
  return animRig(root,motion,phase);
}
function companion(colour:string,phase:number):Rig{
  const root=new THREE.Group();
  const motion=new THREE.Group();root.add(motion);
  const paint=bodyMaterial(new THREE.Color(colour).getHex());
  const armor=bodyMaterial(0x3c5572),glass=bodyMaterial(0xa7e8fa);
  const eye=bodyMaterial(0x214669),gold=bodyMaterial(0xffd475);
  // Compact robot: face panel, two legs and antenna; not a billboard.
  part(motion,new THREE.BoxGeometry(.24,.20,.19),paint,0,.19,0);
  part(motion,new THREE.BoxGeometry(.205,.095,.022),glass,0,.22,.103);
  for(const x of [-.065,.065]){
    part(motion,new THREE.BoxGeometry(.065,.10,.09),armor,x,.055,0);
    part(motion,new THREE.SphereGeometry(.017,5,4),eye,x,.23,.121);
  }
  part(motion,new THREE.CylinderGeometry(.013,.013,.12,5),armor,0,.36,0);
  part(motion,new THREE.IcosahedronGeometry(.041,0),gold,0,.42,0);
  return animRig(root,motion,phase+.3);
}
function recycle(rig:Rig):void{
  rig.mixer.stopAllAction();
  rig.mixer.uncacheRoot(rig.motion);
  rig.root.parent?.remove(rig.root);
  rig.root.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    o.geometry.dispose();
    const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const m of materials)m.dispose();
  });
}
export function missionRobotAnchor(
  player:Player,spots:readonly IslandSpot[],anchors:Anchors
):THREE.Vector3 {
  const mission=player.robot.mission;
  if(!mission){
    const idle=anchors.tile(player.position).clone();
    // Robot companion is next to its owner, never at arbitrary island center.
    idle.x+=.23;
    return idle;
  }
  // The authoritative dispatch tile A must not follow player.position B.
  const start=anchors.tile(mission.launchTile??player.position).clone();
  const site=spots.find(s=>s.id===mission.siteId);
  if(!site)return start;
  const finish=anchors.site(site.x,site.y).clone();
  finish.y=Math.max(finish.y,terrainHeight(finish.x,finish.z)+.05);
  const t=expeditionProgress(mission);
  const progress=mission.phase==='OUTBOUND'?t:
    mission.phase==='SEARCH'?1:1-t;
  return start.lerp(finish,THREE.MathUtils.clamp(progress,0,1));
}
export function createWorldActors(
  scene:THREE.Scene,anchors:Anchors
):AnimatedWorldActors {
  const group=new THREE.Group();
  group.name='worldmap-3d-actors';
  scene.add(group);
  const rigs=new Map<string,Pair>();
  let lastState:GameState|null=null;
  const clear=(id:string,entry:Pair)=>{
    recycle(entry.player);
    recycle(entry.robot);
    rigs.delete(id);
  };
  return {
    sync(state){
      lastState=state;
      const present=new Set(state?.players.map(p=>p.id)??[]);
      for(const [id,entry] of rigs)if(!present.has(id))clear(id,entry);
      if(!state)return;
      for(let i=0;i<state.players.length;i++){
        const p=state.players[i];
        let entry=rigs.get(p.id);
        const tile=anchors.tile(p.position);
        const ordinal=state.players.slice(0,i)
          .filter(other=>other.position===p.position).length;
        const spread=state.players.filter(other=>other.position===p.position).length;
        // Different player models sharing a board tile stay distinguishable.
        const angle=(ordinal/Math.max(1,spread))*TAU;
        const radius=spread>1?.12:0;
        if(!entry){
          const character=avatar(p.color,i*.19);
          const robot=companion(p.color,i*.27);
          group.add(character.root,robot.root);
          const target=missionRobotAnchor(p,state.islandSpots,anchors);
          robot.root.position.copy(target);
          entry={player:character,robot,robotTarget:target.clone()};
          rigs.set(p.id,entry);
        }
        entry.player.root.position.set(
          tile.x+Math.cos(angle)*radius,tile.y,tile.z+Math.sin(angle)*radius
        );
        entry.player.root.rotation.y=Math.atan2(-tile.x,-tile.z);
        entry.robotTarget.copy(missionRobotAnchor(p,state.islandSpots,anchors));
        entry.robot.root.visible=true;
      }
    },
    update(deltaSeconds){
      const delta=Math.max(0,Math.min(.06,deltaSeconds));
      for(const entry of rigs.values()){
        entry.player.mixer.update(delta);
        entry.robot.mixer.update(delta);
        const before=entry.robot.root.position.clone();
        entry.robot.root.position.lerp(entry.robotTarget,
          Math.min(1,delta*5));
        const movement=entry.robot.root.position.clone().sub(before);
        if(movement.lengthSq()>.0000001){
          entry.robot.root.rotation.y=Math.atan2(movement.x,movement.z);
        }
      }
    },
    dispose(){
      for(const [id,entry] of rigs)clear(id,entry);
      group.parent?.remove(group);
      lastState=null;
    }
  };
}
