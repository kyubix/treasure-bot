import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {TILES} from '../src/engine/types.ts';
import {galleryNumberAt,GALLERY_COLORS} from '../src/engine/gallery.ts';
import {
 BOARD_CELL_WIDTH,boardVisualColor,boardVisualTile
} from '../src/client/board-view-three.ts';
import {buildBoardBackdrop,makeBoardLandmark,disposeEnvironment}
 from '../src/client/board-view-environment.ts';
import {boardScenery} from '../src/client/board-environment.ts';

describe('HD Three.js Board View',()=>{
 it('projects all 28 game-engine tiles through the same wrapping traversal',()=>{
  expect(TILES).toHaveLength(28);
  expect(BOARD_CELL_WIDTH).toBeGreaterThan(1);
  for(let i=0;i<28;i++){
   expect(boardVisualTile(i,0)).toBe(i);
   expect(boardVisualTile(i+28,0)).toBe(i);
   expect(boardVisualTile(i,1)).toBe((i+1)%28);
   expect(boardVisualTile(i,-1)).toBe((i+27)%28);
  }
  expect(boardVisualTile(4.9,0)).toBe(4);
  expect(boardVisualTile(-.1,0)).toBe(27);
 });
 it('uses Gallery No.N and authentic game-state tile types, not fake buildings on world map',()=>{
  for(let i=0;i<TILES.length;i++){
   const gallery=galleryNumberAt(i);
   const color=boardVisualColor(i);
   expect(/^#[0-9a-fA-F]{6}$/.test(color)).toBe(true);
   if(gallery)expect(color).toBe(GALLERY_COLORS[gallery]);
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
