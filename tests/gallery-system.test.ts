import {describe,it,expect} from 'vitest';
import {newGame,createPlayer,addGuest,applyAction,netWorth} from '../src/engine/game.ts';
import {TILES} from '../src/engine/types.ts';
import type {GameState,Treasure} from '../src/engine/types.ts';
import {
  GALLERY_CAPACITY,GALLERY_COUNT,GALLERY_TILE_NUMBERS,galleryNumberAt,
  ensureGallerySchema,playerDisplay
} from '../src/engine/gallery.ts';

const item=(id:string,value=1000):Treasure=>({
  id,name:'Treasure '+id,value,category:'Relics'
});
function setup():GameState{
  const s=newGame('ABC123',createPlayer('a','Ada'));
  addGuest(s,createPlayer('b','Bima'));
  applyAction(s,'a',{type:'START',bots:0});
  return s;
}
describe('User-confirmed numbered Gallery System',()=>{
  it('labels every Gallery tile with provisional repeated No.1..5 mapping',()=>{
    expect(GALLERY_COUNT).toBe(5);
    expect(GALLERY_CAPACITY).toBe(10);
    expect(GALLERY_TILE_NUMBERS).toHaveLength(TILES.length);
    for(let n=1;n<=5;n++)
      expect(GALLERY_TILE_NUMBERS.filter(v=>v===n)).toHaveLength(4);
    for(let i=0;i<TILES.length;i++)
      expect(galleryNumberAt(i)!==null).toBe(TILES[i]==='GALLERY');
  });
  it('gives both players independent ten-slot collections in the same Gallery',()=>{
    const s=setup();
    for(let i=0;i<10;i++){
      for(const [id,index] of [['a',0],['b',1]] as const){
        const loot=item(id+i,150+i);
        s.players[index].inventory.push(loot);
        applyAction(s,id,{type:'DISPLAY_TREASURE',galleryNumber:1,treasureId:loot.id});
      }
    }
    expect(playerDisplay(s.galleries[0],'a')).toHaveLength(10);
    expect(playerDisplay(s.galleries[0],'b')).toHaveLength(10);
    expect(playerDisplay(s.galleries[1],'a')).toHaveLength(0);
    expect(s.players[0].inventory).toHaveLength(0);
  });
  it('lets owner choose any Gallery away from it, even off turn',()=>{
    const s=setup(),loot=item('ruby');
    s.players[1].inventory.push(loot); // current actor is a
    applyAction(s,'b',{type:'DISPLAY_TREASURE',galleryNumber:4,treasureId:loot.id});
    expect(playerDisplay(s.galleries[3],'b').map(t=>t.id)).toEqual(['ruby']);
    expect(s.players[1].position).toBe(0);
    expect(()=>applyAction(s,'a',{type:'DISPLAY_TREASURE',galleryNumber:4,treasureId:'ruby'}))
      .toThrow('Treasure not found');
  });
  it('requires replacement when full and atomically auto-sells displaced item',()=>{
    const s=setup(),p=s.players[0],g=s.galleries[1];
    g.displaysByPlayerId.a=Array.from({length:10},(_,i)=>item('old-'+i,1000));
    p.inventory.push(item('new',2200));
    const version=s.version,beforeGold=p.gold;
    expect(()=>applyAction(s,'a',{type:'DISPLAY_TREASURE',galleryNumber:2,treasureId:'new'}))
      .toThrow('Gallery is full');
    expect(s.version).toBe(version);
    expect(playerDisplay(g,'a')[0].id).toBe('old-0');
    expect(()=>applyAction(s,'a',{type:'DISPLAY_TREASURE',galleryNumber:2,
      treasureId:'new',replaceTreasureId:'not-here'})).toThrow('does not belong');
    applyAction(s,'a',{type:'DISPLAY_TREASURE',galleryNumber:2,
      treasureId:'new',replaceTreasureId:'old-0'});
    expect(g.displaysByPlayerId.a).toHaveLength(10);
    expect(g.displaysByPlayerId.a[0].id).toBe('new');
    expect(p.gold).toBe(beforeGold+600); // PROVISIONAL 60% resale
    expect(p.inventory).not.toContainEqual(item('old-0'));
    expect(p.inventory).not.toContainEqual(item('new',2200));
    expect(s.galleries.some(gallery=>Object.values(gallery.displaysByPlayerId)
      .flat().some(t=>t.id==='old-0'))).toBe(false);
    expect(()=>applyAction(s,'a',{type:'DISPLAY_TREASURE',galleryNumber:2,
      treasureId:'new',replaceTreasureId:'old-1'})).toThrow('Treasure not found');
  });
  it('allows selling only pending robot loot directly, without requiring a shop',()=>{
    const s=setup(),p=s.players[0];
    p.inventory.push(item('incoming',1900),item('old',300));
    p.pendingGalleryTreasureIds=['incoming'];
    expect(()=>applyAction(s,'a',{type:'SELL_INCOMING_TREASURE',treasureId:'old'}))
      .toThrow('Only newly returned');
    const value=netWorth(s,p),before=p.gold;
    applyAction(s,'a',{type:'SELL_INCOMING_TREASURE',treasureId:'incoming'});
    expect(p.gold).toBe(before+1140);
    expect(p.inventory.map(t=>t.id)).toEqual(['old']);
    expect(p.pendingGalleryTreasureIds).toEqual([]);
    expect(netWorth(s,p)).toBe(value-760);
    expect(()=>applyAction(s,'a',{type:'SELL_INCOMING_TREASURE',treasureId:'incoming'}))
      .toThrow('Only newly returned');
  });
  it('rearranges own displayed items only while on matching numbered tile',()=>{
    const s=setup(),p=s.players[0];
    s.galleries[2].displaysByPlayerId.a=[item('A'),item('B')];
    p.position=0;
    expect(()=>applyAction(s,'a',{type:'REARRANGE_GALLERY',
      galleryNumber:3,fromIndex:0,toIndex:1})).toThrow('Stand on a tile');
    const matching=GALLERY_TILE_NUMBERS.findIndex(n=>n===3);
    p.position=matching;
    applyAction(s,'a',{type:'REARRANGE_GALLERY',galleryNumber:3,fromIndex:0,toIndex:1});
    expect(s.galleries[2].displaysByPlayerId.a.map(t=>t.id)).toEqual(['B','A']);
    expect(()=>applyAction(s,'a',{type:'REARRANGE_GALLERY',
      galleryNumber:2,fromIndex:0,toIndex:1})).toThrow('Stand on a tile');
  });
  it('migrates old one-owner room without destroying overflow treasure',()=>{
    const s=setup();
    s.galleries=TILES.flatMap((type,i)=>type==='GALLERY'?
      [{tile:i,ownerId:'a',displayed:Array.from({length:3},(_,j)=>item(i+'-'+j))}]:[]) as unknown as GameState['galleries'];
    expect(ensureGallerySchema(s)).toBe(true);
    expect(s.galleries).toHaveLength(5);
    // Four old tiles × three items => 10 in numbered display, 2 in inventory.
    expect(playerDisplay(s.galleries[0],'a')).toHaveLength(10);
    expect(s.players[0].inventory).toHaveLength(10); // 2 overflow per number × 5
    expect(ensureGallerySchema(s)).toBe(false);
    expect(s.players[0].inventory).toHaveLength(10);
  });
});
