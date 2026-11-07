import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

describe('mobile Board and World shared viewport geometry',()=>{
 const css=readFileSync(new URL('../src/client/viewport-layout.css',import.meta.url),'utf8');
 const board=readFileSync(new URL('../src/client/board.ts',import.meta.url),'utf8');

 it('fills the same absolute host area for Board and World, no intrinsic canvas flex sizing',()=>{
  expect(css).toContain('body.in-game #match[data-view="board"] .board-shell #board,');
  expect(css).toContain('body.in-game #match[data-view="world"] .board-shell #board{');
  const shared=css.slice(css.lastIndexOf('body.in-game #match[data-view="board"] .board-shell #board,'));
  expect(shared).toContain('position:absolute!important');
  expect(shared).toContain('inset:3px!important');
  expect(shared).toContain('flex:none!important');
  expect(shared).toContain('width:auto!important');
  expect(shared).toContain('height:auto!important');
 });
 it('keeps the first 3D frame hidden until the responsive host is stable',()=>{
  expect(css).toContain('#match #board.viewport-settling::after');
  expect(board).toContain("element.classList.add('viewport-settling')");
  expect(board).toContain("host?.classList.add('viewport-settling')");
  expect(board).toContain("this.game.canvas.parentElement?.classList.remove('viewport-settling')");
  expect(board).toContain('if(stableFrames<3&&attempts<10)');
 });
 it('retains fixed full viewport and previous top clipping fix',()=>{
  expect(css).toContain('html.treasure-game-active');
  expect(css).toContain('body.in-game #app');
  expect(css).toContain('position:fixed!important');
  expect(css).toContain('inset:0!important');
 });
});
