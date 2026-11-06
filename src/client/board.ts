import Phaser from 'phaser';
import { TILES } from '../engine/types.ts';
import { ISLAND_SIZE, ISLAND_TERRAIN, expeditionProgress } from '../engine/island.ts';
import type { GameState, TileType } from '../engine/types.ts';
import type { Ground } from '../engine/island.ts';

export type GameView = 'board' | 'world';

const TILE_ICONS:Record<TileType,string>={
  START:'★',SHOP:'⌂',GALLERY:'◆',EVENT:'!',SUPPORT:'+',PLAIN:'·'
};
const TILE_PALETTE:Record<TileType,number>={
  START:0xf7d875,SHOP:0xe5a65f,GALLERY:0xe8c99b,EVENT:0xe88c92,
  SUPPORT:0x7bcdb0,PLAIN:0xb7bb99
};
const GROUND:Record<Ground,number>={
  GRASS:0x83bf7a,CLIFF:0x778e88,DESERT:0xe5bd77,
  WATER:0x64bbca,VOLCANO:0xae6d60,ICE:0xa4d4df
};
const lighten=(hex:number,value:number):number=>{
  const c=Phaser.Display.Color.ValueToColor(hex);
  return Phaser.Display.Color.GetColor(
    Math.min(255,c.red+value),Math.min(255,c.green+value),Math.min(255,c.blue+value)
  );
};
const playerColor=(hex:string):number=>Phaser.Display.Color.HexStringToColor(hex).color;

export class BoardScene extends Phaser.Scene {
  private match:GameState|null=null;
  private drawing?:Phaser.GameObjects.Container;
  private view:GameView='board';
  private selectedSpot:string|null=null;
  private readonly onSelect:(id:string)=>void;

