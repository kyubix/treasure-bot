/**
 * Android-first navigation: respond to the pointer that began on this
 * button, not a synthetic click that may be cancelled by UI reflow.
 *
 * Change views on the NEXT animation frame: the click sequence finishes
 * against the original DOM before board/world command rows are swapped.
 * The click handler remains an accessible keyboard/programmatic fallback.
 */
export function bindViewNavigation(
 button:HTMLButtonElement,
 navigate:()=>void,
 schedule:(callback:FrameRequestCallback)=>number=requestAnimationFrame
):void{
 let activePointer:number|null=null;
 let scheduled=false;
 let suppressClickUntil=0;
 const commit=()=>{
  if(scheduled||button.disabled)return;
  scheduled=true;
  schedule(()=>{
   scheduled=false;
   if(button.isConnected&&!button.disabled)navigate();
  });
 };
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||button.disabled)return;
  activePointer=event.pointerId;
  try{button.setPointerCapture(event.pointerId);}catch{/* No capture support. */}
 });
 button.addEventListener('pointerup',event=>{
  if(activePointer!==event.pointerId)return;
  activePointer=null;
  if(button.disabled)return;
  const rect=button.getBoundingClientRect();
  // Treat a swipe/drag off the control as a cancelled navigation.
  if(event.clientX<rect.left-14||event.clientX>rect.right+14||
     event.clientY<rect.top-14||event.clientY>rect.bottom+14)return;
  suppressClickUntil=Date.now()+850;
  event.preventDefault();
  commit();
 });
 button.addEventListener('pointercancel',()=>{activePointer=null;});
 button.addEventListener('lostpointercapture',()=>{activePointer=null;});
 button.addEventListener('click',event=>{
  if(Date.now()<suppressClickUntil){
   event.preventDefault();
   return;
  }
  commit();
 });
}
