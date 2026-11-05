import Phaser from 'phaser';
import { TILES } from '../engine/types.ts';
import { ISLAND_TERRAIN, ISLAND_SIZE, expeditionProgress } from '../engine/island.ts';
import type { GameState, TileType } from '../engine/types.ts';
import type { Ground } from '../engine/island.ts';

const TILE_COLORS:Record<TileType,number>={
  START:0xf8d578,SHOP:0xffbc73,GALLERY:0xffebbc,EVENT:0xffa49a,SUPPORT:0x9ee2c9,PLAIN:0xe3e4c2
};
const TILE_ICONS:Record<TileType,string>={START:'★',SHOP:'⌂',GALLERY:'◆',EVENT:'!',SUPPORT:'+',PLAIN:'·'};
const TERRAIN_COLORS:Record<Ground,number>={GRASS:0x87c478,CLIFF:0x98a99d,DESERT:0xf4d291,WATER:0x75c5d6,VOLCANO:0xc77e71,ICE:0xc0e8f3};
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
    const shore=this.add.graphics();
    shore.fillGradientStyle(0x67c3cc,0x9bdcd0,0x2e8ca6,0x65b4c0,1);
    shore.fillRoundedRect(startX+cellSize*.99,startY+cellSize*.99,cellSize*6.03,cellSize*6.03,cellSize*.62);
    shore.fillStyle(0xf0e2a6,1);
    shore.fillRoundedRect(startX+cellSize*1.18,startY+cellSize*1.18,cellSize*5.64,cellSize*5.64,cellSize*.7);
    shore.fillStyle(0x6cad72,1);
    shore.fillRoundedRect(startX+cellSize*1.36,startY+cellSize*1.34,cellSize*5.27,cellSize*5.35,cellSize*.58);
    parent.add(shore);
    for(let y=0;y<ISLAND_SIZE;y++)for(let x=0;x<ISLAND_SIZE;x++){
      const px=innerX+x*innerStep,py=innerY+y*innerStep;
      const ground=ISLAND_TERRAIN[y][x];
      const g=this.add.graphics();
      g.fillStyle(0x2b706b,.19);
      g.fillRoundedRect(px+1,py+4,innerStep-2,innerStep-5,Math.max(4,cellSize*.12));
      g.fillStyle(TERRAIN_COLORS[ground],1);
      g.fillRoundedRect(px+1,py+1,innerStep-2,innerStep-7,Math.max(4,cellSize*.12));
      if(ground==='GRASS'){
        g.fillStyle(0x398f61,.5);
        g.fillCircle(px+innerStep*.22,py+innerStep*.25,innerStep*.1);
        g.fillCircle(px+innerStep*.32,py+innerStep*.22,innerStep*.06);
      } else if(ground==='WATER'){
        g.lineStyle(1.5,0xebffff,.7);
        g.lineBetween(px+innerStep*.2,py+innerStep*.37,px+innerStep*.71,py+innerStep*.37);
      } else if(ground==='CLIFF'){
        g.fillStyle(0x627d77,.6);
        g.fillTriangle(px+innerStep*.1,py+innerStep*.8,px+innerStep*.47,py+innerStep*.16,px+innerStep*.75,py+innerStep*.8);
      } else if(ground==='ICE'){
        g.lineStyle(2,0xf0ffff,.8);
        g.lineBetween(px+innerStep*.22,py+innerStep*.76,px+innerStep*.74,py+innerStep*.24);
      } else if(ground==='DESERT'){
        g.lineStyle(2,0xd8a568,.8);
        g.beginPath();g.arc(px+innerStep*.45,py+innerStep*.67,innerStep*.2,Math.PI,0);g.strokePath();
      } else {
        g.fillStyle(0x9a4c4a,.7);
        g.fillTriangle(px+innerStep*.2,py+innerStep*.75,px+innerStep*.55,py+innerStep*.16,px+innerStep*.83,py+innerStep*.75);
      }
      parent.add(g);
      const spot=root?.islandSpots.find(s=>s.x===x&&s.y===y&&s.kind!=='LOCATION')??root?.islandSpots.find(s=>s.x===x&&s.y===y);
      if(spot){
        const icon=spot.depleted?'':spot.kind==='KEEPER'?'⚔':spot.kind==='TREASURE'?'✦':'';
        if(icon){
          const medallion=this.add.circle(px+innerStep*.5,py+innerStep*.46,Math.max(9,cellSize*.20),spot.kind==='KEEPER'?0x684765:0xf8d15e)
            .setStrokeStyle(2,0xfff6d3);parent.add(medallion);
          addText(px+innerStep*.5,py+innerStep*.44,icon,Math.max(11,cellSize*.30),spot.kind==='KEEPER'?'#fff2f1':'#674c23');
        }
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
        const color=Phaser.Display.Color.HexStringToColor(p.color).color;
        const robot=this.add.graphics();
        robot.fillStyle(0x183e4e,.4).fillEllipse(x,y+cellSize*.15,cellSize*.44,cellSize*.13);
        robot.fillStyle(color).fillRoundedRect(x-cellSize*.17,y-cellSize*.18,cellSize*.34,cellSize*.35,cellSize*.1);
        robot.lineStyle(2,0xffffff,.8).strokeRoundedRect(x-cellSize*.17,y-cellSize*.18,cellSize*.34,cellSize*.35,cellSize*.1);
        robot.fillStyle(0x243c46).fillCircle(x-cellSize*.075,y-cellSize*.06,cellSize*.028);
        robot.fillCircle(x+cellSize*.075,y-cellSize*.06,cellSize*.028);
        parent.add(robot);
      });
    }
    for(let i=0;i<TILES.length;i++){
      const [col,row]=cellFor(i);
      const x=startX+col*cellSize,y=startY+row*cellSize;
      const isCurrent=root?.players.some(p=>p.position===i&&p.id===root.players[root.currentPlayerIndex]?.id);
      const g=this.add.graphics();
      g.fillStyle(0x315f6c,.55).fillRoundedRect(x+2,y+5,cellSize-4,cellSize-5,Math.max(4,cellSize*.15));
      const gallery=root?.galleries.find(g=>g.tile===i);
      const owner=gallery?.ownerId?root?.players.find(p=>p.id===gallery.ownerId):null;
      const baseColor=owner?Phaser.Display.Color.HexStringToColor(owner.color).color:TILE_COLORS[TILES[i]];
      g.fillStyle(baseColor,1).fillRoundedRect(x+2,y+2,cellSize-4,cellSize-9,Math.max(4,cellSize*.15));
      g.fillStyle(0xffffff,.27).fillRoundedRect(x+5,y+5,cellSize-10,Math.max(3,cellSize*.08),3);
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
  const game=new Phaser.Game({type:Phaser.AUTO,parent:element,backgroundColor:'#458f9f',
    scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:600,height:600},
    render:{pixelArt:false,antialias:true},scene:[scene]});
  return {update(state){scene.setMatch(state);},select(id){scene.selectSpot(id);},destroy(){game.destroy(true);}};
}
