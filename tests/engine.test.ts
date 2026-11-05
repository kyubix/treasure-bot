import {describe,expect,it} from 'vitest';
import {addGuest,applyAction,createPlayer,currentPlayer,GameError,netWorth,newGame,PROVISIONAL_RULES} from '../src/engine/game';
import {ROBOTS,TILES} from '../src/engine/types';

const create=()=>{const s=newGame('ABC123',createPlayer('a','Ada'));addGuest(s,createPlayer('b','Bima'));return s;};
describe('Treasure Bots engine',()=>{
  it('keeps PS1 documented robot base stats',()=>{
    expect(ROBOTS.NORMAL).toEqual({energy:50,walk:50,search:50,battle:50});
    expect(ROBOTS.FIGHTER.battle).toBe(100);
    expect(ROBOTS.SEARCHER.search).toBe(100);
    expect(Object.keys(ROBOTS)).toHaveLength(7);
  });
  it('starts with 28 board cells and gallery lots',()=>{
    const s=create();expect(TILES).toHaveLength(28);expect(s.galleries.length).toBe(6);
  });
  it('limits players to four',()=>{
    const s=create();addGuest(s,createPlayer('c','C'));addGuest(s,createPlayer('d','D'));
    expect(()=>addGuest(s,createPlayer('e','E'))).toThrow(GameError);
  });
  it('only host can start and cannot exceed four participants',()=>{
    const s=create();expect(()=>applyAction(s,'b',{type:'START',bots:0})).toThrow('Only the host');
    expect(()=>applyAction(s,'a',{type:'START',bots:3})).toThrow('Maximum four');
    expect(s.phase).toBe('lobby');
  });
  it('server rolls two legal dice and blocks double-rolls',()=>{
    const s=create();applyAction(s,'a',{type:'START',bots:0});applyAction(s,'a',{type:'ROLL'},()=>0);
    expect(s.dice).toEqual([1,1]);expect(s.players[0].position).toBe(2);
    expect(()=>applyAction(s,'a',{type:'ROLL'},()=>0.8)).toThrow('already rolled');
    applyAction(s,'a',{type:'END_TURN'});expect(currentPlayer(s).id).toBe('b');
  });
  it('prevents non-active player from acting',()=>{
    const s=create();applyAction(s,'a',{type:'START',bots:0});
    expect(()=>applyAction(s,'b',{type:'ROLL'})).toThrow('not your turn');
  });
  it('charges exactly twenty percent of displayed gallery treasure',()=>{
    const s=create();applyAction(s,'a',{type:'START',bots:0});
    const gallery=s.galleries[0];gallery.ownerId='b';gallery.displayed.push({id:'one',category:'Gems',name:'Ruby',value:1500});
    const at=gallery.tile; // 4, a deterministic roll of 2+2 lands here
    expect(at).toBe(4);applyAction(s,'a',{type:'ROLL'},()=>.2);
    expect(s.players[0].position).toBe(4);expect(s.players[0].gold).toBe(2100);
    expect(s.players[1].gold).toBe(2700);
  });
  it('can send a robot, recover treasure and display it',()=>{
    const s=create();applyAction(s,'a',{type:'START',bots:0});
    applyAction(s,'a',{type:'SEND_ROBOT',terrain:'RUINS'});expect(s.players[0].gateCards).toBe(1);
    applyAction(s,'a',{type:'ROLL'},()=>.2); // land gallery 4
    applyAction(s,'a',{type:'CLAIM_GALLERY'});
    applyAction(s,'a',{type:'END_TURN'});
    applyAction(s,'b',{type:'ROLL'},()=>0.1);applyAction(s,'b',{type:'END_TURN'});
    applyAction(s,'a',{type:'ROLL'},()=>0.1); // second robot tick finds treasure
    expect(s.players[0].inventory).toHaveLength(1);
    const id=s.players[0].inventory[0].id;
    applyAction(s,'a',{type:'DISPLAY_TREASURE',treasureId:id});
    expect(s.galleries[0].displayed).toHaveLength(1);
    expect(s.players[0].inventory).toHaveLength(0);
    expect(netWorth(s,s.players[0])).toBeGreaterThanOrEqual(1600);
  });
  it('does not permit invented illegal terrain values',()=>{
    const s=create();applyAction(s,'a',{type:'START',bots:0});
    expect(()=>applyAction(s,'a',{type:'SEND_ROBOT',terrain:'MOON' as any})).toThrow('Unknown destination');
  });
  it('explicitly labels unverified balance constants as provisional',()=>{
    expect(PROVISIONAL_RULES.galleryFeeRatio).toBe(.2);
    expect(PROVISIONAL_RULES.winAssets).toBe(20_000);
  });
});