  constructor(onSelect:(id:string)=>void){super('Board');this.onSelect=onSelect;}
  create():void {
    this.scale.on('resize',()=>this.paint());
    this.paint();
  }
  setMatch(state:GameState):void {
    this.match=state;
    if(this.sys.isActive())this.paint();
  }
  setView(next:GameView):void {
    if(this.view===next)return;
    this.view=next;
    if(this.sys.isActive()){
      this.paint();
      this.cameras.main.fadeIn(180,12,26,42);
    }
  }
  selectSpot(id:string):void {
    this.selectedSpot=id;
    if(this.sys.isActive())this.paint();
  }
  private label(parent:Phaser.GameObjects.Container,x:number,y:number,
    text:string,size:number,color='#ffffff',stroke=false):Phaser.GameObjects.Text {
    const obj=this.add.text(x,y,text,{
      fontFamily:'system-ui, sans-serif',fontStyle:'bold',
      fontSize:Math.round(size)+'px',color,
      align:'center',stroke:stroke?'#163044':undefined,strokeThickness:stroke?3:0
    }).setOrigin(.5);
    parent.add(obj);
    return obj;
  }
  private paint():void {
    const {width,height}=this.scale;
    if(width<10||height<10)return;
    this.drawing?.destroy(true);
    const parent=this.add.container(0,0);
    this.drawing=parent;
    if(this.view==='board')this.paintVerticalBoard(parent,width,height);
    else this.paintWorldMap(parent,width,height);
  }
  // Main gameplay screen: vertical perspective follows the active board pawn.
  // Art and road geometry are original placeholders, NOT ripped PS1 assets.
  private paintVerticalBoard(parent:Phaser.GameObjects.Container,w:number,h:number):void {
    const g=this.add.graphics();parent.add(g);
    g.fillGradientStyle(0x76b9d7,0xa8dacc,0x609f7a,0x437d5f,1);
    g.fillRect(0,0,w,h);
    g.fillStyle(0x8bc184,.8);g.fillEllipse(w*.55,h*.36,w*1.25,h*.47);
    g.fillStyle(0x356f71,.9);
    g.fillEllipse(w*.84,h*.82,w*.8,h*.34);
    g.fillStyle(0x8ec8bf,.75);g.fillEllipse(w*.80,h*.80,w*.65,h*.24);
    for(let i=0;i<13;i++){
      const x=(i*97+29)%w, y=(i*133+81)%h;
      if(y<h*.14)continue;
      g.fillStyle(0x335f52,.22);
      g.fillEllipse(x+4,y+12,38,10);
      g.fillStyle(0x387a55,.8);
      g.fillTriangle(x-17,y+4,x,y-36,x+17,y+4);
      g.fillStyle(0x5b9867,.9);
      g.fillTriangle(x-13,y+2,x,y-26,x+13,y+2);
    }
    if(!this.match){
      this.label(parent,w/2,h/2,'BOARD VIEW',22,'#ffffff',true);
      return;
    }
    const state=this.match;
    const active=state.players[state.currentPlayerIndex];
    const baseY=h*.59;
    const spacing=Math.min(h*.137,83);
    const baseW=Math.min(w*.61,280);
    const activePosition=active?.position??0;
    // Draw distant spaces before nearer spaces for a fake isometric 2.5D route.
    for(let offset=4;offset>=-3;offset--){
      const idx=(activePosition+offset+TILES.length)%TILES.length;
      const y=baseY-offset*spacing;
      if(y < -40||y > h+40)continue;
      const x=w*.51+Math.sin(idx*.74)*w*.15;
      const tw=baseW*(1-offset*.065);
      const th=Math.max(27,tw*.28);
      const tile=TILES[idx];
      const gallery=state.galleries.find(a=>a.tile===idx);
      const owner=gallery?.ownerId?state.players.find(p=>p.id===gallery.ownerId):null;
      const color=owner?playerColor(owner.color):TILE_PALETTE[tile];
      const shadow=Phaser.Display.Color.GetColor(31,66,68);
      g.fillStyle(shadow,.65);
      g.fillPoints([
        new Phaser.Geom.Point(x-tw*.5,y+9),
        new Phaser.Geom.Point(x,y-th*.48+9),
        new Phaser.Geom.Point(x+tw*.5,y+9),
        new Phaser.Geom.Point(x,y+th*.48+9)
      ],true);
      g.fillStyle(color,1);
      g.fillPoints([
        new Phaser.Geom.Point(x-tw*.5,y),
        new Phaser.Geom.Point(x,y-th*.48),
        new Phaser.Geom.Point(x+tw*.5,y),
        new Phaser.Geom.Point(x,y+th*.48)
      ],true);
      g.lineStyle(offset===0?4:2,offset===0?0xfff2ab:0x315668,1);
      g.strokePoints([
        new Phaser.Geom.Point(x-tw*.5,y),
        new Phaser.Geom.Point(x,y-th*.48),
        new Phaser.Geom.Point(x+tw*.5,y),
        new Phaser.Geom.Point(x,y+th*.48)
      ],true);
      const bright=lighten(color,35);
      g.fillStyle(bright,.62);
      g.fillTriangle(x-tw*.43,y-2,x,y-th*.43,x+tw*.43,y-2);
      this.label(parent,x,y-1,TILE_ICONS[tile],Math.max(16,tw*.17),'#233a46');
      this.label(parent,x,y+th*.36,String(idx+1),Math.max(9,tw*.056),'#264052');
      if(offset===0){
        const pawns=state.players.filter(p=>p.position===idx);
        pawns.forEach((p,i)=>{
          const xx=x+(i-(pawns.length-1)/2)*Math.min(28,tw*.13);
          const yy=y-th*.24;
          const body=playerColor(p.color);
          g.fillStyle(0x183f51,.35);g.fillEllipse(xx,yy+24,27,10);
          g.fillStyle(body,1);g.fillRoundedRect(xx-11,yy-1,22,26,7);
          g.lineStyle(2,0xffffff,.85);g.strokeRoundedRect(xx-11,yy-1,22,26,7);
          g.fillStyle(0xffdcc0,1);g.fillCircle(xx,yy-9,12);
          g.fillStyle(0x304455,1);g.fillCircle(xx-4,yy-9,1.5);g.fillCircle(xx+4,yy-9,1.5);
        });
      }
    }
    g.fillStyle(0x15394b,.88);g.fillRoundedRect(14,14,w-28,49,13);
    this.label(parent,w/2,35,'BOARD · ROUND '+state.turn,Math.min(18,w*.041),'#fff1c1');
    const tileName=TILES[activePosition]==='GALLERY'?'GALLERY':TILES[activePosition].replace('START','ROBOT CENTER');
    g.fillStyle(0x102e40,.9);g.fillRoundedRect(w*.15,h-61,w*.70,46,12);
    this.label(parent,w*.5,h-38,'◆ '+tileName+' · '+(activePosition+1)+' / '+TILES.length,
      Math.min(15,w*.038),'#f4f4dc');
  }

