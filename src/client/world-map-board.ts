import * as THREE from 'three';
import {TILES} from '../engine/types.ts';
import {galleryNumberAt,GALLERY_COLORS} from '../engine/gallery.ts';
import type {GameState} from '../engine/types.ts';

/**
 * Depth-tested real 3D board ring. Phaser remains authoritative for markers,
 * hit targets and game rules, but does not paint flat tile polygons in 3D mode.
 * A shared mesh means hills/landmarks naturally occlude distant ring tiles.
 */
export interface WorldBoard3D {
  readonly group:THREE.Group;
  sync(state:GameState|null):void;
}

const BASE_COLOURS:Record<(typeof TILES)[number],number>={
  START:0xffd56b,SHOP:0xf8d06d,GALLERY:0xb4e9f6,
  EVENT:0xeaaaee,SUPPORT:0x92f0a3,PLAIN:0x8fb9f6
};
export const BOARD_SURFACE_Y=.54;
const STEPS=TILES.length;
const ANGLE_OFFSET=Math.PI/2-Math.PI/4;
const HALF_SPAN=Math.PI/STEPS*.93;

function quad(index:number,y:number,inner:number,outer:number):THREE.Vector3[]{
  const center=ANGLE_OFFSET+index/STEPS*Math.PI*2;
  const a=center-HALF_SPAN,b=center+HALF_SPAN;
  const v=(r:number,theta:number)=>new THREE.Vector3(
    Math.cos(theta)*r,y,Math.sin(theta)*r
  );
  return [v(outer,a),v(outer,b),v(inner,b),v(inner,a)];
}

