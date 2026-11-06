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
  /** Board tile where the robot was dispatched. Immutable for this mission. */
  launchTile?:number;
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
export function initialIsland():IslandSpot[] {
  const featured=STARTING_SPOTS.map(spot=>({...spot,depleted:false}));
  // PROVISIONAL unmarked-area scouting: these map cells/payouts are not PS1 data.
  const locations:IslandSpot[]=[];
  for(let y=0;y<ISLAND_SIZE;y++)for(let x=0;x<ISLAND_SIZE;x++){
    if(featured.some(s=>s.x===x&&s.y===y))continue;
    locations.push({id:`survey-${x}-${y}`,x,y,ground:ISLAND_TERRAIN[y][x],kind:'LOCATION',
      label:`Unexplored location (${x+1},${y+1})`,
      value:600+95*((x*7+y*3)%9),keeperPower:0,depleted:false});
  }
  return featured.concat(locations);
}
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

/** PROVISIONAL terrain adaptation: the PS1 uses A-D grades, but this
 * table is original balancing and must be replaced with documented values. */
export type TerrainGrade='A'|'B'|'C'|'D';
export const ROBOT_TERRAIN:Readonly<Record<import('./types.ts').RobotType,Readonly<Record<Ground,TerrainGrade>>>>={
  NORMAL: {GRASS:'B',CLIFF:'C',DESERT:'C',WATER:'D',VOLCANO:'D',ICE:'D'},
  FIGHTER:{GRASS:'B',CLIFF:'B',DESERT:'C',WATER:'D',VOLCANO:'B',ICE:'C'},
  SEARCHER:{GRASS:'A',CLIFF:'C',DESERT:'B',WATER:'C',VOLCANO:'D',ICE:'B'},
  DIVER:  {GRASS:'B',CLIFF:'D',DESERT:'C',WATER:'A',VOLCANO:'D',ICE:'B'},
  MULTI:  {GRASS:'B',CLIFF:'B',DESERT:'B',WATER:'B',VOLCANO:'B',ICE:'B'},
  HUNTER: {GRASS:'A',CLIFF:'A',DESERT:'B',WATER:'C',VOLCANO:'C',ICE:'C'},
  DASH:   {GRASS:'A',CLIFF:'C',DESERT:'A',WATER:'D',VOLCANO:'C',ICE:'D'}
};
export function terrainGrade(chassis:import('./types.ts').RobotType,ground:Ground):TerrainGrade{
  return ROBOT_TERRAIN[chassis][ground];
}
export function terrainTroubleChance(grade:TerrainGrade):number{
  return ({A:.015,B:.065,C:.13,D:.23} as const)[grade];
}
export function terrainEnergyCost(grade:TerrainGrade,ground:Ground):number{
  const base=({A:5,B:6,C:8,D:11} as const)[grade];
  return base+(ground==='ICE'||ground==='VOLCANO'?4:0);
}
export function terrainTravelPenalty(grade:TerrainGrade):number{
  return ({A:0,B:0,C:1,D:2} as const)[grade];
}
