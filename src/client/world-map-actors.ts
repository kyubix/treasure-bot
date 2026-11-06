import * as THREE from 'three';
import type {GameState,Player} from '../engine/types.ts';
import type {IslandSpot} from '../engine/island.ts';
import {expeditionProgress} from '../engine/island.ts';
import {terrainHeight} from './world-map-terrain.ts';
import {createOriginalActor,disposeActorModel} from './world-map-models.ts';
import type {ActorAnimation,ActorKind,ActorModel} from './world-map-models.ts';
import {loadActorAsset} from './world-map-actor-assets.ts';
import type {ActorAssetLoader} from './world-map-actor-assets.ts';

type Anchors={tile:(index:number)=>THREE.Vector3;site:(x:number,y:number)=>THREE.Vector3};
type Rig={root:THREE.Group;model:ActorModel;mixer:THREE.AnimationMixer;
  actions:Map<string,THREE.AnimationAction>;active:ActorAnimation;colour:string};
type Pair={player:Rig;robot:Rig;robotTarget:THREE.Vector3;path:THREE.Vector3[];
  tile:number;phase:Player['robot']['mission'];fast:boolean;returning:boolean};
export interface AnimatedWorldActors{
  sync(state:GameState|null):void;
  update(deltaSeconds:number,cosmeticMotion?:boolean):void;
  pause(value:boolean):void;
  dispose():void;
}

