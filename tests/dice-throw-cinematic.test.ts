import * as THREE from 'three';
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {diceThrowHeight,diceFloorBounce,normalizedDiceFace,diceResultQuaternion,faceNormal} from '../src/client/dice-three.ts';
import {DICE_THROW_DURATION_MS,DICE_SETTLE_DURATION_MS,
 DICE_REVEAL_DELAY_MS,diceResultRevealDelayMs} from '../src/client/dice-timing.ts';

describe('Glint-inspired full Board roll animation',()=>{
 it('arcs from the raised hand to floor, followed by damping bounces',()=>{
  expect(diceThrowHeight(0)).toBeCloseTo(1.34);
  expect(diceThrowHeight(1)).toBeCloseTo(0);
  expect(diceThrowHeight(.4)).toBeGreaterThan(diceThrowHeight(1));
  expect(diceFloorBounce(0)).toBeCloseTo(0);
  expect(diceFloorBounce(1)).toBeCloseTo(0);
  expect(diceFloorBounce(.17)).toBeGreaterThan(0);
  expect(diceFloorBounce(.84)).toBeLessThan(diceFloorBounce(.17));
 });
 it('only reveals server-authoritative faces AFTER throw and landing',()=>{
  expect(DICE_THROW_DURATION_MS).toBeGreaterThanOrEqual(500);
  expect(DICE_SETTLE_DURATION_MS).toBeGreaterThanOrEqual(350);
  expect(DICE_REVEAL_DELAY_MS).toBe(
    DICE_THROW_DURATION_MS+DICE_SETTLE_DURATION_MS);
  expect(diceResultRevealDelayMs(0)).toBe(DICE_REVEAL_DELAY_MS);
  expect(diceResultRevealDelayMs(DICE_THROW_DURATION_MS/2)).toBe(
    DICE_REVEAL_DELAY_MS-DICE_THROW_DURATION_MS/2);
  expect(diceResultRevealDelayMs(DICE_THROW_DURATION_MS+10)).toBe(
    DICE_SETTLE_DURATION_MS);
  expect(diceResultRevealDelayMs(Infinity)).toBe(0);
  for(let face=1;face<=6;face++){
   expect(normalizedDiceFace(face)).toBe(face);
   const visible=faceNormal(face).applyQuaternion(diceResultQuaternion(face));
   expect(visible.distanceTo(new THREE.Vector3(0,0,1))).toBeLessThan(1e-5);
  }
 });
 it('hides old 2D faces on hold BEFORE Three.js finishes importing',()=>{
  const css=readFileSync(new URL('../src/client/dice-three.css',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/client/main.ts',import.meta.url),'utf8');
  expect(css).toContain('.dice-overlay.dice-3d-intended:not(.dice-render-fallback) .die-face');
  expect(css).toContain('display:none!important');
  expect(main).toContain("overlay.classList.add('dice-3d-intended')");
  expect(main).toContain("syncDiceThree('holding')");
  expect(main).toContain("syncDiceThree('throwing')");
  expect(main).toContain("syncDiceThree('result',[first,second])");
  expect(main).toContain("sendAction({type:'ROLL'})");
  expect(main).toContain("diceResultRevealDelayMs(elapsed)");
  expect(main).toContain("if(!diceBoardMovementDeferred)board.update(s)");
  expect(main).toContain("diceBoardMovementDeferred=false");
  expect(main).toContain("board?.setDiceGesture('holding')");
  expect(main).toContain("board?.setDiceGesture('throwing')");
 });
 it('plays raise and throw on the same named avatar arm joints',()=>{
  const three=readFileSync(new URL('../src/client/board-view-three.ts',import.meta.url),'utf8');
  const scene=readFileSync(new URL('../src/client/board.ts',import.meta.url),'utf8');
  expect(three).toContain("getObjectByName(side+'Arm')");
  expect(three).toContain("diceGesture==='holding'");
  expect(three).toContain('setDiceGesture(phase)');
  expect(scene).toContain('setDiceGesture(phase){scene.setDiceGesture(phase);}');
 });
});
