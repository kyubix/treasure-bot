import {describe,expect,it} from 'vitest';
import {resetMatchViewportScroll} from '../src/client/match-viewport.ts';
import {readFileSync} from 'node:fs';

describe('mobile fullscreen match top-edge viewport',()=>{
 it('resets pre-game lobby scroll in html and body',()=>{
  const html={scrollTop:554},body={scrollTop:71},scrolled:number[][]=[];
  resetMatchViewportScroll(html,body,(x,y)=>scrolled.push([x,y]));
  expect(html.scrollTop).toBe(0);
  expect(body.scrollTop).toBe(0);
  expect(scrolled).toEqual([[0,0]]);
 });
 it('pins the game container to viewport top instead of a scrolled document',()=>{
  const css=readFileSync(new URL('../src/client/viewport-layout.css',import.meta.url),'utf8');
  expect(css).toContain('html.treasure-game-active');
  expect(css).toContain('body.in-game #app');
  expect(css).toContain('position:fixed!important');
  expect(css).toContain('inset:0!important');
  const main=readFileSync(new URL('../src/client/main.ts',import.meta.url),'utf8');
  expect(main).toContain("document.documentElement.classList.toggle('treasure-game-active',playing)");
  expect(main).toContain('if(viewportModeChanged)resetMatchViewportScroll(');
 });
});
