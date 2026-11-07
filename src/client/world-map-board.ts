import * as THREE from 'three';
import {TILES,boardTiles} from '../engine/types.ts';
import type {GameState,TileType} from '../engine/types.ts';
import {galleryNumberAt} from '../engine/gallery.ts';
import {boardTileBaseColor} from '../engine/player-palette.ts';
import {boardPathFrame,boardPathQuad} from '../engine/map-shapes.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';

/** The ring is rebuilt only when the immutable match board layout changes.
 * The same dynamic layout drives all cameras, markers and Gallery digits.
 */
export interface WorldBoard3D {
 readonly group:THREE.Group;
 sync(state:GameState|null):void;
}
export const BOARD_SURFACE_Y=.54;
function quad(index:number,y:number,inner:number,outer:number,count:number,
 shape:MapShapeId='RING'):THREE.Vector3[]{
 return boardPathQuad(index,count,shape,inner,outer)
  .map(p=>new THREE.Vector3(p.x,y,p.z));
}
/** Exact same shape and tile centers are used by island board and actor anchors. */
export function tileBoardCorners(index:number,count=TILES.length,
 shape:MapShapeId='RING',y=BOARD_SURFACE_Y,inner=3.33,outer=3.63):THREE.Vector3[]{
 return quad(index,y,inner,outer,count,shape);
}
function makeRing(inner:number,outer:number,y:number,count:number,
 shape:MapShapeId='RING',colored=false):THREE.BufferGeometry{
 const pos:number[]=[],faces:number[]=[],colors:number[]=[];
 for(let i=0;i<count;i++){
  const verts=quad(i,y,inner,outer,count,shape),start=pos.length/3;
  for(const v of verts){pos.push(v.x,v.y,v.z);if(colored)colors.push(1,1,1);}
  faces.push(start,start+1,start+2,start,start+2,start+3);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 if(colored)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(faces);geometry.computeVertexNormals();return geometry;
}
function makeSides(top:number,bottom:number,count:number,shape:MapShapeId):THREE.BufferGeometry{
 const pos:number[]=[],idx:number[]=[];
 for(let i=0;i<count;i++){
  const hi=quad(i,top,3.28,3.68,count,shape),lo=quad(i,bottom,3.28,3.68,count,shape);
  for(const [a,b] of [[0,1],[2,3],[1,2],[3,0]]){
   const k=pos.length/3;
   for(const v of [hi[a],hi[b],lo[b],lo[a]])pos.push(v.x,v.y,v.z);
   idx.push(k,k+1,k+2,k,k+2,k+3);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geometry.setIndex(idx);geometry.computeVertexNormals();return geometry;
}
function makeTileMarkers(tiles:readonly TileType[],shape:MapShapeId):THREE.Mesh{
 const pos:number[]=[],rgb:number[]=[],faces:number[]=[];
 const color=new THREE.Color();
 for(let tile=0;tile<tiles.length;tile++){
  const type=tiles[tile];if(type!=='START'&&type!=='SHOP')continue;
  const frame=boardPathFrame(tile/tiles.length,shape);
  const cx=frame.x,cz=frame.z,idx=pos.length/3;
  color.setHex(type==='START'?0xfff39c:0xb7733c);
  pos.push(cx,.558,cz);rgb.push(color.r,color.g,color.b);
  for(let j=0;j<=12;j++){
   const theta=j/12*Math.PI*2;
   pos.push(cx+Math.cos(theta)*.052,.558,cz+Math.sin(theta)*.052);
   rgb.push(color.r,color.g,color.b);
   if(j>0)faces.push(idx,idx+j,idx+j+1);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setIndex(faces);
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
 mesh.name='worldmap-tile-type-markers';return mesh;
}
/** Native 3D seven-segment numbers remain depth-tested at every map size. */
export function makeGalleryDigits(state?:GameState|null):THREE.Mesh{
 const tiles=boardTiles(state),count=tiles.length;
 const shape=state?.board?.shapeId??'RING';
 const glyph:Record<string,number[]>={
  '1':[1,2],'2':[0,1,6,4,3],'3':[0,1,6,2,3],
  '4':[5,6,1,2],'5':[0,5,6,2,3]
 };
 const segments=[
  [-.05,.092,.05,.092],[.052,.09,.052,0],[.052,0,.052,-.09],
  [-.05,-.093,.05,-.093],[-.052,0,-.052,-.09],
  [-.052,.09,-.052,0],[-.05,0,.05,0],[-.05,0,.05,0]
 ];
 const scale=Math.min(1,28/count),width=.022*scale;
 const pos:number[]=[],idx:number[]=[];
 for(let tile=0;tile<count;tile++){
  const n=galleryNumberAt(tile,state);if(!n)continue;
  const frame=boardPathFrame(tile/count,shape);
  const tangent=new THREE.Vector2(frame.tx,frame.tz);
  const radial=new THREE.Vector2(frame.nx,frame.nz);
  const centre=new THREE.Vector2(frame.x,frame.z);
  const add=(x:number,z:number)=>{
   const p=centre.clone().addScaledVector(tangent,x*scale).addScaledVector(radial,z*scale);
   pos.push(p.x,.573,p.y);
  };
  for(const part of glyph[String(n)]??[]){
   const [x1,y1,x2,y2]=segments[part],dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
   const nx=-dy/len*width/2,ny=dx/len*width/2,k=pos.length/3;
   add(x1+nx,y1+ny);add(x2+nx,y2+ny);add(x2-nx,y2-ny);add(x1-nx,y1-ny);
   idx.push(k,k+1,k+2,k,k+2,k+3);
  }
 }
 const geo=new THREE.BufferGeometry();geo.setIndex(idx);
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({
  color:0x23364a,side:THREE.DoubleSide,depthTest:true,depthWrite:true
 }));
 mesh.name='worldmap-gallery-numbers';return mesh;
}
export function createWorldBoard3D(scene:THREE.Scene):WorldBoard3D{
 const group=new THREE.Group();group.name='worldmap-board-3d';scene.add(group);
 let tileGeometry:THREE.BufferGeometry,count=0,layoutKey='',previous:string[]=[];
 const clear=()=>{
  for(const obj of [...group.children]){
   group.remove(obj);
   if(!(obj instanceof THREE.Mesh))continue;
   obj.geometry.dispose();
   for(const material of Array.isArray(obj.material)?obj.material:[obj.material])material.dispose();
  }
 };
 const build=(state:GameState|null)=>{
  clear();
  const tiles=boardTiles(state);count=tiles.length;
  const shape=state?.board?.shapeId??'RING';
  const skirt=new THREE.Mesh(makeSides(.517,.415,count,shape),
   new THREE.MeshStandardMaterial({color:0x815a38,roughness:1,side:THREE.DoubleSide}));
  skirt.receiveShadow=true;group.add(skirt);
  const trim=new THREE.Mesh(makeRing(3.28,3.68,.518,count,shape),
   new THREE.MeshStandardMaterial({color:0xe3bb73,roughness:.84,side:THREE.DoubleSide}));
  trim.receiveShadow=true;group.add(trim);
  tileGeometry=makeRing(3.33,3.63,BOARD_SURFACE_Y,count,shape,true);
  const top=new THREE.Mesh(tileGeometry,new THREE.MeshStandardMaterial({
   color:0xffffff,vertexColors:true,roughness:.88,metalness:0,
   side:THREE.DoubleSide
  }));
  top.name='worldmap-board-colors';top.receiveShadow=true;group.add(top);
  group.add(makeTileMarkers(tiles,shape));group.add(makeGalleryDigits(state));
  previous=[];
 };
 build(null);
 layoutKey='legacy';
 return {
  group,
  sync(state){
   const nextKey=state?.board?
    'generated-'+state.board.galleryCount+'-'+(state.board.shapeId??'RING'):
    'legacy';
   if(nextKey!==layoutKey || boardTiles(state).length!==count){
    build(state);layoutKey=nextKey;
   }
   const palette=boardTiles(state).map((_,i)=>boardTileBaseColor(i,state));
   if(palette.every((c,i)=>c===previous[i]))return;
   previous=palette;
   const attribute=tileGeometry.getAttribute('color') as THREE.BufferAttribute;
   const rgb=new THREE.Color();
   for(let i=0;i<count;i++){
    rgb.set(palette[i]);
    for(let j=0;j<4;j++)attribute.setXYZ(i*4+j,rgb.r,rgb.g,rgb.b);
   }
   attribute.needsUpdate=true;
  }
 };
}
