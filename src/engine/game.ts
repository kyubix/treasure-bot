import { initialIsland, findSpot, travelTurns, searchSuccess, battleVictory, terrainGrade, terrainTroubleChance, terrainEnergyCost, terrainTravelPenalty } from './island.ts';
import { ROBOTS, TILES } from './types.ts';
import type { GameAction, GameLog, GameState, Player, Robot, PartSlot, RobotStats, Treasure } from './types.ts';

export type Random = () => number;
const COLORS = ['#69d7ce', '#f4be70', '#dba5ed', '#94abfa'];
const START_GOLD = 2400;
const WIN_ASSETS = 20_000;
const GATE_PRICE = 300; // PROVISIONAL price
const PART_PRICE = 450; // PROVISIONAL price
const PART_SLOTS:PartSlot[]=['HEAD','BODY','ARM','LEG'];
const PART_BONUS:Record<PartSlot,Partial<RobotStats>>={
  HEAD:{search:25},BODY:{energy:25},ARM:{battle:25},LEG:{walk:25}
};
export function getRobotStats(robot:Robot):RobotStats{
  const stats={...ROBOTS[robot.chassis]};
  for(const slot of PART_SLOTS){
    if(!robot.parts?.[slot])continue;
    for(const [key,amount] of Object.entries(PART_BONUS[slot]))
      stats[key as keyof RobotStats]+=amount;
  }
  return stats;
}
const SHOP_FEE = 0;
const CATEGORY = ['Relics', 'Artworks', 'Gems', 'Documents', 'Fossils', 'Food', 'Creatures', 'Junk'];
export class GameError extends Error { constructor(message: string) { super(message); this.name='GameError'; } }

