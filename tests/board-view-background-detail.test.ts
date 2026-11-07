import * as THREE from 'three';
import {describe,expect,it} from 'vitest';
import {buildBoardBackdrop,disposeEnvironment} from '../src/client/board-view-environment.ts';
import {BOARD_BIOMES} from '../src/client/board-environment.ts';
import {readFileSync} from 'node:fs';

describe('stylized detailed Board background',()=>{
 it('provides atmospheric sky, distant layered ridges, clouds and instanced natural detail',()=>{
  for(const biome of new Set(BOARD_BIOMES)){
   const group=buildBoardBackdrop(biome);
   const detail=group.getObjectByName('board-hd-background-detail') as THREE.Group;
   expect(detail).toBeInstanceOf(THREE.Group);
   expect(detail.userData.detailVersion).toBe('stylized-detailed-v1');
   const sky=detail.getObjectByName('gradient-sky') as THREE.Mesh;
   expect(sky).toBeInstanceOf(THREE.Mesh);
   expect(sky.geometry.getAttribute('color').count).toBeGreaterThan(20);
   expect(detail.getObjectByName('layered-mid-ridge')).toBeInstanceOf(THREE.Mesh);
   expect(detail.getObjectByName('misty-distant-peaks')).toBeInstanceOf(THREE.Mesh);
   const clouds=detail.getObjectByName('distant-cloud-banks') as THREE.InstancedMesh;
   const stones=detail.getObjectByName('scattered-worn-boulders') as THREE.InstancedMesh;
   const shrubs=detail.getObjectByName('grasses-and-low-shrubs') as THREE.InstancedMesh;
   const flowers=detail.getObjectByName('biome-wildflowers-and-sparks') as THREE.InstancedMesh;
   for(const mesh of [clouds,stones,shrubs,flowers]){
    expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(mesh.count).toBeGreaterThanOrEqual(13);
   }
   expect(clouds.count).toBeLessThanOrEqual(16);
   expect(stones.count+shrubs.count+flowers.count).toBeLessThan(250);
   // All new meshes are owned by the existing scene lifecycle.
   disposeEnvironment(group);
  }
 });
 it('preserves touch-orbit World Map without the removed rotation controls',()=>{
  const main=readFileSync(new URL('../src/client/main.ts',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/client/viewport-layout.css',import.meta.url),'utf8');
  const world=readFileSync(new URL('../src/client/board.ts',import.meta.url),'utf8');
  expect(main).not.toContain('id="rotateLeft"');
  expect(main).not.toContain('id="rotateRight"');
  expect(main).not.toContain("toast(t('robotReady'))");
  expect(main).toContain('function playDispatch():void');
  expect(css).toContain('grid-template-columns:minmax(0,1fr) minmax(0,1.24fr)');
  expect(world).toContain('this.threeLayer.orbit(');
 });
});
