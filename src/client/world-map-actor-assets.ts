import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {ActorKind,ActorModel} from './world-map-models.ts';
import {ACTOR_ANIMATIONS,disposeActorModel} from './world-map-models.ts';

export type ActorAssetLoader=(kind:ActorKind)=>Promise<ActorModel>;
/** Same-origin, self-contained glTF: no decoder, textures or external services. */
export const loadActorAsset:ActorAssetLoader=async kind=>{
  const gltf=await new GLTFLoader().loadAsync(`/assets/worldmap/actors/${kind}-v5.gltf`);
  const model={scene:gltf.scene,animations:gltf.animations};
  if(!ACTOR_ANIMATIONS.every(name=>gltf.animations.some(clip=>clip.name===name))){
    disposeActorModel(model);throw new Error(`Incomplete ${kind} animation clips`);
  }
  // Exporter's scene wrapper is outside Motion; keep clips rooted at the glTF
  // scene so the named nodes exported by GLTFLoader are resolved correctly.
  return model;
};
