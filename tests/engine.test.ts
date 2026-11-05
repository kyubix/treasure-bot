import {describe,it,expect} from 'vitest';
import {addGuest,applyAction,createPlayer,newGame,PROVISIONAL_RULES} from '../src/engine/game';
import {ROBOTS,TILES} from '../src/engine/types';
import {initialIsland,battleVictory,searchSuccess} from '../src/engine/island';
const setup=()=>{const s=newGame('ABC123',createPlayer('a','Ada'));addGuest(s,createPlayer('b','Bima'));applyAction(s,'a',{type:'START',bots:0});return s;};
describe('faithful gameplay vertical slice',()=>{
 it('has seven robot chassis with documented baseline stats',()=>{
   expect(Object.keys(ROBOTS)).toHaveLength(7);
   expect(ROBOTS.NORMAL).toEqual({energy:50,walk:50,search:50,battle:50});
 });
 it('assigns galleries to player colors, no real estate purchase',()=>{
   const s=setup();expect(TILES).toHaveLength(28);
   expect(s.galleries).toHaveLength(20);
   expect(s.galleries[0].ownerId).toBe('a');expect(s.galleries[1].ownerId).toBe('b');
 });
 it('has coordinates for treasure icons and keeper encounters',()=>{
   const sites=initialIsland();expect(sites.some(s=>s.kind==='TREASURE')).toBe(true);
   expect(sites.some(s=>s.kind==='KEEPER')).toBe(true);
   expect(sites.some(s=>s.kind==='LOCATION')).toBe(true);
 });
 it('sends robot to a specific map destination after purchasing Gate Card',()=>{
   const s=setup();
   expect(()=>applyAction(s,'a',{type:'SEND_ROBOT',siteId:'relic'})).toThrow('Buy a gate card');
   applyAction(s,'a',{type:'ROLL'},()=>.2);
   expect(s.shopAccess).toBe(true);
   applyAction(s,'a',{type:'BUY_GATE_CARD'});
   expect(s.players[0].gateCards).toBe(1);
   applyAction(s,'a',{type:'END_TURN'});
   applyAction(s,'b',{type:'ROLL'},()=>0);
   applyAction(s,'b',{type:'END_TURN'});
   applyAction(s,'a',{type:'SEND_ROBOT',siteId:'relic'});
   expect(s.players[0].robot.mission?.siteId).toBe('relic');
 });
 it('charges 20% of displayed value for landing at opponent gallery',()=>{
   const s=setup();s.galleries[1].displayed.push({id:'r',name:'Ruby',category:'Gems',value:1500});
   applyAction(s,'a',{type:'ROLL'},()=>0);
   expect(s.players[0].gold).toBe(2100);expect(s.players[1].gold).toBe(2700);
 });
 it('search and keeper combat use robot attributes (probabilities provisional)',()=>{
   expect(searchSuccess(100,.5)).toBe(true);
   expect(searchSuccess(20,.9)).toBe(false);
   expect(battleVictory(100,20,.2)).toBe(true);
 });
 it('marks provisional values separately',()=>{
   expect(PROVISIONAL_RULES.galleryFeeRatio).toBe(.2);
   expect(PROVISIONAL_RULES.robotSearchFormula).toBe('provisional');
 });
});
