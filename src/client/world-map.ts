import Phaser from 'phaser';
import { TILES } from '../engine/types.ts';
import type { GameState, Player } from '../engine/types.ts';
import { expeditionProgress } from '../engine/island.ts';
import type { Ground } from '../engine/island.ts';
import { mapProjection, perimeterPoint, robotOnRoute, clamp } from './world-map-geometry.ts';
import type { Point } from './world-map-geometry.ts';

/**
 * First-pass illustrated World Map for portrait phones. Phaser is responsible
 * for terrain, real player positions, robot routes and interactive destination
 * markers. The blue sci-fi HUD lives in HTML/CSS so it remains crisp.
 *
 * This is a lightweight 2.5D diorama, NOT a 3D model or copyrighted game art.
 * Four camera orientations rotate the map without changing logical tile IDs.
 */
const point=(x:number,y:number)=>new Phaser.Geom.Point(x,y);
const TILE_COLORS={START:0xffd56b,SHOP:0xf8d06d,GALLERY:0xb4e9f6,
  EVENT:0xeaaaee,SUPPORT:0x92f0a3,PLAIN:0x8fb9f6} as const;
const TERRAIN_COLORS:Record<Ground,number>={
  GRASS:0x67bd68,CLIFF:0x9d977e,DESERT:0xf3d18c,
  WATER:0x60cbdc,VOLCANO:0xd38461,ICE:0xd4f9ff
};
const color=(hex:string)=>Phaser.Display.Color.HexStringToColor(hex).color;
const hash=(n:number)=>Math.abs(Math.sin(n*47.831+19.343))*1;
const waterWave=(n:number)=>Math.sin(n*23.5)*.5+.5;

