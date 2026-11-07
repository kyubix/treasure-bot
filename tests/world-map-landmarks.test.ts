import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {terrainHeight} from '../src/client/world-map-terrain.ts';
import {WORLD_LANDMARKS,createDetailedStageLandmarks,LandmarkId}
 from '../src/client/world-map-landmarks.ts';
import {MAP_SHAPES} from '../src/engine/map-shapes.ts';

describe('V7 original detailed GLB landmarks',()=>{
 it('ships valid compact binary GLB files with multiple PBR materials',async()=>{
  const ids:LandmarkId[]=['lighthouse','ruins','camp','dock','crystals','stones'];
  let combined=0;
  for(const id of ids){
   const bytes=readFileSync(new URL('../public/assets/worldmap/landmarks/'+id+'.glb',import.meta.url));
   combined+=bytes.length;
   expect(bytes.subarray(0,4).toString('ascii')).toBe('glTF');
   expect(bytes.length).toBeLessThan(200_000);
   const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
   const gltf=await new GLTFLoader().parseAsync(buffer,'');
   const meshes:THREE.Mesh[]=[];
   gltf.scene.traverse(node=>{if(node instanceof THREE.Mesh)meshes.push(node);});
   expect(meshes.length).toBeGreaterThan(4);
   for(const mesh of meshes){
    expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
    expect(mesh.geometry.getAttribute('normal')).toBeDefined();
    expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    mesh.geometry.dispose();
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])
     material.dispose();
   }
  }
  expect(combined).toBeLessThan(750_000);
 });
 it('grounds all models within their stage boundaries and avoids gallery tile centers',()=>{
  for(const shape of MAP_SHAPES){
   const spots=WORLD_LANDMARKS[shape];
   expect(spots.length).toBeGreaterThan(0);
   for(const spot of spots){
    expect(Number.isFinite(terrainHeight(spot.x,spot.z,shape))).toBe(true);
    expect(Math.hypot(spot.x,spot.z)).toBeLessThan(3.15);
    expect(spot.scale).toBeGreaterThan(.75);
   }
  }
 });
 it('atomically replaces fallback only after all stage assets load',async()=>{
  const stage=new THREE.Group(),fallback=new THREE.Group();
  stage.add(fallback);
  const loader=async()=>new THREE.Group();
  const handle=createDetailedStageLandmarks(stage,'RING',fallback,loader);
  expect(fallback.visible).toBe(true);
  expect(await handle.ready).toBe(true);
  expect(fallback.visible).toBe(false);
  expect(stage.children.filter(n=>n.name.startsWith('worldmap-landmark-'))).toHaveLength(3);
  handle.dispose();
  expect(fallback.visible).toBe(true);
  expect(stage.children).toHaveLength(1);
 });
 it('preserves fallback after partial load failure or cancellation',async()=>{
  for(const failing of [true,false]){
   const stage=new THREE.Group(),fallback=new THREE.Group();stage.add(fallback);
   let release:(value:THREE.Group)=>void=()=>{};
   const promise=new Promise<THREE.Group>(resolve=>{release=resolve;});
   const handle=createDetailedStageLandmarks(stage,'LAGOON',fallback,
    ()=>failing?Promise.reject(new Error('offline')):promise);
   if(!failing)handle.dispose();
   else expect(await handle.ready).toBe(false);
   if(!failing)release(new THREE.Group());
   expect(await handle.ready).toBe(false);
   expect(fallback.visible).toBe(true);
   expect(stage.children).toHaveLength(1);
  }
 });
});
