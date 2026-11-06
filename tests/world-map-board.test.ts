import * as THREE from 'three';
import {describe,expect,it} from 'vitest';
import {createWorldBoard3D,tileBoardCorners,BOARD_SURFACE_Y}
  from '../src/client/world-map-board.ts';
import {boardTileWorldPosition} from '../src/client/world-map-three.ts';
import {TILES} from '../src/engine/types.ts';
import {galleryNumberAt} from '../src/engine/gallery.ts';
import {boardTileBaseColor} from '../src/engine/player-palette.ts';
import type {GameState} from '../src/engine/types.ts';

describe('Depth-tested Three.js World Map board',()=>{
  it('positions all 28 tile polygons on the actual orbitable board ring',()=>{
    const seen=new Set<string>();
    for(let i=0;i<TILES.length;i++){
      const corners=tileBoardCorners(i);
      expect(corners).toHaveLength(4);
      const midpoint=boardTileWorldPosition(i);
      const centre=new THREE.Vector3();
      for(const corner of corners){
        expect(corner.y).toBeCloseTo(BOARD_SURFACE_Y,6);
        centre.add(corner);
      }
      centre.multiplyScalar(.25);
      expect(midpoint.distanceTo(new THREE.Vector3(centre.x,midpoint.y,centre.z))).toBeLessThan(.025);
      seen.add([centre.x.toFixed(4),centre.z.toFixed(4)].join(':'));
    }
    expect(seen.size).toBe(28);
  });

  it('reuses board geometries and keeps stable player colors despite treasure changes',()=>{
    const scene=new THREE.Scene();
    const board=createWorldBoard3D(scene);
    expect(scene.children).toContain(board.group);
    const surface=board.group.getObjectByName('worldmap-board-colors') as THREE.Mesh;
    expect(surface).toBeDefined();
    const geometry=surface.geometry as THREE.BufferGeometry;
    const palette=geometry.getAttribute('color') as THREE.BufferAttribute;
    expect(palette.count).toBe(TILES.length*4);
    expect(board.group.children.length).toBe(5);
    const digits=board.group.getObjectByName('worldmap-gallery-numbers') as THREE.Mesh;
    expect(digits).toBeInstanceOf(THREE.Mesh);
    expect((digits.geometry as THREE.BufferGeometry).getAttribute('position').count).toBeGreaterThan(100);
    const tokens=board.group.getObjectByName('worldmap-tile-type-markers');
    expect(tokens).toBeInstanceOf(THREE.Mesh);
    board.sync(null);
    const number=galleryNumberAt(1)!;
    const expected=new THREE.Color(boardTileBaseColor(1));
    expect(palette.getX(4)).toBeCloseTo(expected.r);
    expect(palette.getY(4)).toBeCloseTo(expected.g);
    expect(palette.getZ(4)).toBeCloseTo(expected.b);
    const state={
      players:[{id:'a',color:'#ff0000'}],
      galleries:[{number:1,tile:1,displaysByPlayerId:{a:[]}}]
    } as unknown as GameState;
    board.sync(state);
    // Shared per-player galleries never change tile-number palette by owner.
    expect(palette.getX(4)).toBeCloseTo(expected.r);
    const identity=palette.array;
    board.sync(state);
    expect(palette.array).toBe(identity);
    for(const child of board.group.children){
      if(child instanceof THREE.Mesh){
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  });
});
