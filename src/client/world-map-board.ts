import * as THREE from 'three';
import {TILES} from '../engine/types.ts';
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
  scene.add(group);
  let previous:string[]=[];
  const color=new THREE.Color();
  return {
    group,
    sync(state){
      const palette=TILES.map((type,i)=>{
        const owner=state?.galleries.find(g=>g.tile===i)?.ownerId;
        const player=owner?state?.players.find(p=>p.id===owner):undefined;
        return player?.color??('#'+BASE_COLOURS[type].toString(16).padStart(6,'0'));
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