export function createPlayer(id: string, name: string, isBot = false, colorIndex = 0): Player {
  return {
    id, name: name.trim().slice(0, 22) || 'Explorer', color: COLORS[colorIndex % COLORS.length], isBot,
    position: 0, gold: START_GOLD, gateCards: 0, repairKits: 0,
    robot: { chassis: 'NORMAL', energy: ROBOTS.NORMAL.energy, mission: null, cargo: [], parts:{HEAD:false,BODY:false,ARM:false,LEG:false} }, inventory: []
  };
}
export function newGame(code: string, player: Player): GameState {
  return {
    code, hostId: player.id, phase: 'lobby', players: [player],
    galleries: TILES.flatMap((tile, i) => tile === 'GALLERY' ? [{tile:i, ownerId:null, displayed: []}] : []),
    currentPlayerIndex:0, turn:1, version:1, rolled:false, dice:null, winnerId:null, islandSpots:initialIsland(), shopAccess:false, shopOffer:false, pendingSteps:0, shopTile:null, logs: [{id:1, turn:1, message:'Room created. Invite friends or add bots.'}]
  };
}
export function netWorth(state: GameState, player: Player): number {
  const treasure = player.inventory.reduce((n, item)=>n+item.value,0);
  const galleryValue = state.galleries.filter(g=>g.ownerId===player.id).reduce((n,g)=>n+g.displayed.reduce((v,t)=>v+t.value,0),0);
  return player.gold + treasure + galleryValue + player.robot.cargo.reduce((n,item)=>n+item.value,0);
}
export function currentPlayer(state: GameState): Player {
  const player = state.players[state.currentPlayerIndex];
  if (!player) throw new GameError('No active player.');
  return player;
}
function log(state: GameState, message: string): void {
  state.logs.push({id:(state.logs.at(-1)?.id ?? 0)+1,turn:state.turn,message});
  if (state.logs.length > 80) state.logs = state.logs.slice(-80);
}
function rollDie(random:Random): number { return Math.floor(Math.max(0, Math.min(0.9999999999, random())) * 6)+1; }
export function addGuest(state: GameState, player: Player): void {
  if (state.phase!=='lobby') throw new GameError('The match has already started.');
  if (state.players.length >= 4) throw new GameError('Room is full.');
  if (state.players.some(p=>p.id===player.id)) throw new GameError('Player already joined.');
  player.color = COLORS[state.players.length];
  state.players.push(player);
  log(state, `${player.name} joined the room.`);
  state.version++;
}
export function applyAction(state: GameState, actorId: string, action: GameAction, random:Random=Math.random): GameState {
  if (action.type==='START') {
    if (state.phase!=='lobby') throw new GameError('Game has already started.');
    if (actorId!==state.hostId) throw new GameError('Only the host can start.');
    if (!Number.isInteger(action.bots) || action.bots < 0 || action.bots > 3) throw new GameError('Invalid number of bots.');
    if (state.players.length+action.bots>4) throw new GameError('Maximum four players.');
    for(let i=0;i<action.bots;i++) {
      const idx=state.players.length;
      state.players.push(createPlayer(`bot-${idx}-${state.code}`, `CPU ${idx+1}`, true, idx));
    }
    if(state.players.length<2) throw new GameError('At least two participants are required. Add a bot.');
    state.galleries.forEach((gallery,i)=>{gallery.ownerId=state.players[i % state.players.length].id;});
    state.phase='playing';
    log(state, 'The expedition begins!');
    // CPU turns are resolved in durable, visible steps by the room alarm.
    state.version++;
    return state;
  }
  if(state.phase!=='playing') throw new GameError('The game is not in progress.');
  const player = currentPlayer(state);
  if(player.id !== actorId || player.isBot) throw new GameError('It is not your turn.');
  switch(action.type) {
    case 'ROLL': if (state.rolled) throw new GameError('You have already rolled this turn.'); rollAndResolve(state,random); break;
    case 'END_TURN': if (!state.rolled) throw new GameError('Roll dice before ending your turn.'); endTurn(state); break;
    case 'SEND_ROBOT': sendRobot(state, player, action.siteId); break;
    case 'RETURN_ROBOT': returnRobot(state,player); break;
    case 'BUY_GATE_CARD': buyGate(state,player); break;
    case 'CLOSE_SHOP': closeShop(state,player,random); break;
    case 'ENTER_SHOP': enterShop(state,player); break;
    case 'SKIP_SHOP': skipShop(state,player,random); break;
    case 'BUY_SUPPLY': buySupply(state,player,action.supply); break;
    case 'SELL_TREASURE': sellTreasure(state,player,action.treasureId); break;
    case 'USE_REPAIR_KIT': useRepairKit(state,player); break;
    case 'BUY_PART': buyPart(state,player,action.slot); break;
    case 'DISPLAY_TREASURE': displayTreasure(state,player,action.treasureId); break;
    default: throw new GameError('Unknown action.');
  }
  state.version++;
  return state;
}
function sendRobot(state:GameState, player:Player, siteId:string):void {
  if(state.rolled) throw new GameError('Launch robot before rolling.');
  if(player.robot.mission) throw new GameError('Robot is already on the island.');
  if(player.gateCards<1) throw new GameError('Buy a gate card from a shop first.');
  if(player.robot.energy<10) throw new GameError('Robot needs energy to launch.');
  let site;
  try { site=findSpot(state.islandSpots,siteId); }
  catch { throw new GameError('Select a valid map destination.'); }
  if(site.depleted) throw new GameError('This treasure has already been discovered.');
  player.gateCards--;
  const grade=terrainGrade(player.robot.chassis,site.ground);
  const steps=travelTurns(site,getRobotStats(player.robot).walk)+terrainTravelPenalty(grade);
  player.robot.mission={siteId,launchTile:player.position,phase:'OUTBOUND',turnsRemaining:steps,transitTotal:steps};
  log(state,`${player.name} launched a robot toward ${site.label} (${steps} travel turns).`);
}
function returnRobot(state:GameState,player:Player):void {
  if(state.rolled)throw new GameError('Issue robot command before rolling.');
  const m=player.robot.mission;
  if(!m)throw new GameError('No active robot expedition.');
  if(m.phase==='INBOUND')throw new GameError('Robot is already returning.');
  m.phase='INBOUND';
  m.turnsRemaining=m.transitTotal;
  log(state,`${player.name} called their robot home.`);
}
function enterShop(state:GameState,player:Player):void {
  if(!state.rolled || !state.shopOffer || state.shopAccess)
    throw new GameError('No shop invitation to accept.');
  state.shopOffer=false;
  state.shopAccess=true;
  log(state,`${player.name} entered the robot shop at tile ${player.position+1}.`);
}
function skipShop(state:GameState,player:Player,random:Random):void {
  if(!state.rolled || !state.shopOffer || state.shopAccess)
    throw new GameError('No shop invitation to skip.');
  state.shopOffer=false;
  state.shopTile=null;
  log(state,`${player.name} passed the robot shop without entering.`);
  advanceMovement(state,player,random);
}
function closeShop(state:GameState,player:Player,random:Random):void {
  if(!state.rolled || !state.shopAccess)
    throw new GameError('No active shop encounter.');
  state.shopAccess=false;
  state.shopTile=null;
  log(state,`${player.name} left the robot shop.`);
  advanceMovement(state,player,random);
}
function buySupply(state:GameState,player:Player,supply:'ENERGY_CELL'|'REPAIR_KIT'):void {
  if(!state.rolled||!state.shopAccess)throw new GameError('Enter a shop to buy supplies.');
  if(supply==='ENERGY_CELL'){
    const max=getRobotStats(player.robot).energy;
    if(player.robot.energy>=max)throw new GameError('Robot energy is already full.');
    if(player.gold<200)throw new GameError('Not enough gold for an energy cell.');
    player.gold-=200;
    player.robot.energy=Math.min(max,player.robot.energy+25);
    log(state,`${player.name} bought an energy cell, restoring up to 25 robot energy.`);
  } else if(supply==='REPAIR_KIT'){
    if((player.repairKits??0)>=3)throw new GameError('Repair kit limit reached.');
    if(player.gold<280)throw new GameError('Not enough gold for a repair kit.');
    player.gold-=280;
    player.repairKits=(player.repairKits??0)+1;
    log(state,`${player.name} bought a repair kit.`);
  } else throw new GameError('Unknown shop item.');
}
function sellTreasure(state:GameState,player:Player,treasureId:string):void {
  if(!state.rolled||!state.shopAccess)throw new GameError('Enter a shop to sell treasures.');
  const idx=player.inventory.findIndex(item=>item.id===treasureId);
  if(idx<0)throw new GameError('Treasure is not in your inventory.');
  const [treasure]=player.inventory.splice(idx,1);
  const payout=Math.floor(treasure.value*.6); // PROVISIONAL resale ratio
  player.gold+=payout;
  log(state,`${player.name} sold ${treasure.name} for ${payout} G.`);
}
function useRepairKit(state:GameState,player:Player):void {
  if(state.rolled || player.robot.mission)throw new GameError('Use repair kits at base before rolling.');
  if(!player.repairKits)throw new GameError('No repair kit available.');
  const max=getRobotStats(player.robot).energy;
  if(player.robot.energy>=max)throw new GameError('Robot energy is already full.');
  player.repairKits--;
  player.robot.energy=Math.min(max,player.robot.energy+35);
  log(state,`${player.name} used a repair kit (+35 energy, provisional).`);
}
function buyGate(state:GameState,player:Player):void {
  if(!state.rolled || !state.shopAccess)throw new GameError('You must pass or stop at a shop before buying.');
  if(player.gold<GATE_PRICE)throw new GameError('Not enough gold.');
  if(player.gateCards>=5)throw new GameError('Gate card limit reached.');
  player.gold-=GATE_PRICE;player.gateCards++;
  log(state,`${player.name} purchased a gate card for ${GATE_PRICE} G.`);
}
function buyPart(state:GameState,player:Player,slot:PartSlot):void{
  if(!PART_SLOTS.includes(slot))throw new GameError('Unknown robot part.');
  if(!state.rolled||!state.shopAccess)throw new GameError('Visit a robot shop to purchase parts.');
  if(!player.robot.parts)player.robot.parts={HEAD:false,BODY:false,ARM:false,LEG:false};
  if(player.robot.parts[slot])throw new GameError('Part already installed.');
  if(player.gold<PART_PRICE)throw new GameError('Insufficient gold to upgrade robot.');
  player.gold-=PART_PRICE;
  player.robot.parts[slot]=true;
  if(slot==='BODY')player.robot.energy+=PART_BONUS.BODY.energy??0;
  log(state,`${player.name} equipped improved ${slot.toLowerCase()} (+25 stat, provisional balance).`);
}
function displayTreasure(state:GameState, player:Player, treasureId:string):void {
  const gallery=state.galleries.find(g=>g.ownerId===player.id && g.displayed.length<10);
  if(!gallery) throw new GameError('You need an owned gallery with an empty display slot.');
  const idx=player.inventory.findIndex(t=>t.id===treasureId);
  if(idx<0) throw new GameError('Treasure not found in your inventory.');
  const [treasure]=player.inventory.splice(idx,1);
  gallery.displayed.push(treasure);
  log(state,`${player.name} displayed ${treasure.name} in a gallery.`);
}
function robotTick(state:GameState,player:Player,random:Random):void {
  const m=player.robot.mission;
  if(!m)return;
  const site=findSpot(state.islandSpots,m.siteId);
  const grade=terrainGrade(player.robot.chassis,site.ground);
  const energyCost=terrainEnergyCost(grade,site.ground);
  player.robot.energy=Math.max(0,player.robot.energy-energyCost);
  if(player.robot.energy===0){
    player.robot.mission=null;player.robot.cargo=[];
    log(state,`${player.name}'s robot lost power and was forcibly returned.`);
    return;
  }
  // PROVISIONAL: terrain risks based on grade; original has specific trouble
  // counter-items (airbag, rope, balloon, float, water, campfire).
  // The current Repair Kit acts as a temporary generic rescue item.
  const danger=terrainTroubleChance(grade);
  if(random()>1-danger){
    if((player.repairKits??0)>0){
      player.repairKits!--;
      log(state,`${player.name}'s robot had ${site.ground.toLowerCase()} terrain trouble (${grade}) but used a repair kit. Travel delayed.`);
      return;
    }
    player.robot.mission=null;
    player.robot.cargo=[];
    log(state,`${player.name}'s robot was forcibly recalled after ${site.ground.toLowerCase()} terrain trouble (${grade}).`);
    return;
  }
  if(m.phase==='OUTBOUND'){
    m.turnsRemaining--;
    if(m.turnsRemaining>0)return;
    // PROVISIONAL: same-location robot encounter; PS1 battle timing needs validation.
    const rival=state.players.find(other=>other.id!==player.id &&
      other.robot.mission?.siteId===m.siteId && other.robot.mission.phase==='SEARCH');
    if(rival){
      const won=battleVictory(getRobotStats(player.robot).battle,getRobotStats(rival.robot).battle,random());
      if(!won){
        player.robot.mission=null;player.robot.cargo=[];
        log(state,`${player.name}'s robot lost an encounter with ${rival.name} at ${site.label}.`);
        return;
      }
      rival.robot.mission=null;rival.robot.cargo=[];
      log(state,`${player.name}'s robot defeated ${rival.name}'s robot at ${site.label}.`);
    }
    if(site.kind==='KEEPER'){
      if(site.depleted){m.phase='INBOUND';m.turnsRemaining=m.transitTotal;return;}
      const won=battleVictory(getRobotStats(player.robot).battle,site.keeperPower,random());
      if(won){
        const loot={id:`${site.id}-${state.turn}`,name:site.label,category:'Relics',value:site.value};
        player.robot.cargo.push(loot);site.depleted=true;
        m.phase='INBOUND';m.turnsRemaining=m.transitTotal;
        log(state,`${player.name}'s robot defeated ${site.label} and secured treasure. Returning to gallery.`);
      }else{
        player.robot.mission=null;player.robot.cargo=[];
        log(state,`${player.name}'s robot lost to ${site.label} and was forcibly returned.`);
      }
      return;
    }
    m.phase='SEARCH';log(state,`${player.name}'s robot reached ${site.label}. Search begins next turn.`);
    return;
  }
  if(m.phase==='SEARCH'){
    if(!site.depleted&&searchSuccess(getRobotStats(player.robot).search,random())){
      const loot={id:`${site.id}-${state.turn}`,name:site.label,category:'Relics',value:site.value};
      player.robot.cargo.push(loot);site.depleted=true;
      m.phase='INBOUND';m.turnsRemaining=m.transitTotal;
      log(state,`${player.name}'s robot found ${site.label} and is bringing it home.`);
    }else{
      log(state,`${player.name}'s robot searched ${site.label} but found nothing this turn.`);
      if(site.depleted){m.phase='INBOUND';m.turnsRemaining=m.transitTotal;}
    }
    return;
  }
  if(m.phase==='INBOUND'){
    m.turnsRemaining--;
    if(m.turnsRemaining>0)return;
    if(player.robot.cargo.length){
      player.inventory.push(...player.robot.cargo);
      log(state,`${player.name}'s robot delivered ${player.robot.cargo.length} treasure item(s).`);
      player.robot.cargo=[];
    }else log(state,`${player.name}'s robot returned to base.`);
    player.robot.mission=null;
  }
}
function generateTreasure(random:Random,turn:number,playerId:string,index:number):Treasure {
  const category = CATEGORY[Math.floor(random()*CATEGORY.length)] ?? 'Relics';
  const value=250+Math.floor(random()*8)*100;
  return {id:`${turn}-${playerId}-${index}-${Math.floor(random()*1_000_000)}`, name:`${category} Find`, category, value};
}
function rollAndResolve(state:GameState,random:Random):void {
  const player=currentPlayer(state);
  robotTick(state,player,random);
  const dice:[number,number]=[rollDie(random),rollDie(random)];
  state.dice=dice;
  state.rolled=true;
  state.shopAccess=false;
  state.shopOffer=false;
  state.shopTile=null;
  state.pendingSteps=dice[0]+dice[1];
  log(state,`${player.name} rolled ${dice[0]} + ${dice[1]}.`);
  advanceMovement(state,player,random);
}
function advanceMovement(state:GameState,player:Player,random:Random):void {
  // Movement is authoritative and pauses immediately on EVERY shop space,
  // including shops passed through before the destination.
  while((state.pendingSteps??0)>0) {
    player.position=(player.position+1)%TILES.length;
    state.pendingSteps!--;
    if(TILES[player.position]==='START') {
      player.gold+=START_GOLD;
      log(state,`${player.name} passed Robot Center (+${START_GOLD} G).`);
    }
    if(TILES[player.position]==='SHOP') {
      state.shopTile=player.position;
      state.shopOffer=true;
      log(state,`${player.name} arrived at a robot shop. Enter or skip?`);
      return;
    }
  }
  state.pendingSteps=0;
  state.shopOffer=false;
  state.shopTile=null;
  log(state,`${player.name} completed movement on tile ${player.position+1}.`);
  resolveTile(state,player,random);
  if(netWorth(state,player)>=WIN_ASSETS){
    state.winnerId=player.id;
    state.phase='finished';
    log(state,`${player.name} wins with ${netWorth(state,player)} G in total assets!`);
  }
}
function endTurn(state:GameState):void {
  if(state.shopOffer || state.shopAccess || (state.pendingSteps??0)>0)
    throw new GameError('Finish or skip the shop encounter before ending this turn.');
  state.currentPlayerIndex=(state.currentPlayerIndex+1)%state.players.length;
  state.rolled=false;
  state.dice=null;
  state.shopAccess=false;
  state.shopOffer=false;
  state.shopTile=null;
  state.pendingSteps=0;
  if(state.currentPlayerIndex===0)state.turn++;
}
function resolveTile(state:GameState,player:Player,random:Random):void {
  const tile=TILES[player.position];
  if(tile==='GALLERY') {
    const gallery=state.galleries.find(g=>g.tile===player.position)!;
    if(gallery.ownerId && gallery.ownerId!==player.id) {
      const owner=state.players.find(p=>p.id===gallery.ownerId)!;
      const value=gallery.displayed.reduce((sum,t)=>sum+t.value,0);
      const fee=Math.min(player.gold,Math.floor(value*0.2));
      if(fee>0){player.gold-=fee;owner.gold+=fee;log(state,`${player.name} paid ${fee} G to visit ${owner.name}'s gallery.`);}
    }
  }else if(tile==='SUPPORT') {
    player.gold+=200;log(state,`${player.name} received a 200 G support bonus.`);
  }else if(tile==='SHOP') {
    log(state,`${player.name} stopped at the robot shop.`);
  }else if(tile==='EVENT') {
    const event=Math.floor(random()*3);
    if(event===0){player.gold+=350;log(state,`Lucky find! ${player.name} gained 350 G.`);}
    else if(event===1){const loss=Math.min(player.gold,150);player.gold-=loss;log(state,`Bad weather! ${player.name} lost ${loss} G.`);}
    else {player.robot.energy=Math.min(getRobotStats(player.robot).energy,player.robot.energy+15);log(state,`Maintenance bonus! ${player.name}'s robot regained energy.`);}
  }else if(tile==='START') {
    player.gold+=START_GOLD;log(state,`${player.name} stopped at the Robot Center (+${START_GOLD*2} G total for passing and stopping).`);
  }
}
/**
 * Resolve ONE visible CPU action. Called only from the Durable Object alarm.
 * Never run the entire bot turn in one request: clients must see each snapshot.
 * The server remains authoritative for random dice, shopping and robot decisions.
 */
