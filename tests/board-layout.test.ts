import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {generateBoardLayout,isGalleryCount} from '../src/engine/board-layout.ts';
import {boardTiles,TILES} from '../src/engine/types.ts';
import type {GameState,GameAction} from '../src/engine/types.ts';
import {createPlayer,newGame,addGuest,applyAction} from '../src/engine/game.ts';
import {galleryNumberAt,ensureGallerySchema,galleryTile} from '../src/engine/gallery.ts';
import {boardTileBaseColor,PLAYER_COLORS} from '../src/engine/player-palette.ts';
import {boardVisualTile,boardVisualXForIndex} from '../src/client/board-view-three.ts';
import {createWorldBoard3D,tileBoardCorners} from '../src/client/world-map-board.ts';
import {boardTileWorldPosition} from '../src/client/world-map-three.ts';

function createMatch(count:3|4|5):GameState{
 const state=newGame('M12345',createPlayer('p1','Player 1'));
 addGuest(state,createPlayer('p2','Player 2'));
 applyAction(state,'p1',{type:'START',bots:0,galleryCount:count});
 return state;
}
describe('Dynamic 3/4/5-gallery map without legacy room regression',()=>{
 it('strictly validates gallery count instead of accepting arbitrary untrusted data',()=>{
  expect([3,4,5].every(isGalleryCount)).toBe(true);
  expect([0,2,6,-1,'3',3.5,Number.NaN].some(isGalleryCount)).toBe(false);
  const state=newGame('BAD001',createPlayer('host','Host'));
  addGuest(state,createPlayer('guest','Guest'));
  expect(()=>applyAction(state,'host',{type:'START',bots:0,galleryCount:6} as unknown as GameAction))
   .toThrow('Gallery count');
 });
 for(const count of [3,4,5] as const){
  it('generates a fair stable '+count+' Gallery board and per-player display',()=>{
   const board=generateBoardLayout(count);
   expect(board.galleryCount).toBe(count);
   expect(board.tiles).toHaveLength(1+count*9+(count>=3?1:0));
   expect(board.galleryNumbers).toHaveLength(board.tiles.length);
   expect(board.gallerySlots).toHaveLength(board.tiles.length);
   expect(board.tiles[0]).toBe('START');
   const state=createMatch(count);
   expect(boardTiles(state)).toEqual(board.tiles);
   expect(state.galleries).toHaveLength(count);
   expect(ensureGallerySchema(state)).toBe(false);
   for(let n=1;n<=count;n++){
    const indices=board.galleryNumbers.flatMap((v,i)=>v===n?[i]:[]);
    expect(indices).toHaveLength(8);
    const slots=indices.map(i=>board.gallerySlots[i]);
    expect(slots).toEqual([1,1,2,2,4,4,3,3]);
    for(const slot of [1,2,3,4])expect(slots.filter(s=>s===slot)).toHaveLength(2);
    for(const index of indices){
     expect(galleryNumberAt(index,state)).toBe(n);
     expect(boardTileBaseColor(index,state)).toBe(PLAYER_COLORS[(board.gallerySlots[index]??1)-1]);
    }
    expect(state.galleries[n-1].tile).toBe(indices[0]);
    expect(galleryTile(n,state)).toBe(indices[0]);
   }
   expect(board.tiles.filter(t=>t==='GALLERY')).toHaveLength(count*8);
   expect(boardVisualTile(0,-1,state)).toBe(1);
   expect(boardVisualTile(0,1,state)).toBe(board.tiles.length-1);
   expect(boardVisualXForIndex(1,0,state)).toBeLessThan(0);
   expect(boardVisualXForIndex(0,board.tiles.length-1,state)).toBeLessThan(0);
   const scene=new THREE.Scene();
   const boardMesh=createWorldBoard3D(scene);
   boardMesh.sync(state);
   const top=boardMesh.group.getObjectByName('worldmap-board-colors') as THREE.Mesh;
   const colors=top.geometry.getAttribute('color') as THREE.BufferAttribute;
   expect(colors.count).toBe(board.tiles.length*4);
   expect(boardMesh.group.getObjectByName('worldmap-gallery-numbers')).toBeInstanceOf(THREE.Mesh);
   for(let i=0;i<board.tiles.length;i++){
    const corners=tileBoardCorners(i,board.tiles.length);
    const avg=new THREE.Vector3();
    corners.forEach(x=>avg.add(x));
    avg.multiplyScalar(.25);
    const point=boardTileWorldPosition(i,3.48,.555,board.tiles.length);
    expect(point.distanceTo(new THREE.Vector3(avg.x,point.y,avg.z))).toBeLessThan(.025);
   }
   const oldGeometry=top.geometry;
   boardMesh.sync(state);
   expect((boardMesh.group.getObjectByName('worldmap-board-colors') as THREE.Mesh).geometry).toBe(oldGeometry);
  });
 }
 it('keeps legacy 28-tile persisted rooms on five unchanged numbered Galleries',()=>{
  const state=newGame('OLD001',createPlayer('host','Host'));
  addGuest(state,createPlayer('guest','Guest'));
  applyAction(state,'host',{type:'START',bots:0});
  expect(state.board).toBeUndefined();
  expect(boardTiles(state)).toBe(TILES);
  expect(boardTiles(state)).toHaveLength(28);
  expect(state.galleries).toHaveLength(5);
  expect(galleryNumberAt(1,state)).toBe(1);
  expect(ensureGallerySchema(state)).toBe(false);
 });
});
