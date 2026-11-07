import * as THREE from 'three';
import {boardPathFrame} from '../engine/map-shapes.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';
import {RING_CAMP_CLEARING} from './world-map-landmark-layout.ts';
import {terrainRadius,terrainHeight} from './world-map-terrain.ts';
import type {WorldSurfaceLibrary} from './world-map-materials.ts';

/** A stage's solid edge follows EXACTLY the same parametric curve as
 * the board. This closes the exposed water seam between the island and
 * the outermost brown board wall at every camera angle and map shape.
 */
export const STAGE_FOUNDATION_OUTSET=.232;
export const STAGE_APRON_INSET=-.198;
const SEGMENTS=144;
export function stageBoundaryPoint(progress:number,shape:MapShapeId='RING',
 outset=STAGE_FOUNDATION_OUTSET):THREE.Vector2{
 const frame=boardPathFrame(progress,shape);
 return new THREE.Vector2(frame.x+frame.nx*outset,frame.z+frame.nz*outset);
}
/** One continuous bottom and top; no disconnected radial cylinders or
 * ocean leaking through Gallery cell joins.
 */

export function createStageFoundation(shape:MapShapeId='RING',
 surfaces?:WorldSurfaceLibrary):THREE.Mesh{
 const positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
 const top=.414;
 const edge=new THREE.Color(shape==='LAGOON'?0xb88d62:
  shape==='CLOVER'?0x716958:0x98724a);
 const cap=new THREE.Color(shape==='LAGOON'?0xb7ad77:
  shape==='CLOVER'?0x6b845b:0x75a05d);
 const tint=new THREE.Color();
 // Keep the TOP contour exact: it closes the sea seam at every Gallery tile.
 // Only the rock below the trim can erode. The foot widens gently into the
 // ocean rather than forming a uniform, unsupported brown cylinder.
 positions.push(0,top,0);colors.push(cap.r,cap.g,cap.b);uvs.push(0,0);
 for(let i=0;i<=SEGMENTS;i++){
  const pt=stageBoundaryPoint(i/SEGMENTS,shape);
  positions.push(pt.x,top,pt.y);
  uvs.push(pt.x*.82,pt.y*.82);
  colors.push(cap.r,cap.g,cap.b);
 }
 for(let i=0;i<SEGMENTS;i++)indices.push(0,i+1,i+2);
 const sideIndex=positions.length/3;
 const bands=[
  {y:top,outset:STAGE_FOUNDATION_OUTSET,tone:1.08,rough:0},
  {y:.337,outset:.223,tone:1.00,rough:.003},
  {y:.192,outset:.187,tone:.93,rough:.007},
  {y:.014,outset:.150,tone:.82,rough:.016},
  {y:-.205,outset:.205,tone:.71,rough:.019},
  {y:-.422,outset:.268,tone:.61,rough:.012}
 ];
 for(let level=0;level<bands.length;level++){
  const band=bands[level];
  for(let i=0;i<=SEGMENTS;i++){
   const u=i/SEGMENTS,a=u*Math.PI*2;
   // Periodic harmonics: identical at t=0 and t=1, with no per-frame
   // randomness or independent island rings to drift across the board.
   const erosion=band.rough*(.59*Math.sin(9*a+level*.71)
    +.27*Math.sin(17*a+level*1.31)
    +.14*Math.cos(29*a-level*.48));
   const pt=stageBoundaryPoint(u,shape,band.outset+erosion);
   const strata=band.rough*(.6*Math.sin(11*a+level*.83)
    +.4*Math.cos(23*a-level*.43));
   positions.push(pt.x,band.y+strata,pt.y);
   uvs.push(u*12,(band.y+strata)*2.5);
   const grain=.94+.045*Math.sin(7*a+level*.81)
    +.015*Math.cos(31*a-level*.36);
   tint.copy(edge).multiplyScalar(band.tone*grain);
   if(level===0)tint.lerp(cap,.18);
   if(level===1)tint.lerp(cap,.08);
   colors.push(tint.r,tint.g,tint.b);
  }
 }
 for(let layer=0;layer<bands.length-1;layer++){
  const first=sideIndex+layer*(SEGMENTS+1),second=first+SEGMENTS+1;
  for(let i=0;i<SEGMENTS;i++){
   const a=first+i,b=second+i;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setIndex(indices);
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.94,flatShading:false,side:THREE.DoubleSide
 });
 if(surfaces)surfaces.apply(material,'stone');
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='stage-solid-foundation';
 mesh.castShadow=true;mesh.receiveShadow=true;
 return mesh;
}
/** Grass and sand bridge the heightfield coast to the road's inside.
 * This layer is immediately below the board, so it fills gaps without
 * covering any Gallery tile color or its embossed numeral.
 */

