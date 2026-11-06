/** Perimeter scenery zones for the original procedural board.
 * These are temporary environments, not maps/assets extracted from the PS1 game.
 * Drawing code uses fractional position to keep the scenery continuous during walking. */
export type BoardBiome='meadow'|'forest'|'cliffs'|'coast'|'desert'|'volcano'|'ice';
export const BOARD_BIOMES:readonly BoardBiome[]=[
  'meadow','meadow','meadow','meadow',
  'forest','forest','forest','forest',
  'cliffs','cliffs','cliffs','cliffs',
  'coast','coast','coast','coast',
  'desert','desert','desert','desert',
  'volcano','volcano','volcano','volcano',
  'ice','ice','ice','ice'
] as const;
export const BOARD_BIOME_PALETTE:Record<BoardBiome,{
  sky:number;horizon:number;far:number;mid:number;near:number;
}> = {
  meadow:{sky:0xaadce9,horizon:0xf1edbe,far:0x9bbb99,mid:0x76a889,near:0x3b795f},
  forest:{sky:0x90d7cb,horizon:0xd2ebba,far:0x6ea89b,mid:0x498d70,near:0x226d50},
  cliffs:{sky:0xa2d3e7,horizon:0xe1d8bd,far:0xadb3a5,mid:0x8e9687,near:0x637a72},
  coast:{sky:0x9bdfee,horizon:0xf8e4ba,far:0x81cad2,mid:0x6bb8bb,near:0x389297},
  desert:{sky:0xf3cf98,horizon:0xffe8ab,far:0xe2bd81,mid:0xd6a468,near:0x987c57},
  volcano:{sky:0xe1aaa0,horizon:0xe5b98f,far:0x997d85,mid:0x74616b,near:0x543e50},
  ice:{sky:0xbfdcf1,horizon:0xe7f3f6,far:0xbcdfe9,mid:0x86bccc,near:0x639bad}
};
export function wrapTile(position:number):number{
  if(!Number.isFinite(position))return 0;
  return ((Math.floor(position)%BOARD_BIOMES.length)+BOARD_BIOMES.length)%BOARD_BIOMES.length;
}
export function boardScenery(position:number):{biome:BoardBiome;next:BoardBiome;transition:number;travel:number}{
  const integer=Math.floor(position);
  const biome=BOARD_BIOMES[wrapTile(integer)];
  const next=BOARD_BIOMES[wrapTile(integer+1)];
  const phase=Number.isFinite(position)?position-integer:0;
  return {biome,next,transition:biome===next?0:Math.max(0,Math.min(1,(phase-.35)/.65)),
    travel:Number.isFinite(position)?position:0};
}
export function relativeParallax(position:number,rate:number,cycle:number):number{
  if(!Number.isFinite(position)||cycle<=0)return 0;
  return ((position*rate)%cycle+cycle)%cycle;
}
