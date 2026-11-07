import {describe,it,expect} from 'vitest';
import {bindViewNavigation} from '../src/client/view-navigation.ts';

function fakeButton(){
 const listeners=new Map<string,((event:unknown)=>void)[]>();
 const button={
  disabled:false,isConnected:true,
  addEventListener:(name:string,fn:(event:unknown)=>void)=>{
   const handlers=listeners.get(name)??[];
   handlers.push(fn);listeners.set(name,handlers);
  },
  dispatch:(name:string,overrides:Record<string,unknown>={})=>{
   const event={button:0,pointerId:6,pointerType:'touch',
    clientX:55,clientY:42,...overrides};
   for(const listener of listeners.get(name)??[])listener(event);
  }
 };
 return button;
}
describe('first-touch Map / Back Board navigation',()=>{
 it('accepts one Android touch and ignores a later synthetic click',()=>{
  const button=fakeButton(),frames:FrameRequestCallback[]=[];
  let count=0;
  bindViewNavigation(button as unknown as HTMLButtonElement,()=>count++,
   cb=>{frames.push(cb);return frames.length;});
  button.dispatch('pointerdown');
  button.dispatch('pointerup');
  button.dispatch('click');
  expect(frames).toHaveLength(1);
  expect(count).toBe(0);
  frames[0](0);
  button.dispatch('click'); // Some WebViews deliver click a frame later.
  expect(frames).toHaveLength(1);
  expect(count).toBe(1);
 });
 it('keeps navigation intent after the asynchronous button state changes',()=>{
  const button=fakeButton(),frames:FrameRequestCallback[]=[];
  let count=0;
  bindViewNavigation(button as unknown as HTMLButtonElement,()=>count++,
   cb=>{frames.push(cb);return frames.length;});
  button.dispatch('pointerdown');
  button.dispatch('pointerup');
  button.disabled=true;button.isConnected=false;
  frames[0](0);
  expect(count).toBe(1);
 });
 it('supports native keyboard and mouse clicks',()=>{
  const button=fakeButton(),frames:FrameRequestCallback[]=[];
  let count=0;
  bindViewNavigation(button as unknown as HTMLButtonElement,()=>count++,
   cb=>{frames.push(cb);return frames.length;});
  button.dispatch('click');
  frames[0](0);
  expect(count).toBe(1);
  button.dispatch('pointerdown',{pointerType:'mouse'});
  button.dispatch('pointerup',{pointerType:'mouse'});
  button.dispatch('click');
  expect(frames).toHaveLength(2);
  frames[1](0);
  expect(count).toBe(2);
 });
 it('does not navigate on drag, pointer cancellation or disabled button',()=>{
  const button=fakeButton(),frames:FrameRequestCallback[]=[];
  let count=0;
  bindViewNavigation(button as unknown as HTMLButtonElement,()=>count++,
   cb=>{frames.push(cb);return frames.length;});
  button.dispatch('pointerdown');
  button.dispatch('pointerup',{clientY:240});
  button.dispatch('pointerdown');
  button.dispatch('pointercancel');
  button.dispatch('pointerup');
  button.disabled=true;
  button.dispatch('click');
  expect(frames).toHaveLength(0);
  expect(count).toBe(0);
 });
 it('never dispatches twice from repeated events within the same frame',()=>{
  const button=fakeButton(),frames:FrameRequestCallback[]=[];
  let count=0;
  bindViewNavigation(button as unknown as HTMLButtonElement,()=>count++,
   cb=>{frames.push(cb);return frames.length;});
  button.dispatch('pointerdown');
  button.dispatch('pointerup');
  button.dispatch('pointerup');
  button.dispatch('click');
  expect(frames).toHaveLength(1);
  frames[0](0);expect(count).toBe(1);
 });
});
