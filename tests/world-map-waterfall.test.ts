import * as THREE from 'three';
import {describe,expect,it} from 'vitest';
import {waterfallPoint,createCascadingWaterfall}
  from '../src/client/world-map-waterfall.ts';
import {terrainHeight} from '../src/client/world-map-terrain.ts';

describe('Terrain-attached waterfall',()=>{
  it('flows from a high cliff into the existing lagoon without floating',()=>{
    const start=waterfallPoint(0),finish=waterfallPoint(1);
    expect(start.y).toBeGreaterThan(1.5);
    expect(finish.y).toBeLessThan(.55);
    expect(start.x).toBeLessThan(finish.x);
    for(let i=0;i<=40;i++){
      const p=waterfallPoint(i/40);
      expect(p.y).toBeGreaterThanOrEqual(terrainHeight(p.x,p.z)+.035-.000001);
      expect(p.y).toBeLessThan(2.6);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    expect(Math.hypot(finish.x-.75,finish.z-.61)).toBeLessThan(.59);
  });

  it('animates water color in-place and keeps spray close to the impact pool',()=>{
    const root=new THREE.Group();
    const cascade=createCascadingWaterfall(root);
    const mesh=cascade.mesh;
    const geo=mesh.geometry as THREE.BufferGeometry;
    const color=geo.getAttribute('color') as THREE.BufferAttribute;
    const initial=color.getX(10);
    const buffer=color.array;
    cascade.update(1.4);
    expect(color.array).toBe(buffer);
    expect(color.getX(10)).not.toBeCloseTo(initial,5);
    const spray=root.getObjectByName('waterfall-spray') as THREE.InstancedMesh;
    expect(spray).toBeInstanceOf(THREE.InstancedMesh);
    const m=new THREE.Matrix4();spray.getMatrixAt(3,m);
    const p=new THREE.Vector3().setFromMatrixPosition(m);
    expect(p.distanceTo(new THREE.Vector3(.49,.50,.61))).toBeLessThan(.4);
    for(const obj of root.children)if(obj instanceof THREE.Mesh){
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
      if(obj instanceof THREE.InstancedMesh)obj.dispose();
    }
  });
});
