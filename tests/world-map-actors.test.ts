import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createWorldActors,missionRobotAnchor} from '../src/client/world-map-actors.ts';
import type {GameState,Player} from '../src/engine/types.ts';

const anchors={
  tile:(index:number)=>new THREE.Vector3(index,.50,0),
  site:(x:number,y:number)=>new THREE.Vector3(x,.48,y)
};
function player(id:string,position:number,mission:Player['robot']['mission']=null):Player{
  return {
    id,name:id,color:id==='a'?'#ff8c54':'#60b8e5',isBot:false,
    position,gold:0,gateCards:0,inventory:[],robot:{
      chassis:'NORMAL',energy:50,cargo:[],parts:undefined,mission
    }
  };
}
const location={id:'valley',x:3,y:2,ground:'GRASS' as const,
  kind:'LOCATION' as const,label:'Valley',value:0,keeperPower:0,depleted:false};
function state(...players:Player[]):GameState{
  return {players,islandSpots:[location]} as GameState;
}

describe('Three.js V4 animated World Map actors',()=>{
  it('uses immutable launchTile A instead of player position B',()=>{
    const p=player('a',19,{siteId:'valley',launchTile:2,phase:'OUTBOUND',
      turnsRemaining:3,transitTotal:4});
    const at=missionRobotAnchor(p,[location],anchors);
    // Even with board position B=19, robot starts from A=2.
    expect(at.x).toBeCloseTo(2.25,6);
    expect(at.x).not.toBeCloseTo(19,3);
    expect(at.y).toBeGreaterThan(.45);
    p.robot.mission!.phase='SEARCH';
    expect(missionRobotAnchor(p,[location],anchors).x).toBeCloseTo(3,6);
    p.robot.mission!.phase='INBOUND';
    p.robot.mission!.turnsRemaining=2;
    expect(missionRobotAnchor(p,[location],anchors).x).toBeCloseTo(2.5,6);
  });

  it('keeps exactly one persistent 3D avatar and robot per state player',()=>{
    const scene=new THREE.Scene();
    const actors=createWorldActors(scene,anchors);
    const a=player('a',4);
    actors.sync(state(a));
    const host=scene.getObjectByName('worldmap-3d-actors') as THREE.Group;
    expect(host).toBeInstanceOf(THREE.Group);
    expect(host.children.length).toBe(2);
    const original=[...host.children];
    actors.sync(state(a));
    expect(host.children).toEqual(original);
    actors.update(.2);
    const playerMotion=(host.children[0] as THREE.Group).children[0] as THREE.Group;
    expect(playerMotion.position.y).toBeGreaterThan(0);
    actors.sync(state(a,player('b',4)));
    expect(host.children.length).toBe(4);
    const p0=host.children[0] as THREE.Group;
    const p1=host.children[2] as THREE.Group;
    expect(p0.position.x).not.toBeCloseTo(p1.position.x,3);
    actors.sync(state(player('b',4)));
    expect(host.children.length).toBe(2);
    actors.sync(null);
    expect(host.children.length).toBe(0);
    actors.dispose();
    expect(scene.children.includes(host)).toBe(false);
  });
});
