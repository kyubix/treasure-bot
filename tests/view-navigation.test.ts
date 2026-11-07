import {describe,it,expect} from 'vitest';
import {bindViewNavigation} from '../src/client/view-navigation.ts';

function fakeButton(){
 const listeners=new Map<string,((e:unknown)=>void)[]>();
 const button={
  disabled:false,isConnected:true,
  addEventListener:(name:string,callback:(e:unknown)=>void)=>{
   const list=listeners.get(name)??[];
   list.push(callback);listeners.set(name,list);
  },
  setPointerCapture:(_pointerId:number)=>{},
  getBoundingClientRect:()=>({left:10,top:10,right:150,bottom:70}),
  dispatch:(name:string,details:Record<string,unknown>={})=>{
   const event={button:0,pointerId:6,clientX:50,clientY:42,
    preventDefault:()=>{},...details};
   for(const listener of listeners.get(name)??[])listener(event);
  }
 };
 return button;
}
describe('one-touch Board / World navigation',()=>{
 it('navigates on the FIRST pointerup, exactly once after a ghost click',()=>{
  const button=fakeButton(),frames:FrameRequestCallback[]=[];
  let count=0;
  bindViewNavigation(button as unknown as HTMLButtonElement,()=>count++,
   cb=>{frames.push(cb);return frames.length;});
  button.dispatch('pointerdown');
  button.dispatch('pointerup');
  button.dispatch('click'); // Android generates this after pointerup.
  expect(frames).toHaveLength(1);
  expect(count).toBe(0); // let pointer/click sequence finish before DOM swap
  frames[0](0);
  expect(count).toBe(1);
 });
 it('supports keyboard click, without needing pointer events',()=>{
  const button=fakeButton(),frames:FrameRequestCallback[]=[];
  let count=0;
  bindViewNavigation(button as unknown as HTMLButtonElement,()=>count++,
   cb=>{frames.push(cb);return frames.length;});
  button.dispatch('click');
  expect(frames).toHaveLength(1);
  frames[0](0);
  expect(count).toBe(1);
 });
 it('does not navigate from a cancelled or dragged pointer, nor from a disabled button',()=>{
  const button=fakeButton(),frames:FrameRequestCallback[]=[];
  let count=0;
  bindViewNavigation(button as unknown as HTMLButtonElement,()=>count++,
   cb=>{frames.push(cb);return frames.length;});
  button.dispatch('pointerdown');
  button.dispatch('pointercancel');
  button.dispatch('pointerup');
  expect(frames).toHaveLength(0);
  button.dispatch('pointerdown');
  button.dispatch('pointerup',{clientX:900});
  expect(frames).toHaveLength(0);
  button.disabled=true;
  button.dispatch('click');
  expect(frames).toHaveLength(0);
  expect(count).toBe(0);
 });
});