const drawLabel=(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,x:number,y:number,
  text:string,size:number,fg:string,stroke='#143954')=>{
  const label=scene.add.text(x,y,text,{
    fontFamily:'Trebuchet MS,Arial,sans-serif',fontStyle:'bold',
    fontSize:Math.round(size)+'px',color:fg,align:'center',
    stroke,strokeThickness:Math.max(1,Math.round(size*.2))
  }).setOrigin(.5);
  parent.add(label);return label;
};
function tree(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number,shade=0):void{
  g.fillStyle(0x1e5e51,.27);g.fillEllipse(x,y+r*.2,r*1.9,r*.42);
  g.fillStyle(0x765638);g.fillRoundedRect(x-r*.14,y-r*.6,r*.28,r*.96,r*.12);
  g.fillStyle(shade?0x266c43:0x328b50);g.fillCircle(x-r*.31,y-r*.7,r*.62);
  g.fillStyle(shade?0x358452:0x5da95b);g.fillCircle(x+r*.39,y-r*.73,r*.71);
  g.fillStyle(shade?0x4b9d56:0x83c86b);g.fillCircle(x,y-r*1.04,r*.8);
}
function marker(g:Phaser.GameObjects.Graphics,scene:Phaser.Scene,
  parent:Phaser.GameObjects.Container,x:number,y:number,size:number,
  fill:number,icon:string):void{
  g.fillStyle(0x163e5f,.55);g.fillEllipse(x,y+size*.95,size*1.4,size*.45);
  g.fillStyle(0xffedd0);g.fillCircle(x,y,size*.87);
  g.fillStyle(fill);g.fillCircle(x,y,size*.68);
  g.lineStyle(2,0xffffff,1);g.strokeCircle(x,y,size*.7);
  drawLabel(scene,parent,x,y,icon,size*1.04,'#fffde9');
}
function avatar(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number,fill:number):void{
  g.fillStyle(0x153750,.42);g.fillEllipse(x,y+r*.3,r*1.8,r*.4);
  g.fillStyle(0x334a70);g.fillRoundedRect(x-r*.47,y-r*.14,r*.36,r*.65,r*.15);
  g.fillRoundedRect(x+r*.12,y-r*.14,r*.36,r*.65,r*.15);
  g.fillStyle(fill);g.fillRoundedRect(x-r*.55,y-r*.94,r*1.1,r*.95,r*.25);
  g.lineStyle(2,0xffffff,.82);g.strokeRoundedRect(x-r*.55,y-r*.94,r*1.1,r*.95,r*.25);
  g.fillStyle(0xffdab1);g.fillCircle(x,y-r*1.43,r*.69);
  g.fillStyle(0x36475d);g.fillEllipse(x,y-r*1.92,r*1.48,r*.48);
  g.fillStyle(0x27374e);g.fillCircle(x-r*.22,y-r*1.44,r*.09);
  g.fillCircle(x+r*.22,y-r*1.44,r*.09);
}
function robot(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number,fill:number):void{
  g.fillStyle(0x2b4d61,.4);g.fillEllipse(x,y+r*.7,r*1.6,r*.5);
  g.fillStyle(0x344969);g.fillRoundedRect(x-r*.56,y+r*.02,r*.42,r*.55,r*.13);
  g.fillRoundedRect(x+r*.14,y+r*.02,r*.42,r*.55,r*.13);
  g.fillStyle(fill);g.fillRoundedRect(x-r*.74,y-r*.84,r*1.48,r*.93,r*.23);
  g.lineStyle(2,0xfef0cc);g.strokeRoundedRect(x-r*.74,y-r*.84,r*1.48,r*.93,r*.23);
  g.fillStyle(0x1b3e56);g.fillRoundedRect(x-r*.48,y-r*.6,r*.96,r*.47,r*.09);
  g.fillStyle(0x82ffe7);g.fillCircle(x-r*.21,y-r*.36,r*.13);
  g.fillCircle(x+r*.21,y-r*.36,r*.13);
  g.lineStyle(2,0xc2d8df);g.lineBetween(x,y-r*.86,x,y-r*1.27);
  g.fillStyle(0xffdd67);g.fillCircle(x,y-r*1.35,r*.2);
}
function mountain(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number):void{
  g.fillStyle(0x334f51,.22);g.fillEllipse(x,y+16,r*1.95,r*.55);
  g.fillStyle(0x967e65);g.fillTriangle(x-r*.95,y+r*.31,x-r*.08,y-r*1.35,x+r*.97,y+r*.31);
  g.fillStyle(0xb09a78);g.fillTriangle(x-r*.27,y+r*.3,x-r*.08,y-r*1.35,x+r*.97,y+r*.31);
  g.fillStyle(0xd3b992);g.fillTriangle(x-r*.53,y+r*.29,x-r*.08,y-r*1.35,x+r*.24,y+r*.29);
  g.fillStyle(0xf5f7eb);g.fillTriangle(x-r*.33,y-r*.83,x-r*.08,y-r*1.35,x+r*.16,y-r*.86);
  g.fillStyle(0xe6f3f6);g.fillEllipse(x-r*.35,y-r*.76,r*.6,r*.12);
}
function ruins(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number):void{
  g.fillStyle(0x254d46,.2);g.fillEllipse(x,y+6,r*2.4,r*.45);
  for(let i=0;i<3;i++){
    const xx=x+(i-1)*r*.62;
    g.fillStyle(i%2?0xdbdec4:0xf3ecce);
    g.fillRoundedRect(xx-r*.2,y-r*.9,r*.4,r*.95,2);
    g.fillStyle(0x9ca89c);g.fillRect(xx-r*.22,y-r*.94,r*.44,r*.17);
  }
  g.fillStyle(0xeddfb8);g.fillRoundedRect(x-r*.96,y-r*1.08,r*1.92,r*.27,2);
  g.fillStyle(0x86a980);g.fillEllipse(x+r*.92,y-r*.82,r*.42,r*.25);
}
function lighthouse(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number):void{
  g.fillStyle(0xf0eee4);g.fillPoints([point(x-r*.30,y),point(x+r*.30,y),point(x+r*.19,y-r*1.6),point(x-r*.20,y-r*1.6)],true);
  g.fillStyle(0xdf5e58);g.fillRoundedRect(x-r*.25,y-r*1.1,r*.5,r*.22,2);
  g.fillStyle(0xdf5e58);g.fillRoundedRect(x-r*.19,y-r*.48,r*.39,r*.22,2);
  g.fillStyle(0xf5bd6c);g.fillRoundedRect(x-r*.27,y-r*1.75,r*.54,r*.21,3);
  g.fillStyle(0xb54557);g.fillTriangle(x-r*.37,y-r*1.75,x,y-r*2.14,x+r*.37,y-r*1.75);
}
function chest(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number):void{
  g.fillStyle(0xffdf61,.17);g.fillCircle(x,y,r*1.55);
  g.fillStyle(0xf8db58,.3);g.fillEllipse(x,y+r*.44,r*2,r*.66);
  g.fillStyle(0x7d412b);g.fillRoundedRect(x-r*.79,y-r*.31,r*1.6,r*.86,r*.16);
  g.fillStyle(0xc97835);g.fillRoundedRect(x-r*.76,y-r*.56,r*1.54,r*.57,r*.18);
  g.lineStyle(Math.max(1,r*.12),0xfbd66d,1);g.strokeRoundedRect(x-r*.76,y-r*.56,r*1.54,r*1.09,r*.17);
  g.fillStyle(0xffe17a);g.fillRoundedRect(x-r*.11,y-r*.34,r*.22,r*.69,r*.08);
  g.fillStyle(0xfff1ae);g.fillCircle(x,y+.04*r,r*.1);
}
function special(g:Phaser.GameObjects.Graphics,kind:Ground,x:number,y:number,r:number):void{
  if(kind==='CLIFF'||kind==='VOLCANO'){mountain(g,x,y,r*.9);return;}
  if(kind==='DESERT'){
    g.fillStyle(0xdeb36c);g.fillEllipse(x,y+r*.15,r*1.8,r*.6);
    g.fillStyle(0xf7e6a3);g.fillTriangle(x-r*.8,y+r*.32,x,y-r*.6,x+r*.8,y+r*.32);
    return;
  }
  if(kind==='WATER'){
    g.fillStyle(0xa1edff,.72);g.fillEllipse(x,y,r*1.8,r*.55);
    g.lineStyle(2,0xe4ffff,.8);g.lineBetween(x-r*.52,y,x+r*.6,y-r*.12);
    return;
  }
  if(kind==='ICE'){
    g.fillStyle(0xc9f7ff);g.fillTriangle(x-r*.55,y+r*.24,x,y-r*.85,x+r*.56,y+r*.24);return;
  }
  tree(g,x,y,r*.52);
}
function drawSea(g:Phaser.GameObjects.Graphics,w:number,h:number):void{
  g.fillGradientStyle(0x1a7eb2,0x1784ba,0x0b5e91,0x0d5a8d,1);
  g.fillRect(0,0,w,h);
  for(let i=0;i<75;i++){
    const x=hash(i*3.7)*w,y=hash(i*2.33+100)*h;
    const p=waterWave(i);
    g.lineStyle(i%7===0?2:1,i%7===0?0xd4ffff:0x6ed3e6,.15+p*.28);
    g.lineBetween(x,y,x+9+p*16,y-1.3);
  }
  for(let i=0;i<4;i++){
    const x=[.08,.94,.14,.91][i]*w,y=[.15,.22,.81,.82][i]*h;
    const r=Math.max(8,w*.032);
    g.fillStyle(0xb1edec,.55);g.fillEllipse(x,y+6,r*2.7,r*.72);
    g.fillStyle(0xd7c79b);g.fillEllipse(x,y+2,r*2.1,r*.8);
    g.fillStyle(0x5ca66b);g.fillEllipse(x,y,r*1.7,r*.76);
  }
}
export function drawWorldIsland(args:{
  scene:Phaser.Scene;parent:Phaser.GameObjects.Container;
  width:number;height:number;state:GameState|null;
  rotation:number;selectedSpot:string|null;onSelect:(id:string)=>void;
}):void{
  const {scene,parent,width:w,height:h,state,rotation,selectedSpot,onSelect}=args;
  const g=scene.add.graphics();parent.add(g);
  drawSea(g,w,h);
  const cx=w*.5,cy=h*.535;
  const rx=Math.min(w*.445,280),ry=Math.min(h*.36,300);
  const center={x:cx,y:cy};

  // Layered perimeter gives the island a raised diorama-like coast.
  g.fillStyle(0x0b4b6b,.55);g.fillEllipse(cx,cy+19,rx*2.18,ry*2.12);
  g.fillStyle(0x83d6da,.88);g.fillEllipse(cx,cy+15,rx*2.15,ry*2.05);
  g.fillStyle(0xd8a96b);g.fillEllipse(cx,cy+11,rx*2.02,ry*1.98);
  g.fillStyle(0x82684d);g.fillEllipse(cx,cy+13,rx*1.92,ry*1.83);
  g.fillStyle(0xf4df9c);g.fillEllipse(cx,cy-4,rx*1.99,ry*1.82);
  g.fillStyle(0x4fa56f);g.fillEllipse(cx,cy-11,rx*1.83,ry*1.76);
  g.fillStyle(0x75c56b);g.fillEllipse(cx-rx*.18,cy-ry*.28,rx*1.21,ry*1.05);
  g.fillStyle(0x3f9e6a);g.fillEllipse(cx+rx*.26,cy+ry*.21,rx*1.37,ry*.96);
  g.fillStyle(0x91d277,.47);g.fillEllipse(cx-rx*.21,cy-ry*.24,rx*.72,ry*.51);

  // Distinct environmental landmarks are oriented along with the map.
  const landmarks=[
    {x:1,y:0,type:'mountain'},{x:0,y:2,type:'forest'},
    {x:4,y:0,type:'ruins'},{x:4,y:3,type:'lighthouse'},
    {x:2,y:4,type:'forest'},{x:1,y:3,type:'waterfall'}
  ] as const;
  const scale=clamp(w/410,.73,1.4);
  for(const l of landmarks){
    const p=mapProjection(l.x,l.y,rotation,center,rx,ry);
    if(l.type==='mountain')mountain(g,p.x,p.y,50*scale);
    else if(l.type==='ruins')ruins(g,p.x,p.y,18*scale);
    else if(l.type==='lighthouse')lighthouse(g,p.x,p.y,22*scale);
    else if(l.type==='waterfall'){
      g.fillStyle(0x60caed);g.fillEllipse(p.x,p.y+8,34*scale,43*scale);
      g.lineStyle(3,0xc4faff,.87);
      g.lineBetween(p.x-8*scale,p.y-6*scale,p.x-5*scale,p.y+17*scale);
      g.lineBetween(p.x+4*scale,p.y-10*scale,p.x+6*scale,p.y+15*scale);
    } else for(let i=0;i<4;i++)tree(g,p.x+(i-1.5)*11*scale,p.y+i%2*4*scale,13*scale,i%2);
  }

  // The decorative board route follows the entire coastline; every tile
  // is real TILES data. Avatars are taken from the authoritative game state.
  for(let i=0;i<TILES.length;i++){
    const p=perimeterPoint(i,center,rx*.97,ry*.92,rotation);
    const before=perimeterPoint((i+TILES.length-1)%TILES.length,center,rx*.97,ry*.92,rotation);
    const after=perimeterPoint((i+1)%TILES.length,center,rx*.97,ry*.92,rotation);
    const a={x:(before.x+p.x)*.5,y:(before.y+p.y)*.5};
    const b={x:(after.x+p.x)*.5,y:(after.y+p.y)*.5};
    const tangent={x:b.x-a.x,y:b.y-a.y};
    const len=Math.max(1,Math.hypot(tangent.x,tangent.y));
    const nx=-tangent.y/len,ny=tangent.x/len;
    const depth=.62+.37*(p.y-(cy-ry))/(ry*2);
    const thick=Math.max(5,13*scale*depth);
    const shape=[
      point(a.x+nx*thick,a.y+ny*thick),point(b.x+nx*thick,b.y+ny*thick),
      point(b.x-nx*thick,b.y-ny*thick),point(a.x-nx*thick,a.y-ny*thick)
    ];
    const owner=state?.galleries.find(item=>item.tile===i)?.ownerId;
    const home=owner?state?.players.find(pl=>pl.id===owner):undefined;
    const paint=home?color(home.color):TILE_COLORS[TILES[i]];
    g.fillStyle(0x345368,.8);g.fillPoints(shape.map(a=>point(a.x+1,a.y+3)),true);
    g.fillStyle(paint,1);g.fillPoints(shape,true);
    g.lineStyle(1.5,0xf8fff4,.9);g.strokePoints(shape,true);
    if(TILES[i]==='SHOP'||TILES[i]==='START'){
      g.fillStyle(TILES[i]==='START'?0xffef95:0xc26f40);
      g.fillCircle(p.x,p.y,3.4*scale);
    }
  }

  // Read-only active robot routes start at the owner's actual board tile,
  // not from an arbitrary point in the island center.
  if(state)for(const player of state.players){
    const mission=player.robot.mission;
    if(!mission)continue;
    const site=state.islandSpots.find(spot=>spot.id===mission.siteId);
    if(!site)continue;
    // Use immutable dispatch tile A, never the owner's new board position B.
    // Legacy missions created before v0.14 lack launchTile and must fall back.
    const sourceTile=mission.launchTile??player.position;
    const start=perimeterPoint(sourceTile,center,rx*.95,ry*.89,rotation);
    const end=mapProjection(site.x,site.y,rotation,center,rx,ry);
    const progress=mission.phase==='OUTBOUND'?expeditionProgress(mission):
      mission.phase==='SEARCH'?1:1-expeditionProgress(mission);
    const p=robotOnRoute(start,end,progress);
    const num=Math.max(9,Math.ceil(Math.hypot(start.x-end.x,start.y-end.y)/17));
    for(let i=0;i<=num;i++){
      const at=robotOnRoute(start,end,i/num);
      g.fillStyle(0x4be4fb,.26);g.fillCircle(at.x,at.y,6*scale);
      g.fillStyle(i/num<=progress?0xd7ffff:0x6bb4c0,i/num<=progress?1:.6);
      g.fillCircle(at.x,at.y,2.4*scale);
    }
    // Make the fixed dispatch point visible even after the owner moves away.
    g.fillStyle(0xffd57f,.34);g.fillCircle(start.x,start.y,7.5*scale);
    g.lineStyle(2,0xffffff,.95);g.strokeCircle(start.x,start.y,5.2*scale);
    robot(g,p.x,p.y,11*scale,color(player.color));
  }

  // Locations are user-selectable. Do not bake targets or character positions
  // into a static illustration: actions must always correspond to real IDs.
  if(state){
    for(const spot of state.islandSpots){
      const p=mapProjection(spot.x,spot.y,rotation,center,rx,ry);
      if(spot.kind!=='LOCATION'&&!spot.depleted){
        const isKeeper=spot.kind==='KEEPER';
        marker(g,scene,parent,p.x,p.y,8*scale,isKeeper?0x9f5f92:0xe7a841,isKeeper?'⚔':'◆');
      } else if(!spot.depleted){
        g.fillStyle(0xf3ecbf,.38);g.fillCircle(p.x,p.y,3.8*scale);
      }
      if(spot.depleted){
        g.lineStyle(2,0xdbf6eb,.63);g.strokeCircle(p.x,p.y,5*scale);
      }
      if(spot.id===selectedSpot){
        g.fillStyle(0xffd862,.12);g.fillCircle(p.x,p.y,25*scale);
        g.lineStyle(3,0xffef8c,1);g.strokeCircle(p.x,p.y,17*scale);
        drawLabel(scene,parent,p.x,p.y-26*scale,'▼',15*scale,'#fff5a1');
        if(!spot.depleted && spot.kind!=='LOCATION')chest(g,p.x,p.y-7*scale,9*scale);
      }
      const hit=scene.add.circle(p.x,p.y,Math.max(13,18*scale),0x000000,0)
        .setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>onSelect(spot.id));
      parent.add(hit);
    }
    for(const pl of state.players){
      const p=perimeterPoint(pl.position,center,rx*.97,ry*.92,rotation);
      const ordinal=state.players.filter(other=>other.position===pl.position).indexOf(pl);
      const x=p.x+(ordinal%2===0?-8:9)*scale;
      const y=p.y+((ordinal/2)|0)*10*scale;
      avatar(g,x,y,10*scale,color(pl.color));
      if(!pl.robot.mission)robot(g,x+14*scale,y+2*scale,7*scale,color(pl.color));
    }
  }
}
