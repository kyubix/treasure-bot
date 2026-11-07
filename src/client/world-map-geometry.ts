import {boardPathFrame} from '../engine/map-shapes.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';
/** Pure map geometry shared by Phaser rendering and engine smoke tests. */
export type Point={x:number;y:number};
export const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function mapProjection(
  x:number,y:number,turns:number,center:Point,rx:number,ry:number
):Point{
  // View rotations never mutate the island cell ID or authoritative map.
  let xx=x-2,yy=y-2;
  for(let i=0;i<((turns%4)+4)%4;i++)[xx,yy]=[-yy,xx];
  return {x:center.x+(xx-yy)*rx/5.5,y:center.y+(xx+yy)*ry/5.5};
}
export function perimeterPoint(index:number,center:Point,rx:number,ry:number,
 turns=0,tileCount=28,shape:MapShapeId='RING'):Point{
  // Geometry is shared with Three.js. The 45-degree rotation here is
  // the historical Phaser camera offset, not another island shape.
  const pt=boardPathFrame(index/tileCount,shape,1);
  const angle=Math.PI/4+turns*Math.PI/2,c=Math.cos(angle),sin=Math.sin(angle);
  return {x:center.x+(pt.x*c-pt.z*sin)*rx,
          y:center.y+(pt.x*sin+pt.z*c)*ry};
}
export function robotOnRoute(start:Point,end:Point,progress:number):Point{
  const t=clamp(progress,0,1);
  return {x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};
}
