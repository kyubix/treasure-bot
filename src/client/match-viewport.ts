/**
 * Clear a scroll offset inherited from the lobby before a fullscreen match.
 *
 * The document's scrolling element varies between Android Chrome/WebView
 * builds. Clear both the html and body offsets, then the viewport itself.
 * Keep this deterministic and independently testable without DOM globals.
 */
export function resetMatchViewportScroll(
 html:{scrollTop:number},
 body:{scrollTop:number},
 scrollTo:(x:number,y:number)=>void
):void{
 html.scrollTop=0;
 body.scrollTop=0;
 scrollTo(0,0);
}
