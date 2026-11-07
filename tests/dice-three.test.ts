import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 DIE_FACE_MATERIAL_ORDER,pipPositions,normalizedDiceFace,
 faceNormal,diceResultQuaternion
} from '../src/client/dice-three.ts';

describe('Three.js two-die roll visualization',()=>{
 it('uses all six standard physical die faces with opposite sides totaling seven',()=>{
  expect(DIE_FACE_MATERIAL_ORDER).toEqual([3,4,2,5,1,6]);
  for(let n=1;n<=6;n++){
   expect(pipPositions(n)).toHaveLength(n);
   expect(normalizedDiceFace(n)).toBe(n);
   const opposite=7-n;
   expect(faceNormal(n).dot(faceNormal(opposite))).toBeCloseTo(-1,8);
  }
  expect(normalizedDiceFace(-4)).toBe(1);
  expect(normalizedDiceFace(2.8)).toBe(1);
  expect(normalizedDiceFace(Number.NaN)).toBe(1);
 });
 it('settles the actual authoritative result facing the user',()=>{
  const front=new THREE.Vector3(0,0,1);
  for(let n=1;n<=6;n++){
   // Rotate the physical face normal, not the camera.
   const visible=faceNormal(n).applyQuaternion(diceResultQuaternion(n));
   expect(visible.distanceTo(front)).toBeLessThan(1e-5);
   expect(diceResultQuaternion(n).length()).toBeCloseTo(1,5);
  }
 });
 it('integrates with the existing hold/release/authoritative server result',()=>{
  const main=readFileSync(new URL('../src/client/main.ts',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/client/dice-three.css',import.meta.url),'utf8');
  expect(main).toContain('id="diceThreeHost"');
  expect(main).toContain('id="rollLabel"');
  expect(main).toContain("syncDiceThree('holding')");
  expect(main).toContain("syncDiceThree('waiting')");
  expect(main).toContain("syncDiceThree('result',[first,second])");
  expect(main).toContain("sendAction({type:'ROLL'})");
  expect(main).not.toContain("el<HTMLButtonElement>('roll').textContent=");
  expect(css).toContain('.dice-overlay.has-three-dice .die-face{display:none!important}');
  expect(css).toContain('.dice-overlay.has-three-dice .dice-three-host{display:block}');
 });
});
