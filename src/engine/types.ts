export type TileType = 'START' | 'SHOP' | 'GALLERY' | 'EVENT' | 'SUPPORT' | 'PLAIN';
export type Terrain = 'RUINS' | 'FOREST' | 'COAST';
export type RobotType = 'NORMAL' | 'FIGHTER' | 'SEARCHER' | 'DIVER' | 'MULTI' | 'HUNTER' | 'DASH';
export interface RobotStats { energy: number; walk: number; search: number; battle: number }
export interface RobotMission { terrain: Terrain; remaining: number }
export interface Robot { chassis: RobotType; energy: number; mission: RobotMission | null }
export interface Treasure { id: string; name: string; value: number; category: string }
export interface Player {
  id: string; name: string; color: string; isBot: boolean; position: number;
  gold: number; gateCards: number; robot: Robot; inventory: Treasure[];
}
export interface Gallery { tile: number; ownerId: string | null; displayed: Treasure[] }
export interface GameLog { id: number; message: string; turn: number }
export interface GameState {
  code: string; hostId: string; phase: 'lobby' | 'playing' | 'finished';
  players: Player[]; galleries: Gallery[]; currentPlayerIndex: number;
  turn: number; version: number; rolled: boolean; dice: [number, number] | null;
  winnerId: string | null; logs: GameLog[];
}
export type GameAction =
  | { type: 'START'; bots: number }
  | { type: 'ROLL' }
  | { type: 'END_TURN' }
  | { type: 'CLAIM_GALLERY' }
  | { type: 'DISPLAY_TREASURE'; treasureId: string }
  | { type: 'SEND_ROBOT'; terrain: Terrain };
export interface GameRequest { token: string; expectedVersion: number; action: GameAction }
export type PublicPlayer = Omit<Player, never>;
export type PublicState = GameState & { yourId: string };
export const TILES: TileType[] = [
  'START','PLAIN','SHOP','PLAIN','GALLERY','EVENT','PLAIN',
  'SUPPORT','GALLERY','PLAIN','SHOP','PLAIN','GALLERY','EVENT',
  'SUPPORT','PLAIN','GALLERY','SHOP','PLAIN','EVENT','PLAIN',
  'GALLERY','SUPPORT','PLAIN','SHOP','PLAIN','GALLERY','EVENT'
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
