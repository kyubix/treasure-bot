import * as THREE from 'three';
import {boardViewportDimensions} from '../src/client/board-viewport.ts';
import {describe,it,expect} from 'vitest';
import {TILES} from '../src/engine/types.ts';
import type {GameState} from '../src/engine/types.ts';
import {galleryNumberAt} from '../src/engine/gallery.ts';
import {PLAYER_COLORS,GALLERY_SLOT_ORDER,galleryPlayerSlotAt,galleryPlayerColorAt,boardTileBaseColor} from '../src/engine/player-palette.ts';
import {
 BOARD_CELL_WIDTH,BOARD_NUMBER_PLATE_DEPTH,BOARD_COLOR_PLATE_DEPTH,
 boardVisualColor,boardVisualTile,boardVisualXForIndex,stoppedEncounterTile
} from '../src/client/board-view-three.ts';
import {buildBoardBackdrop,makeBoardLandmark,disposeEnvironment}
 from '../src/client/board-view-environment.ts';
import {boardScenery} from '../src/client/board-environment.ts';

describe('HD Three.js Board View',()=>{
 it('starts mobile board at the actual measured portrait viewport',()=>{
   expect(boardViewportDimensions({clientWidth:388,clientHeight:657}))
    .toEqual({width:388,height:657});
   expect(boardViewportDimensions({clientWidth:812,clientHeight:370}))
    .toEqual({width:812,height:370});
   expect(boardViewportDimensions({clientWidth:0,clientHeight:0}))
    .toEqual({width:640,height:480});
 });
 it('distributes each numbered Gallery equally between player colors',()=>{
   expect(PLAYER_COLORS).toEqual(['#2489ea','#44c767','#e254c5','#f5cf32']);
   expect(GALLERY_SLOT_ORDER).toEqual([1,2,4,3]);
   for(let n=1;n<=5;n++){
     const slots=TILES.map((_,i)=>galleryNumberAt(i)===n?
       galleryPlayerSlotAt(i):null).filter(x=>x!==null);
     expect(slots).toEqual([1,2,4,3]);
   }
   expect(boardTileBaseColor(1)).toBe(PLAYER_COLORS[0]);
   expect(boardTileBaseColor(2)).toBe(PLAYER_COLORS[1]);
   expect(galleryPlayerSlotAt(3)).toBeNull(); // SHOP, not a player tile
 });
 it('makes forward steps go LEFT, including across wraparound',()=>{
   expect(boardVisualXForIndex(0,27)).toBeCloseTo(-BOARD_CELL_WIDTH);
   expect(boardVisualXForIndex(27,0)).toBeCloseTo(BOARD_CELL_WIDTH);
   expect(boardVisualXForIndex(2,1.5)).toBeCloseTo(-BOARD_CELL_WIDTH*.5);
   expect(boardVisualXForIndex(1,1.5)).toBeCloseTo(BOARD_CELL_WIDTH*.5);
 });
 it('shows encounter buildings only once the avatar stops on that tile',()=>{
  const special=TILES.findIndex(t=>t==='GALLERY');
  const state={
   phase:'playing',currentPlayerIndex:0,players:[{id:'player',position:special}]
  } as unknown as GameState;
  expect(stoppedEncounterTile(state,special,null)).toBe(special);
  expect(stoppedEncounterTile(state,special+28,null)).toBe(special);
  // GameState already points at the destination DURING movement.
  expect(stoppedEncounterTile(state,special,'player')).toBeNull();
  expect(stoppedEncounterTile(state,special-.25,'player')).toBeNull();
  expect(stoppedEncounterTile(state,special-.25,null)).toBeNull();
  expect(stoppedEncounterTile(state,Number.NaN,null)).toBeNull();
  state.players[0].position=TILES.findIndex(t=>t==='PLAIN');
  expect(stoppedEncounterTile(state,state.players[0].position,null)).toBeNull();
  state.phase='lobby';
  expect(stoppedEncounterTile(state,special,null)).toBeNull();
 });
 it('shows specific Shop/Event/Support landmarks only on stopped tiles',()=>{
  for(const type of ['SHOP','EVENT','SUPPORT'] as const){
   const pos=TILES.findIndex(t=>t===type);
   const state={phase:'playing',currentPlayerIndex:0,
    players:[{id:'p',position:pos}]} as unknown as GameState;
   expect(stoppedEncounterTile(state,pos,null)).toBe(pos);
   expect(stoppedEncounterTile(state,pos,'p')).toBeNull();
  }
 });
 it('keeps number plate and colored lower panel physically separate',()=>{
  expect(BOARD_NUMBER_PLATE_DEPTH).toBeGreaterThan(1);
  expect(BOARD_COLOR_PLATE_DEPTH).toBeGreaterThan(BOARD_NUMBER_PLATE_DEPTH);
 });
 it('projects all 28 game-engine tiles through the same wrapping traversal',()=>{
  expect(TILES).toHaveLength(28);
  expect(BOARD_CELL_WIDTH).toBeGreaterThan(1);
  for(let i=0;i<28;i++){
   expect(boardVisualTile(i,0)).toBe(i);
   expect(boardVisualTile(i+28,0)).toBe(i);
   expect(boardVisualTile(i,1)).toBe((i+27)%28);
   expect(boardVisualTile(i,-1)).toBe((i+1)%28);
   expect(boardVisualXForIndex((i+1)%28,i)).toBeCloseTo(-BOARD_CELL_WIDTH);
   expect(boardVisualXForIndex((i+27)%28,i)).toBeCloseTo(BOARD_CELL_WIDTH);
  }
  expect(boardVisualTile(4.9,0)).toBe(4);
  expect(boardVisualTile(-.1,0)).toBe(27);
 });
 it('uses Gallery No.N and authentic game-state tile types, not fake buildings on world map',()=>{
  for(let i=0;i<TILES.length;i++){
   const gallery=galleryNumberAt(i);
   const color=boardVisualColor(i);
   expect(/^#[0-9a-fA-F]{6}$/.test(color)).toBe(true);
   if(gallery)expect(color).toBe(galleryPlayerColorAt(i));
  }
 });
 it('builds physically lit HD scenery for every existing biome',()=>{
  const zones=['meadow','forest','cliffs','coast','desert','volcano','ice'] as const;
  for(const biome of zones){
   const group=buildBoardBackdrop(biome);
   const hill=group.children.find(c=>c instanceof THREE.Mesh &&
      (c as THREE.Mesh).geometry.getAttribute('color')) as THREE.Mesh;
   expect(hill).toBeInstanceOf(THREE.Mesh);
   expect(hill.geometry.getAttribute('position').count).toBeGreaterThan(1000);
   expect(group.children.filter(c=>c instanceof THREE.InstancedMesh).length).toBe(2);
   disposeEnvironment(group);
  }
  expect(boardScenery(5).biome).toBe('forest');
  expect(boardScenery(12).biome).toBe('coast');
 });
 it('renders separate close-up gallery, shop and special landmarks',()=>{
  const a=makeBoardLandmark('gallery',3);
  const b=makeBoardLandmark('shop',null);
  const c=makeBoardLandmark('event',null);
  expect(a.userData.sign).toBe('GALLERY No.3');
  expect(b.userData.sign).toBe('ROBOT SHOP');
  expect(c.userData.sign).toBeUndefined();
  expect(a.children.length).toBeGreaterThan(6);
  for(const group of [a,b,c])disposeEnvironment(group);
 });
});
