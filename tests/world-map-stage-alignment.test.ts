import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {MAP_SHAPES,boardPathFrame} from '../src/engine/map-shapes.ts';
import {boardPathQuad} from '../src/engine/map-shapes.ts';
import {terrainRadius} from '../src/client/world-map-terrain.ts';
import {createStageFoundation,createStageApron,createStageDecorations,
 stageBoundaryPoint,STAGE_FOUNDATION_OUTSET} from '../src/client/world-map-stage.ts';
import {createSurfBand} from '../src/client/world-map-terrain.ts';

describe('World Map V3 connected stage foundation and themed islands',()=>{
 it('places solid foundation outside EVERY tile wall without an exposed ocean seam',()=>{
  for(const shape of MAP_SHAPES){
   for(const count of [28,29,38,47])for(let i=0;i<count;i++){
    const f=boardPathFrame(i/count,shape);
    const outer=stageBoundaryPoint(i/count,shape);
    const border=boardPathQuad(i,count,shape,3.28,3.68);
    expect(outer.distanceTo(new THREE.Vector2(f.x,f.z))).toBeCloseTo(
      STAGE_FOUNDATION_OUTSET,3);
    for(const corner of border.slice(0,2)){
      // The solid island wall is OUTSIDE the widest coloured board
      // trim. This margin closes ocean gaps even at acute corners.
      const radial=(corner.x-f.x)*f.nx+(corner.z-f.z)*f.nz;
      expect(STAGE_FOUNDATION_OUTSET-radial).toBeGreaterThan(.02);
    }
    const a=Math.atan2(f.z,f.x);
    const shore=terrainRadius(a,shape);
    expect(outer.length()).toBeGreaterThan(shore+.25);
   }
  }
 });
 it('draws continuous board foundation, grass apron and offshore foam',()=>{
  for(const shape of MAP_SHAPES){
   const foundation=createStageFoundation(shape);
   const apron=createStageApron(shape),foam=createSurfBand(shape);
   expect(foundation.name).toBe('stage-solid-foundation');
   expect(apron.name).toBe('stage-land-to-board-apron');
   const f=foundation.geometry.getAttribute('position') as THREE.BufferAttribute;
   const p=apron.geometry.getAttribute('position') as THREE.BufferAttribute;
   const sea=foam.geometry.getAttribute('position') as THREE.BufferAttribute;
   expect(f.count).toBe(1+145+290);
   expect(p.count).toBe(290);
   expect(sea.count).toBe(242);
   expect(f.getY(0)).toBeCloseTo(.414);
   expect(p.getY(0)).toBeCloseTo(.426);
   expect(sea.getY(0)).toBeCloseTo(-.393);
   // At the map-seam the foundation and apron return to their own start.
   expect(new THREE.Vector3(f.getX(1),f.getY(1),f.getZ(1)).distanceTo(
    new THREE.Vector3(f.getX(145),f.getY(145),f.getZ(145)))).toBeLessThan(.00001);
   for(const mesh of [foundation,apron,foam]){
    mesh.geometry.dispose();
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    materials.forEach(m=>m.dispose());
   }
  }
 });
 it('uses distinct visible stage landmarks beyond subtle color variation',()=>{
  const ring=createStageDecorations('RING');
  const lagoon=createStageDecorations('LAGOON');
  const clover=createStageDecorations('CLOVER');
  expect(ring.name).toBe('stage-specific-decor-ring');
  expect(lagoon.name).toBe('stage-specific-decor-lagoon');
  expect(clover.name).toBe('stage-specific-decor-clover');
  expect(ring.children).toHaveLength(7);
  expect(lagoon.children).toHaveLength(15);
  expect(clover.children).toHaveLength(14);
  const shapeSet=new Set([ring,lagoon,clover].map(g=>g.children.map(o=>
   o instanceof THREE.Mesh?o.geometry.type:'none').join('|')));
  expect(shapeSet.size).toBe(3);
  for(const stage of [ring,lagoon,clover]){
   for(const child of stage.children)if(child instanceof THREE.Mesh){
    child.geometry.dispose();
    (child.material as THREE.Material).dispose();
   }
  }
 });
});