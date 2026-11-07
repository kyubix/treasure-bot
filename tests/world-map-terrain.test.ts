import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {terrainHeight,terrainRadius,createTerrainMesh,addTerrainDetail,createSurfBand} from '../src/client/world-map-terrain.ts';

describe('V3 procedural PS1-style island terrain',()=>{
  it('builds distinct highland plateaux but keeps lagoon and coastline low',()=>{
    expect(terrainHeight(.10,-1.12)).toBeGreaterThan(1.55);
    expect(terrainHeight(-.72,.90)).toBeGreaterThan(1.55);
    expect(terrainHeight(.75,.61)).toBeLessThan(.50);
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,r=terrainRadius(a);
      // The V2 shoreline is intentionally inset by ~5 cm to prevent
      // cliffs and grass intersecting the Gallery tile board.
      expect(r).toBeGreaterThan(2.95);
      expect(r).toBeLessThan(3.35);
      const y=terrainHeight(Math.cos(a)*r,Math.sin(a)*r);
      expect(y).toBeGreaterThan(.37);
      expect(y).toBeLessThan(.48);
    }
  });
  it('creates connected radial terrain with colored slopes and upward normals',()=>{
    const mesh=createTerrainMesh();
    const geometry=mesh.geometry as THREE.BufferGeometry;
    const pos=geometry.getAttribute('position');
    const colors=geometry.getAttribute('color');
    expect(pos.count).toBe((120+1)*(45+1));
    expect(colors.count).toBe(pos.count);
    expect(geometry.getIndex()?.count).toBe(120*45*6);
    // Edge ring is nearly flat, so its normal should face the sky.
    const normals=geometry.getAttribute('normal');
    expect(normals.getY(38*(121)+12)).toBeGreaterThan(.25);
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
    geometry.dispose();
  });
  it('uses a continuous irregular foam band around the board island rim',()=>{
    const foam=createSurfBand();
    const geo=foam.geometry as THREE.BufferGeometry;
    expect(geo.getAttribute('position').count).toBe(2*121);
    expect(geo.getIndex()?.count).toBe(120*6);
    const coords=geo.getAttribute('position');
    expect(coords.getY(0)).toBeCloseTo(-.393,5);
    expect(Math.hypot(coords.getX(0),coords.getZ(0))).toBeGreaterThan(3.4);
    geo.dispose();
    (foam.material as THREE.Material).dispose();
  });
  it('batches grass, bush and rock decoration as three instanced meshes',()=>{
    const group=new THREE.Group();
    addTerrainDetail(group);
    expect(group.children).toHaveLength(3);
    for(const child of group.children){
      expect(child).toBeInstanceOf(THREE.InstancedMesh);
      const mesh=child as THREE.InstancedMesh;
      expect(mesh.count).toBeGreaterThan(0);
      expect(mesh.count).toBeLessThanOrEqual(175);
      expect(mesh.instanceColor).not.toBeNull();
      mesh.geometry.dispose();
    }
  });
});
