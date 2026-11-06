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
  // Two original Phaser silhouettes: broadleaf crowns and coastal conifers.
  // The projected anchor is always the trunk's ground point.
  g.fillStyle(0x173e3c,.27);g.fillEllipse(x,y+r*.22,r*2.05,r*.44);
  g.fillStyle(0x6c4e32);g.fillRoundedRect(x-r*.13,y-r*.65,r*.26,r*.81,r*.1);
  if(shade%4===3){
    g.fillStyle(0x1c554d);
    g.fillTriangle(x-r*.64,y-r*.26,x,y-r*2.20,x+r*.64,y-r*.26);
    g.fillStyle(0x317565);
    g.fillTriangle(x-r*.52,y-r*.67,x-r*.03,y-r*2.25,x+r*.50,y-r*.67);
    g.fillStyle(0x4d9a74);
    g.fillTriangle(x-r*.36,y-r*1.05,x-r*.08,y-r*2.27,x+r*.28,y-r*1.05);
  }else{
    const palette=shade%2===0?[0x235f4e,0x378461,0x57a978]:
      [0x1d574a,0x2b7457,0x489b68];
    g.fillStyle(palette[0]);
    g.fillCircle(x-r*.43,y-r*1.11,r*.66);
    g.fillCircle(x+r*.42,y-r*1.05,r*.73);
    g.fillCircle(x,y-r*1.52,r*.70);
    g.fillStyle(palette[1]);
    g.fillCircle(x-r*.45,y-r*1.39,r*.48);
    g.fillCircle(x+r*.32,y-r*1.39,r*.58);
    g.fillCircle(x-r*.06,y-r*1.75,r*.54);
    g.fillStyle(palette[2],.85);
    g.fillEllipse(x-r*.25,y-r*1.76,r*.68,r*.29);
    g.fillCircle(x+r*.26,y-r*1.72,r*.21);
  }
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
  // Hand-drawn stepped mesa. Layers share a ground anchor, so the same mesa
  // can be re-projected at 0/90/180/270 degrees without alternate images.
  g.fillStyle(0x214f47,.29);g.fillEllipse(x,y+r*.30,r*2.25,r*.53);
  const tier=(cx:number,base:number,half:number,height:number,tint:number)=>{
    const top=base-height;
    // Dark left and sunlit right cliff faces with irregular facet edges.
    g.fillStyle(0x71543e);
    g.fillPoints([
      point(cx-half,top+r*.065),point(cx-half*.23,top-r*.095),
      point(cx,top-r*.055),point(cx,base+r*.08),
      point(cx-half*.56,base+r*.17),point(cx-half*.96,base-r*.01)
    ],true);
    g.fillStyle(0xb08b61);
    g.fillPoints([
      point(cx,top-r*.055),point(cx+half*.44,top-r*.12),
      point(cx+half,top+r*.025),point(cx+half*.89,base-r*.12),
      point(cx+half*.42,base+r*.13),point(cx,base+r*.08)
    ],true);
    g.fillStyle(0x896b4e);
    g.fillPoints([
      point(cx-half*.45,top-r*.03),point(cx-half*.12,top-r*.09),
      point(cx+half*.08,base+r*.06),point(cx-half*.16,base+r*.12)
    ],true);
    g.fillStyle(0xc8a77a,.75);
    g.fillPoints([
      point(cx+half*.44,top-r*.12),point(cx+half*.65,top-r*.035),
      point(cx+half*.43,base+r*.10),point(cx+half*.28,base+r*.10)
    ],true);
    // Flattened grassy top is the defining characteristic of the reference.
    g.fillStyle(0x365a42);
    g.fillEllipse(cx,top-r*.02,half*2.05,r*.30);
    g.fillStyle(tint);
    g.fillEllipse(cx-r*.015,top-r*.06,half*1.86,r*.20);
    g.lineStyle(Math.max(1,r*.022),0xe5c796,.50);
    g.lineBetween(cx-half*.60,top+r*.08,cx-half*.35,top+r*.10);
    g.lineBetween(cx+half*.33,top+r*.08,cx+half*.61,top+r*.02);
  };
  tier(x,y+r*.16,r*.90,r*.72,0x6e9257);
  tier(x+r*.07,y-r*.30,r*.67,r*.67,0x829d63);
  tier(x-r*.03,y-r*.82,r*.40,r*.60,0x8fa771);
  // Narrow vertical rock fractures, never a raster texture.
  g.lineStyle(Math.max(1,r*.022),0x604b3c,.38);
  g.lineBetween(x-r*.52,y-r*.23,x-r*.43,y+r*.04);
  g.lineBetween(x+r*.56,y-r*.20,x+r*.49,y+r*.04);
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
function coast(g:Phaser.GameObjects.Graphics,cx:number,cy:number,rx:number,ry:number,
  offsetY:number,turns:number,fill:number):void{
  // One shoreline shape sampled in model-space. Rotation changes which
  // original coastal bumps face the camera without changing logical anchors.
  const ring:Phaser.Geom.Point[]=[];
  for(let i=0;i<72;i++){
    const theta=i*Math.PI*2/72,worldTheta=theta+turns*Math.PI*.5;
    const jitter=1+.014*Math.sin(worldTheta*5+.3)+.012*Math.sin(worldTheta*9+1.7);
    ring.push(point(cx+Math.cos(theta)*rx*jitter,cy+offsetY+Math.sin(theta)*ry*jitter));
  }
  g.fillStyle(fill);
  g.fillPoints(ring,true);
}
/**
 * Lightweight procedural grass detail, drawn as Phaser vectors. Points are
 * generated once from deterministic model-space coordinates and transformed
 * through the same quarter-turn convention as mapProjection().
 * No downloaded textures, sprites or independent camera images are involved.
 */
