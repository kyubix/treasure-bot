/** Original Treasure Bots stage silhouettes; no original game asset is copied.
 * A deterministic, periodic geometric path drives meshes, markers and actors.
 */
export const MAP_SHAPES=['RING','LAGOON','CLOVER'] as const;
export type MapShapeId=typeof MAP_SHAPES[number];
export const DEFAULT_MAP_SHAPE:MapShapeId='RING';
export const BOARD_ANGLE_OFFSET=Math.PI/2-Math.PI/4;
export const BOARD_PATH_RADIUS=3.48;
export function isMapShapeId(value:unknown):value is MapShapeId{
 return value==='RING'||value==='LAGOON'||value==='CLOVER';
}
/** Scale of a *radial* coast ray relative to the classic ring.
 * For an ellipse, this computes the real ray/ellipse intersection;
 * using board-index scaling here would misalign land and shoreline.
 */
export function stageRadialScale(angle:number,shape:MapShapeId='RING'):number{
 if(shape==='LAGOON'){
  const c=Math.cos(angle),s=Math.sin(angle);
  return 1/Math.hypot(c/1.11,s/.92);
 }
 if(shape==='CLOVER')return 1+.075*Math.cos(4*angle);
 return 1;
}
export type BoardPathFrame={
 x:number;z:number;
 /** Unit tangent (direction of increasing tile indices). */
 tx:number;tz:number;
 /** Unit normal directed toward the outside of the island. */
 nx:number;nz:number;
};
/** progress is periodic and can be fractional, negative or greater than 1. */
export function boardPathFrame(progress:number,shape:MapShapeId=DEFAULT_MAP_SHAPE,
 radius=BOARD_PATH_RADIUS):BoardPathFrame{
 const position=(p:number)=>{
  const a=BOARD_ANGLE_OFFSET+p*Math.PI*2;
  if(shape==='LAGOON')return {x:radius*1.11*Math.cos(a),z:radius*.92*Math.sin(a)};
  if(shape==='CLOVER'){
   const r=radius*(1+.075*Math.cos(4*a));
   return {x:r*Math.cos(a),z:r*Math.sin(a)};
  }
  return {x:radius*Math.cos(a),z:radius*Math.sin(a)};
 };
 const p=position(progress),a=position(progress-.0001),b=position(progress+.0001);
 const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
 const tx=dx/len,tz=dz/len;
 return {x:p.x,z:p.z,tx,tz,nx:tz,nz:-tx};
}
/** Mesh corner frame sampled at tile boundaries, including curved loops. */
export function boardPathQuad(index:number,count:number,shape:MapShapeId,
 inner:number,outer:number):Array<{x:number;z:number}>{
 const half=.465/count;
 const before=boardPathFrame(index/count-half,shape);
 const after=boardPathFrame(index/count+half,shape);
 const innerOffset=inner-BOARD_PATH_RADIUS,outerOffset=outer-BOARD_PATH_RADIUS;
 return [
  {x:before.x+before.nx*outerOffset,z:before.z+before.nz*outerOffset},
  {x:after.x+after.nx*outerOffset,z:after.z+after.nz*outerOffset},
  {x:after.x+after.nx*innerOffset,z:after.z+after.nz*innerOffset},
  {x:before.x+before.nx*innerOffset,z:before.z+before.nz*innerOffset}
 ];
}
