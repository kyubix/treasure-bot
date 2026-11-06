import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {boardTileWorldPosition,siteWorldPosition} from '../src/client/world-map-three.ts';

describe('Three.js World Map V2 model coordinates',()=>{
  it('maps logical site centers onto the same island master',()=>{
    const p=siteWorldPosition(2,2);
    expect(p.x).toBe(0);
    expect(p.z).toBe(0);
    expect(p.y).toBeGreaterThan(0);
    const a=siteWorldPosition(3,2),b=siteWorldPosition(2,3);
    expect(a.x).toBeGreaterThan(0);
    expect(b.z).toBeGreaterThan(0);
  });
  it('generates 28 stable distinct ring tiles with tile zero facing the default camera',()=>{
    const ring=Array.from({length:28},(_,i)=>boardTileWorldPosition(i));
    for(const p of ring)expect(Math.hypot(p.x,p.z)).toBeCloseTo(3.48,5);
    expect(ring[0].x).toBeCloseTo(ring[0].z,5);
    expect(new Set(ring.map(p=>p.x.toFixed(4)+':'+p.z.toFixed(4))).size).toBe(28);
  });
  it('anchors destinations above their actual terrain, even on cliffs',()=>{
    const summit=siteWorldPosition(1,3);
    expect(summit.y).toBeGreaterThan(.65);
    const lowland=siteWorldPosition(4,4);
    expect(lowland.y).toBeGreaterThanOrEqual(.48);
    expect(siteWorldPosition(1,3,1.23).y).toBeCloseTo(1.23,6);
  });
  it('preserves marker projection when the same camera rotates 360 degrees',()=>{
    const target=siteWorldPosition(3,3);
    const camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,100);
    const results:number[]=[];
    for(let i=0;i<5;i++){
      const azimuth=Math.PI/4+i*Math.PI/2;
      camera.position.set(Math.sin(azimuth)*13,11,Math.cos(azimuth)*13);
      camera.lookAt(0,.38,0);
      camera.updateMatrixWorld(true);
      results.push(target.clone().project(camera).x);
    }
    expect(results[0]).toBeCloseTo(results[4],6);
    expect(results[0]).not.toBeCloseTo(results[1],2);
  });
});
