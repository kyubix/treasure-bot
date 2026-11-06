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


describe('V5 state-driven animation',()=>{
  it('walks around perimeter and settles to idle without mutating state',()=>{
    const scene=new THREE.Scene();const actors=createWorldActors(scene,anchors);
    const a=player('a',4);actors.sync(state(a));
    const host=scene.getObjectByName('worldmap-3d-actors')!;
    const root=host.children[0];
    a.position=7;const snapshot=JSON.stringify(a);actors.sync(state(a));
    expect(root.position.x).toBeCloseTo(4);
    actors.update(.05);
    expect(root.userData.animation).toBe('walk');
    expect(root.position.x).toBeGreaterThan(4);
    expect(root.position.x).toBeLessThan(7);
    for(let i=0;i<100;i++)actors.update(.05);
    expect(root.position.x).toBeCloseTo(7);
    expect(root.userData.animation).toBe('idle');
    expect(JSON.stringify(a)).toBe(snapshot);actors.dispose();
  });
  it('searches only on arrival, runs for DASH and returns to immutable origin',()=>{
    const scene=new THREE.Scene();const actors=createWorldActors(scene,anchors);
    const a=player('a',2);actors.sync(state(a));
    const robot=scene.getObjectByName('worldmap-3d-actors')!.children[1];
    a.robot.chassis='DASH';
    a.robot.mission={siteId:'valley',launchTile:2,phase:'OUTBOUND',turnsRemaining:1,transitTotal:4};
    actors.sync(state(a));actors.update(.05);
    expect(robot.userData.animation).toBe('run');
    a.robot.mission.phase='SEARCH';actors.sync(state(a));
    for(let i=0;i<100;i++)actors.update(.05);
    expect(robot.userData.animation).toBe('search');
    a.position=19;a.robot.mission.phase='INBOUND';a.robot.mission.turnsRemaining=0;
    actors.sync(state(a));actors.update(.05);
    expect(robot.userData.animation).toBe('return');
    for(let i=0;i<100;i++)actors.update(.05);
    expect(robot.position.x).toBeCloseTo(2);
    expect(robot.userData.animation).toBe('idle');actors.dispose();
  });
});

describe('V5 redraw and visibility regressions',()=>{
  it('keeps return animation across repeated redraws until arrival',()=>{
    const scene=new THREE.Scene(),actors=createWorldActors(scene,anchors);
    const a=player('a',19,{siteId:'valley',launchTile:2,phase:'INBOUND',turnsRemaining:0,transitTotal:4});
    actors.sync(state(a));const robot=scene.getObjectByName('worldmap-3d-actors')!.children[1];
    a.robot.mission=null;actors.sync(state(a));actors.update(.05);
    expect(robot.userData.animation).toBe('return');
    actors.sync(state(a));actors.update(.05);
    expect(robot.userData.animation).toBe('return');actors.dispose();
  });
  it('snaps hidden state changes on resume instead of replaying stale laps',()=>{
    const scene=new THREE.Scene(),actors=createWorldActors(scene,anchors);
    const a=player('a',2);actors.sync(state(a));actors.pause(true);
    for(const position of [8,18,26,4,12]){a.position=position;actors.sync(state(a));}
    actors.pause(false);actors.update(.05);
    const avatar=scene.getObjectByName('worldmap-3d-actors')!.children[0];
    expect(avatar.position.x).toBeCloseTo(12);expect(avatar.userData.animation).toBe('idle');actors.dispose();
  });
  it('suppresses cosmetic motion when reduced motion is requested',()=>{
    const scene=new THREE.Scene(),actors=createWorldActors(scene,anchors);
    actors.sync(state(player('a',2)));
    const motion=scene.getObjectByName('worldmap-3d-actors')!.children[0].children[0];
    actors.update(.05,false);expect(motion.position.y).toBe(0);actors.dispose();
  });
});
