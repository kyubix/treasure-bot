import type {BoardLayout,TileType} from './types.ts';
import {GALLERY_SLOT_ORDER} from './player-palette.ts';

/** Original-inspired SPECIAL-cell placement is provisional. Gallery groups
 * are user confirmed: two tiles for each color in order B,G,Y,M. */
export const GALLERY_COUNTS=[3,4,5] as const;
export function isGalleryCount(v:unknown):v is 3|4|5{
 return v===3||v===4||v===5;
}
export function generateBoardLayout(count:3|4|5):BoardLayout{
 const tiles:TileType[]=['START'],galleryNumbers:(number|null)[]=[null],
       gallerySlots:(1|2|3|4|null)[]=[null];
 const add=(type:TileType,number:number|null=null,slot:1|2|3|4|null=null)=>{
  tiles.push(type);galleryNumbers.push(number);gallerySlots.push(slot);
 };
 for(let number=1;number<=count;number++){
  for(const slot of GALLERY_SLOT_ORDER){add('GALLERY',number,slot);add('GALLERY',number,slot);}
  add(number%2?'SHOP':'EVENT');
  if(number%3===0)add('SUPPORT');
 }
 return {galleryCount:count,tiles,galleryNumbers,gallerySlots};
}
