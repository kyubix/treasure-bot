import type { Expedition, IslandSpot } from './island.ts';
export type TileType = 'START' | 'SHOP' | 'GALLERY' | 'EVENT' | 'SUPPORT' | 'PLAIN';
export type Terrain = 'RUINS' | 'FOREST' | 'COAST';
export type RobotType = 'NORMAL' | 'FIGHTER' | 'SEARCHER' | 'DIVER' | 'MULTI' | 'HUNTER' | 'DASH';
export interface RobotStats { energy: number; walk: number; search: number; battle: number }
export type RobotMission = Expedition
export type PartSlot = 'HEAD' | 'BODY' | 'ARM' | 'LEG';
export interface RobotParts { HEAD:boolean; BODY:boolean; ARM:boolean; LEG:boolean }
export interface Robot { chassis: RobotType; energy: number; mission: RobotMission | null; cargo: Treasure[]; parts?: RobotParts }
export interface Treasure { id: string; name: string; value: number; category: string }
export interface Player {
  id: string; name: string; color: string; isBot: boolean; position: number;
  gold: number; gateCards: number; repairKits?: number; robot: Robot; inventory: Treasure[];
  /** Treasure just delivered by robot; awaiting an explicit Gallery or sale choice. */
  pendingGalleryTreasureIds?:string[];
}
/** A numbered Gallery contains an independent 10-slot row for EVERY player. */
export interface Gallery {
  number:number;
  /** Canonical first board tile of this number; other tiles share the ID. */
  tile:number;
  displaysByPlayerId:Record<string,Treasure[]>;
}
export interface GameLog { id: number; message: string; turn: number }
export interface GameState {
  code: string; hostId: string; phase: 'lobby' | 'playing' | 'finished';
  players: Player[]; galleries: Gallery[]; currentPlayerIndex: number;
  turn: number; version: number; rolled: boolean; dice: [number, number] | null;
  winnerId: string | null; logs: GameLog[]; islandSpots: IslandSpot[]; shopAccess: boolean;
  /** The route is paused at a shop until its owner chooses to enter or pass. */
  shopOffer?: boolean; pendingSteps?: number; shopTile?: number | null;
  /** Visible, server-owned CPU action; changes at each automation tick. */
  botEvent?: {playerId:string; kind:'SEND'|'ROLL'|'ENTER_SHOP'|'BUY'|'SKIP_SHOP'|'LEAVE_SHOP'|'END'; step:number};
}
export type GameAction =
  | { type: 'START'; bots: number }
  | { type: 'ROLL' }
  | { type: 'END_TURN' }
  | { type: 'BUY_GATE_CARD' }
  | { type: 'CLOSE_SHOP' }
  | { type: 'ENTER_SHOP' }
  | { type: 'SKIP_SHOP' }
  | { type: 'BUY_SUPPLY'; supply: 'ENERGY_CELL' | 'REPAIR_KIT' }
  | { type: 'SELL_TREASURE'; treasureId: string }
  | { type: 'USE_REPAIR_KIT' }
  | { type: 'BUY_PART'; slot: PartSlot }
  | { type: 'RETURN_ROBOT' }
  | { type: 'DISPLAY_TREASURE'; treasureId: string; galleryNumber: number; replaceTreasureId?:string }
  | { type: 'SELL_INCOMING_TREASURE'; treasureId:string }
  | { type: 'REARRANGE_GALLERY'; galleryNumber:number; fromIndex:number; toIndex:number }
  | { type: 'SEND_ROBOT'; siteId: string };
export interface GameRequest { token: string; expectedVersion: number; action: GameAction }
export type PublicPlayer = Omit<Player, never>;
export type PublicState = GameState & { yourId: string };
// PROVISIONAL perimeter geometry; colored galleries are assigned at match start.
export const TILES: TileType[] = [
  'START','GALLERY','GALLERY','SHOP','GALLERY','GALLERY','GALLERY',
  'GALLERY','EVENT','GALLERY','GALLERY','GALLERY','SHOP','GALLERY',
  'GALLERY','GALLERY','GALLERY','SUPPORT','GALLERY','GALLERY','GALLERY',
  'SHOP','GALLERY','GALLERY','EVENT','GALLERY','GALLERY','SUPPORT'
];
export const ROBOTS: Record<RobotType, RobotStats> = {
  NORMAL: { energy: 50, walk: 50, search: 50, battle: 50 },
  FIGHTER: { energy: 100, walk: 35, search: 20, battle: 100 },
  SEARCHER: { energy: 55, walk: 80, search: 100, battle: 20 },
  DIVER: { energy: 130, walk: 25, search: 50, battle: 50 },
  MULTI: { energy: 35, walk: 70, search: 75, battle: 75 },
  HUNTER: { energy: 70, walk: 70, search: 35, battle: 80 },
  DASH: { energy: 80, walk: 100, search: 40, battle: 35 }
};
