import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {createAnimatedOcean,waveHeight,coastLight,OCEAN_LEVEL,WAVE_INTERVAL_MS}
  from '../src/client/world-map-water.ts';

describe('Three.js World Map animated ocean',()=>{
  it('uses bounded, time-varying waves rather than a flat plane',()=>{
    const zero=waveHeight(1.7,-2.4,0);
    const later=waveHeight(1.7,-2.4,2.5);
    expect(Number.isFinite(zero)).toBe(true);
    expect(Math.abs(zero)).toBeLessThan(.091);
    expect(Math.abs(later)).toBeLessThan(.091);
    expect(later).not.toBeCloseTo(zero,4);
    expect(OCEAN_LEVEL).toBeLessThan(0);
    expect(WAVE_INTERVAL_MS).toBeGreaterThan(40);
  });

  it('lightens water near the island without making the open sea opaque white',()=>{
    expect(coastLight(4,0)).toBeGreaterThan(coastLight(8,0));
    expect(coastLight(8,0)).toBe(0);
    expect(coastLight(4,0)).toBeGreaterThan(0);
    expect(coastLight(0,0)).toBe(1);
  });

  it('updates one shared geometry and reuses water/foam objects',()=>{
    const scene=new THREE.Scene();
    const ocean=createAnimatedOcean(scene);
    const meshes=scene.children.filter(o=>o instanceof THREE.Mesh) as THREE.Mesh[];
    const sea=meshes.find(o=>o.geometry instanceof THREE.PlaneGeometry);
    expect(sea).toBeDefined();
    const geometry=sea!.geometry as THREE.BufferGeometry;
    const position=geometry.getAttribute('position') as THREE.BufferAttribute;
    const color=geometry.getAttribute('color') as THREE.BufferAttribute;
    expect(position.count).toBe(57*57);
    expect(color.count).toBe(position.count);
    const initial=position.getY(30);
    ocean.update(1.4);
    expect(position.getY(30)).not.toBeCloseTo(initial,6);
    expect(scene.children.filter(o=>o instanceof THREE.LineSegments)).toHaveLength(1);
    expect(scene.children.filter(o=>o instanceof THREE.Mesh)).toHaveLength(3);
    for(const obj of scene.children)if(obj instanceof THREE.Mesh||obj instanceof THREE.Line){
      obj.geometry.dispose();
      const mat=obj.material;
      if(Array.isArray(mat))mat.forEach(m=>m.dispose());else mat.dispose();
    }
  });
});
