import {TILES} from './types.ts';
import {galleryNumberAt,GALLERY_TILE_NUMBERS} from './gallery.ts';

/** Canonical P1..P4 defaults. Saved player colors are never overwritten. */
export const PLAYER_COLORS=['#2489ea','#44c767','#e254c5','#f5cf32'] as const;
/** Visible tile order BLUE, GREEN, YELLOW, MAGENTA, not turn order. */
export const GALLERY_SLOT_ORDER=[1,2,4,3] as const;

/** Equal distribution per gallery number. Groups of 4 give one per slot;
 * groups of 8 (future larger maps) give two per slot.
 */
export function galleryPlayerSlotAt(tile:number,state?:import('./types.ts').GameState|null):1|2|3|4|null{
 if(state?.board)return state.board.gallerySlots[tile]??null;
 const number=galleryNumberAt(tile);
 if(number===null)return null;
 const total=GALLERY_TILE_NUMBERS.filter(n=>n===number).length;
 const ordinal=GALLERY_TILE_NUMBERS.slice(0,tile).filter(n=>n===number).length;
 if(!total)return null;
 return GALLERY_SLOT_ORDER[Math.min(3,Math.floor(ordinal*4/total))];
}
export function galleryPlayerColorAt(tile:number,state?:import('./types.ts').GameState|null):string|null{
 const slot=galleryPlayerSlotAt(tile,state);
 return slot===null?null:PLAYER_COLORS[slot-1];
}
/** Special tiles use separate neutral or semantic surfaces and symbols;
 * no Gallery number is interpreted as player ownership. */
const SPECIAL_COLORS:Record<(typeof TILES)[number],string>={
 START:'#f7e6a5',SHOP:'#e8d5ae',GALLERY:'#e9f1f3',
 EVENT:'#b9dcf8',SUPPORT:'#b8ead6',PLAIN:'#d7e3e8'
};
export function boardTileBaseColor(tile:number,state?:import('./types.ts').GameState|null):string{
 const tiles=state?.board?.tiles??TILES;
 if(!Number.isInteger(tile)||tile<0||tile>=tiles.length)
   throw new RangeError('Invalid board tile index');
 return galleryPlayerColorAt(tile,state)??SPECIAL_COLORS[tiles[tile]];
}
