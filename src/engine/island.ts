/** Original-inspired spatial exploration. Exact travel/search/combat formulas are PROVISIONAL. */
export type Ground = 'GRASS' | 'CLIFF' | 'DESERT' | 'WATER' | 'VOLCANO' | 'ICE';
export type SpotKind = 'TREASURE' | 'KEEPER' | 'LOCATION';
export interface IslandSpot {
  id: string;
  x: number;
  y: number;
  ground: Ground;
  kind: SpotKind;
  label: string;
  value: number;
  keeperPower: number;
  depleted: boolean;
}
export interface Position { x:number; y:number }
export type ExpeditionPhase = 'OUTBOUND' | 'SEARCH' | 'INBOUND';
export interface Expedition {
  siteId:string;
  phase:ExpeditionPhase;
  turnsRemaining:number;
  transitTotal:number;
}
export const ISLAND_SIZE=5;
export const ISLAND_TERRAIN: readonly Ground[][] = [
  ['CLIFF','CLIFF','GRASS','ICE','ICE'],
  ['GRASS','GRASS','GRASS','ICE','WATER'],
  ['DESERT','GRASS','GRASS','WATER','WATER'],
  ['DESERT','DESERT','GRASS','GRASS','VOLCANO'],
  ['DESERT','GRASS','GRASS','VOLCANO','VOLCANO']
];
// Deliberately invented sample treasures and provisional values/locations, NOT a PS1 map.
export const STARTING_SPOTS: readonly Omit<IslandSpot,'depleted'>[] = [
  {id:'relic', x:0,y:1,ground:'GRASS',kind:'TREASURE',label:'Buried Relic',value:1300,keeperPower:0},
  {id:'fossil',x:1,y:0,ground:'CLIFF',kind:'TREASURE',label:'Ancient Fossil',value:1700,keeperPower:0},
  {id:'guardian',x:3,y:1,ground:'ICE',kind:'KEEPER',label:'Treasure Keeper',value:2200,keeperPower:62},
  {id:'gem',x:4,y:2,ground:'WATER',kind:'TREASURE',label:'Azure Gem',value:1900,keeperPower:0},
  {id:'sarcophagus',x:0,y:4,ground:'DESERT',kind:'TREASURE',label:'Golden Casket',value:2400,keeperPower:0},
  {id:'firekeeper',x:4,y:4,ground:'VOLCANO',kind:'KEEPER',label:'Lava Keeper',value:3100,keeperPower:80},
  {id:'valley',x:2,y:3,ground:'GRASS',kind:'LOCATION',label:'Quiet Valley',value:800,keeperPower:0},
  {id:'cave',x:2,y:1,ground:'GRASS',kind:'LOCATION',label:'Cave Mouth',value:950,keeperPower:0}
];
export function initialIsland():IslandSpot[] { return STARTING_SPOTS.map(spot=>({...spot,depleted:false})); }
export function findSpot(spots:readonly IslandSpot[],id:string):IslandSpot {
  const spot=spots.find(s=>s.id===id);
  if(!spot)throw new Error('Unknown treasure map destination.');
  return spot;
}
export function travelTurns(spot:Position,walk:number):number {
  if(!Number.isFinite(walk)||walk<=0)throw new Error('Invalid robot walk stat.');
  const distance=Math.abs(spot.x-2)+Math.abs(spot.y-2);
  return Math.max(1,Math.ceil((distance+1)*35/walk)); // PROVISIONAL, varies by path length
}
export function searchSuccess(search:number,random:number):boolean {
  const probability=Math.min(.95,Math.max(.1,search/120)); // PROVISIONAL
  return random<probability;
}
export function battleVictory(battle:number,keeperPower:number,random:number):boolean {
  const probability=Math.min(.9,Math.max(.1,battle/(battle+keeperPower))); // PROVISIONAL
  return random<probability;
}
export function expeditionProgress(mission:Expedition):number {
  const elapsed=mission.transitTotal-mission.turnsRemaining;
  return Math.max(0,Math.min(1,elapsed/Math.max(1,mission.transitTotal)));
}
