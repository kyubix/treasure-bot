import {describe,it,expect} from 'vitest';
import {createPlayer,newGame,addGuest,applyAction,validateWinRule,winningRuleFor,netWorth} from '../src/engine/game.ts';
import type {GameState,GameAction} from '../src/engine/types.ts';

function newFour():GameState{
 const s=newGame('FOUR01',createPlayer('p1','Alice'));
 addGuest(s,createPlayer('p2','Bob'));
 addGuest(s,createPlayer('p3','Clara'));
 addGuest(s,createPlayer('p4','Dani'));
 return s;
}
describe('Four-player match setup and winning modes',()=>{
 it('requires all four seats for configured matches (CPU fill allowed)',()=>{
  const s=newGame('ONE001',createPlayer('p1','Alice'));
  expect(()=>applyAction(s,'p1',{type:'START',bots:2,galleryCount:3,
   winningRule:{kind:'TURN_LIMIT',rounds:20}})).toThrow('Exactly four');
  applyAction(s,'p1',{type:'START',bots:3,galleryCount:3,
   winningRule:{kind:'TURN_LIMIT',rounds:20}});
  expect(s.players).toHaveLength(4);
  expect(s.players.filter(p=>p.isBot)).toHaveLength(3);
  expect(s.players.map(p=>p.slot)).toEqual([1,2,3,4]);
  expect(new Set(s.players.map(p=>p.color)).size).toBe(4);
  expect(winningRuleFor(s)).toEqual({kind:'TURN_LIMIT',rounds:20});
 });
 it('lets human players select unique slot, avatar, and color before play',()=>{
  const s=newGame('COLOR1',createPlayer('p1','Alice'));
  addGuest(s,createPlayer('p2','Bob'));
  applyAction(s,'p1',{type:'SET_PROFILE',slot:3,color:'#f5cf32',avatarId:'H04'});
  expect(s.players[0]).toMatchObject({slot:3,color:'#f5cf32',avatarId:'H04'});
  expect(()=>applyAction(s,'p2',{type:'SET_PROFILE',slot:3,color:'#44c767',avatarId:'H02'}))
   .toThrow('slot');
  expect(()=>applyAction(s,'p2',{type:'SET_PROFILE',slot:4,color:'#f5cf32',avatarId:'H02'}))
   .toThrow('color');
  expect(()=>applyAction(s,'p2',{type:'SET_PROFILE',slot:4,color:'#123456',avatarId:'H02'}))
   .toThrow('colors');
  const before=s.version;
  applyAction(s,'p2',{type:'SET_PROFILE',slot:1,color:'#2489ea',avatarId:'H03'});
  expect(s.version).toBe(before+1);
  applyAction(s,'p1',{type:'START',bots:2,galleryCount:5,
   winningRule:{kind:'WEALTH_TARGET',amount:30000}});
  expect(s.players.map(p=>p.slot)).toEqual([1,2,3,4]);
  expect(s.players[0].id).toBe('p2');
  expect(()=>applyAction(s,'p1',{type:'SET_PROFILE',slot:4,color:'#44c767',avatarId:'H01'}))
   .toThrow('closed');
 });
 it('validates numeric winning goals on server',()=>{
  expect(validateWinRule({kind:'WEALTH_TARGET',amount:20000}))
   .toEqual({kind:'WEALTH_TARGET',amount:20000});
  expect(validateWinRule({kind:'TURN_LIMIT',rounds:30}))
   .toEqual({kind:'TURN_LIMIT',rounds:30});
  for(const invalid of [{kind:'TURN_LIMIT',rounds:0},{kind:'TURN_LIMIT',rounds:1.5},
   {kind:'TURN_LIMIT',rounds:501},{kind:'WEALTH_TARGET',amount:-1000},
   {kind:'WEALTH_TARGET',amount:10000001},{kind:'WEALTH_TARGET',amount:'30000'}]){
   expect(()=>validateWinRule(invalid)).toThrow('Invalid');
  }
 });
 it('ends at exactly the completion of all four seats in a fixed round',()=>{
  const s=newFour();applyAction(s,'p1',{type:'START',bots:0,galleryCount:3,
    winningRule:{kind:'TURN_LIMIT',rounds:1}});
  s.players[2].gold=6000;
  for(let i=0;i<4;i++){
   expect(s.phase).toBe('playing');
   const id=s.players[i].id;
   s.rolled=true;applyAction(s,id,{type:'END_TURN'});
  }
  expect(s.phase).toBe('finished');
  expect(s.winnerId).toBe('p3');
  expect(s.turn).toBe(2);
  expect(s.logs.at(-1)?.message).toContain('wins after 1 rounds');
 });
 it('preserves a draw if multiple players have exactly the same net worth',()=>{
  const s=newFour();applyAction(s,'p1',{type:'START',bots:0,galleryCount:3,
    winningRule:{kind:'TURN_LIMIT',rounds:1}});
  for(let i=0;i<4;i++){s.rolled=true;applyAction(s,s.players[i].id,{type:'END_TURN'});}
  expect(s.phase).toBe('finished');expect(s.winnerId).toBeNull();
  expect(s.logs.at(-1)?.message).toContain('Draw');
 });
 it('checks wealth target on authoritative player actions, without forcing early end in round mode',()=>{
  const s=newFour();
  applyAction(s,'p1',{type:'START',bots:0,galleryCount:3,
    winningRule:{kind:'WEALTH_TARGET',amount:3000}});
  s.players[0].gold=4000;
  applyAction(s,'p1',{type:'ROLL'},()=>0);
  expect(netWorth(s,s.players[0])).toBeGreaterThanOrEqual(3000);
  expect(s.phase).toBe('finished');expect(s.winnerId).toBe('p1');
  const rounds=newFour();
  applyAction(rounds,'p1',{type:'START',bots:0,galleryCount:3,
    winningRule:{kind:'TURN_LIMIT',rounds:10}});
  rounds.players[0].gold=99999;
  applyAction(rounds,'p1',{type:'ROLL'},()=>0);
  expect(rounds.phase).toBe('playing');
 });
 it('keeps legacy rooms and their existing 20,000 G default rule',()=>{
  const legacy=newGame('OLD001',createPlayer('p1','Alice'));
  addGuest(legacy,createPlayer('p2','Bob'));
  applyAction(legacy,'p1',{type:'START',bots:0});
  expect(legacy.board).toBeUndefined();
  expect(winningRuleFor(legacy)).toEqual({kind:'WEALTH_TARGET',amount:20000});
 });
});
