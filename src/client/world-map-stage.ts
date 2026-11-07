import * as THREE from 'three';
import {boardPathFrame} from '../engine/map-shapes.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';
import {terrainRadius,terrainHeight} from './world-map-terrain.ts';

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
export function createStageFoundation(shape:MapShapeId='RING'):THREE.Mesh{
 const positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const top=.414;
 const edge=new THREE.Color(shape==='LAGOON'?0xb88d62:
  shape==='CLOVER'?0x716958:0x98724a);
 const cap=new THREE.Color(shape==='LAGOON'?0xb7ad77:
  shape==='CLOVER'?0x6b845b:0x75a05d);
 const tint=new THREE.Color();
 // The top disc is hidden beneath the walkable tiles and grass apron.
 positions.push(0,top,0);colors.push(cap.r,cap.g,cap.b);
 for(let i=0;i<=SEGMENTS;i++){
  const pt=stageBoundaryPoint(i/SEGMENTS,shape);
  positions.push(pt.x,top,pt.y);
  colors.push(cap.r,cap.g,cap.b);
 }
 for(let i=0;i<SEGMENTS;i++)indices.push(0,i+1,i+2);
 const sideIndex=positions.length/3;
 // Four sloped layers are more natural than the previous perfectly
 // vertical, dark-brown cylinder. Only the narrow top lip overhangs
 // the coloured board's outside trim, with rock tapering into the sea.
 const levels=[
  {y:top,outset:STAGE_FOUNDATION_OUTSET,tone:1.07},
  {y:.175,outset:.175,tone:.97},
  {y:-.105,outset:.116,tone:.80},
  {y:-.416,outset:.063,tone:.62}
 ];
 for(let level=0;level<levels.length;level++){
  const band=levels[level];
  for(let i=0;i<=SEGMENTS;i++){
   const u=i/SEGMENTS;
   const pt=stageBoundaryPoint(u,shape,band.outset);
   const ripple=level===0||level===3?0:
     Math.sin(u*Math.PI*2*11)*.014+
     Math.cos(u*Math.PI*2*7)*.009-.009;
   positions.push(pt.x,band.y+ripple,pt.y);
   const grain=.96+.06*Math.sin(u*Math.PI*2*17);
   tint.copy(edge).multiplyScalar(band.tone*grain);
   if(level===0)tint.lerp(cap,.17);
   colors.push(tint.r,tint.g,tint.b);
  }
 }
 for(let layer=0;layer<levels.length-1;layer++){
  const first=sideIndex+layer*(SEGMENTS+1);
  const second=first+SEGMENTS+1;
  for(let i=0;i<SEGMENTS;i++){
   const a=first+i,b=second+i;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setIndex(indices);
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide
 }));
 mesh.name='stage-solid-foundation';
 mesh.castShadow=true;mesh.receiveShadow=true;
 return mesh;
}
/** Grass and sand bridge the heightfield coast to the road's inside.
 * This layer is immediately below the board, so it fills gaps without
 * covering any Gallery tile color or its embossed numeral.
 */
export function createStageApron(shape:MapShapeId='RING'):THREE.Mesh{
 const positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const inner=new THREE.Color(shape==='LAGOON'?0x8dbd80:
  shape==='CLOVER'?0x638b55:0x78a75a);
 const outer=new THREE.Color(shape==='LAGOON'?0xc5c193:
  shape==='CLOVER'?0x8a9a66:0xb4ab78);
 for(let i=0;i<=SEGMENTS;i++){
  const t=i/SEGMENTS,a=t*Math.PI*2;
  const r=terrainRadius(a,shape)-.04;
  const landX=Math.cos(a)*r,landZ=Math.sin(a)*r;
  const border=stageBoundaryPoint(t,shape,STAGE_APRON_INSET);
  positions.push(landX,.426,landZ,border.x,.426,border.y);
  colors.push(inner.r,inner.g,inner.b,outer.r,outer.g,outer.b);
 }
 for(let i=0;i<SEGMENTS;i++){
  const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setIndex(indices);
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:1,side:THREE.DoubleSide
 }));
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
   const a=i*Math.PI/3,x=-1.45+Math.cos(a)*.36,z=1.53+Math.sin(a)*.36;
   const pole=place(new THREE.CylinderGeometry(.034,.05,.38,5),stone,x,z,.19);
   pole.rotation.z=Math.sin(a)*.15;
  }
  place(new THREE.ConeGeometry(.40,.48,5),
   new THREE.MeshStandardMaterial({color:0xc99055,roughness:1,flatShading:true}),
   -1.45,1.53,.36);
 }
 return root;
}
