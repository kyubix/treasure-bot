import { ROBOTS, TILES } from './types.ts';
import type { GameAction, GameLog, GameState, Player, Terrain, Treasure } from './types.ts';

export type Random = () => number;
const COLORS = ['#69d7ce', '#f4be70', '#dba5ed', '#94abfa'];
const START_GOLD = 2400;
const WIN_ASSETS = 20_000;
const CLAIM_COST = 800;
const SHOP_FEE = 0;
const CATEGORY = ['Relics', 'Artworks', 'Gems', 'Documents', 'Fossils', 'Food', 'Creatures', 'Junk'];
export class GameError extends Error { constructor(message: string) { super(message); this.name='GameError'; } }

export function createPlayer(id: string, name: string, isBot = false, colorIndex = 0): Player {
  return {
    id, name: name.trim().slice(0, 22) || 'Explorer', color: COLORS[colorIndex % COLORS.length], isBot,
    position: 0, gold: START_GOLD, gateCards: 2,
    robot: { chassis: 'NORMAL', energy: ROBOTS.NORMAL.energy, mission: null }, inventory: []
  };
}
export function newGame(code: string, player: Player): GameState {
  return {
    code, hostId: player.id, phase: 'lobby', players: [player],
    galleries: TILES.flatMap((tile, i) => tile === 'GALLERY' ? [{tile:i, ownerId:null, displayed: []}] : []),
    currentPlayerIndex:0, turn:1, version:1, rolled:false, dice:null, winnerId:null, logs: [{id:1, turn:1, message:'Room created. Invite friends or add bots.'}]
  };
}
export function netWorth(state: GameState, player: Player): number {
  const treasure = player.inventory.reduce((n, item)=>n+item.value,0);
  const galleryValue = state.galleries.filter(g=>g.ownerId===player.id).reduce((n,g)=>n+g.displayed.reduce((v,t)=>v+t.value,0),0);
  return player.gold + treasure + galleryValue;
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
    state.phase='playing';
    log(state, 'The expedition begins!');
    autoPlayBots(state,random);
    state.version++;
    return state;
  }
  if(state.phase!=='playing') throw new GameError('The game is not in progress.');
  const player = currentPlayer(state);
  if(player.id !== actorId || player.isBot) throw new GameError('It is not your turn.');
  switch(action.type) {
    case 'ROLL': if (state.rolled) throw new GameError('You have already rolled this turn.'); rollAndResolve(state,random); break;
    case 'END_TURN': if (!state.rolled) throw new GameError('Roll dice before ending your turn.'); endTurn(state); autoPlayBots(state,random); break;
    case 'SEND_ROBOT': sendRobot(state, player, action.terrain); break;
    case 'CLAIM_GALLERY': claimGallery(state, player); break;
    case 'DISPLAY_TREASURE': displayTreasure(state,player,action.treasureId); break;
    default: throw new GameError('Unknown action.');
  }
  state.version++;
  return state;
}
function sendRobot(state:GameState, player:Player, terrain:Terrain):void {
  if(!['RUINS','FOREST','COAST'].includes(terrain)) throw new GameError('Unknown destination.');
  if(state.rolled) throw new GameError('Send the robot before rolling.');
  if(player.robot.mission) throw new GameError('Robot already exploring.');
  if(player.gateCards<1) throw new GameError('No gate cards left.');
  if(player.robot.energy<10) throw new GameError('Robot has insufficient energy.');
  player.gateCards--;
  player.robot.mission={terrain,remaining:2};
  log(state,`${player.name} sent a robot to ${terrain.toLowerCase()}.`);
}
function claimGallery(state:GameState,player:Player):void {
  const g = state.galleries.find(g=>g.tile===player.position);
  if(!state.rolled || !g || g.ownerId) throw new GameError('No available gallery on this tile after your roll.');
  if(player.gold<CLAIM_COST) throw new GameError('Not enough gold to claim the gallery.');
  player.gold-=CLAIM_COST;g.ownerId=player.id;
  log(state,`${player.name} opened a gallery for ${CLAIM_COST} G.`);
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
  const mission=player.robot.mission;
  if(!mission) return;
  player.robot.energy=Math.max(0,player.robot.energy-8);
  mission.remaining--;
  if(player.robot.energy===0){
    log(state,`${player.name}'s robot ran out of energy and returned empty-handed.`);
    player.robot.mission=null;
    return;
  }
  if(mission.remaining>0)return;
  const found=random() < 0.7; // PROVISIONAL: not an original-game search probability.
  if(found) {
    const treasure=generateTreasure(random, state.turn,player.id,player.inventory.length);
    player.inventory.push(treasure);
    log(state,`${player.name}'s robot returned from ${mission.terrain.toLowerCase()} with ${treasure.name} (${treasure.value} G)!`);
  } else {
    log(state,`${player.name}'s robot returned without finding treasure.`);
  }
  player.robot.mission=null;
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
  const previous=player.position;
  player.position=(previous+dice[0]+dice[1])%TILES.length;
  state.dice=dice; state.rolled=true;
  log(state,`${player.name} rolled ${dice[0]} + ${dice[1]} and moved to tile ${player.position+1}.`);
  if(previous+dice[0]+dice[1]>=TILES.length) {
    player.gold+=500;
    player.robot.energy=ROBOTS[player.robot.chassis].energy;
    log(state,`${player.name} passed the Robot Center (+500 G, energy restored).`);
  }
  resolveTile(state,player,random);
  if(netWorth(state,player)>=WIN_ASSETS){
    state.winnerId=player.id;state.phase='finished';
    log(state,`${player.name} wins with ${netWorth(state,player)} G in total assets!`);
    return;
  }
}
function endTurn(state:GameState):void {
  state.currentPlayerIndex=(state.currentPlayerIndex+1)%state.players.length;
  state.rolled=false; state.dice=null;
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
    } else if(!gallery.ownerId) log(state,`${player.name} discovered an unowned gallery. Claim it this turn!`);
  }else if(tile==='SUPPORT') {
    player.gold+=200;log(state,`${player.name} received a 200 G support bonus.`);
  }else if(tile==='SHOP') {
    player.gateCards=Math.min(5,player.gateCards+1);log(state,`${player.name} visited a robot shop (+1 gate card).`);
  }else if(tile==='EVENT') {
    const event=Math.floor(random()*3);
    if(event===0){player.gold+=350;log(state,`Lucky find! ${player.name} gained 350 G.`);}
    else if(event===1){const loss=Math.min(player.gold,150);player.gold-=loss;log(state,`Bad weather! ${player.name} lost ${loss} G.`);}
    else {player.robot.energy=Math.min(ROBOTS[player.robot.chassis].energy,player.robot.energy+15);log(state,`Maintenance bonus! ${player.name}'s robot regained energy.`);}
  }else if(tile==='START') {
    player.gold+=200;log(state,`${player.name} stopped at the Robot Center (+200 G).`);
  }
}
function autoPlayBots(state:GameState,random:Random):void {
  let safety=0;
  while(state.phase==='playing' && currentPlayer(state).isBot && safety++<state.players.length) {
    const bot=currentPlayer(state);
    if(!bot.robot.mission && bot.gateCards>0 && bot.robot.energy>=10) sendRobot(state,bot,['RUINS','FOREST','COAST'][Math.floor(random()*3)] as Terrain);
    rollAndResolve(state,random);
    if(state.phase==='playing') endTurn(state);
  }
}
export const PROVISIONAL_RULES = {
  startingGold:START_GOLD, winAssets:WIN_ASSETS, claimCost:CLAIM_COST,
  shopFee:SHOP_FEE, galleryFeeRatio:0.2, robotFindChance:0.7
} as const;
