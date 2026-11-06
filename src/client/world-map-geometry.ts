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
export function perimeterPoint(index:number,center:Point,rx:number,ry:number,turns=0,tileCount=28):Point{
  const angle=(index/tileCount)*Math.PI*2+Math.PI/2+turns*Math.PI/2;
  return {x:center.x+Math.cos(angle)*rx,y:center.y+Math.sin(angle)*ry};
}
export function robotOnRoute(start:Point,end:Point,progress:number):Point{
  const t=clamp(progress,0,1);
  return {x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};
}
