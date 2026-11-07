import {describe,it,expect} from 'vitest';
import {createOriginalActor,disposeActorModel,styleAvatarModel} from '../src/client/world-map-models.ts';
describe('Selectable chibi avatar styles',()=>{
 it('distinguishes H01-H04 with actual lightweight Three.js geometry',()=>{
  for(const avatarId of ['H01','H02','H03','H04']){
   const model=createOriginalActor('avatar');
   const head=model.scene.getObjectByName('Head')!;
   const before=head.children.length;
   styleAvatarModel(model,avatarId);
   expect(head.children.length).toBe(avatarId==='H01'?before:before+1);
   if(avatarId!=='H01')
     expect(head.getObjectByName('AvatarAccessory')?.children.length).toBe(2);
   styleAvatarModel(model,avatarId);
   expect(head.children.length).toBe(avatarId==='H01'?before:before+1);
   disposeActorModel(model);
  }
 });
});