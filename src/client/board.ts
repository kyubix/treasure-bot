import Phaser from 'phaser';
import { TILES } from '../engine/types.ts';
import type { GameState, TileType } from '../engine/types.ts';

const TILE_COLORS:Record<TileType,number>={
  START:0x59cbbf,SHOP:0xf2be75,GALLERY:0xb7a1f2,EVENT:0xf18b9c,SUPPORT:0x82b8e9,PLAIN:0x283754
};
const TILE_ICONS:Record<TileType,string>={START:'★',SHOP:'⌂',GALLERY:'◆',EVENT:'!',SUPPORT:'+',PLAIN:'·'};
function cellFor(i:number):[number,number]{
  if(i<8)return [i,0];
  if(i<14)return [7,i-7];
  if(i<22)return [21-i,7];
  return [0,28-i];
}

export class BoardScene extends Phaser.Scene {
  private match:GameState|null=null;
  private drawing?:Phaser.GameObjects.Container;
  constructor(){super('Board');}
  create():void {
    this.scale.on('resize',()=>this.paint());
    this.paint();
  }
  setMatch(state:GameState):void {this.match=state;if(this.sys.isActive())this.paint();}
  private paint():void {
    const {width,height}=this.scale;
    if(width<10||height<10)return;
    this.drawing?.destroy(true);
    const parent=this.add.container(0,0);
    this.drawing=parent;
    const cellSize=Math.min((width-28)/8,(height-28)/8);
    const startX=(width-8*cellSize)/2;
    const startY=(height-8*cellSize)/2;
    const centerX=width/2,centerY=height/2;
    const bg=this.add.graphics();
    bg.fillStyle(0x1a2941,1).fillRoundedRect(startX+cellSize*1.05,startY+cellSize*1.05,5.9*cellSize,5.9*cellSize,Math.max(8,cellSize*.35));
    bg.lineStyle(2,0x3b5d70,.7).strokeRoundedRect(startX+cellSize*1.25,startY+cellSize*1.25,5.5*cellSize,5.5*cellSize,Math.max(8,cellSize*.35));
    parent.add(bg);
    const deco=this.add.graphics();
    deco.fillStyle(0x26585c,.4).fillCircle(centerX,centerY+cellSize*.9,cellSize*1.85);
    deco.fillStyle(0x2d7776,.3).fillCircle(centerX-cellSize*.9,centerY-cellSize*.5,cellSize*1.3);
    parent.add(deco);
    const centerLabel=this.add.text(centerX,centerY-cellSize*.65,'TREASURE\nISLAND',{
      fontSize:`${Math.max(16,cellSize*.4)}px`,fontFamily:'sans-serif',fontStyle:'bold',align:'center',color:'#d8eceb',lineSpacing:6
    }).setOrigin(.5);
    parent.add(centerLabel);
    const centerSub=this.add.text(centerX,centerY+cellSize*.1,'✦  ✦  ✦',{
      fontSize:`${Math.max(10,cellSize*.3)}px`,color:'#f3c47b'
    }).setOrigin(.5);
    parent.add(centerSub);
    for(let i=0;i<TILES.length;i++){
      const [col,row]=cellFor(i); const x=startX+col*cellSize,y=startY+row*cellSize;
      const box=this.add.graphics();
      const isCurrent=this.match?.players.some(p=>p.position===i && p.id===this.match?.players[this.match?.currentPlayerIndex]?.id);
      box.fillStyle(TILE_COLORS[TILES[i]],1).fillRoundedRect(x+2,y+2,cellSize-4,cellSize-4,Math.max(3,cellSize*.12));
      if(isCurrent){box.lineStyle(3,0xffe6a2,1).strokeRoundedRect(x+2,y+2,cellSize-4,cellSize-4,Math.max(3,cellSize*.12));}
      parent.add(box);
      const icon=this.add.text(x+cellSize/2,y+cellSize*.40,TILE_ICONS[TILES[i]],{
        fontSize:`${Math.max(13,cellSize*.35)}px`,fontFamily:'sans-serif',fontStyle:'bold',color:TILES[i]==='PLAIN'?'#6e89a9':'#14223a'
      }).setOrigin(.5);
      parent.add(icon);
      const no=this.add.text(x+cellSize*.11,y+cellSize*.85,String(i+1),{fontSize:`${Math.max(8,cellSize*.17)}px`,color:'#071626'});
      parent.add(no);
      if(this.match) {
        const players=this.match.players.filter(p=>p.position===i);
        players.forEach((p,j)=>{
          const px=x+cellSize*(.68-j%2*.24);const py=y+cellSize*(.70-Math.floor(j/2)*.26);
          const pawn=this.add.circle(px,py,Math.max(4,cellSize*.11),Phaser.Display.Color.HexStringToColor(p.color).color);
          pawn.setStrokeStyle(2,0x102033);
          parent.add(pawn);
        });
        const gallery=this.match.galleries.find(g=>g.tile===i);
        if(gallery?.ownerId) {
          const owner=this.match.players.find(p=>p.id===gallery.ownerId);
          if(owner){ const marker=this.add.rectangle(x+cellSize*.86,y+cellSize*.18,Math.max(6,cellSize*.14),Math.max(6,cellSize*.14),Phaser.Display.Color.HexStringToColor(owner.color).color);parent.add(marker); }
        }
      }
    }
  }
}

export function mountBoard(element:HTMLElement):{update(state:GameState):void;destroy():void}{
  const scene=new BoardScene();
  const game=new Phaser.Game({
    type:Phaser.AUTO,
    parent:element,
    backgroundColor:'#101a2e',
    scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:600,height:600},
    render:{pixelArt:false,antialias:true},
    scene:[scene]
  });
  return {update(state){scene.setMatch(state);},destroy(){game.destroy(true);}};
}