function drawProceduralGrass(
  g:Phaser.GameObjects.Graphics,
  cx:number,cy:number,rx:number,ry:number,rotation:number
):void{
  const turns=((rotation%4)+4)%4;
  const scale=clamp(rx/165,.74,1.34);
  for(let i=0;i<108;i++){
    const angle=hash(i*2.31+17)*Math.PI*2;
    const radius=Math.sqrt(hash(i*3.87+21))*.86;
    let u=Math.cos(angle)*radius,v=Math.sin(angle)*radius;
    for(let k=0;k<turns;k++)[u,v]=[-v,u];
    const x=cx+u*rx*.92,y=cy-11+v*ry*.84;
    const size=(2.2+hash(i*.71+5)*2.8)*scale;
    // Subtle underpainting imitates a hand-painted meadow at mobile scale.
    g.fillStyle(i%3===0?0x3e9460:0x9aca79,.45);
    g.fillEllipse(x,y,size*4.4,size*1.25);
    if(i%16===0){
      // Tiny clusters of white meadow flowers, independent from Gallery data.
      for(let p=0;p<3;p++){
        const fx=x+(p-1)*size*.62,fy=y+(p%2)*size*.18;
        g.fillStyle(0x335e3e,.40);g.fillEllipse(fx,fy+size*.32,size*1.9,size*.55);
        g.fillStyle(0xfff9dc);
        g.fillCircle(fx-size*.25,fy,size*.40);
        g.fillCircle(fx+size*.25,fy,size*.40);
        g.fillCircle(fx,fy-size*.27,size*.40);
        g.fillStyle(0xf5cf5b);g.fillCircle(fx,fy,size*.23);
      }
    }else{
      // Three leaf blades each with a soft highlight and common ground anchor.
      g.fillStyle(i%4===0?0x2c7651:0x3e9756,.88);
      g.fillTriangle(x-size*.58,y+size*.18,x-size*.69,y-size*1.35,x,y+size*.26);
      g.fillTriangle(x,y+size*.19,x+size*.05,y-size*1.85,x+size*.48,y+size*.24);
      g.fillStyle(0x9fd16b,.75);
      g.fillTriangle(x+size*.12,y+size*.18,x+size*.87,y-size*1.12,x+size*.52,y+size*.31);
    }
  }
}
function drawSea(g:Phaser.GameObjects.Graphics,w:number,h:number):void{
  g.fillGradientStyle(0x1a7eb2,0x1784ba,0x0b5e91,0x0d5a8d,1);
  g.fillRect(0,0,w,h);
  // Small deterministic reflections keep the sea readable on mobile.
  for(let i=0;i<110;i++){
    const x=hash(i*3.7)*w,y=hash(i*2.33+100)*h;
    const p=waterWave(i);
    g.lineStyle(i%9===0?1.6:1,i%9===0?0xe3ffff:0x8bd6e7,.12+p*.29);
    g.lineBetween(x,y,x+6+p*13,y-1);
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
  // The base, grass material and state-driven overlays have separate render
  // layers so the texture never hides board tiles or interactive targets.
  let g=scene.add.graphics();parent.add(g);
  drawSea(g,w,h);
  const cx=w*.5,cy=h*.535;
  // Keep the entire perimeter visible with a safe border on portrait phones.
  const rx=Math.min(w*.40,280),ry=Math.min(h*.35,300);
  const center={x:cx,y:cy};

  // A raised, gently uneven coastline: turquoise surf, golden beach, rocky
  // island wall, and grassy land. Only Phaser vector geometry is used.
  g.fillStyle(0x0b4b6b,.42);g.fillEllipse(cx,cy+21,rx*2.16,ry*2.13);
  coast(g,cx,cy,rx*1.06,ry*1.03,16,rotation,0x83d6da);
  coast(g,cx,cy,rx*1.018,ry*.99,14,rotation,0xd0b17b);
  coast(g,cx,cy,rx*.973,ry*.94,17,rotation,0x745941);
  coast(g,cx,cy,rx*1.004,ry*.96,-2,rotation,0xf1d8a0);
  coast(g,cx,cy,rx*.929,ry*.89,-10,rotation,0x4b9867);
  g.fillStyle(0x74b85f);g.fillEllipse(cx-rx*.20,cy-ry*.25,rx*1.26,ry*1.04);
  g.fillStyle(0x438e63);g.fillEllipse(cx+rx*.27,cy+ry*.18,rx*1.30,ry*.89);
  g.fillStyle(0xa3d27b,.37);g.fillEllipse(cx-rx*.23,cy-ry*.24,rx*.72,ry*.48);

  // Procedural grass is part of the same rotating master-space scenery.
  // The former AI-generated WebP is intentionally not loaded or rendered.
  drawProceduralGrass(g,cx,cy,rx,ry,rotation);

  // Everything above is scenery; all landmarks, board spaces, missions and
  // touch targets remain on their original logical/projection coordinates.
  g=scene.add.graphics();parent.add(g);


  // Shallow lagoon and stream are decorative ground layers only. They share
  // world-space coordinates with terrain anchors and rotate with the camera.
  const lake=mapProjection(2.45,2.1,rotation,center,rx,ry);
  g.fillStyle(0x2e806d,.48);g.fillEllipse(lake.x,lake.y+3,rx*.51,ry*.35);
  g.fillStyle(0x299eb3);g.fillEllipse(lake.x,lake.y,rx*.46,ry*.30);
  g.fillStyle(0x69d8d9,.64);g.fillEllipse(lake.x-rx*.065,lake.y-ry*.044,rx*.26,ry*.095);
  const streamPoints=[[2.45,2.10],[2.8,2.47],[3.13,2.70],[3.38,2.90]]
    .map(([x,y])=>mapProjection(x,y,rotation,center,rx,ry));
  g.lineStyle(Math.max(3,6*clamp(w/410,.73,1.4)),0x2897b2,.90);
  g.strokePoints(streamPoints.map(p=>point(p.x,p.y)),false);
  g.lineStyle(1.8,0xc7f5df,.70);
  g.strokePoints(streamPoints.map(p=>point(p.x-2,p.y-1)),false);

  // Fixed model-space anchors; never create four unrelated image views.
  const landmarks=[
    {x:2.00,y:.60,type:'mountain',size:48},
    {x:1.55,y:2.90,type:'mountain',size:62},
    {x:.65,y:1.25,type:'forest',size:15},
    {x:.42,y:2.55,type:'forest',size:17},
    {x:1.10,y:3.95,type:'forest',size:14},
    {x:3.55,y:1.13,type:'forest',size:14},
    {x:3.45,y:3.25,type:'forest',size:15},
    {x:4.00,y:.18,type:'ruins',size:18},
    {x:3.93,y:3.94,type:'lighthouse',size:20},
    {x:2.57,y:1.70,type:'waterfall',size:18}
  ] as const;
  const scale=clamp(w/410,.73,1.4);
  const projected=landmarks.map(l=>({...l,p:mapProjection(l.x,l.y,rotation,center,rx,ry)}))
    .sort((a,b)=>a.p.y-b.p.y);
  for(const l of projected){
    const {x,y}=l.p;
    if(l.type==='mountain')mountain(g,x,y,l.size*scale);
    else if(l.type==='ruins')ruins(g,x,y,l.size*scale);
    else if(l.type==='lighthouse')lighthouse(g,x,y,l.size*scale);
    else if(l.type==='waterfall'){
      g.fillStyle(0x2e8aa5,.73);g.fillEllipse(x,y+7*scale,27*scale,35*scale);
      g.fillStyle(0xa9ecf5,.85);g.fillEllipse(x-2*scale,y+1*scale,11*scale,28*scale);
      g.lineStyle(2,0xffffff,.72);
      g.lineBetween(x-4*scale,y-9*scale,x-4*scale,y+14*scale);
    }else{
      const count=7;
      for(let i=0;i<count;i++){
        const dx=((i*3)%7-3)*6.5*scale;
        const dy=(Math.floor(i/3)-1)*8.8*scale;
        tree(g,x+dx,y+dy,(l.size+(i%3-1)*2.2)*scale,i);
      }
    }
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
    // Golden-raised board trim and state-driven colored top face.
    g.fillStyle(0x355161,.80);
    g.fillPoints(shape.map(a=>point(a.x+1.2,a.y+4.5*scale)),true);
    g.fillStyle(0xb88941,.92);
    g.fillPoints(shape.map(a=>point(a.x,a.y+2.5*scale)),true);
    g.fillStyle(paint,1);g.fillPoints(shape,true);
    g.lineStyle(1.5,0xfff8d5,.92);g.strokePoints(shape,true);
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
