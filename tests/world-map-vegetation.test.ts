import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {forestPlacements,createDetailedForest} from '../src/client/world-map-vegetation.ts';
import {terrainHeight,terrainRadius} from '../src/client/world-map-terrain.ts';
import {MAP_SHAPES} from '../src/engine/map-shapes.ts';

describe('Stylized detailed 3D instanced vegetation',()=>{
  it('keeps rooted trees within land and outside board/Gallery rim on all shapes',()=>{
    for(const shape of MAP_SHAPES){
      const placements=forestPlacements(shape);
      expect(placements.length).toBeGreaterThan(12);
      expect(placements.length).toBeLessThanOrEqual(58);
      for(const tree of placements){
        const a=Math.atan2(tree.z,tree.x);
        expect(Math.hypot(tree.x,tree.z)).toBeLessThanOrEqual(
          terrainRadius(a,shape)-.65+.000001);
        expect(tree.y).toBeCloseTo(terrainHeight(tree.x,tree.z,shape),5);
        expect(tree.scale).toBeGreaterThan(.7);
      }
      expect(forestPlacements(shape)).toEqual(placements);
    }
  });
  it('batches broadleaf and pine into two shaded instanced meshes',()=>{
    for(const shape of MAP_SHAPES){
      const forest=createDetailedForest(shape);
      expect(forest.children).toHaveLength(2);
      expect(forest.name).toContain('detailed-forest');
      const count=forestPlacements(shape).length;
      expect(forest.children.reduce((n,c)=>n+(c as THREE.InstancedMesh).count,0)).toBe(count);
      const mats=new Set<THREE.Material>();
      for(const child of forest.children){
        expect(child).toBeInstanceOf(THREE.InstancedMesh);
        const mesh=child as THREE.InstancedMesh;
        const geometry=mesh.geometry as THREE.BufferGeometry;
        expect(geometry.getAttribute('color')).toBeDefined();
        expect(geometry.getAttribute('normal')).toBeDefined();
        expect(geometry.getAttribute('position').count).toBeGreaterThan(120);
        expect(mesh.castShadow).toBe(true);
        expect(mesh.instanceColor).not.toBeNull();
        mats.add(mesh.material as THREE.Material);
        geometry.dispose();
        mesh.dispose();
      }
      for(const mat of mats)mat.dispose();
    }
  });
});
