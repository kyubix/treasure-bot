import {describe,it,expect} from 'vitest';
import {newGame,createPlayer,addGuest,applyAction} from '../src/engine/game.ts';
import type {GameState} from '../src/engine/types.ts';

function four():GameState{
 const state=newGame('REVERSE',createPlayer('p1','P1'));
 addGuest(state,createPlayer('p2','P2'));
 addGuest(state,createPlayer('p3','P3'));
 addGuest(state,createPlayer('p4','P4'));
 // Original 28-cell board retained as controlled fixture for event tile 8.
 applyAction(state,'p1',{type:'START',bots:0});
 return state;
}
function rollWithEvent(state:GameState,id:string,eventRandom:number):void{
 const rolls=[0,0,eventRandom];
 applyAction(state,id,{type:'ROLL'},()=>rolls.shift()??0);
}
function end(state:GameState):void{
 const active=state.players[state.currentPlayerIndex];
 state.rolled=true;
 applyAction(state,active.id,{type:'END_TURN'});
}
describe('Server-owned global Reverse Direction event',()=>{
 it('anchors three full effect cycles to triggering 2P rather than 1P',()=>{
  const s=four();
  s.currentPlayerIndex=1;s.players[1].position=6;
  rollWithEvent(s,'p2',.95); // 2 steps forward to Event tile 8.
  expect(s.players[1].position).toBe(8);
  expect(s.movementDirection).toBe(1); // already walked forward
  expect(s.reverseEffect).toEqual({
   triggerPlayerId:'p2',remainingCycles:3,durationBasis:'TRIGGER_PLAYER_CYCLE'
  });
  expect(s.phase).toBe('playing');
  end(s); // p3 becomes active, no decrement
  expect(s.reverseEffect?.remainingCycles).toBe(3);
  s.players[2].position=6;
  rollWithEvent(s,'p3',0); // 2 reverse steps 6 -> 5 -> 4
  expect(s.movementDirection).toBe(-1);
  expect(s.players[2].position).toBe(4);
  expect(s.reverseEffect?.remainingCycles).toBe(3);
  end(s);end(s);end(s); // 4P,1P,2P: first completed trigger cycle
  expect(s.players[s.currentPlayerIndex].id).toBe('p2');
  expect(s.reverseEffect?.remainingCycles).toBe(2);
  for(let cycle=2;cycle<=3;cycle++){
   end(s);end(s);end(s);end(s);
   expect(s.players[s.currentPlayerIndex].id).toBe('p2');
   if(cycle===2)expect(s.reverseEffect?.remainingCycles).toBe(1);
   else expect(s.reverseEffect).toBeUndefined();
  }
  expect(s.turn).toBe(4); // regular match rounds counted from 1P only
  expect(s.logs.at(-1)?.message).toContain('Reverse Direction has ended');
 });
 it('cancels the active effect when the next EVENT occurs',()=>{
  const s=four();s.currentPlayerIndex=1;s.players[1].position=6;
  rollWithEvent(s,'p2',.95);
  end(s); // p3
  s.players[2].position=10;
  rollWithEvent(s,'p3',0); // 10 -> 9 -> 8 is EVENT under reverse
  expect(s.players[2].position).toBe(8);
  expect(s.movementDirection).toBe(-1); // renderer shows actual traversal
  expect(s.reverseEffect).toBeUndefined(); // new reward replaced modifier
  expect(s.logs.some(l=>l.message.includes('cancelled'))).toBe(true);
  end(s); // p4
  s.players[3].position=6;
  rollWithEvent(s,'p4',0); // normal direction restored
  expect(s.players[3].position).toBe(8);
  expect(s.movementDirection).toBe(1);
 });
 it('wraps backwards through tile zero without skipping a step',()=>{
  const s=four();s.currentPlayerIndex=1;s.players[1].position=0;
  s.reverseEffect={triggerPlayerId:'p1',remainingCycles:3,durationBasis:'TRIGGER_PLAYER_CYCLE'};
  rollWithEvent(s,'p2',0);
  expect(s.movementDirection).toBe(-1);
  expect(s.players[1].position).toBe(26);
  expect(s.pendingSteps).toBe(0);
 });
});
