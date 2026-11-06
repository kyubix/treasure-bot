import Phaser from 'phaser';
import { TILES } from '../engine/types.ts';
import { boardScenery, BOARD_BIOME_PALETTE, relativeParallax } from './board-environment.ts';
import type { BoardBiome } from './board-environment.ts';
import { ISLAND_SIZE, ISLAND_TERRAIN, expeditionProgress } from '../engine/island.ts';
import type { GameState, TileType } from '../engine/types.ts';
import type { Ground } from '../engine/island.ts';

export type GameView = 'board' | 'world';

const TILE_COLORS: Record<TileType,number> = {
  START:0xffd55e, SHOP:0xffdf32, GALLERY:0xf7f9ff,
  EVENT:0xffa65c, SUPPORT:0x7bd9bc, PLAIN:0x85c5ff
};
const ICON: Record<TileType,string> = {
  START:'★', SHOP:'S', GALLERY:'G', EVENT:'!', SUPPORT:'+', PLAIN:'·'
};
const GROUND: Record<Ground,number> = {
  GRASS:0x76b96b,CLIFF:0x8b9b88,DESERT:0xe9c584,
  WATER:0x6bb8d8,VOLCANO:0xc37a67,ICE:0xb0dceb
};
const asColor=(s:string):number=>Phaser.Display.Color.HexStringToColor(s).color;
const pt=(x:number,y:number)=>new Phaser.Geom.Point(x,y);

// Original-art procedural visual study. PS1 references are composition only;
// no Konami game assets, screenshots, logos or artwork are bundled.
export class BoardScene extends Phaser.Scene {
  private match: GameState|null=null;
  private display?:Phaser.GameObjects.Container;
  private view:GameView='board';
  private selected:string|null=null;
  private travelingPlayer:string|null=null;
  private visualPosition:number|null=null;
  private movement?:Phaser.Tweens.Tween;
  private lastMotionPaint=0;
  private launchEffect?:Phaser.Tweens.Tween;
  private launchProgress:number|null=null;
  private launchPlayerId:string|null=null;
  private lastLaunchPaint=0;

