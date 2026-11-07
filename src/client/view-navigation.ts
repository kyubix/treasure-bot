/**
 * Board / World navigation should accept the first tap on Android, even if
 * the WebView delays/suppresses its synthetic "click".
 *
 * Respond on touch pointerup (or native click for keyboard/mouse), without
 * pointer capture, preventDefault, or cancellation by a later re-render.
 * The DOM swap occurs in rAF, after the pointer sequence has completed.
 */
export function bindViewNavigation(
 button:HTMLButtonElement,
 navigate:()=>void,
 schedule:(callback:FrameRequestCallback)=>number=requestAnimationFrame
):void{
 let pressed:{id:number;x:number;y:number}|null=null;
 let queued=false;
 let lastTouchNavigation=-Infinity;
 const run=()=>{
  if(queued||button.disabled)return;
  queued=true;
  schedule(()=>{
   queued=false;
   // This tap was accepted when the button was enabled. Do not revoke the
   // transition just because a state render temporarily disabled the button.
   navigate();
  });
 };
 button.addEventListener('pointerdown',event=>{
  if(button.disabled||event.button!==0)return;
  pressed={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 button.addEventListener('pointerup',event=>{
  if(!pressed||pressed.id!==event.pointerId)return;
  const distance=Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y);
  pressed=null;
  if(distance>24)return; // A drag is not an intentional navigation tap.
  if(event.pointerType==='touch'||event.pointerType==='pen'){
   lastTouchNavigation=Date.now();
   run();
  }
  // Mouse is handled by native click, retaining keyboard-like semantics.
 });
 button.addEventListener('pointercancel',()=>{pressed=null;});
 button.addEventListener('click',()=>{
  // Android may emit a click AFTER the successful pointerup/rAF.
  if(Date.now()-lastTouchNavigation<750)return;
  run();
 });
}
