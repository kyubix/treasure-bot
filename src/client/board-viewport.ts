/** Measure the real canvas host before Phaser's first frame.
 * A detached/hidden host may be zero; Phaser's Resize mode will recover
 * once its container becomes visible. Keep this independent of Phaser so
 * node tests can verify cold Android board setup.
 */
export function boardViewportDimensions(
 host:{readonly clientWidth:number;readonly clientHeight:number}
):{width:number;height:number}{
 const w=Math.round(host.clientWidth),h=Math.round(host.clientHeight);
 return {
  width:Number.isFinite(w)&&w>=40?w:640,
  height:Number.isFinite(h)&&h>=40?h:480
 };
}
