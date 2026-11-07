import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {createWorldSurfaceLibrary,createSurfacePair,SURFACE_SIZE,
 landmarkSurfaceKind,surfaceHeight} from '../src/client/world-map-materials.ts';

describe('V8 stylized detailed PBR texture and normal library',()=>{
 it('generates repeatable neutral albedo and non-flat normal relief',()=>{
  const a=createSurfacePair('stone'),b=createSurfacePair('stone');
  const data=a.color.image.data as Uint8Array;
  const repeated=b.color.image.data as Uint8Array;
  const normals=a.normal.image.data as Uint8Array;
  expect(a.color.image.width).toBe(SURFACE_SIZE);
  expect(a.color.colorSpace).toBe(THREE.SRGBColorSpace);
  expect(a.normal.colorSpace).not.toBe(THREE.SRGBColorSpace);
  expect(a.color.wrapS).toBe(THREE.RepeatWrapping);
  expect(Array.from(data)).toEqual(Array.from(repeated));
  expect(new Set(Array.from(data).filter((_,i)=>i%4===0)).size).toBeGreaterThan(12);
  expect(new Set(Array.from(normals).filter((_,i)=>i%4===0)).size).toBeGreaterThan(12);
  expect(surfaceHeight('wood',0,0)).toBeCloseTo(surfaceHeight('wood',SURFACE_SIZE,0));
  a.color.dispose();a.normal.dispose();b.color.dispose();b.normal.dispose();
 });
 it('assigns family textures, leaves metals/glass untouched and disposes only once',()=>{
  const library=createWorldSurfaceLibrary();
  const wood=new THREE.MeshStandardMaterial({name:'wood'});
  const stone=new THREE.MeshStandardMaterial({name:'stone'});
  const brass=new THREE.MeshStandardMaterial({name:'brass'});
  expect(landmarkSurfaceKind('canvas')).toBe('fabric');
  expect(landmarkSurfaceKind('crystal')).toBeNull();
  library.apply(wood);library.apply(stone);library.apply(brass);
  expect(wood.map).toBeInstanceOf(THREE.DataTexture);
  expect(wood.normalMap).toBeInstanceOf(THREE.DataTexture);
  expect(stone.map).not.toBe(wood.map);
  expect(brass.map).toBeNull();
  library.apply(new THREE.MeshStandardMaterial({name:'darkWood'}));
  expect(library.count()).toBe(2);
  library.dispose();library.dispose();
  expect(library.count()).toBe(0);
  wood.dispose();stone.dispose();brass.dispose();
 });
});
