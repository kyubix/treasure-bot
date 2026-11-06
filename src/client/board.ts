import Phaser from 'phaser';
import {useThreeWorldMap,useThreeBoardView} from './render-mode.ts';
import { TILES, boardTiles } from '../engine/types.ts';
import {galleryNumberAt,playerDisplay} from '../engine/gallery.ts';
import {boardTileBaseColor} from '../engine/player-palette.ts';
import { boardScenery, BOARD_BIOME_PALETTE, relativeParallax } from './board-environment.ts';
import type { BoardBiome } from './board-environment.ts';
import type { GameState, TileType } from '../engine/types.ts';
import { drawWorldIsland } from './world-map.ts';
import type { WorldThreeLayer } from './world-map-three.ts';
import type { ThreeBoardVisual } from './board-view-three.ts';

export type GameView = 'board' | 'world';

const TILE_COLORS: Record<TileType,number> = {
  START:0xffd55e, SHOP:0xffdf32, GALLERY:0xf7f9ff,
  EVENT:0xffa65c, SUPPORT:0x7bd9bc, PLAIN:0x85c5ff
};
const ICON: Record<TileType,string> = {
  START:'★', SHOP:'S', GALLERY:'G', EVENT:'!', SUPPORT:'+', PLAIN:'·'
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
  private worldRotation=0;
  private travelingPlayer:string|null=null;
  private visualPosition:number|null=null;
  private movement?:Phaser.Tweens.Tween;
  private lastMotionPaint=0;
  private launchEffect?:Phaser.Tweens.Tween;
  private launchProgress:number|null=null;
  private launchPlayerId:string|null=null;
  private lastLaunchPaint=0;
  private layoutFrame=0;
  private threeLayer:WorldThreeLayer|null=null;
  private boardThree:ThreeBoardVisual|null=null;
  private orbitTouches=new Map<number,{x:number;y:number}>();
  private orbitMoved=0;
  private lastPinchDistance=0;
  private lastOrbitPaint=0;

  constructor(private readonly onSelect:(id:string)=>void,private readonly onTravelEnd:()=>void) {super('Board');}
  isMoving():boolean{return Boolean(this.movement?.isPlaying());}
  setThreeLayer(layer:WorldThreeLayer):void{
    this.threeLayer?.dispose();
    this.threeLayer=layer;
    if(this.sys.isActive()&&this.view==='world')this.scheduleLayoutPaint();
  }
  disposeWorldPreview():void{
    this.threeLayer?.dispose();
    this.threeLayer=null;
  }
  setBoardThreeLayer(layer:ThreeBoardVisual):void{
    this.boardThree?.dispose();
    this.boardThree=layer;
    if(this.sys.isActive()&&this.view==='board')this.scheduleLayoutPaint();
  }
  disposeBoardThreeLayer():void{
    this.boardThree?.dispose();
    this.boardThree=null;
  }
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
  create():void {
    // Phaser.Scale.RESIZE may fire while the Board/World CSS layout changes.
    // Batch resize + view rendering to one frame after the new layout settles.
    this.scale.on('resize',()=>this.scheduleLayoutPaint());
    // Phaser owns touch hit areas; Three owns only camera and background.
    this.input.addPointer(1);
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>this.orbitDown(p));
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>this.orbitMove(p));
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>this.orbitUp(p));
    this.input.on('pointerupoutside',(p:Phaser.Input.Pointer)=>this.orbitUp(p));
    this.events.once('shutdown',()=>{
      this.orbitTouches.clear();
      if(this.layoutFrame)cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame=0;
    });
    this.paint();
  }
  private orbitDown(pointer:Phaser.Input.Pointer):void{
    if(this.view!=='world'||!this.threeLayer)return;
    if(this.orbitTouches.size===0)this.orbitMoved=0;
    this.orbitTouches.set(pointer.id,{x:pointer.x,y:pointer.y});
    this.lastPinchDistance=0;
  }
  private orbitMove(pointer:Phaser.Input.Pointer):void{
    if(this.view!=='world'||!this.threeLayer||!pointer.isDown)return;
    const prev=this.orbitTouches.get(pointer.id);
    if(!prev)return;
    const dx=pointer.x-prev.x,dy=pointer.y-prev.y;
    this.orbitTouches.set(pointer.id,{x:pointer.x,y:pointer.y});
    this.orbitMoved+=Math.hypot(dx,dy);
    if(this.orbitTouches.size>=2){
      const points=[...this.orbitTouches.values()];
      const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
      if(this.lastPinchDistance>0&&distance>5)
        this.threeLayer.zoom(Math.log(distance/this.lastPinchDistance));
      this.lastPinchDistance=distance;
      this.orbitMoved=100;
    }else if(this.orbitMoved>=8){
      // Do not repaint or destroy an interactive hit circle on tiny touch
      // jitter: otherwise its pointerup tap event can be lost on Android.
      this.threeLayer.orbit(-dx,dy);
    }else{
      return;
    }
    if(this.time.now-this.lastOrbitPaint>=33){
      this.lastOrbitPaint=this.time.now;
      if(!this.layoutFrame)this.paint();
    }
  }
  private orbitUp(pointer:Phaser.Input.Pointer):void{
    if(!this.orbitTouches.has(pointer.id))return;
    this.orbitTouches.delete(pointer.id);
    this.lastPinchDistance=0;
    // A tap must keep its Phaser hit target alive until pointerup dispatch.
    // Drag samples already repaint at a mobile-friendly capped frequency.
    if(this.orbitMoved>=8&&this.view==='world'&&this.threeLayer&&!this.layoutFrame)this.paint();
  }
  private isOrbitTap():boolean{return this.orbitMoved<8;}
  private scheduleLayoutPaint():void {
    if(this.layoutFrame||!this.sys.isActive())return;
    // World HUD and command rows change the flex layout. Browser viewport
    // controls can also change 100dvh a frame later on Android. Wait for
    // three matching measurements before revealing the newly sized scene.
    let lastWidth=0,lastHeight=0,stableFrames=0,attempts=0;
    const sample=()=>{
      if(!this.sys.isActive()){this.layoutFrame=0;return;}
      const host=this.game.canvas.parentElement;
      const width=Math.round(host?.clientWidth??0);
      const height=Math.round(host?.clientHeight??0);
      if(width<40||height<40){this.layoutFrame=0;return;}
      if(width===lastWidth&&height===lastHeight)stableFrames++;
      else {stableFrames=1;lastWidth=width;lastHeight=height;}
      attempts++;
      if(stableFrames<3&&attempts<10){
        this.layoutFrame=requestAnimationFrame(sample);
        return;
      }
      // Mark in-flight to suppress the synchronous Phaser Scale.resize event.
      // The final paint is produced only after the new canvas size is applied.
      this.layoutFrame=-1;
      if(Math.abs(this.scale.width-width)>1||
         Math.abs(this.scale.height-height)>1){
        this.scale.resize(width,height);
      }
      this.paint();
      this.layoutFrame=0;
    };
    this.layoutFrame=requestAnimationFrame(sample);
  }
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
      const tileCount=boardTiles(value).length;
      const steps=(actor.position-earlier.position+tileCount)%tileCount;
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
    }else if(this.sys.isActive()&&!this.layoutFrame)this.paint();
  }
  setView(value:GameView):void {
    if(this.view===value)return;
    this.view=value;
    // Hide the previous WebGL scene immediately, even during CSS resize.
    if(value==='world')this.boardThree?.visible(false);
    else this.threeLayer?.visible(false);
    this.movement?.stop();
    this.movement=undefined;
    this.travelingPlayer=null;
    this.visualPosition=null;
    if(this.sys.isActive()){
      // Do not reveal a wrong-sized frame of the previous view while the
      // flex layout replaces the board header/commands with World HUD.
      this.display?.setVisible(false);
      this.scheduleLayoutPaint();
    }
  }
  selectSpot(value:string):void {this.selected=value;if(this.sys.isActive())this.paint();}
  rotateMap(delta:number):void {
    if(!Number.isFinite(delta))return;
    if(this.view==='world'&&this.threeLayer){
      this.threeLayer.rotateBy(Math.sign(delta)*Math.PI/4);
    }else{
      this.worldRotation=((this.worldRotation+Math.sign(delta))%4+4)%4;
    }
    if(this.sys.isActive()&&this.view==='world'&&!this.layoutFrame)this.paint();
  }
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
    // Never show a stale-size frame during Board -> World layout settlement.
    if(this.layoutFrame>0)return;
    const {width:w,height:h}=this.scale;
    if(w<40||h<40)return;
    this.display?.destroy(true);
    const container=this.add.container(0,0);
    this.display=container;
    if(this.view==='world'){
      // When WebGL cannot initialize, continue with the full Phaser map.
      // Update actual Three.js chibi models from the authoritative match
      // before drawing; keep Phaser actors as fallback on any WebGL failure.
      let rendered3D=false;
      if(this.threeLayer){
        try{
          this.threeLayer.syncActors(this.match);
          rendered3D=this.threeLayer.draw(w,h);
        }catch{
          rendered3D=false;
        }
      }
      if(!rendered3D)this.threeLayer?.visible(false);
      this.world(container,w,h,rendered3D);
    }else{
      this.threeLayer?.visible(false);
      const active=this.match?.players[this.match.currentPlayerIndex];
      const focus=this.visualPosition!==null&&this.travelingPlayer===active?.id?
        this.visualPosition:(active?.position??0);
      let rendered3D=false;
      if(this.boardThree){
        try{
          rendered3D=this.boardThree.draw(this.match,w,h,focus,
            this.travelingPlayer,this.launchProgress,this.launchPlayerId);
        }catch{rendered3D=false;}
      }
      if(rendered3D){
        // Reveal only AFTER the first successful Three.js frame. Hiding the
        // old Phaser scene during the async import avoids a legacy-view flash.
        this.game.canvas.parentElement?.classList.remove('board-three-pending');
      }else{
        // Real WebGL failure: uncover the fully functional Phaser fallback.
        // While Three is still importing, keep the loading veil over Phaser.
        if(this.boardThree)
          this.game.canvas.parentElement?.classList.remove('board-three-pending');
        this.boardThree?.visible(false);
        this.board(container,w,h);
      }
    }
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
  private drawScenery(g:Phaser.GameObjects.Graphics,w:number,h:number,position:number):void {
    const scene=boardScenery(position);
    this.drawSceneryLayer(g,w,h,scene.biome,position,1);
    if(scene.transition>0)
      this.drawSceneryLayer(g,w,h,scene.next,position,scene.transition);
  }
  private drawSceneryLayer(g:Phaser.GameObjects.Graphics,w:number,h:number,
    biome:BoardBiome,position:number,alpha:number):void {
    const colors=BOARD_BIOME_PALETTE[biome];
    const s=Math.min(w/640,h/480);
    g.fillStyle(colors.sky,alpha);g.fillRect(0,0,w,h*.60);
    g.fillStyle(colors.horizon,alpha);g.fillRect(0,h*.37,w,h*.23);
    g.fillStyle(biome==='volcano'?0xffa26b:0xfff5bb,alpha*.65);
    g.fillCircle(w*.84,h*.12,34*s);
    const far=relativeParallax(position,13*s,235*s);
    const middle=relativeParallax(position,30*s,172*s);
    const near=relativeParallax(position,67*s,118*s);
    g.fillStyle(colors.far,alpha);
    for(let i=-2;i<7;i++)g.fillEllipse(i*235*s-far+110*s,h*.43,285*s,121*s);
    g.fillStyle(colors.mid,alpha);
    for(let i=-2;i<9;i++){
      const x=i*172*s-middle;
      if(biome==='cliffs'||biome==='ice'||biome==='volcano'){
        g.fillTriangle(x,h*.57,x+88*s,h*.27+(i%2)*22*s,x+180*s,h*.57);
        if(biome==='ice'){
          g.fillStyle(0xe8fcff,alpha*.8);
          g.fillTriangle(x+56*s,h*.39,x+88*s,h*.27+(i%2)*22*s,x+119*s,h*.39);
          g.fillStyle(colors.mid,alpha);
        }
      }else g.fillEllipse(x+87*s,h*.52,225*s,98*s);
    }
    if(biome==='coast'){
      g.fillStyle(0x54b6c9,alpha*.78);g.fillRect(0,h*.52,w,h*.08);
      g.lineStyle(2*s,0xe9fbf9,alpha*.8);
      for(let i=-1;i<12;i++){
        const x=i*78*s-near;
        g.lineBetween(x,h*.554,x+48*s,h*.55);
      }
    }else if(biome==='forest'||biome==='meadow'){
      for(let i=-1;i<11;i++){
        const x=i*118*s-near;
        const r=(biome==='forest'?20:13)*s;
        g.fillStyle(0x665d3f,alpha);g.fillRect(x-r*.14,h*.49,r*.28,r*1.15);
        g.fillStyle(colors.near,alpha);g.fillCircle(x-r*.3,h*.47,r*.74);
        g.fillStyle(0x3e935d,alpha);g.fillCircle(x+r*.29,h*.456,r*.77);
        g.fillStyle(0x70b879,alpha);g.fillCircle(x,h*.423,r*.85);
      }
    }else if(biome==='desert'){
      for(let i=-1;i<9;i++){
        const x=i*118*s-near;
        g.fillStyle(0x7a976c,alpha);g.fillRoundedRect(x,h*.49,7*s,39*s,3*s);
        g.fillRoundedRect(x+4*s,h*.52,17*s,7*s,3*s);
      }
    }else if(biome==='volcano'){
      for(let i=-1;i<9;i++){
        const x=i*118*s-near;
        g.fillStyle(colors.near,alpha);
        g.fillTriangle(x,h*.58,x+56*s,h*.41,x+112*s,h*.58);
        g.lineStyle(3*s,0xfa9555,alpha*.9);
        g.lineBetween(x+55*s,h*.47,x+62*s,h*.58);
      }
    }else{
      for(let i=-1;i<9;i++){
        const x=i*118*s-near;
        g.fillStyle(colors.near,alpha);g.fillTriangle(x,h*.58,x+58*s,h*.42,x+116*s,h*.58);
      }
    }
  }
  private board(parent:Phaser.GameObjects.Container,w:number,h:number):void {
    const g=this.add.graphics();parent.add(g);
    const s=Math.min(w/640,h/480);
    const active=this.match?.players[this.match.currentPlayerIndex];
    const camera=this.visualPosition!==null&&this.travelingPlayer===active?.id
      ?this.visualPosition:(active?.position??0);
    this.drawScenery(g,w,h,camera);
    if(this.launchProgress!==null)this.gateway(g,w,h,this.launchProgress);
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
      const tiles=boardTiles(state);
       const focus=((base%tiles.length)+tiles.length)%tiles.length;
      const count=8;
      const stride=w/7;
      const leftTile=base+3;
      for(let col=0;col<count;col++){
        const idx=(leftTile-col+tiles.length*8)%tiles.length;
        const tile=tiles[idx];
        const x=(col+fraction)*stride;
        const galleryNumber=galleryNumberAt(idx,state);
        const gallery=galleryNumber?state.galleries.find(q=>q.number===galleryNumber):undefined;
        const color=asColor(boardTileBaseColor(idx,state));
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
        }else if(galleryNumber){
          this.text(parent,x+stride/2,roadTop+15*s,'GALLERY',Math.max(8,10*s),'#30435d',true);
          this.text(parent,x+stride/2,roadTop+46*s,String(galleryNumber),
            Math.max(24,31*s),'#1d3c57',true);
          const count=gallery?playerDisplay(gallery,me?.id??'').length:0;
          this.text(parent,x+stride/2,roadBottom-18*s,
            String(count)+'/10',Math.max(9,11*s),'#375064',true);
        }else{
          this.text(parent,x+stride/2,roadTop+33*s,ICON[tile],
            Math.max(13,19*s),'#1c4b66');
        }
        const standing=state.players.filter(p=>p.id===this.travelingPlayer?focus===idx:p.position===idx);
        standing.forEach((p,i)=>{
          const walking=p.id===this.travelingPlayer;
          const phase=walking&&this.visualPosition!==null?Math.abs(Math.sin(this.visualPosition*Math.PI*2)):0;
          const px=x+stride*(.40+i*.13)-(walking?fraction*stride:0), py=roadTop+8*s-phase*6*s;
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
      for(let i=0;i<tiles.length;i++){
        const a=i/tiles.length*Math.PI*2-Math.PI/2;
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
  private world(parent:Phaser.GameObjects.Container,w:number,h:number,rendered3D:boolean):void {
    drawWorldIsland({
      scene:this,parent,width:w,height:h,state:this.match,
      renderScenery:!rendered3D,
      project3D:rendered3D?this.threeLayer??undefined:undefined,
      isPointerTap:()=>this.isOrbitTap(),
      rotation:this.worldRotation,selectedSpot:this.selected,
      onSelect:id=>{
        this.selected=id;
        this.paint();
        this.onSelect(id);
      }
    });
  }
}

export function mountBoard(element:HTMLElement,onSelect:(id:string)=>void,onTravelEnd:()=>void=()=>{}):{
  update(state:GameState):void;
  select(id:string):void;
  setView(mode:GameView):void;
  rotateMap(delta:number):void;
  isMoving():boolean;
  isLaunching():boolean;
  launchRobot(playerId:string):void;
  destroy():void;
}{
  // Both World Map and Board View use Three.js by default. Keep independent
  // opt-outs for Android/WebGL troubleshooting and the full Phaser fallback.
  const params=new URLSearchParams(location.search);
  const map3D=useThreeWorldMap(params);
  const board3D=useThreeBoardView(params);
  // This class is set BEFORE Phaser.Game construction: its first synchronous
  // scene paint is covered until the lazy-loaded Three renderer draws.
  if(board3D)element.classList.add('board-three-pending');
  const scene=new BoardScene(onSelect,onTravelEnd);
  const game=new Phaser.Game({
    // Canvas-backed Phaser avoids a second competing WebGL renderer and
    // retains deterministic game interaction / fallback rendering.
    type:(map3D||board3D)?Phaser.CANVAS:Phaser.AUTO,
    transparent:map3D||board3D,
    parent:element,backgroundColor:(map3D||board3D)?'#000000':'#245879',
    scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:640,height:480},
    render:{pixelArt:false,antialias:true},scene:[scene]
  });
  let destroyed=false;
  if(board3D){
    void import('./board-view-three.ts').then(({createThreeBoardView})=>{
      if(destroyed)return;
      const layer=createThreeBoardView(element);
      if(!layer){
        element.classList.remove('board-three-pending');
        return;
      }
      game.canvas.style.position='relative';
      game.canvas.style.zIndex='1';
      game.canvas.style.touchAction='none';
      scene.setBoardThreeLayer(layer);
    }).catch(()=>{
      element.classList.remove('board-three-pending');
      // Phaser remains a fully working Board View fallback.
    });
  }
  if(map3D){
    // Lazy-load 3D as the DEFAULT World Map; Phaser remains the fallback.
    void import('./world-map-three.ts').then(({createThreeWorldLayer})=>{
      if(destroyed)return;
      const layer=createThreeWorldLayer(element);
      if(!layer)return; // WebGL unsupported: use procedural Phaser background.
      // The renderer sits behind transparent Phaser interaction graphics.
      game.canvas.style.position='relative';
      game.canvas.style.zIndex='1';
      game.canvas.style.touchAction='none';
      scene.setThreeLayer(layer);
    }).catch(()=>{
      // An unavailable Three/WebGL renderer must not block game controls.
    });
  }
  return {
    update(state){scene.setMatch(state);},
    select(id){scene.selectSpot(id);},
    setView(mode){scene.setView(mode);},
    rotateMap(delta){scene.rotateMap(delta);},
    isMoving(){return scene.isMoving();},
    isLaunching(){return scene.isLaunching();},
    launchRobot(id){scene.launchRobot(id);},
    destroy(){
      destroyed=true;
      element.classList.remove('board-three-pending');
      game.destroy(true);
      // The Three layer's lifecycle follows the Phaser scene and host.
      // The wrapper below also permits a late import to be cancelled.
      scene.disposeWorldPreview();
      scene.disposeBoardThreeLayer();
    }
  };
}