/** Surface geometry uses the same 28-tile azimuth and radius as the actors. */
export function tileBoardCorners(index:number):THREE.Vector3[]{
  return quad(index,BOARD_SURFACE_Y,3.33,3.63);
}
function makeRing(inner:number,outer:number,y:number,colored:boolean):THREE.BufferGeometry {
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];
  for(let i=0;i<STEPS;i++){
    const corners=quad(i,y,inner,outer);
    const origin=positions.length/3;
    for(const p of corners){
      positions.push(p.x,p.y,p.z);
      if(colored)colors.push(1,1,1);
    }
    // Double sided material supports arbitrary winding (camera can orbit).
    indices.push(origin,origin+1,origin+2,origin,origin+2,origin+3);
  }
  const g=new THREE.BufferGeometry();
  g.setIndex(indices);
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(colored)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.computeVertexNormals();
  return g;
}
function makeSides(top:number,bottom:number):THREE.BufferGeometry{
  const pos:number[]=[],indices:number[]=[];
  for(let i=0;i<STEPS;i++){
    const high=quad(i,top,3.28,3.68);
    const low=quad(i,bottom,3.28,3.68);
    for(const [a,b] of [[0,1],[2,3],[1,2],[3,0]]){
      const o=pos.length/3;
      for(const v of [high[a],high[b],low[b],low[a]])
        pos.push(v.x,v.y,v.z);
      indices.push(o,o+1,o+2,o,o+2,o+3);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setIndex(indices);
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.computeVertexNormals();
  return g;
}
function makeTileMarkers():THREE.Mesh{
  const pos:number[]=[],colors:number[]=[],indices:number[]=[];
  const rgb=new THREE.Color();
  for(let tile=0;tile<STEPS;tile++){
    const type=TILES[tile];
    if(type!=='START'&&type!=='SHOP')continue;
    const theta=ANGLE_OFFSET+tile/STEPS*Math.PI*2;
    const centre=new THREE.Vector3(Math.cos(theta)*3.48,.558,Math.sin(theta)*3.48);
    rgb.setHex(type==='START'?0xfff39c:0xb7733c);
    const offset=pos.length/3;
    pos.push(centre.x,centre.y,centre.z);
    colors.push(rgb.r,rgb.g,rgb.b);
    for(let i=0;i<=12;i++){
      const a=i/12*Math.PI*2;
      pos.push(centre.x+Math.cos(a)*.052,centre.y,centre.z+Math.sin(a)*.052);
      colors.push(rgb.r,rgb.g,rgb.b);
      if(i>0)indices.push(offset,offset+i,offset+i+1);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    vertexColors:true,side:THREE.DoubleSide
  }));
  mesh.name='worldmap-tile-type-markers';
  return mesh;
}
/**
 * Seven-segment digits are native 3D geometry. Their depth is tested against
 * mountains, landmark models and the board, with no screen-space label drift.
 */
export function makeGalleryDigits():THREE.Mesh{
  const glyph:Record<string,number[]>={
    '1':[1,2],'2':[0,1,6,4,3],'3':[0,1,6,2,3],
    '4':[5,6,1,2],'5':[0,5,6,2,3]
  };
  const segments=[
    [-.05,.092,.05,.092],[.052,.09,.052,.0],[.052,0,.052,-.09],
    [-.05,-.093,.05,-.093],[-.052,0,-.052,-.09],
    [-.052,.09,-.052,0],[-.05,0,.05,0]
  ];
  const pos:number[]=[],idx:number[]=[];
  const width=.022;
  for(let tile=0;tile<STEPS;tile++){
    const n=galleryNumberAt(tile);if(!n)continue;
    const angle=ANGLE_OFFSET+tile/STEPS*Math.PI*2;
    // Tangent is the left/right glyph axis. Radial is glyph vertical.
    const tangent=new THREE.Vector2(-Math.sin(angle),Math.cos(angle));
    const radial=new THREE.Vector2(Math.cos(angle),Math.sin(angle));
    const centre=new THREE.Vector2(Math.cos(angle)*3.48,Math.sin(angle)*3.48);
    const add=(x:number,z:number)=>{
      const p=centre.clone().addScaledVector(tangent,x).addScaledVector(radial,z);
      pos.push(p.x,.573,p.y);
    };
    for(const part of glyph[String(n)]){
      const [x1,y1,x2,y2]=segments[part];
      const dx=x2-x1,dy=y2-y1;
      const len=Math.hypot(dx,dy);
      const nx=-dy/len*width/2,ny=dx/len*width/2;
      const o=pos.length/3;
      add(x1+nx,y1+ny);add(x2+nx,y2+ny);
      add(x2-nx,y2-ny);add(x1-nx,y1-ny);
      idx.push(o,o+1,o+2,o,o+2,o+3);
    }
  }
  const geom=new THREE.BufferGeometry();
  geom.setIndex(idx);
  geom.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geom.computeVertexNormals();
  const m=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({
    color:0x23364a,side:THREE.DoubleSide,depthTest:true,depthWrite:true
  }));
  m.name='worldmap-gallery-numbers';
  return m;
}
export function createWorldBoard3D(scene:THREE.Scene):WorldBoard3D{
  const group=new THREE.Group();
  group.name='worldmap-board-3d';
  const skirt=new THREE.Mesh(makeSides(.517,.415),
    new THREE.MeshStandardMaterial({color:0x815a38,roughness:1,side:THREE.DoubleSide}));
  skirt.receiveShadow=true;group.add(skirt);
  const trim=new THREE.Mesh(makeRing(3.28,3.68,.518,false),
    new THREE.MeshStandardMaterial({color:0xe3bb73,roughness:.84,side:THREE.DoubleSide}));
  trim.receiveShadow=true;group.add(trim);
  const tileGeometry=makeRing(3.33,3.63,BOARD_SURFACE_Y,true);
  const top=new THREE.Mesh(tileGeometry,new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,roughness:.88,
    metalness:0,side:THREE.DoubleSide
  }));
  top.name='worldmap-board-colors';
  top.receiveShadow=true;group.add(top);
  group.add(makeTileMarkers());
  group.add(makeGalleryDigits());
  scene.add(group);
  let previous:string[]=[];
  const color=new THREE.Color();
  return {
    group,
    sync(state){
      const palette=TILES.map((type,i)=>{
        const number=galleryNumberAt(i);
        if(!number)return '#'+BASE_COLOURS[type].toString(16).padStart(6,'0');
        const gallery=state?.galleries.find(g=>g.number===number);
        const occupied=gallery?Object.values(gallery.displaysByPlayerId)
          .reduce((n,row)=>n+row.length,0):0;
        const c=new THREE.Color(GALLERY_COLORS[number]);
        // A subtle fill highlight, while preserving stable number identity.
        if(occupied)c.lerp(new THREE.Color(0xffe6b1),Math.min(.18,occupied*.009));
        return '#'+c.getHexString();
      });
      if(palette.every((c,i)=>c===previous[i]))return;
      previous=palette;
      const attribute=tileGeometry.getAttribute('color') as THREE.BufferAttribute;
      for(let i=0;i<STEPS;i++){
        color.set(palette[i]);
        for(let k=0;k<4;k++)attribute.setXYZ(i*4+k,color.r,color.g,color.b);
      }
      attribute.needsUpdate=true;
    }
  };
}
