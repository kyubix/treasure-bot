import Phaser from 'phaser';
import { TILES } from '../engine/types.ts';
import { ISLAND_TERRAIN, ISLAND_SIZE, expeditionProgress } from '../engine/island.ts';
import type { GameState, TileType } from '../engine/types.ts';
import type { Ground } from '../engine/island.ts';

const TILE_COLORS:Record<TileType,number>={
  START:0x59cbbf,SHOP:0xf2be75,GALLERY:0xb7a1f2,EVENT:0xf18b9c,SUPPORT:0x82b8e9,PLAIN:0x283754
};
const TILE_ICONS:Record<TileType,string>={START:'★',SHOP:'⌂',GALLERY:'◆',EVENT:'!',SUPPORT:'+',PLAIN:'·'};
const TERRAIN_COLORS:Record<Ground,number>={GRASS:0x407e64,CLIFF:0x777b89,DESERT:0xbca066,WATER:0x3e829f,VOLCANO:0xa4645d,ICE:0x91bdd0};
function cellFor(i:number):[number,number]{
  if(i<8)return [i,0];
  if(i<14)return [7,i-7];
  if(i<22)return [21-i,7];
  return [0,28-i];
}

export class BoardScene extends Phaser.Scene {
  private match:GameState|null=null;
  private drawing?:Phaser.GameObjects.Container;
  private onSelect:(id:string)=>void;
  private selectedSpot:string|null=null;
  constructor(onSelect:(id:string)=>void){super('Board');this.onSelect=onSelect;}
  create():void {this.scale.on('resize',()=>this.paint());this.paint();}
  setMatch(state:GameState):void {this.match=state;if(this.sys.isActive())this.paint();}
  selectSpot(id:string):void{this.selectedSpot=id;if(this.sys.isActive())this.paint();}
  private paint():void {
    const {width,height}=this.scale;
    if(width<10||height<10)return;
    this.drawing?.destroy(true);
    const parent=this.add.container(0,0);
    this.drawing=parent;
    const cellSize=Math.min((width-28)/8,(height-28)/8);
    const startX=(width-8*cellSize)/2;
    const startY=(height-8*cellSize)/2;
    const addText=(x:number,y:number,text:string,size:number,color='#fff')=>{
      const label=this.add.text(x,y,text,{fontFamily:'sans-serif',fontStyle:'bold',fontSize:`${size}px`,color}).setOrigin(.5);
      parent.add(label);return label;
    };
    // A real second play-space: treasure exploration coordinates inside the street perimeter.
    const innerStep=cellSize*.94;
    const innerX=startX+cellSize*1.65;
    const innerY=startY+cellSize*1.65;
    const root=this.match;
    for(let y=0;y<ISLAND_SIZE;y++)for(let x=0;x<ISLAND_SIZE;x++){
      const px=innerX+x*innerStep,py=innerY+y*innerStep;
      const bg=this.add.rectangle(px,py,innerStep-2,innerStep-2,TERRAIN_COLORS[ISLAND_TERRAIN[y][x]],.9)
        .setOrigin(0,0);
      parent.add(bg);
      const spot=root?.islandSpots.find(s=>s.x===x&&s.y===y);
      if(spot){
        const icon=spot.depleted?'·':spot.kind==='KEEPER'?'⚔':spot.kind==='TREASURE'?'◆':'?';
        addText(px+innerStep*.5,py+innerStep*.46,icon,Math.max(11,cellSize*.30),spot.depleted?'#a9b8c3':spot.kind==='KEEPER'?'#ffd78b':'#effaf7');
        if(this.selectedSpot===spot.id){
          const halo=this.add.rectangle(px+innerStep/2,py+innerStep/2,innerStep-2,innerStep-2)
            .setStrokeStyle(3,0xffe49a).setFillStyle(0,0);
          parent.add(halo);
        }
        const hit=this.add.rectangle(px+innerStep/2,py+innerStep/2,innerStep-2,innerStep-2,0,0)
          .setInteractive({useHandCursor:true});
        hit.on('pointerdown',()=>{this.selectedSpot=spot.id;this.onSelect(spot.id);this.paint();});
        parent.add(hit);
      }
    }
    if(root){
      root.players.forEach(p=>{
        const m=p.robot.mission;
        if(!m)return;
        const site=root.islandSpots.find(s=>s.id===m.siteId);
        if(!site)return;
        const frac=m.phase==='OUTBOUND'?expeditionProgress(m):m.phase==='SEARCH'?1:1-expeditionProgress(m);
        const gx=2+(site.x-2)*frac,gy=2+(site.y-2)*frac;
        const x=innerX+(gx+.5)*innerStep,y=innerY+(gy+.5)*innerStep;
        const dot=this.add.circle(x,y,Math.max(5,cellSize*.14),Phaser.Display.Color.HexStringToColor(p.color).color).setStrokeStyle(2,0x141e2c);
        parent.add(dot);
      });
    }
    for(let i=0;i<TILES.length;i++){
      const [col,row]=cellFor(i);
      const x=startX+col*cellSize,y=startY+row*cellSize;
      const isCurrent=root?.players.some(p=>p.position===i&&p.id===root.players[root.currentPlayerIndex]?.id);
      const g=this.add.graphics();
      g.fillStyle(TILE_COLORS[TILES[i]],1).fillRoundedRect(x+2,y+2,cellSize-4,cellSize-4,Math.max(3,cellSize*.12));
      if(isCurrent)g.lineStyle(3,0xffe6a2,1).strokeRoundedRect(x+2,y+2,cellSize-4,cellSize-4,Math.max(3,cellSize*.12));
      parent.add(g);
      addText(x+cellSize*.5,y+cellSize*.41,TILE_ICONS[TILES[i]],Math.max(13,cellSize*.35),'#16253a');
      if(root){
        const gallery=root.galleries.find(g=>g.tile===i);
        if(gallery?.ownerId){
          const owner=root.players.find(p=>p.id===gallery.ownerId);
          if(owner){const rect=this.add.rectangle(x+cellSize*.85,y+cellSize*.18,Math.max(5,cellSize*.15),Math.max(5,cellSize*.15),Phaser.Display.Color.HexStringToColor(owner.color).color);parent.add(rect);}
        }
        root.players.filter(p=>p.position===i).forEach((p,j)=>{
          const pawn=this.add.circle(x+cellSize*(.66-(j%2)*.25),y+cellSize*(.69-Math.floor(j/2)*.25),Math.max(4,cellSize*.11),Phaser.Display.Color.HexStringToColor(p.color).color).setStrokeStyle(2,0x102033);
          parent.add(pawn);
        });
      }
    }
  }
}
export function mountBoard(element:HTMLElement,onSelect:(id:string)=>void):{update(state:GameState):void;select(id:string):void;destroy():void}{
  const scene=new BoardScene(onSelect);
  const game=new Phaser.Game({type:Phaser.AUTO,parent:element,backgroundColor:'#101a2e',
    scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:600,height:600},
    render:{pixelArt:false,antialias:true},scene:[scene]});
  return {update(state){scene.setMatch(state);},select(id){scene.selectSpot(id);},destroy(){game.destroy(true);}};
}