export function advanceBotStep(state:GameState,random:Random=Math.random):{
  kind:NonNullable<GameState['botEvent']>['kind']; waitMs:number
}|null {
  if(state.phase!=='playing'||!currentPlayer(state).isBot)return null;
  const bot=currentPlayer(state);
  const beforePending=state.pendingSteps??0;
  let kind:NonNullable<GameState['botEvent']>['kind'];
  let waitMs=900;
  if(!state.rolled) {
    // Sending is deliberately its own stage, followed by a separate roll stage.
    if(!bot.robot.mission && bot.gateCards>0 && bot.robot.energy>=10) {
      const target=state.islandSpots.find(spot=>!spot.depleted);
      if(target){
        sendRobot(state,bot,target.id);
        kind='SEND';
        waitMs=1500;
      }else{
        rollAndResolve(state,random);
        kind='ROLL';
      }
    } else {
      rollAndResolve(state,random);
      kind='ROLL';
    }
    if(kind==='ROLL'){
      const walked=(state.dice?.[0]??0)+(state.dice?.[1]??0)-(state.pendingSteps??0);
      waitMs=Math.max(1400,Math.min(4300,walked*230+850));
    }
  }else if(state.shopOffer){
    if(bot.gold>=GATE_PRICE && bot.gateCards<2){
      enterShop(state,bot);
      kind='ENTER_SHOP';
      waitMs=1100;
    }else{
      skipShop(state,bot,random);
      kind='SKIP_SHOP';
      const walked=beforePending-(state.pendingSteps??0);
      waitMs=Math.max(800,Math.min(3600,walked*230+650));
    }
  }else if(state.shopAccess){
    // Buy at most one ticket per shop visit; then visibly exit.
    // This also prevents a bot looping through unlimited purchases in one turn.
    const alreadyBoughtHere=state.botEvent?.playerId===bot.id && state.botEvent.kind==='BUY';
    if(!alreadyBoughtHere && bot.gold>=GATE_PRICE && bot.gateCards<2){
      buyGate(state,bot);
      kind='BUY';
      waitMs=950;
    }else{
      closeShop(state,bot,random);
      kind='LEAVE_SHOP';
      const walked=beforePending-(state.pendingSteps??0);
      waitMs=Math.max(950,Math.min(3600,walked*230+650));
    }
  }else if((state.pendingSteps??0)===0){
    endTurn(state);
    kind='END';
    waitMs=650;
  }else{
    // Defensive recovery from stale in-progress movement.
    advanceMovement(state,bot,random);
    kind='ROLL';
    const walked=beforePending-(state.pendingSteps??0);
    waitMs=Math.max(900,Math.min(3600,walked*230+650));
  }
  state.botEvent={playerId:bot.id,kind,step:(state.botEvent?.step??0)+1};
  state.version++;
  return {kind,waitMs};
}
export const PROVISIONAL_RULES = {
  startingGold:START_GOLD, winAssets:WIN_ASSETS, gatePrice:GATE_PRICE,
  shopFee:SHOP_FEE, galleryFeeRatio:0.2, partPrice:PART_PRICE, energyCellPrice:200, repairKitPrice:280, resaleRate:0.6, robotSearchFormula:'provisional', terrainAffinity:'provisional'
} as const;
