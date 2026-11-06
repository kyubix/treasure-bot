import {TILES} from './types.ts';
import type {GameState,Gallery,Treasure} from './types.ts';

/**
 * PROVISIONAL five-number board layout.
 * Twenty GALLERY spaces are split into five contiguous groups of four,
 * so a Gallery number can appear on several neighboring board spaces.
 * The authentic game-specific number-to-tile placement is NOT verified.
 */
export const GALLERY_CAPACITY=10;
export const GALLERY_COUNT=5;
export const GALLERY_COLORS:Record<number,string>={
  1:'#75d9eb',2:'#c6a1e9',3:'#ffd17d',4:'#8fe4ab',5:'#f3a5c4'
};
const galleryTiles=TILES.flatMap((type,i)=>type==='GALLERY'?[i]:[]);
export const GALLERY_TILE_NUMBERS:readonly (number|null)[]=TILES.map((type,tile)=>{
  if(type!=='GALLERY')return null;
  const ordinal=galleryTiles.indexOf(tile);
  return Math.min(GALLERY_COUNT,Math.floor(ordinal/(galleryTiles.length/GALLERY_COUNT))+1);
});
export const GALLERY_NUMBERS=Array.from({length:GALLERY_COUNT},(_,i)=>i+1);

export function galleryNumberAt(tile:number):number|null{
  return Number.isInteger(tile)?GALLERY_TILE_NUMBERS[tile]??null:null;
}
export function galleryTile(number:number):number{
  if(!Number.isInteger(number)||number<1||number>GALLERY_COUNT)
    throw new Error('Unknown Gallery number.');
  return galleryTiles.find(tile=>galleryNumberAt(tile)===number)!;
}
export function newGalleries():Gallery[]{
  return GALLERY_NUMBERS.map(number=>({
    number,tile:galleryTile(number),displaysByPlayerId:{}
  }));
}
export function playerDisplay(gallery:Gallery,playerId:string):Treasure[]{
  return gallery.displaysByPlayerId[playerId]??[];
}
export function galleryForTile(state:GameState,tile:number):Gallery|null{
  const number=galleryNumberAt(tile);
  return number===null?null:state.galleries.find(g=>g.number===number)??null;
}
export function galleryForNumber(state:GameState,number:number):Gallery|null{
  return Number.isInteger(number)&&number>=1&&number<=GALLERY_COUNT?
    state.galleries.find(g=>g.number===number)??null:null;
}

/** Import old single-owner room displays losslessly, without duplicating gold. */
export function ensureGallerySchema(state:GameState):boolean{
  const existing=state.galleries as (Gallery & {
    ownerId?:string|null;displayed?:Treasure[];tile:number;number?:number
  })[];
  if(existing.length===GALLERY_COUNT &&
     existing.every(g=>Number.isInteger(g.number)&&g.displaysByPlayerId &&
       typeof g.displaysByPlayerId==='object'&&!Array.isArray(g.displaysByPlayerId)))
    return false;
  const next=newGalleries();
  for(const old of existing){
    const number=old.number??galleryNumberAt(old.tile);
    if(!number)continue;
    const dest=next[number-1];
    const contributions=old.displaysByPlayerId??(
      old.ownerId&&Array.isArray(old.displayed)?{[old.ownerId]:old.displayed}:{}
    );
    for(const [id,items] of Object.entries(contributions)){
      const player=state.players.find(p=>p.id===id);
      if(!player||!Array.isArray(items))continue;
      const slots=dest.displaysByPlayerId[id]??(dest.displaysByPlayerId[id]=[]);
      for(const item of items){
        if(slots.length<GALLERY_CAPACITY)slots.push(item);
        else{
          // Older rooms used twenty independent 10-slot rows. Any merged
          // overflow remains with the rightful owner, never destroyed/sold.
          player.inventory.push(item);
        }
      }
    }
  }
  state.galleries=next;
  return true;
}
export function gallerySlotTotal(state:GameState,playerId:string):number{
  return state.galleries.reduce((sum,g)=>sum+playerDisplay(g,playerId).length,0);
}
