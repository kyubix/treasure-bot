import {describe,expect,it} from 'vitest';
import {useThreeWorldMap,useThreeBoardView} from '../src/client/render-mode.ts';

describe('default renderer modes',()=>{
  it('defaults both views to Three.js for normal production room URLs',()=>{
    for(const query of ['', '?room=ABC123', '?room=ABC123&x=1']){
      const params=new URLSearchParams(query);
      expect(useThreeWorldMap(params)).toBe(true);
      expect(useThreeBoardView(params)).toBe(true);
    }
  });
  it('keeps old 3D preview links working',()=>{
    expect(useThreeWorldMap(new URLSearchParams('?map3d=1'))).toBe(true);
  });
  it('can independently force Phaser fallback for each view',()=>{
    const world=new URLSearchParams('?room=ABC123&map3d=0');
    expect(useThreeWorldMap(world)).toBe(false);
    expect(useThreeBoardView(world)).toBe(true);
    const board=new URLSearchParams('?board2d=1');
    expect(useThreeWorldMap(board)).toBe(true);
    expect(useThreeBoardView(board)).toBe(false);
    const both=new URLSearchParams('?map3d=0&board2d=1');
    expect(useThreeWorldMap(both)).toBe(false);
    expect(useThreeBoardView(both)).toBe(false);
  });
});