function rig(model:ActorModel,colour:string):Rig{
  const root=new THREE.Group();root.add(model.scene);
  const mixer=new THREE.AnimationMixer(model.scene);
  const actions=new Map(model.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  const result={root,model,mixer,actions,active:'idle' as const,colour};
  model.scene.traverse(o=>{if(o instanceof THREE.Mesh){
    const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const m of materials)if(m.name==='PlayerPaint'&&m instanceof THREE.MeshStandardMaterial)m.color.set(colour);
  }});
  actions.get('idle')?.play();root.userData.animation='idle';
  return result;
}
function animate(r:Rig,name:ActorAnimation):void{
  if(r.active===name)return;
  const previous=r.actions.get(r.active),next=r.actions.get(name);
  // Reset stale fading actions before reuse, without allocating actions/frames.
  for(const [key,action] of r.actions)if(key!==r.active&&key!==name)action.stop();
  next?.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if(previous&&next)next.crossFadeFrom(previous,.16,false);
  r.active=name;r.root.userData.animation=name;
}
function recycle(r:Rig):void{
  r.mixer.stopAllAction();r.mixer.uncacheRoot(r.model.scene);
  r.root.removeFromParent();disposeActorModel(r.model);
}
function cloneModel(source:ActorModel):ActorModel{
  const scene=source.scene.clone(true);
  // Each rig owns its resources, so removing one player cannot invalidate peers.
  const materials=new Map<THREE.Material,THREE.Material>();
  scene.traverse(o=>{if(o instanceof THREE.Mesh){
    o.geometry=o.geometry.clone();o.castShadow=true;
    const clone=(m:THREE.Material)=>{let c=materials.get(m);if(!c){c=m.clone();materials.set(m,c);}return c;};
    o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);
  }});
  return {scene,animations:source.animations};
}
function upgrade(r:Rig,source:ActorModel):void{
  const replacement=rig(cloneModel(source),r.colour);
  r.mixer.stopAllAction();r.mixer.uncacheRoot(r.model.scene);
  r.root.remove(r.model.scene);disposeActorModel(r.model);
  r.model=replacement.model;r.mixer=replacement.mixer;r.actions=replacement.actions;
  r.root.add(r.model.scene);const active=r.active;r.active='idle';animate(r,active);
  r.root.userData.asset='gltf';
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

export function createWorldActors(scene:THREE.Scene,anchors:Anchors,
  loader:ActorAssetLoader=loadActorAsset):AnimatedWorldActors{
  const group=new THREE.Group();group.name='worldmap-3d-actors';scene.add(group);
  const rigs=new Map<string,Pair>();
  const assets=new Map<ActorKind,ActorModel>();
  let dead=false,paused=false;
  // Per-layer cache, at most two fetches. Failed downloads retain original rigs.
  for(const kind of ['avatar','robot'] as const){
    void loader(kind).then(model=>{
      if(dead){disposeActorModel(model);return;}
      assets.set(kind,model);
      for(const entry of rigs.values())upgrade(kind==='avatar'?entry.player:entry.robot,model);
    }).catch(()=>{/* Immediate procedural fallback remains animated and usable. */});
  }
  const make=(kind:ActorKind,colour:string)=>{
    const asset=assets.get(kind);
    const result=rig(asset?cloneModel(asset):createOriginalActor(kind),colour);
    result.root.userData.asset=asset?'gltf':'procedural';return result;
  };
  const clear=(id:string,entry:Pair)=>{recycle(entry.player);recycle(entry.robot);rigs.delete(id);};
  // Scratch vector reused for all actors: no allocations in the render loop.
  const movement=new THREE.Vector3();
  function move(root:THREE.Group,target:THREE.Vector3,step:number):boolean{
    movement.subVectors(target,root.position);
    const distance=movement.length();
    if(distance<.004){root.position.copy(target);return false;}
    root.rotation.y=Math.atan2(movement.x,movement.z);
    root.position.addScaledVector(movement,Math.min(1,step/distance));return true;
  }
  return {
    sync(state){
      if(dead)return;
      const present=new Set(state?.players.map(p=>p.id)??[]);
      for(const [id,entry] of rigs)if(!present.has(id))clear(id,entry);
      if(!state)return;
      for(let i=0;i<state.players.length;i++){
        const p=state.players[i];const tile=anchors.tile(p.position);
        const ordinal=state.players.slice(0,i).filter(other=>other.position===p.position).length;
        const spread=state.players.filter(other=>other.position===p.position).length;
        const angle=ordinal/Math.max(1,spread)*Math.PI*2,radius=spread>1?.12:0;
        const target=tile.clone().add(new THREE.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius));
        let entry=rigs.get(p.id);
        if(!entry){
          const character=make('avatar',p.color),robot=make('robot',p.color);
          character.root.position.copy(target);character.root.rotation.y=Math.atan2(-tile.x,-tile.z);
          const robotTarget=missionRobotAnchor(p,state.islandSpots,anchors);
          robot.root.position.copy(robotTarget);group.add(character.root,robot.root);
          entry={player:character,robot,robotTarget,path:[],tile:p.position,phase:null,fast:false,returning:false};
          rigs.set(p.id,entry);
        }else if(paused){
          entry.path.length=0;entry.tile=p.position;entry.player.root.position.copy(target);
        }else if(entry.tile!==p.position){
          // Append snapshot changes to the pending route; never shortcut across
          // the island. Initial/reconnected snapshots snap, later ones traverse.
          const steps=(p.position-entry.tile+28)%28;
          for(let n=1;n<=steps;n++)entry.path.push(anchors.tile((entry.tile+n)%28));
          entry.path[entry.path.length-1]=target;
          entry.tile=p.position;
          if(entry.path.length>28){entry.path.length=0;entry.player.root.position.copy(target);}
        }else if(entry.path.length){
          entry.path[entry.path.length-1].copy(target);
        }else entry.player.root.position.copy(target);
        if(p.robot.mission)entry.returning=false;
        else if(entry.phase?.phase==='INBOUND')entry.returning=true;
        entry.phase=p.robot.mission?{...p.robot.mission}:null;
        entry.fast=p.robot.chassis==='DASH';
        entry.robotTarget.copy(missionRobotAnchor(p,state.islandSpots,anchors));
        if(paused){
          entry.robot.root.position.copy(entry.robotTarget);entry.returning=false;
          animate(entry.player,'idle');animate(entry.robot,entry.phase?.phase==='SEARCH'?'search':'idle');
        }
      }
    },
    pause(value){
      paused=value;
      if(value)for(const entry of rigs.values()){
        const latest=entry.path.at(-1);if(latest)entry.player.root.position.copy(latest);
        entry.path.length=0;entry.robot.root.position.copy(entry.robotTarget);entry.returning=false;
        animate(entry.player,'idle');animate(entry.robot,entry.phase?.phase==='SEARCH'?'search':'idle');
      }
    },
    update(deltaSeconds,cosmeticMotion=true){
      if(dead||paused)return;
      const delta=Number.isFinite(deltaSeconds)?Math.max(0,Math.min(.06,deltaSeconds)):0;
      if(!delta)return;
      for(const entry of rigs.values()){
        const destination=entry.path[0];
        if(destination){
          move(entry.player.root,destination,delta*3.4);
          if(entry.player.root.position.distanceToSquared(destination)<.000016)entry.path.shift();
        }
        animate(entry.player,entry.path.length?'walk':'idle');
        const travelling=move(entry.robot.root,entry.robotTarget,delta*(entry.fast?3.6:2.4));
        const phase=entry.phase?.phase;
        animate(entry.robot,travelling?(phase==='INBOUND'||entry.returning?'return':entry.fast?'run':'walk'):
          phase==='SEARCH'?'search':'idle');
        if(!travelling)entry.returning=false;
        if(cosmeticMotion){entry.player.mixer.update(delta);entry.robot.mixer.update(delta);}
        else {entry.player.mixer.setTime(0);entry.robot.mixer.setTime(0);}
      }
    },
    dispose(){
      if(dead)return;dead=true;
      for(const [id,entry] of rigs)clear(id,entry);
      for(const asset of assets.values())disposeActorModel(asset);assets.clear();group.removeFromParent();
    }
  };
}