  constructor(private readonly onSelect:(id:string)=>void,private readonly onTravelEnd:()=>void) {super('Board');}
  isMoving():boolean{return Boolean(this.movement?.isPlaying());}
  isLaunching():boolean{return this.launchProgress!==null;}
  launchRobot(playerId:string):void {
    if(!this.sys.isActive())return;
    if(this.view!=='board')this.setView('board');
    this.launchEffect?.stop();
    this.launchPlayerId=playerId;
    this.launchProgress=0;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.launchEffect=this.tweens.addCounter({
      from:0,to:1,duration:reduce?100:2200,ease:'Sine.easeInOut',
      onUpdate:tween=>{
        this.launchProgress=tween.getValue();
        if(this.time.now-this.lastLaunchPaint>34){this.lastLaunchPaint=this.time.now;this.paint();}
      },
      onComplete:()=>{
        this.launchProgress=null;this.launchPlayerId=null;this.launchEffect=undefined;
        this.paint();
      }
    });
  }
  create():void {this.scale.on('resize',()=>this.paint());this.paint();}
  setMatch(value:GameState):void {
    const previous=this.match;
    const actor=value.players[value.currentPlayerIndex];
    const earlier=previous?.players.find(p=>p.id===actor?.id);
    const movementSegment=Boolean(this.view==='board'&&previous&&earlier&&actor&&
      previous.phase==='playing'&&value.phase==='playing'&&value.rolled&&value.dice&&
      previous.currentPlayerIndex===value.currentPlayerIndex &&
      earlier.position!==actor.position);
    this.match=value;
    if(movementSegment&&earlier&&actor&&value.dice&&this.sys.isActive()&&
       !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      this.movement?.stop();
      const steps=(actor.position-earlier.position+TILES.length)%TILES.length;
      this.travelingPlayer=actor.id;
      this.visualPosition=earlier.position;
      this.movement=this.tweens.addCounter({
        from:0,to:steps,duration:steps*220,ease:'Linear',
        onUpdate:tween=>{
          const progress=tween.getValue();
          if(progress===null)return;
          this.visualPosition=earlier.position+progress;
          // Limit scene recreation: inexpensive motion without 60 FPS object churn.
          if(this.time.now-this.lastMotionPaint>38){
            this.lastMotionPaint=this.time.now;
            this.paint();
          }
        },
        onComplete:()=>{
          this.visualPosition=null;
          this.travelingPlayer=null;
          this.movement=undefined;
          this.paint();
          this.onTravelEnd();
        }
      });
    }else if(this.sys.isActive())this.paint();
  }
  setView(value:GameView):void {
    if(this.view===value)return;
    this.view=value;
    this.movement?.stop();
    this.movement=undefined;
    this.travelingPlayer=null;
    this.visualPosition=null;
    if(this.sys.isActive()){this.paint();this.cameras.main.fadeIn(170,20,40,48);}
  }
  selectSpot(value:string):void {this.selected=value;if(this.sys.isActive())this.paint();}
  private text(parent:Phaser.GameObjects.Container,x:number,y:number,value:string,
    size:number,color='#ffffff',stroke=false):Phaser.GameObjects.Text {
    const object=this.add.text(x,y,value,{
      fontFamily:'Trebuchet MS,Arial,sans-serif',fontStyle:'bold',
      fontSize:Math.round(size)+'px',align:'center',color,
      stroke:stroke?'#28404d':undefined,strokeThickness:stroke?3:0
    }).setOrigin(.5);
    parent.add(object);return object;
  }
  private paint():void {
    const {width:w,height:h}=this.scale;
    if(w<40||h<40)return;
    this.display?.destroy(true);
    const container=this.add.container(0,0);
    this.display=container;
    if(this.view==='world')this.world(container,w,h);
    else this.board(container,w,h);
  }
  private tree(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number):void {
    g.fillStyle(0x394e37,.45);g.fillEllipse(x,y+r*.75,r*2.1,r*.45);
    g.fillStyle(0x705738);g.fillRoundedRect(x-r*.16,y-r*.5,r*.32,r*1.12,r*.12);
    g.fillStyle(0x2e744a);g.fillCircle(x-r*.55,y-r*.55,r*.67);
    g.fillStyle(0x357e4d);g.fillCircle(x+r*.5,y-r*.65,r*.73);
    g.fillStyle(0x489e62);g.fillCircle(x,y-r*1.05,r*.9);
    g.fillStyle(0x7eba68,.55);g.fillEllipse(x-r*.2,y-r*1.3,r*.7,r*.45);
  }
  private chibi(g:Phaser.GameObjects.Graphics,x:number,y:number,scale:number,color:number):void {
    const r=scale;
    g.fillStyle(0x243c45,.35);g.fillEllipse(x,y+r*.4,r*1.8,r*.42);
    g.lineStyle(Math.max(1,r*.09),0x27374a,.8);
    g.fillStyle(0x344c75);g.fillRoundedRect(x-r*.48,y-r*.35,r*.39,r*.75,r*.13);
    g.fillRoundedRect(x+r*.1,y-r*.35,r*.39,r*.75,r*.13);
    g.fillStyle(color);g.fillRoundedRect(x-r*.66,y-r*1.25,r*1.32,r*1.12,r*.3);
    g.lineStyle(Math.max(1,r*.07),0xffffff,.8);g.strokeRoundedRect(x-r*.66,y-r*1.25,r*1.32,r*1.12,r*.3);
    g.fillStyle(0xf8d6a5);g.fillCircle(x,y-r*1.87,r*.75);
    g.fillStyle(0x293750);g.fillEllipse(x,y-r*2.42,r*1.56,r*.58);
    g.fillStyle(color);g.fillEllipse(x,y-r*2.49,r*1.69,r*.4);
    g.fillStyle(0x202d36);g.fillCircle(x-r*.22,y-r*1.87,r*.07);g.fillCircle(x+r*.22,y-r*1.87,r*.07);
    g.lineStyle(Math.max(1,r*.06),0x963f38);g.lineBetween(x-r*.12,y-r*1.56,x+r*.15,y-r*1.55);
  }
  private robotCompanion(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number,color:number,bob=0):void {
    const wobble=bob*3;
    g.fillStyle(0x274356,.25);g.fillEllipse(x,y+r*.3,r*1.7,r*.42);
    g.fillStyle(0x354a69);g.fillRoundedRect(x-r*.66,y-r*.36-wobble,r*.5,r*.76,r*.2);
    g.fillRoundedRect(x+r*.16,y-r*.36-wobble,r*.5,r*.76,r*.2);
    g.fillStyle(color);g.fillRoundedRect(x-r*.75,y-r*1.55-wobble,r*1.5,r*1.2,r*.25);
    g.lineStyle(Math.max(1,r*.11),0xf4efdc);g.strokeRoundedRect(x-r*.75,y-r*1.55-wobble,r*1.5,r*1.2,r*.25);
    g.fillStyle(0xbff0f3);g.fillRoundedRect(x-r*.48,y-r*1.31-wobble,r*.96,r*.48,r*.13);
    g.fillStyle(0x284a70);g.fillCircle(x-r*.21,y-r*1.06-wobble,r*.11);
    g.fillCircle(x+r*.21,y-r*1.06-wobble,r*.11);
    g.lineStyle(Math.max(1,r*.1),0x536c88);g.lineBetween(x,y-r*1.5-wobble,x,y-r*1.94-wobble);
    g.fillStyle(0xffdf7c);g.fillCircle(x,y-r*2-wobble,r*.16);
  }
  private gateway(g:Phaser.GameObjects.Graphics,w:number,h:number,p:number):void {
    const s=Math.min(w/640,h/480);
    const open=Math.min(1,p/.42),split=Math.max(0,Math.min(1,(p-.18)/.33));
    const width=97*s*open,height=137*s*open,x=w*.51,y=h*.54;
    g.fillStyle(0x1d455d,.4);g.fillEllipse(x,y,width*1.25,18*s);
    g.fillStyle(0xffe4a7,.95);g.fillRoundedRect(x-width*.57,y-height,width*1.14,height,14*s);
    g.fillStyle(0x3b527c,.9);g.fillRoundedRect(x-width*.47,y-height*.93,width*.94,height*.92,11*s);
    g.fillStyle(0x57cbdc,.87);g.fillEllipse(x,y-height*.45,width*.73,height*.8);
    g.fillStyle(0xe0ffff,.65);g.fillEllipse(x,y-height*.46,width*.43,height*.58);
    const door=width*.46*(1-split*.75);
    g.fillStyle(0x725778,.95);
    g.fillRoundedRect(x-width*.46,y-height*.93,door,height*.93,7*s);
    g.fillRoundedRect(x+width*.46-door,y-height*.93,door,height*.93,7*s);
    g.lineStyle(3*s,0xffebaa,.94);g.strokeRoundedRect(x-width*.57,y-height,width*1.14,height,14*s);
  }
  private gatewayRobot(g:Phaser.GameObjects.Graphics,w:number,h:number,p:number,color:number):void {
    const progress=Math.min(1,Math.max(0,(p-.34)/.56));
    const s=Math.min(w/640,h/480);
    this.robotCompanion(g,w*.53,h*(.635-.145*progress),14*s*(1-progress*.72),color,
      Math.abs(Math.sin(progress*15)));
  }
  private board(parent:Phaser.GameObjects.Container,w:number,h:number):void {
    const g=this.add.graphics();parent.add(g);
    const s=Math.min(w/640,h/480);
    g.fillGradientStyle(0x7fbadd,0xb8d8e6,0xf7e5b7,0xd2dda5,1);g.fillRect(0,0,w,h);
    g.fillStyle(0xfff0b9,.65);g.fillCircle(w*.86,h*.16,48*s);
    g.fillStyle(0xc4d9b4);g.fillEllipse(w*.5,h*.49,w*1.55,h*.43);
    g.fillStyle(0x9ebf93);g.fillPoints([
      pt(0,h*.5),pt(w*.14,h*.3),pt(w*.32,h*.4),pt(w*.44,h*.24),
      pt(w*.60,h*.4),pt(w*.79,h*.30),pt(w,h*.44),pt(w,h*.67),pt(0,h*.67)
    ],true);
    g.fillStyle(0x6d9877);g.fillPoints([
      pt(0,h*.58),pt(w*.14,h*.45),pt(w*.33,h*.55),pt(w*.52,h*.41),
      pt(w*.73,h*.53),pt(w,h*.38),pt(w,h*.72),pt(0,h*.72)
    ],true);
    for(let i=0;i<11;i++){
      const x=(i*.097+.01)*w;
      const y=h*(.42+.05*Math.sin(i*2.1));
      this.tree(g,x,y,(16+i%3*4)*s);
    }
    // Three-quarter-view floor, like the original scene's low camera and broad road.
    const roadTop=h*.57, roadBottom=h*.84;
    g.fillStyle(0x45656b,.6);
    g.fillPoints([pt(0,roadTop+7*s),pt(w,roadTop+7*s),pt(w,roadBottom+13*s),pt(0,roadBottom+13*s)],true);
    g.fillStyle(0xe6f4fa);
    g.fillRect(0,roadTop,w,roadBottom-roadTop);
    if(this.match){
      const state=this.match;
      const me=state.players[state.currentPlayerIndex];
      const actualFocus=me?.position??0;
      const moving=this.visualPosition!==null&&this.travelingPlayer===me?.id;
      const position=moving?this.visualPosition!:actualFocus;
      const base=Math.floor(position);
      const fraction=position-base;
      const focus=((base%TILES.length)+TILES.length)%TILES.length;
      const count=8;
      const stride=w/7;
      const leftTile=base-3;
      for(let col=0;col<count;col++){
        const idx=(leftTile+col+TILES.length*8)%TILES.length;
        const tile=TILES[idx];
        const x=(col-fraction)*stride;
        const gallery=state.galleries.find(q=>q.tile===idx);
        const owner=gallery?.ownerId?state.players.find(p=>p.id===gallery.ownerId):null;
        let color=owner?asColor(owner.color):TILE_COLORS[tile];
        if(tile==='GALLERY' && !owner)color=idx%2?0xe5f5ff:0xc0eaf9;
        g.fillStyle(color,1);
        g.fillPoints([
          pt(x+3*s,roadTop+2*s),
          pt(x+stride-2*s,roadTop+2*s),
          pt(x+stride+12*s,roadBottom-2*s),
          pt(x-8*s,roadBottom-2*s)
        ],true);
        g.lineStyle(3*s,0x274d63,1);
        g.strokePoints([
          pt(x+3*s,roadTop+2*s),
          pt(x+stride-2*s,roadTop+2*s),
          pt(x+stride+12*s,roadBottom-2*s),
          pt(x-8*s,roadBottom-2*s)
        ],true);
        if(idx===focus){
          g.lineStyle(4*s,0xffe048);g.strokeRect(x,roadTop+2*s,stride,roadBottom-roadTop-4*s);
        }
        if(tile==='SHOP'){
          g.fillStyle(0x3458b7);g.fillRect(x+6*s,roadTop+10*s,stride-12*s,30*s);
          this.text(parent,x+stride/2,roadTop+25*s,'SHOP',Math.max(12,17*s),'#fff987');
        }else{
          this.text(parent,x+stride/2,roadTop+33*s,tile==='GALLERY'?String(idx+1):ICON[tile],
            Math.max(13,19*s),'#1c4b66');
        }
        const standing=state.players.filter(p=>p.id===this.travelingPlayer?focus===idx:p.position===idx);
        standing.forEach((p,i)=>{
          const walking=p.id===this.travelingPlayer;
          const phase=walking&&this.visualPosition!==null?Math.abs(Math.sin(this.visualPosition*Math.PI*2)):0;
          const px=x+stride*(.40+i*.13), py=roadTop+8*s-phase*6*s;
          this.chibi(g,px,py,Math.max(9,17*s),asColor(p.color));
          if(!p.robot.mission && !(this.launchPlayerId===p.id && this.launchProgress!==null))
            this.robotCompanion(g,px+29*s,py+2*s-phase*4*s,Math.max(7,13*s),asColor(p.color),phase);
        });
      }
      if(this.launchProgress!==null){
        const owner=state.players.find(p=>p.id===this.launchPlayerId);
        if(owner)this.gatewayRobot(g,w,h,this.launchProgress,asColor(owner.color));
      }
      // The small upper-right map shows all players and current board location.
      const mmW=115*s,mmH=93*s,mmX=w-mmW-12*s,mmY=9*s;
      g.fillStyle(0x1d4774,.94);g.fillRoundedRect(mmX-5*s,mmY-5*s,mmW+10*s,mmH+10*s,11*s);
      g.fillStyle(0x74bc8c);g.fillRoundedRect(mmX+7*s,mmY+7*s,mmW-14*s,mmH-14*s,14*s);
      g.fillStyle(0xe8e3b3);g.fillRoundedRect(mmX+18*s,mmY+17*s,mmW-36*s,mmH-34*s,11*s);
      g.fillStyle(0x66ac90);g.fillCircle(mmX+mmW*.5,mmY+mmH*.52,19*s);
      for(let i=0;i<TILES.length;i++){
        const a=i/TILES.length*Math.PI*2-Math.PI/2;
        const x=mmX+mmW/2+mmW*.42*Math.cos(a);
        const y=mmY+mmH/2+mmH*.41*Math.sin(a);
        const current=state.players.find(p=>p.id===this.travelingPlayer?focus===i:p.position===i);
        g.fillStyle(current?asColor(current.color):i===focus?0xffee6e:0x2c6780);
        g.fillCircle(x,y,current?4.2*s:1.8*s);
      }
      // PS1-style compact command plaque: actions remain functional in HTML controls.
      g.fillStyle(0x152d57,.94);g.fillRoundedRect(8*s,9*s,131*s,81*s,9*s);
      g.lineStyle(3*s,0xe9c46a);g.strokeRoundedRect(8*s,9*s,131*s,81*s,9*s);
      this.text(parent,73*s,25*s,'YOUR TURN',11*s,'#e8eab2');
      this.text(parent,73*s,45*s,me?me.name:'EXPLORER',15*s,'#ffffff',true);
      this.text(parent,73*s,69*s,'ROBOT · DICE · SHOP',10*s,'#b8f6e6');
      // Thin lower status track for all players, not a stack of browser cards.
      const barY=h*.855;
      g.fillStyle(0x26384c);g.fillRect(0,barY,w,h-barY);
      state.players.forEach((p,i)=>{
        const pw=w/state.players.length,x=i*pw;
        g.fillStyle(asColor(p.color));g.fillRect(x+2*s,barY+3*s,pw-4*s,6*s);
        this.text(parent,x+pw*.5,barY+25*s,p.name.slice(0,11),Math.min(13*s,pw*.14),'#e9f6f4');
        this.text(parent,x+pw*.5,barY+44*s,p.gold.toLocaleString()+' G',Math.min(13*s,pw*.13),'#ffe7a9');
      });
    }else{
      this.text(parent,w/2,h*.6,'BOARD',24*s,'#1c4756');
    }
  }
  private world(parent:Phaser.GameObjects.Container,w:number,h:number):void {
    const g=this.add.graphics();parent.add(g);
    const s=Math.min(w/640,h/480);
    g.fillGradientStyle(0x2e86a9,0x4cabc2,0x276989,0x184969,1);g.fillRect(0,0,w,h);
    const size=Math.min((w-42*s)/ISLAND_SIZE,(h-87*s)/ISLAND_SIZE);
    const x0=(w-size*ISLAND_SIZE)/2;
    const y0=(h-size*ISLAND_SIZE)/2+9*s;
    const cx=w*.5,cy=h*.5;
    g.fillStyle(0x94dbd5,.68);g.fillEllipse(cx,cy,size*5.7,size*5.65);
    g.fillStyle(0xf2e0ac);g.fillEllipse(cx,cy,size*5.38,size*5.28);
    g.fillStyle(0x70b96f);g.fillEllipse(cx,cy,size*5.06,size*4.94);
    for(let y=0;y<ISLAND_SIZE;y++)for(let x=0;x<ISLAND_SIZE;x++){
      const spot=this.match?.islandSpots.find(k=>k.x===x&&k.y===y&&k.kind!=='LOCATION')
        ??this.match?.islandSpots.find(k=>k.x===x&&k.y===y);
      const terrain=ISLAND_TERRAIN[y][x];
      const px=x0+x*size,py=y0+y*size;
      const centerX=px+size*.5,centerY=py+size*.5;
      g.fillStyle(GROUND[terrain],.78);
      g.fillEllipse(centerX,centerY,size*1.08,size*1.07);
      if(terrain==='GRASS')this.tree(g,centerX+size*.18,centerY+size*.2,size*.15);
      if(terrain==='CLIFF'){
        g.fillStyle(0x6c7b78,.78);
        g.fillTriangle(px+size*.14,py+size*.8,px+size*.5,py+size*.15,px+size*.85,py+size*.8);
      }
      if(terrain==='WATER'){
        g.lineStyle(2*s,0xdbffff,.65);g.lineBetween(px+size*.1,centerY,px+size*.88,centerY);
      }
      if(terrain==='VOLCANO'){
        g.fillStyle(0x994a42,.9);
        g.fillTriangle(px+size*.14,py+size*.86,px+size*.5,py+size*.12,px+size*.86,py+size*.86);
      }
      if(!spot)continue;
      if(!spot.depleted && spot.kind!=='LOCATION'){
        g.fillStyle(spot.kind==='KEEPER'?0x563a68:0xf7d16a);
        g.fillCircle(centerX,centerY,Math.max(11*s,size*.19));
        g.lineStyle(3*s,0xffffff);g.strokeCircle(centerX,centerY,Math.max(11*s,size*.19));
        this.text(parent,centerX,centerY,spot.kind==='KEEPER'?'⚔':'◆',size*.24,'#203d50');
      }
      if(this.selected===spot.id){
        g.lineStyle(4*s,0xffee94);
        g.strokeCircle(centerX,centerY,size*.43);
        this.text(parent,centerX,centerY-size*.52,'▼',14*s,'#fff0ae',true);
      }
      const hit=this.add.rectangle(centerX,centerY,size*.93,size*.93,0,0)
        .setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>{
        this.selected=spot.id;this.onSelect(spot.id);this.paint();
      });
      parent.add(hit);
    }
    if(this.match){
      this.match.players.forEach(p=>{
        const m=p.robot.mission;
        if(!m)return;
        const site=this.match?.islandSpots.find(q=>q.id===m.siteId);
        if(!site)return;
        const f=m.phase==='OUTBOUND'?expeditionProgress(m):m.phase==='SEARCH'?1:1-expeditionProgress(m);
        const xx=x0+(2.5+(site.x-2)*f)*size;
        const yy=y0+(2.5+(site.y-2)*f)*size;
        g.fillStyle(asColor(p.color));g.fillRoundedRect(xx-10*s,yy-10*s,20*s,20*s,5*s);
        g.lineStyle(2*s,0xffffff);g.strokeRoundedRect(xx-10*s,yy-10*s,20*s,20*s,5*s);
        this.text(parent,xx,yy,'●',10*s,'#183446');
      });
    }
    g.fillStyle(0x1a4268,.94);g.fillRoundedRect(9*s,9*s,w-18*s,39*s,10*s);
    this.text(parent,w*.5,28*s,'WORLD MAP · SELECT DESTINATION',15*s,'#fff1ba');
    this.text(parent,w*.5,h-17*s,'◆ TREASURE       ⚔ KEEPER       · EXPLORE',12*s,'#fff4c4');
  }
}

export function mountBoard(element:HTMLElement,onSelect:(id:string)=>void,onTravelEnd:()=>void=()=>{}):{
  update(state:GameState):void;
  select(id:string):void;
  setView(mode:GameView):void;
  isMoving():boolean;
  isLaunching():boolean;
  launchRobot(playerId:string):void;
  destroy():void;
}{
  const scene=new BoardScene(onSelect,onTravelEnd);
  const game=new Phaser.Game({
    type:Phaser.AUTO,parent:element,backgroundColor:'#245879',
    scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:640,height:480},
    render:{pixelArt:false,antialias:true},scene:[scene]
  });
  return {
    update(state){scene.setMatch(state);},
    select(id){scene.selectSpot(id);},
    setView(mode){scene.setView(mode);},
    isMoving(){return scene.isMoving();},
    isLaunching(){return scene.isLaunching();},
    launchRobot(id){scene.launchRobot(id);},
    destroy(){game.destroy(true);}
  };
}
