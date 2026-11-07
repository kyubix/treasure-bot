import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {MAP_SHAPES,boardPathFrame,stageRadialScale} from '../src/engine/map-shapes.ts';
import {terrainRadius,terrainHeight,createTerrainMesh,addTerrainDetail,createSurfBand} from '../src/client/world-map-terrain.ts';
import {waterfallPoint,createCascadingWaterfall} from '../src/client/world-map-waterfall.ts';
import {coastLight,createAnimatedOcean} from '../src/client/world-map-water.ts';

function dispose(root:THREE.Object3D):void{
 const geos=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();
 root.traverse(node=>{
  if(node instanceof THREE.InstancedMesh)node.dispose();
  if(node instanceof THREE.Mesh||node instanceof THREE.Line){
   geos.add(node.geometry);
   for(const m of Array.isArray(node.material)?node.material:[node.material])mats.add(m);
  }
 });
 for(const g of geos)g.dispose();
 for(const m of mats)m.dispose();
}

describe('Shape-aware stage scenery and coast',()=>{
 it('keeps a non-overlapping, consistent shoreline inside all three board shapes',()=>{
  for(const shape of MAP_SHAPES)for(let i=0;i<360;i++){
   const angle=i/360*Math.PI*2,scale=stageRadialScale(angle,shape);
   const shore=terrainRadius(angle,shape);
   const edge=3.33*scale,boardMid=3.48*scale;
   expect(shore).toBeGreaterThan(2.7);
   expect(shore).toBeLessThan(edge-.035);
   expect(boardMid-shore).toBeGreaterThan(.17);
   expect(Number.isFinite(terrainHeight(Math.cos(angle)*shore,Math.sin(angle)*shore,shape))).toBe(true);
  }
  // Actual silhouettes differ, not just tile colors or Gallery count.
  const x=0,z=0;
  expect(terrainRadius(x,'LAGOON')).toBeGreaterThan(terrainRadius(x,'RING'));
  expect(terrainRadius(z+Math.PI/2,'LAGOON')).toBeLessThan(terrainRadius(Math.PI/2,'RING'));
  expect(terrainRadius(0,'CLOVER')).toBeGreaterThan(terrainRadius(0,'RING'));
 });
 it('makes distinct coast and terrain meshes without altering ring compatibility',()=>{
  const meshes=MAP_SHAPES.map(shape=>createTerrainMesh(shape));
  const positions=meshes.map(m=>m.geometry.getAttribute('position') as THREE.BufferAttribute);
  expect(positions.map(p=>p.count)).toEqual([121*46,121*46,121*46]);
  const ringX=positions[0].getX(0*121+0),lagoonX=positions[1].getX(0*121+0);
  expect(lagoonX).toBeCloseTo(ringX); // ring zero is at origin
  const outer=45*121;
  expect(positions[1].getX(outer)).toBeGreaterThan(positions[0].getX(outer));
  expect(positions[2].getX(outer)).toBeGreaterThan(positions[0].getX(outer));
  const groups=MAP_SHAPES.map(shape=>{
    const land=new THREE.Group();
    addTerrainDetail(land,shape);
    expect(land.children).toHaveLength(3);
    for(const o of land.children)expect(o).toBeInstanceOf(THREE.InstancedMesh);
    return land;
  });
  const bands=MAP_SHAPES.map(shape=>createSurfBand(shape));
  const first=bands.map(m=>(m.geometry.getAttribute('position') as THREE.BufferAttribute).getX(0));
  expect(first[1]).toBeGreaterThan(first[0]);
  expect(first[2]).toBeGreaterThan(first[0]);
  for(const mesh of [...meshes,...bands])dispose(mesh);
  for(const group of groups)dispose(group);
 });
 it('keeps waterfall draped over themed cliffs, ending in the same lagoon',()=>{
  for(const shape of MAP_SHAPES){
   const start=waterfallPoint(0,0,shape),end=waterfallPoint(1,0,shape);
   expect(end.distanceTo(waterfallPoint(1,0,'RING'))).toBeLessThan(.1);
   expect(start.y).toBeGreaterThan(.50);
   for(let n=0;n<=40;n++){
    const p=waterfallPoint(n/40,0,shape);
    expect(p.y).toBeGreaterThanOrEqual(terrainHeight(p.x,p.z,shape)+.064-1e-5);
   }
   const island=new THREE.Group(),cascade=createCascadingWaterfall(island,shape);
   expect(cascade.mesh.name).toBe('waterfall-cascade');
   const attr=cascade.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
   expect(attr.count).toBe(53*5);
   const before=attr.array;
   cascade.update(2);
   expect((cascade.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array).toBe(before);
   dispose(island);
  }
 });
 it('re-samples ocean shallow-water colors only when the stage shape changes',()=>{
  const scene=new THREE.Scene(),ocean=createAnimatedOcean(scene);
  const sea=scene.children.find(o=>o instanceof THREE.Mesh&&o.geometry instanceof THREE.PlaneGeometry) as THREE.Mesh;
  const colors=sea.geometry.getAttribute('color') as THREE.BufferAttribute;
  ocean.update(1.1);
  const initial=Array.from(colors.array);
  const count=scene.children.length,geometry=sea.geometry;
  ocean.setShape('LAGOON');ocean.update(1.1);
  expect(Array.from(colors.array)).not.toEqual(initial);
  ocean.setShape('CLOVER');ocean.update(1.1);
  expect(scene.children).toHaveLength(count);
  expect(sea.geometry).toBe(geometry);
  expect(coastLight(4,0,'LAGOON')).toBeGreaterThan(coastLight(4,0,'RING'));
  expect(coastLight(0,4,'LAGOON')).toBeLessThan(coastLight(0,4,'RING'));
  ocean.setShape('RING');ocean.update(1.1);
  const restored=Array.from(colors.array);
  expect(restored).toEqual(initial);
  dispose(scene);
 });
 it('keeps board actor positions outside land even at lobes and major axes',()=>{
  for(const shape of MAP_SHAPES){
   for(let i=0;i<72;i++){
    const p=boardPathFrame(i/72,shape);
    const angle=Math.atan2(p.z,p.x);
    const coast=terrainRadius(angle,shape);
    expect(Math.hypot(p.x,p.z)-coast).toBeGreaterThan(.17);
   }
  }
 });
});
