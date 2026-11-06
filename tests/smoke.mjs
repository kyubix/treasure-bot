import assert from 'node:assert/strict';
import {addGuest,applyAction,createPlayer,currentPlayer,newGame,PROVISIONAL_RULES} from '../src/engine/game.ts';
import {ROBOTS,TILES} from '../src/engine/types.ts';
import {initialIsland,travelTurns,searchSuccess,battleVictory} from '../src/engine/island.ts';
let passed=0;
function check(name,run){run();console.log('✓',name);passed++;}
const setup=()=>{const s=newGame('ABC123',createPlayer('a','Ada'));addGuest(s,createPlayer('b','Bima'));return s;};
const start=s=>applyAction(s,'a',{type:'START',bots:0});
const roll=(s,who,rand=()=>.2)=>applyAction(s,who,{type:'ROLL'},rand);
const end=(s,who)=>{while(s.shopOffer)applyAction(s,who,{type:'SKIP_SHOP'});if(s.shopAccess)applyAction(s,who,{type:'CLOSE_SHOP'});return applyAction(s,who,{type:'END_TURN'});};
check('seven documented robot chassis',()=>{assert.equal(Object.keys(ROBOTS).length,7);assert.deepEqual(ROBOTS.NORMAL,{energy:50,walk:50,search:50,battle:50});});
check('spatial treasure map with guardians and hidden locations',()=>{const spots=initialIsland();assert.ok(spots.some(s=>s.kind==='KEEPER'));assert.ok(spots.some(s=>s.kind==='LOCATION'));assert.ok(travelTurns(spots[0],50)>=1);});
check('gallery colors assigned at game start, not claimable properties',()=>{const s=setup();start(s);assert.equal(TILES.length,28);assert.equal(s.galleries.length,20);assert.ok(s.galleries.every(g=>g.ownerId));assert.equal(s.galleries[0].ownerId,'a');assert.equal(s.galleries[1].ownerId,'b');});
check('cannot start a room without host',()=>{const s=setup();assert.throws(()=>applyAction(s,'b',{type:'START',bots:0}));assert.equal(s.phase,'lobby');});
check('two server dice and turn ordering',()=>{const s=setup();start(s);roll(s,'a',()=>0);assert.deepEqual(s.dice,[1,1]);assert.throws(()=>roll(s,'a'));end(s,'a');assert.equal(currentPlayer(s).id,'b');});
check('20% gallery transfer',()=>{const s=setup();start(s);s.galleries[1].displayed.push({id:'ruby',name:'Ruby',category:'Gems',value:1500});roll(s,'a',()=>0);assert.equal(s.players[0].gold,2100);assert.equal(s.players[1].gold,2700);});
check('passing a shop enables purchasing an actual gate card',()=>{const s=setup();start(s);assert.equal(s.players[0].gateCards,0);roll(s,'a',()=>.2);assert.equal(s.shopOffer,true);assert.equal(s.shopAccess,false);applyAction(s,'a',{type:'ENTER_SHOP'});assert.equal(s.shopAccess,true);applyAction(s,'a',{type:'BUY_GATE_CARD'});assert.equal(s.players[0].gateCards,1);assert.equal(s.players[0].gold,2100);});
check('destination must exist and a gate card must be bought',()=>{const s=setup();start(s);assert.throws(()=>applyAction(s,'a',{type:'SEND_ROBOT',siteId:'relic'}),/Buy a gate card/);s.players[0].gateCards=1;assert.throws(()=>applyAction(s,'a',{type:'SEND_ROBOT',siteId:'mars'}),/valid map destination/);});
check('travel then search then return delivers treasure',()=>{
  const s=setup();start(s);s.players[0].gateCards=1;
  applyAction(s,'a',{type:'SEND_ROBOT',siteId:'relic'});
  assert.equal(s.players[0].robot.mission.phase,'OUTBOUND');
  for(let i=0;i<7;i++){
    roll(s,'a',()=>0);if(i<6){end(s,'a');roll(s,'b',()=>0);end(s,'b');}
  }
  assert.equal(s.players[0].robot.mission,null);
  assert.equal(s.players[0].inventory.length,1);
  assert.equal(s.islandSpots.find(site=>site.id==='relic').depleted,true);
  const id=s.players[0].inventory[0].id;
  applyAction(s,'a',{type:'DISPLAY_TREASURE',treasureId:id});
  assert.equal(s.galleries[0].displayed.length,1);
});
check('search and battle depend on capability (formulas provisional)',()=>{assert.ok(searchSuccess(100,.5));assert.ok(!searchSuccess(20,.9));assert.ok(battleVictory(100,20,.2));assert.ok(!battleVictory(10,200,.8));});
check('unknowns explicitly marked provisional',()=>assert.equal(PROVISIONAL_RULES.galleryFeeRatio,.2));
check('unmarked island locations can be selected for exploration',()=>{
  const spots=initialIsland();assert.equal(spots.length,25);
  const survey=spots.find(s=>s.id==='survey-0-0');assert.ok(survey);
  const state=setup();start(state);state.players[0].gateCards=1;
  applyAction(state,'a',{type:'SEND_ROBOT',siteId:survey.id});
  assert.equal(state.players[0].robot.mission.siteId,survey.id);
});
check('shop cannot be accessed any time: close it and require another encounter',()=>{
  const s=setup();start(s);
  assert.throws(()=>applyAction(s,'a',{type:'BUY_GATE_CARD'}),/pass or stop at a shop/);
  assert.throws(()=>applyAction(s,'a',{type:'CLOSE_SHOP'}),/No active shop encounter/);
  roll(s,'a',()=>.2);assert.equal(s.shopOffer,true);
  assert.throws(()=>applyAction(s,'a',{type:'BUY_GATE_CARD'}),/pass or stop at a shop/);
  assert.throws(()=>applyAction(s,'a',{type:'END_TURN'}),/Finish or skip/);
  applyAction(s,'a',{type:'ENTER_SHOP'});
  applyAction(s,'a',{type:'BUY_GATE_CARD'});
  applyAction(s,'a',{type:'CLOSE_SHOP'});
  assert.equal(s.shopAccess,false);
  assert.throws(()=>applyAction(s,'a',{type:'BUY_GATE_CARD'}),/pass or stop at a shop/);
  assert.throws(()=>applyAction(s,'a',{type:'BUY_PART',slot:'HEAD'}),/Visit a robot shop/);
  end(s,'a');assert.equal(s.shopAccess,false);
});
check('shop equips robot parts and updates capabilities',()=>{
  const s=setup();start(s);roll(s,'a',()=>.2);
  applyAction(s,'a',{type:'ENTER_SHOP'});
  assert.throws(()=>applyAction(s,'a',{type:'BUY_PART',slot:'WINGS'}),/Unknown robot part/);
  applyAction(s,'a',{type:'BUY_PART',slot:'HEAD'});
  assert.equal(s.players[0].robot.parts.HEAD,true);
  assert.equal(s.players[0].gold,1950);
  assert.throws(()=>applyAction(s,'a',{type:'BUY_PART',slot:'HEAD'}),/already installed/);
});
check('robots can battle when reaching the same treasure location',()=>{
  const s=setup();start(s);s.currentPlayerIndex=1;
  s.players[0].robot.mission={siteId:'relic',phase:'SEARCH',turnsRemaining:0,transitTotal:2};
  s.players[1].robot.mission={siteId:'relic',phase:'OUTBOUND',turnsRemaining:1,transitTotal:2};
  roll(s,'b',()=>0);
  assert.equal(s.players[0].robot.mission,null);
  assert.ok(s.logs.some(e=>e.message.includes('defeated Ada')));
});
check('skipping shop resumes remaining movement and forbids purchase',()=>{
 const s=setup();start(s);
 roll(s,'a',()=>.2); // 2+2: shop on square 4, one remaining
 assert.equal(s.players[0].position,3);
 assert.equal(s.pendingSteps,1);
 assert.equal(s.shopOffer,true);
 applyAction(s,'a',{type:'SKIP_SHOP'});
 assert.equal(s.players[0].position,4);
 assert.equal(s.pendingSteps,0);
 assert.equal(s.shopAccess,false);
 assert.throws(()=>applyAction(s,'a',{type:'BUY_GATE_CARD'}),/pass or stop/);
 end(s,'a');
});
check('shop inventory supplies and use at base',()=>{
 const s=setup();start(s);s.players[0].robot.energy=10;
 roll(s,'a',()=>.2);applyAction(s,'a',{type:'ENTER_SHOP'});
 applyAction(s,'a',{type:'BUY_SUPPLY',supply:'ENERGY_CELL'});
 assert.equal(s.players[0].robot.energy,35);
 applyAction(s,'a',{type:'BUY_SUPPLY',supply:'REPAIR_KIT'});
 assert.equal(s.players[0].repairKits,1);
 applyAction(s,'a',{type:'CLOSE_SHOP'});
 assert.throws(()=>applyAction(s,'a',{type:'USE_REPAIR_KIT'}),/before rolling/);
 end(s,'a');
 roll(s,'b',()=>0);end(s,'b');
 const before=s.players[0].robot.energy;
 applyAction(s,'a',{type:'USE_REPAIR_KIT'});
 assert.equal(s.players[0].repairKits,0);
 assert.equal(s.players[0].robot.energy,Math.min(50,before+35));
});
check('crossing two shops during one roll asks twice and resumes each segment',()=>{
  const s=setup();start(s);s.players[0].position=10;
  roll(s,'a',()=>.99);
  assert.equal(s.players[0].position,12);
  assert.equal(s.pendingSteps,10);
  assert.equal(s.shopOffer,true);
  applyAction(s,'a',{type:'SKIP_SHOP'});
  assert.equal(s.players[0].position,21);
  assert.equal(s.pendingSteps,1);
  assert.equal(s.shopOffer,true);
  applyAction(s,'a',{type:'SKIP_SHOP'});
  assert.equal(s.players[0].position,22);
  assert.equal(s.shopOffer,false);
  assert.equal(s.pendingSteps,0);
});
check('treasures can be sold only after entering shop',()=>{
  const s=setup();start(s);
  s.players[0].inventory.push({id:'vase',name:'Old Vase',value:1500,category:'Relics'});
  assert.throws(()=>applyAction(s,'a',{type:'SELL_TREASURE',treasureId:'vase'}),/Enter a shop/);
  roll(s,'a',()=>.2);
  assert.throws(()=>applyAction(s,'a',{type:'SELL_TREASURE',treasureId:'vase'}),/Enter a shop/);
  applyAction(s,'a',{type:'ENTER_SHOP'});
  applyAction(s,'a',{type:'SELL_TREASURE',treasureId:'vase'});
  assert.equal(s.players[0].gold,3300);
  assert.equal(s.players[0].inventory.length,0);
  assert.throws(()=>applyAction(s,'a',{type:'SELL_TREASURE',treasureId:'vase'}),/not in your inventory/);
  applyAction(s,'a',{type:'CLOSE_SHOP'});
  assert.throws(()=>applyAction(s,'a',{type:'BUY_SUPPLY',supply:'REPAIR_KIT'}),/Enter a shop/);
});
console.log(`PASS ${passed} faithful-slice smoke checks`);