export function createStageApron(shape:MapShapeId='RING',
 surfaces?:WorldSurfaceLibrary):THREE.Mesh{
 const positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
 const grass=new THREE.Color(shape==='LAGOON'?0x81af70:
  shape==='CLOVER'?0x55844e:0x73a153);
 const earth=new THREE.Color(shape==='LAGOON'?0x9b9c69:
  shape==='CLOVER'?0x75865b:0x9c9865);
 const rim=new THREE.Color(shape==='LAGOON'?0xc3b88a:
  shape==='CLOVER'?0x97966c:0xbca773);
 const tint=new THREE.Color();
 const STRIPS=4;
 for(let i=0;i<=SEGMENTS;i++){
  const t=i/SEGMENTS,frame=boardPathFrame(t,shape);
  // Important: the coast and the board MUST share the same angle.
  // Using t*TAU here twists the apron by BOARD_ANGLE_OFFSET, particularly
  // visibly on the Lagoon ellipse and the Clover lobes.
  const a=Math.atan2(frame.z,frame.x);
  const r=terrainRadius(a,shape)-.04;
  const landX=Math.cos(a)*r,landZ=Math.sin(a)*r;
  const landY=terrainHeight(landX,landZ,shape)+.004;
  const border=stageBoundaryPoint(t,shape,STAGE_APRON_INSET);
  for(let lane=0;lane<STRIPS;lane++){
   const fraction=lane/(STRIPS-1),ease=fraction*fraction*(3-2*fraction);
   const x=THREE.MathUtils.lerp(landX,border.x,fraction);
   const z=THREE.MathUtils.lerp(landZ,border.y,fraction);
   // A shallow earth berm hides the flat road-to-terrain join but remains
   // safely under the trim at y=.518 and coloured tiles at y=.54.
   const lift=.008*Math.sin(Math.PI*fraction)*Math.sin(a*7+.4);
   const y=THREE.MathUtils.lerp(landY,.429,ease)+lift;
   positions.push(x,y,z);
   uvs.push(x*.87,z*.87);
   if(fraction<.6)tint.copy(grass).lerp(earth,(fraction/.6)**2);
   else tint.copy(earth).lerp(rim,((fraction-.6)/.4)**2);
   tint.multiplyScalar(.97+.03*Math.sin(a*11+.6));
   colors.push(tint.r,tint.g,tint.b);
  }
 }
 for(let i=0;i<SEGMENTS;i++){
  const n=i*STRIPS;
  for(let lane=0;lane<STRIPS-1;lane++){
   const a=n+lane,b=a+STRIPS;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setIndex(indices);
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.96,side:THREE.DoubleSide
 });
 if(surfaces)surfaces.apply(material,'soil');
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='stage-land-to-board-apron';
 mesh.receiveShadow=true;
 return mesh;
}
/** Per-stage geometry is deliberately recognisable at the zoomed-out
 * Android camera position; three original palettes, not palette-only
 * variants of the same lighthouse/ruins.
 */
export function createStageDecorations(shape:MapShapeId,
 height=(x:number,z:number)=>terrainHeight(x,z,shape)):THREE.Group{
 const root=new THREE.Group();
 root.name='stage-specific-decor-'+shape.toLowerCase();
 const stone=new THREE.MeshStandardMaterial({color:shape==='CLOVER'?0x7d9292:0xe5d6ad,
  roughness:.92,flatShading:true});
 const accent=new THREE.MeshStandardMaterial({color:shape==='LAGOON'?0x56c5b0:0x8a70b0,
  roughness:.82,flatShading:true});
 const green=new THREE.MeshStandardMaterial({color:0x3d936b,roughness:1,flatShading:true});
 const place=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,z:number,y=0)=>{
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(x,height(x,z)+y,z);
  mesh.castShadow=true;root.add(mesh);return mesh;
 };
 if(shape==='LAGOON'){
  // Distinct white sandbar, two driftwood docks and broad turquoise pond lilies.
  for(let i=0;i<9;i++){
   const a=i*2.4,r=.9+.06*(i%3),x=.75+Math.cos(a)*r,z=.61+Math.sin(a)*r;
   place(new THREE.CylinderGeometry(.085,.12,.12,6),i%2?green:stone,x,z,.07);
  }
  const deck=place(new THREE.BoxGeometry(.65,.075,.23),stone,1.54,.56,.14);
  deck.rotation.y=.24;
  for(let i=0;i<5;i++){
   const x=-1.5+i*.21,z=1.46+.09*Math.sin(i*2.1);
   place(new THREE.ConeGeometry(.13,.40,5),green,x,z,.15);
  }
 }else if(shape==='CLOVER'){
  // Ancient circle of violet crystals and low standing stones.
  for(let i=0;i<9;i++){
   const a=i/9*Math.PI*2,x=1.30+Math.cos(a)*.46,z=-1.52+Math.sin(a)*.46;
   const crystal=place(new THREE.ConeGeometry(.11,.48+(i%3)*.09,5),
      i%3===0?accent:stone,x,z,.20);
   crystal.rotation.y=a;
  }
  for(let i=0;i<5;i++){
   const x=-1.82+(i%3)*.28,z=-1.65+Math.floor(i/3)*.30;
   place(new THREE.CylinderGeometry(.11,.16,.40,6),stone,x,z,.20);
  }
 }else{
  // Warm expedition camp distinguishable from Lagoon's docks
  // and Clover's crystal circle.
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3,x=RING_CAMP_CLEARING.x+Math.cos(a)*.36,
    z=RING_CAMP_CLEARING.z+Math.sin(a)*.36;
   const pole=place(new THREE.CylinderGeometry(.034,.05,.38,5),stone,x,z,.19);
   pole.rotation.z=Math.sin(a)*.15;
  }
  place(new THREE.ConeGeometry(.40,.48,5),
   new THREE.MeshStandardMaterial({color:0xc99055,roughness:1,flatShading:true}),
   RING_CAMP_CLEARING.x,RING_CAMP_CLEARING.z,.36);
 }
 return root;
}
