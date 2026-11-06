import * as THREE from 'three';
import {describe,expect,it} from 'vitest';
import {createWorldBoard3D,tileBoardCorners,BOARD_SURFACE_Y}
  from '../src/client/world-map-board.ts';
import {boardTileWorldPosition} from '../src/client/world-map-three.ts';
import {TILES} from '../src/engine/types.ts';
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

  it('reuses board geometries and updates ownership colors from server state',()=>{
    const scene=new THREE.Scene();
    const board=createWorldBoard3D(scene);
    expect(scene.children).toContain(board.group);
    const surface=board.group.getObjectByName('worldmap-board-colors') as THREE.Mesh;
    expect(surface).toBeDefined();
    const geometry=surface.geometry as THREE.BufferGeometry;
    const palette=geometry.getAttribute('color') as THREE.BufferAttribute;
    expect(palette.count).toBe(TILES.length*4);
    expect(board.group.children.length).toBe(4);
    const tokens=board.group.getObjectByName('worldmap-tile-type-markers');
    expect(tokens).toBeInstanceOf(THREE.Mesh);
    board.sync(null);
    const defaultBlue=[palette.getX(4),palette.getY(4),palette.getZ(4)];
    const state={
      players:[{id:'a',color:'#ff0000'}],
      galleries:[{tile:1,ownerId:'a'}]
    } as GameState;
    board.sync(state);
    expect(palette.getX(4)).toBeCloseTo(1);
    expect(palette.getY(4)).toBeCloseTo(0);
    expect(palette.getZ(4)).toBeCloseTo(0);
    expect(defaultBlue).not.toEqual([1,0,0]);
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
