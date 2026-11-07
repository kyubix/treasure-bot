import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {MAP_SHAPES,boardPathFrame} from '../src/engine/map-shapes.ts';
import {boardPathQuad} from '../src/engine/map-shapes.ts';
import {terrainRadius,terrainHeight} from '../src/client/world-map-terrain.ts';
import {createStageFoundation,createStageApron,createStageDecorations,
 stageBoundaryPoint,STAGE_FOUNDATION_OUTSET,STAGE_APRON_INSET} from '../src/client/world-map-stage.ts';
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
   expect(f.count).toBe(1+145+6*145);
   expect(p.count).toBe(4*145);
   expect(sea.count).toBe(242);
   expect(f.getY(0)).toBeCloseTo(.414);
   expect(p.getY(0)).toBeCloseTo(terrainHeight(p.getX(0),p.getZ(0),shape)+.004,5);
   expect(p.getY(3)).toBeCloseTo(.429,5);
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

 it('aligns every apron lane with its board-angle coast and preserves the tile face',()=>{
  for(const shape of MAP_SHAPES){
   const apron=createStageApron(shape),foundation=createStageFoundation(shape);
   const foam=createSurfBand(shape);
   const p=apron.geometry.getAttribute('position') as THREE.BufferAttribute;
   const rock=foundation.geometry.getAttribute('position') as THREE.BufferAttribute;
   const surf=foam.geometry.getAttribute('position') as THREE.BufferAttribute;
   for(let i=0;i<=144;i++){
    const u=i/144,frame=boardPathFrame(u,shape);
    const a=Math.atan2(frame.z,frame.x),r=terrainRadius(a,shape)-.04;
    const land=new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r);
    const board=stageBoundaryPoint(u,shape,STAGE_APRON_INSET);
    const first=i*4;
    expect(new THREE.Vector2(p.getX(first),p.getZ(first)).distanceTo(land)).toBeLessThan(.00001);
    expect(new THREE.Vector2(p.getX(first+3),p.getZ(first+3)).distanceTo(board)).toBeLessThan(.00001);
    for(let lane=1;lane<3;lane++){
     const f=lane/3,expected=land.clone().lerp(board,f);
     expect(new THREE.Vector2(p.getX(first+lane),p.getZ(first+lane))
      .distanceTo(expected)).toBeLessThan(.00001);
     expect(p.getY(first+lane)).toBeLessThan(.518);
    }
    // Erosion may vary the rock underneath, but never the board-closing cap.
    const cap=new THREE.Vector2(rock.getX(i+1),rock.getZ(i+1));
    expect(cap.distanceTo(stageBoundaryPoint(u,shape))).toBeLessThan(.00001);
    const footIndex=1+145+5*145+i;
    const foot=new THREE.Vector2(rock.getX(footIndex),rock.getZ(footIndex));
    expect(foot.distanceTo(stageBoundaryPoint(u,shape,.268))).toBeLessThan(.013);
   }
   // Foam stays beyond the widest rock-foot erosion at the waterline.
   for(let i=0;i<=120;i++){
    const u=i/120,first=i*2;
    const inFoam=new THREE.Vector2(surf.getX(first),surf.getZ(first));
    expect(inFoam.distanceTo(stageBoundaryPoint(u,shape,.294))).toBeLessThan(.00001);
   }
   for(const mesh of [apron,foundation,foam]){
    mesh.geometry.dispose();
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();
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