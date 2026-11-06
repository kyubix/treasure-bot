import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createWorldAmbience} from '../src/client/world-map-environment.ts';

describe('V5 bounded environment animation',()=>{
  it('reuses particle buffers and keeps tree sway bounded and reversible',()=>{
    const land=new THREE.Group();const crown=new THREE.Group();
    crown.userData.swayPhase=.4;land.add(crown);
    const ambience=createWorldAmbience(land,new THREE.Vector3(1,2,3));
    const fall=land.getObjectByName('waterfall-streaks') as THREE.InstancedMesh;
    const buffer=fall.instanceMatrix.array;
    ambience.update(0);const initial=crown.rotation.z;
    ambience.update(1);expect(crown.rotation.z).not.toBe(initial);
    expect(Math.abs(crown.rotation.z)).toBeLessThan(.04);
    expect(fall.instanceMatrix.array).toBe(buffer);
    ambience.update(0);expect(crown.rotation.z).toBeCloseTo(initial);
    const matrix=new THREE.Matrix4();fall.getMatrixAt(0,matrix);
    expect(matrix.elements.every(Number.isFinite)).toBe(true);
    expect(land.getObjectByName('lighthouse-beacon')!.rotation.y).toBe(0);
    ambience.update(3);expect(land.getObjectByName('lighthouse-beacon')!.rotation.y).toBeCloseTo(1.65);
  });
});
