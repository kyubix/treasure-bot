import assert from 'node:assert/strict';
import {addGuest,applyAction,createPlayer,currentPlayer,newGame,netWorth,PROVISIONAL_RULES} from '../src/engine/game.ts';
import {ROBOTS,TILES} from '../src/engine/types.ts';
let passed=0;
function check(name,run){run();console.log('✓',name);passed++;}
const setup=()=>{const state=newGame('ABC123',createPlayer('a','Ada'));addGuest(state,createPlayer('b','Bima'));return state;};
check('7 robot chassis and original base stats',()=>{assert.equal(Object.keys(ROBOTS).length,7);assert.deepEqual(ROBOTS.NORMAL,{energy:50,walk:50,search:50,battle:50});});
check('28 provisional tiles, 6 galleries',()=>{assert.equal(TILES.length,28);assert.equal(setup().galleries.length,6);});
check('cannot start opponent game',()=>{const state=setup();assert.throws(()=>applyAction(state,'b',{type:'START',bots:0}));assert.equal(state.phase,'lobby');});
check('server dice 1-6, no double roll, alternate turn',()=>{const state=setup();applyAction(state,'a',{type:'START',bots:0});applyAction(state,'a',{type:'ROLL'},()=>0);assert.deepEqual(state.dice,[1,1]);assert.throws(()=>applyAction(state,'a',{type:'ROLL'},()=>.3));applyAction(state,'a',{type:'END_TURN'});assert.equal(currentPlayer(state).id,'b');});
check('gallery fee 20% to owner',()=>{const state=setup();applyAction(state,'a',{type:'START',bots:0});const g=state.galleries[0];g.ownerId='b';g.displayed.push({id:'treasure',name:'Ruby',category:'Gems',value:1500});applyAction(state,'a',{type:'ROLL'},()=>.2);assert.equal(state.players[0].gold,2100);assert.equal(state.players[1].gold,2700);});
check('robot missions, gallery ownership, treasures',()=>{const state=setup();applyAction(state,'a',{type:'START',bots:0});applyAction(state,'a',{type:'SEND_ROBOT',terrain:'RUINS'});applyAction(state,'a',{type:'ROLL'},()=>.2);applyAction(state,'a',{type:'CLAIM_GALLERY'});applyAction(state,'a',{type:'END_TURN'});applyAction(state,'b',{type:'ROLL'},()=>.1);applyAction(state,'b',{type:'END_TURN'});applyAction(state,'a',{type:'ROLL'},()=>.1);assert.equal(state.players[0].inventory.length,1);const id=state.players[0].inventory[0].id;applyAction(state,'a',{type:'DISPLAY_TREASURE',treasureId:id});assert.equal(state.galleries[0].displayed.length,1);assert.ok(netWorth(state,state.players[0])>1000);});
check('provisional rules clearly exposed',()=>assert.equal(PROVISIONAL_RULES.galleryFeeRatio,.2));
console.log(`PASS ${passed} engine smoke checks`);
