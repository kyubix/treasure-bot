import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {terrainHeight} from './world-map-terrain.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';

/**
 * Authored, original GLB miniature landmarks. The procedural stage remains
 * visible until the entire required set has loaded successfully.
 * Failed downloads, shape changes or disposal never remove the fallback.
 */
export type LandmarkId='lighthouse'|'ruins'|'camp'|'dock'|'crystals'|'stones';
export interface LandmarkSpec {
 readonly id:LandmarkId;
 readonly x:number;
 readonly z:number;
 readonly scale:number;
 readonly rotation:number;
 readonly groundOffset:number;
}
export const WORLD_LANDMARKS:Readonly<Record<MapShapeId,readonly LandmarkSpec[]>>={
 RING:[
  {id:'lighthouse',x:1.86,z:2.28,scale:1,rotation:0,groundOffset:-.04},
  {id:'ruins',x:2.10,z:-1.50,scale:.90,rotation:.20,groundOffset:-.055},
  {id:'camp',x:-1.45,z:1.53,scale:.96,rotation:.40,groundOffset:-.035}
 ],
 LAGOON:[
  {id:'dock',x:1.54,z:.56,scale:1,rotation:.24,groundOffset:-.08}
 ],
 CLOVER:[
  {id:'crystals',x:1.30,z:-1.52,scale:1,rotation:.13,groundOffset:-.06},
  {id:'stones',x:-1.82,z:-1.65,scale:.89,rotation:-.21,groundOffset:-.05}
 ]
};

type LandmarkLoader=(id:LandmarkId)=>Promise<THREE.Group>;
const templates=new Map<LandmarkId,Promise<THREE.Group>>();
const defaultLoader:LandmarkLoader=(id)=>{
 let promise=templates.get(id);
 if(!promise){
  promise=new GLTFLoader()
   .loadAsync('/assets/worldmap/landmarks/'+id+'.glb')
   .then(gltf=>gltf.scene)
   .catch(error=>{templates.delete(id);throw error;});
  templates.set(id,promise);
 }
 return promise;
};
function disposeModel(root:THREE.Group):void{
 const geometries=new Set<THREE.BufferGeometry>();
 const materials=new Set<THREE.Material>();
 root.traverse(obj=>{
  if(obj instanceof THREE.Mesh){
   geometries.add(obj.geometry);
   for(const m of Array.isArray(obj.material)?obj.material:[obj.material])
    materials.add(m);
  }
 });
 for(const g of geometries)g.dispose();
 for(const m of materials)m.dispose();
}
function instantiate(template:THREE.Group,spec:LandmarkSpec,shape:MapShapeId):THREE.Group{
 const instance=template.clone(true);
 // Every visible GLB mesh is scene-owned, not shared with cached templates.
 // A shape change may dispose it without affecting newly spawned islands.
 instance.traverse(obj=>{
  if(obj instanceof THREE.Mesh){
   obj.geometry=obj.geometry.clone();
   obj.material=Array.isArray(obj.material)?
    obj.material.map(m=>m.clone()):obj.material.clone();
   obj.castShadow=true;obj.receiveShadow=true;
  }
 });
 instance.name='worldmap-landmark-'+spec.id;
 instance.position.set(spec.x,terrainHeight(spec.x,spec.z,shape)+spec.groundOffset,spec.z);
 instance.rotation.y=spec.rotation;
 instance.scale.setScalar(spec.scale);
 return instance;
}
export interface DetailedLandmarkStage {
 readonly ready:Promise<boolean>;
 dispose():void;
}
/**
 * Loader injection is used by node regression tests. Production uses exactly
 * one cached same-origin GLB load per kind, with no remote model services.
 */
export function createDetailedStageLandmarks(
 stage:THREE.Group,shape:MapShapeId,fallback:THREE.Group,
 loader:LandmarkLoader=defaultLoader
):DetailedLandmarkStage{
 let disposed=false;
 let installed:THREE.Group[]=[];
 const specs=WORLD_LANDMARKS[shape];
 const ready=Promise.allSettled(specs.map(async spec=>
  instantiate(await loader(spec.id),spec,shape)
 )).then(results=>{
  const loaded=results
   .filter((result):result is PromiseFulfilledResult<THREE.Group>=>result.status==='fulfilled')
   .map(result=>result.value);
  if(disposed||loaded.length!==specs.length){
   for(const model of loaded)disposeModel(model);
   return false;
  }
  // Atomic visual swap; never show duplicate decorative objects.
  for(const model of loaded)stage.add(model);
  installed=loaded;
  fallback.visible=false;
  return true;
 });
 return {
  ready,
  dispose(){
   disposed=true;
   fallback.visible=true;
   for(const model of installed){
    stage.remove(model);
    disposeModel(model);
   }
   installed=[];
  }
 };
}