  // The WORLD MAP only appears after explicitly entering robot dispatch mode.
  private paintWorldMap(parent:Phaser.GameObjects.Container,w:number,h:number):void {
    const g=this.add.graphics();parent.add(g);
    g.fillGradientStyle(0x246f8b,0x358da0,0x225b77,0x1a4a6b,1);g.fillRect(0,0,w,h);
    const cell=Math.min((w-32)/ISLAND_SIZE,(h-120)/ISLAND_SIZE);
    const left=(w-cell*ISLAND_SIZE)/2;
    const top=Math.max(57,(h-cell*ISLAND_SIZE)/2+15);
    // Soft shoreline surrounds the entire 5x5 island, without the board perimeter.
    g.fillStyle(0x8ecac2,.85);g.fillRoundedRect(left-12,top-12,cell*5+24,cell*5+24,cell*.65);
    g.fillStyle(0xf1dca0,1);g.fillRoundedRect(left-7,top-7,cell*5+14,cell*5+14,cell*.52);
    for(let y=0;y<ISLAND_SIZE;y++)for(let x=0;x<ISLAND_SIZE;x++){
      const px=left+x*cell,py=top+y*cell;
      const ground=ISLAND_TERRAIN[y][x];
      g.fillStyle(GROUND[ground],1);g.fillRect(px,py,cell+.5,cell+.5);
      g.fillStyle(lighten(GROUND[ground],20),.38);
      g.fillEllipse(px+cell*.38,py+cell*.34,cell*.55,cell*.36);
      if(ground==='CLIFF'){
        g.fillStyle(0x4f7067,.6);
        g.fillTriangle(px+cell*.1,py+cell*.75,px+cell*.48,py+cell*.11,px+cell*.84,py+cell*.75);
      }else if(ground==='WATER'){
        g.lineStyle(2,0xd7ffff,.75);
        g.lineBetween(px+cell*.14,py+cell*.45,px+cell*.72,py+cell*.45);
      }else if(ground==='DESERT'){
        g.lineStyle(2,0xc99852,.75);
        g.beginPath();g.arc(px+cell*.5,py+cell*.7,cell*.27,Math.PI,0);g.strokePath();
      }else if(ground==='ICE'){
        g.lineStyle(2,0xf2ffff,.7);
        g.lineBetween(px+cell*.2,py+cell*.75,px+cell*.77,py+cell*.2);
      }else if(ground==='VOLCANO'){
        g.fillStyle(0x90403d,.85);
        g.fillTriangle(px+cell*.19,py+cell*.82,px+cell*.55,py+cell*.17,px+cell*.89,py+cell*.82);
      }else{
        g.fillStyle(0x447c55,.65);
        g.fillTriangle(px+cell*.18,py+cell*.73,px+cell*.34,py+cell*.29,px+cell*.50,py+cell*.73);
      }
      const spot=this.match?.islandSpots.find(s=>s.x===x&&s.y===y&&s.kind!=='LOCATION')
        ??this.match?.islandSpots.find(s=>s.x===x&&s.y===y);
      if(!spot)continue;
      const cx=px+cell*.5,cy=py+cell*.5;
      if(!spot.depleted&&spot.kind!=='LOCATION'){
        g.fillStyle(spot.kind==='KEEPER'?0x693c57:0xf2d06b,.97);
        g.fillCircle(cx,cy,Math.max(12,cell*.19));
        g.lineStyle(2,0xffffff,.95);g.strokeCircle(cx,cy,Math.max(12,cell*.19));
        this.label(parent,cx,cy,spot.kind==='KEEPER'?'⚔':'◆',Math.max(14,cell*.24),'#243b44');
      }
      if(this.selectedSpot===spot.id){
        g.lineStyle(4,0xfff39c,1);g.strokeRoundedRect(px+3,py+3,cell-6,cell-6,10);
        this.label(parent,cx,py+cell*.12,'▼',Math.max(12,cell*.22),'#fff4c0',true);
      }
      const hit=this.add.rectangle(cx,cy,cell,cell,0,0).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>{
        this.selectedSpot=spot.id;
        this.onSelect(spot.id);
        this.paint();
      });
      parent.add(hit);
    }
    if(this.match){
      this.match.players.forEach(p=>{
        const m=p.robot.mission;
        if(!m)return;
        const site=this.match?.islandSpots.find(s=>s.id===m.siteId);
        if(!site)return;
        const progress=m.phase==='OUTBOUND'?expeditionProgress(m):m.phase==='SEARCH'?1:1-expeditionProgress(m);
        const gx=2+(site.x-2)*progress,gy=2+(site.y-2)*progress;
        const x=left+(gx+.5)*cell,y=top+(gy+.5)*cell;
        g.fillStyle(playerColor(p.color),1);g.fillRoundedRect(x-10,y-10,20,20,6);
        g.lineStyle(2,0xffffff,1);g.strokeRoundedRect(x-10,y-10,20,20,6);
        this.label(parent,x,y,'●',10,'#23364b');
      });
    }
    g.fillStyle(0x102e45,.86);g.fillRoundedRect(12,10,w-24,41,11);
    this.label(parent,w/2,30,'WORLD MAP · EXPEDITION',Math.min(17,w*.045),'#f9f3ca');
    this.label(parent,w/2,Math.min(h-17,top+cell*5+23),
      '◆ TREASURE    ⚔ KEEPER    · SCOUT',Math.min(12,w*.028),'#f9eec6');
  }
}

export function mountBoard(
  element:HTMLElement,
  onSelect:(id:string)=>void
):{
  update(state:GameState):void;
  select(id:string):void;
  setView(mode:GameView):void;
  destroy():void;
}{
  const scene=new BoardScene(onSelect);
  const game=new Phaser.Game({
    type:Phaser.AUTO,
    parent:element,
    backgroundColor:'#21455e',
    scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:600,height:700},
    render:{pixelArt:false,antialias:true},
    scene:[scene]
  });
  return {
    update(state){scene.setMatch(state);},
    select(id){scene.selectSpot(id);},
    setView(mode){scene.setView(mode);},
    destroy(){game.destroy(true);}
  };
}
