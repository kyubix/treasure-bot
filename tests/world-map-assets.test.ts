import {describe,it,expect,vi} from 'vitest';
import avatarSource from '../public/assets/worldmap/actors/avatar-v5.gltf?raw';
import robotSource from '../public/assets/worldmap/actors/robot-v5.gltf?raw';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createOriginalActor,disposeActorModel,ACTOR_ANIMATIONS} from '../src/client/world-map-models.ts';
import type {ActorModel} from '../src/client/world-map-models.ts';
import {createWorldActors} from '../src/client/world-map-actors.ts';
import type {GameState} from '../src/engine/types.ts';

const anchors={tile:(n:number)=>new THREE.Vector3(n,.5,0),site:(x:number,y:number)=>new THREE.Vector3(x,.5,y)};
const state={players:[{id:'a',position:2,color:'#ff8833',robot:{chassis:'NORMAL',mission:null}}],islandSpots:[]} as unknown as GameState;

describe('V5 shipped glTF assets and lifecycle',()=>{
  it.each(['avatar','robot'] as const)('loads real %s glTF and animates joints within mobile budgets',async kind=>{
    // Node has no ProgressEvent; FileLoader requires it for embedded data URIs.
    vi.stubGlobal('ProgressEvent',class {constructor(public type:string){}});
    try{
      const text=kind==='avatar'?avatarSource:robotSource;
      expect(text.length).toBeLessThan(125000);
      const gltf=await new GLTFLoader().parseAsync(text,'');
      expect(gltf.animations.map(c=>c.name)).toEqual(ACTOR_ANIMATIONS);
      let meshes=0,vertices=0;
      gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;vertices+=o.geometry.attributes.position.count;}});
      expect(meshes).toBeLessThanOrEqual(10);expect(vertices/3).toBeLessThan(1500);
      const mixer=new THREE.AnimationMixer(gltf.scene);
      for(const clip of gltf.animations){
        mixer.stopAllAction();mixer.clipAction(clip).reset().play();
        mixer.update(clip.duration*.25);
        const node=gltf.scene.getObjectByName(clip.name==='idle'?'Motion':'LeftArm')!;
        expect(node).toBeTruthy();
        if(clip.name==='idle')expect(node.position.y).toBeGreaterThan(0);
        else expect(Math.abs(node.quaternion.x)).toBeGreaterThan(.01);
      }
      mixer.stopAllAction();disposeActorModel({scene:gltf.scene,animations:gltf.animations});
    }finally{vi.unstubAllGlobals();}
  });
  it('upgrades in place and disposes assets that finish loading after exit',async()=>{
    const pending=new Map<string,(m:ActorModel)=>void>();
    const scene=new THREE.Scene();
    const actors=createWorldActors(scene,anchors,kind=>new Promise(resolve=>pending.set(kind,resolve)));
    actors.sync(state);const host=scene.getObjectByName('worldmap-3d-actors')!;
    const original=host.children[0];
    pending.get('avatar')!(createOriginalActor('avatar'));await Promise.resolve();
    expect(host.children[0]).toBe(original);expect(original.userData.asset).toBe('gltf');
    const late=createOriginalActor('robot');let disposed=0;
    late.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.addEventListener('dispose',()=>disposed++);});
    actors.dispose();pending.get('robot')!(late);await Promise.resolve();
    expect(disposed).toBe(10);expect(scene.children).toHaveLength(0);
    actors.sync(state);expect(scene.children).toHaveLength(0);
  });
  it('retains animated fallback after failed download and ignores removed players',async()=>{
    const scene=new THREE.Scene();
    const actors=createWorldActors(scene,anchors,async()=>{throw Error('offline');});
    actors.sync(state);await Promise.resolve();await Promise.resolve();
    const root=scene.getObjectByName('worldmap-3d-actors')!.children[0];
    expect(root.userData.asset).toBe('procedural');actors.update(.05);
    expect(root.children[0].position.y).toBeGreaterThan(0);
    actors.sync(null);actors.dispose();expect(scene.children).toHaveLength(0);
  });
});
