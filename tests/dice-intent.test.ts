import {describe,it,expect} from 'vitest';
import {matchingRollPointer,accessibleRollClick} from '../src/client/dice-intent.ts';

describe('Dice control intent on Android touch and view transitions',()=>{
 it('accepts only a pointer released from the same dice-button press on Board View',()=>{
  expect(matchingRollPointer(17,17,true)).toBe(true);
  expect(matchingRollPointer(null,17,true)).toBe(false);
  expect(matchingRollPointer(17,19,true)).toBe(false);
  expect(matchingRollPointer(17,17,false)).toBe(false);
 });
 it('never treats Android synthesized pointer clicks on World Map as dice rolls',()=>{
  expect(accessibleRollClick(1,true,true)).toBe(false);
  expect(accessibleRollClick(1,true,false)).toBe(false);
  expect(accessibleRollClick(0,true,false)).toBe(false);
  expect(accessibleRollClick(0,false,true)).toBe(false);
  expect(accessibleRollClick(0,true,true)).toBe(true);
 });
});
