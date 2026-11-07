import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {MAP_SHAPES,isMapShapeId,boardPathFrame,boardPathQuad} from '../src/engine/map-shapes.ts';
import {generateBoardLayout} from '../src/engine/board-layout.ts';
import {createPlayer,newGame,applyAction} from '../src/engine/game.ts';
import type {GameState,GameAction} from '../src/engine/types.ts';
import {boardTiles} from '../src/engine/types.ts';
import {galleryNumberAt} from '../src/engine/gallery.ts';
import {tileBoardCorners,createWorldBoard3D,BOARD_SURFACE_Y} from '../src/client/world-map-board.ts';
import {boardTileWorldPosition} from '../src/client/world-map-three.ts';
import {perimeterPoint} from '../src/client/world-map-geometry.ts';

function match(count:3|4|5,shape:'RING'|'LAGOON'|'CLOVER'):GameState{
 const state=newGame('SHAPES',createPlayer('p1','Player1'));
 applyAction(state,'p1',{type:'START',bots:3,galleryCount:count,mapShapeId:shape,
   winningRule:{kind:'TURN_LIMIT',rounds:10}});
 return state;
}
describe('Selectable stage shapes synchronized across World Map 3D and Phaser',()=>{
 it('strictly validates names and persists map shape independently of Gallery count',()=>{
  expect(MAP_SHAPES).toEqual(['RING','LAGOON','CLOVER']);
  expect(isMapShapeId('LAGOON')).toBe(true);
  expect(isMapShapeId('spiral')).toBe(false);
  for(const count of [3,4,5] as const)for(const shape of MAP_SHAPES){
   const s=match(count,shape);
   expect(s.board?.shapeId).toBe(shape);
   expect(s.board?.galleryCount).toBe(count);
   expect(boardTiles(s).filter(t=>t==='GALLERY')).toHaveLength(count*8);
  }
  const bad=newGame('BADMAP',createPlayer('host','Host'));
  expect(()=>applyAction(bad,'host',{type:'START',bots:3,galleryCount:3,
   mapShapeId:'nonexistent' as never})).toThrow('Map shape');
  expect(bad.phase).toBe('lobby');
  expect(bad.players).toHaveLength(1);
  const old=newGame('LEGACY',createPlayer('p1','Player1'));
  applyAction(old,'p1',{type:'START',bots:3,galleryCount:3});
  expect(old.board?.shapeId).toBe('RING');
  const historic=newGame('PREV',createPlayer('p1','Player1'));
  applyAction(historic,'p1',{type:'START',bots:3});
  expect(historic.board).toBeUndefined();
 });
 it('uses a single periodic path for each stage, including 0/last seam',()=>{
  for(const shape of MAP_SHAPES){
   const a=boardPathFrame(0,shape),b=boardPathFrame(1,shape);
   expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeLessThan(1e-8);
   expect(Math.hypot(a.tx-b.tx,a.tz-b.tz)).toBeLessThan(1e-7);
   const points=Array.from({length:200},(_,i)=>boardPathFrame(i/200,shape));
   for(const p of points){
    expect(Number.isFinite(p.x+p.z+p.nx+p.nz)).toBe(true);
    expect(Math.hypot(p.x,p.z)).toBeGreaterThan(3);
    expect(Math.hypot(p.x,p.z)).toBeLessThan(4);
    expect(Math.abs(Math.hypot(p.tx,p.tz)-1)).toBeLessThan(1e-9);
    expect(Math.abs(p.tx*p.nx+p.tz*p.nz)).toBeLessThan(1e-8);
   }
  }
  const ring=boardPathFrame(.125,'RING'),lagoon=boardPathFrame(.125,'LAGOON'),
        clover=boardPathFrame(.125,'CLOVER');
  expect(Math.hypot(ring.x-lagoon.x,ring.z-lagoon.z)).toBeGreaterThan(.2);
  expect(Math.hypot(ring.x-clover.x,ring.z-clover.z)).toBeGreaterThan(.15);
 });
 for(const count of [3,4,5] as const)for(const shape of MAP_SHAPES){
  it(`aligns ${shape} ${count}-Gallery board corners, actor anchors and labels`,()=>{
   const state=match(count,shape),n=boardTiles(state).length;
   const positions:THREE.Vector3[]=[];
   for(let index=0;index<n;index++){
    const corners=tileBoardCorners(index,n,shape);
    expect(corners).toHaveLength(4);
    const avg=corners.reduce((p,v)=>p.add(v),new THREE.Vector3()).multiplyScalar(.25);
    const actor=boardTileWorldPosition(index,3.48,BOARD_SURFACE_Y,n,shape);
    expect(actor.distanceTo(avg)).toBeLessThan(.065);
    positions.push(actor);
    expect(galleryNumberAt(index,state)).toBe(state.board?.galleryNumbers[index]??null);
    const p=perimeterPoint(index,{x:0,y:0},1,1,0,n,shape);
    expect(Number.isFinite(p.x+p.y)).toBe(true);
    const quad=boardPathQuad(index,n,shape,3.33,3.63);
    expect(corners[0].x).toBeCloseTo(quad[0].x);
   }
   for(let i=0;i<n;i++){
    const next=positions[(i+1)%n],dist=positions[i].distanceTo(next);
    expect(dist).toBeGreaterThan(.25);
    expect(dist).toBeLessThan(1.2);
   }
  });
 }
 it('rebuilds the same 3D board mesh for a new stage shape but not on same shape redraw',()=>{
  const scene=new THREE.Scene(),renderer=createWorldBoard3D(scene);
  const ring=match(4,'RING'),oval=match(4,'LAGOON'),clover=match(4,'CLOVER');
  renderer.sync(ring);
  const ringMesh=renderer.group.getObjectByName('worldmap-board-colors') as THREE.Mesh;
  const ringPosition=Array.from((ringMesh.geometry.getAttribute('position') as THREE.BufferAttribute).array);
  renderer.sync(ring);
  expect((renderer.group.getObjectByName('worldmap-board-colors') as THREE.Mesh).geometry)
   .toBe(ringMesh.geometry);
  renderer.sync(oval);
  const ovalMesh=renderer.group.getObjectByName('worldmap-board-colors') as THREE.Mesh;
  const ovalPosition=Array.from((ovalMesh.geometry.getAttribute('position') as THREE.BufferAttribute).array);
  expect(ovalMesh.geometry).not.toBe(ringMesh.geometry);
  expect(ovalPosition).not.toEqual(ringPosition);
  renderer.sync(clover);
  const cloverMesh=renderer.group.getObjectByName('worldmap-board-colors') as THREE.Mesh;
  const cloverPosition=Array.from((cloverMesh.geometry.getAttribute('position') as THREE.BufferAttribute).array);
  expect(cloverPosition).not.toEqual(ovalPosition);
  expect((cloverMesh.geometry.getAttribute('color') as THREE.BufferAttribute).count)
   .toBe(boardTiles(clover).length*4);
  expect(renderer.group.getObjectByName('worldmap-gallery-numbers')).toBeDefined();
 });
});