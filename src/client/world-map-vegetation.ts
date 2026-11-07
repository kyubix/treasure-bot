import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {MapShapeId} from '../engine/map-shapes.ts';
import {terrainHeight,terrainRadius} from './world-map-terrain.ts';
import {RING_CAMP_CLEARING} from './world-map-landmark-layout.ts';

/**
 * Instanced sculpted tree assets. Three geometry draw calls replace dozens
 * of independently rendered spheres/cones while preserving convincing
 * silhouettes and stage-specific color treatments on Android.
 *
 * All coordinates are deterministic and driven by the shared heightfield.
 * This scenery cannot alter board, site IDs, input or player state.
 */
type TreeKind='broadleaf'|'pine';
interface TreePlacement {x:number;z:number;y:number;scale:number;rotation:number;kind:TreeKind;}
const clusters=[
  {x:-1.64,z:-.52,n:11,seed:7},
  {x:-2.02,z:1.25,n:11,seed:18},
  {x:.78,z:-2.22,n:13,seed:32},
  {x:1.92,z:1.23,n:12,seed:45},
  {x:-.26,z:2.10,n:11,seed:58}
] as const;
const random=(n:number):number=>{
  const v=Math.sin(n*74.37+11.27)*25711.71;
  return v-Math.floor(v);
};
const slope=(x:number,z:number,shape:MapShapeId):number=>{
  const e=.08;
  return Math.hypot(
    terrainHeight(x+e,z,shape)-terrainHeight(x-e,z,shape),
    terrainHeight(x,z+e,shape)-terrainHeight(x,z-e,shape)
  )/(2*e);
};
export function forestPlacements(shape:MapShapeId='RING'):TreePlacement[]{
  const result:TreePlacement[]=[];
  for(const cluster of clusters)for(let i=0;i<cluster.n;i++){
    const angle=i*2.39996323;
    const r=.14+.45*Math.sqrt((i+.5)/cluster.n);
    const x=cluster.x+Math.cos(angle)*r;
    const z=cluster.z+Math.sin(angle)*r;
    // The outer board and Gallery numbers remain unobstructed.
    const coast=terrainRadius(Math.atan2(z,x),shape);
    if(Math.hypot(x,z)>coast-.65)continue;
    if(Math.hypot(x-.75,z-.61)<.78)continue;
    if(Math.hypot(x-.10,z+1.12)<.74)continue;
    if(Math.hypot(x+.72,z-.90)<.78)continue;
    // Reserve the tent footprint (including ropes and lantern) on Ring.
    if(shape==='RING'&&Math.hypot(x-RING_CAMP_CLEARING.x,
      z-RING_CAMP_CLEARING.z)<RING_CAMP_CLEARING.radius)continue;
    if(slope(x,z,shape)>.48)continue;
    const kind:TreeKind=(
      shape==='CLOVER'?i%3===0:shape==='LAGOON'?i%8===0:i%5===3
    )?'pine':'broadleaf';
    result.push({
      x,z,y:terrainHeight(x,z,shape),
      scale:.73+.40*random(cluster.seed+i*3.7),
      rotation:random(cluster.seed*13+i)*Math.PI*2,kind
    });
  }
  return result;
}
function addPart(parts:THREE.BufferGeometry[],geometry:THREE.BufferGeometry,
  hex:number,x:number,y:number,z:number,sx=1,sy=1,sz=1):void{
  geometry.scale(sx,sy,sz);
  geometry.translate(x,y,z);
  const c=new THREE.Color(hex);
  const rgb=new Float32Array(geometry.getAttribute('position').count*3);
  for(let i=0;i<rgb.length;i+=3){
    rgb[i]=c.r;rgb[i+1]=c.g;rgb[i+2]=c.b;
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(rgb,3));
  parts.push(geometry);
}
function treePalette(shape:MapShapeId){
  return shape==='LAGOON'
    ?{deep:0x267965,mid:0x3d9c79,light:0x7bc494,bark:0x776246}
    :shape==='CLOVER'
    ?{deep:0x285b4d,mid:0x398568,light:0x76ad69,bark:0x68563e}
    :{deep:0x286648,mid:0x48965e,light:0x8bc276,bark:0x805b41};
}
function treeGeometry(kind:TreeKind,shape:MapShapeId):THREE.BufferGeometry{
  const parts:THREE.BufferGeometry[]=[];
  const p=treePalette(shape);
  addPart(parts,new THREE.CylinderGeometry(.057,.092,.58,9,2),
    p.bark,0,.30,0);
  // Roots/short branches soften the boxy silhouette of primitive trees.
  for(const s of [-1,1]){
    const branch=new THREE.CylinderGeometry(.020,.039,.25,7,1);
    branch.rotateZ(s*.65);
    addPart(parts,branch,p.bark,s*.095,.47,.012);
  }
  if(kind==='broadleaf'){
    // Overlapping asymmetrical ellipsoids give a modeled foliage canopy,
    // while warm upper highlights add volume without extra lighting passes.
    const lumps=[
      [-.19,.78,-.08,.33,.27,.30,p.deep],
      [ .18,.82,.06,.32,.28,.31,p.mid],
      [-.05,.98,.01,.33,.30,.32,p.mid],
      [ .02,.78,.24,.28,.25,.27,p.light],
      [-.16,1.04,-.09,.23,.19,.20,p.light]
    ] as const;
    for(const [x,y,z,sx,sy,sz,color] of lumps)
      addPart(parts,new THREE.SphereGeometry(1,10,7),color,x,y,z,sx,sy,sz);
  }else{
    // Curving tiered fir crowns; more silhouette definition than cones.
    const layers=[
      {y:.63,r:.39,h:.55,c:p.deep},
      {y:.86,r:.30,h:.49,c:p.mid},
      {y:1.08,r:.21,h:.42,c:p.light}
    ];
    for(const layer of layers){
      const profile=[
        new THREE.Vector2(.06,0),
        new THREE.Vector2(layer.r*.67,.05),
        new THREE.Vector2(layer.r,.13),
        new THREE.Vector2(layer.r*.90,.22),
        new THREE.Vector2(layer.r*.55,layer.h*.75),
        new THREE.Vector2(0,layer.h)
      ];
      const crown=new THREE.LatheGeometry(profile,12);
      addPart(parts,crown,layer.c,0,layer.y-.14,0);
    }
  }
  const merged=mergeGeometries(parts,false);
  for(const part of parts)part.dispose();
  if(!merged)throw new Error('Could not assemble detailed forest geometry');
  merged.computeBoundingSphere();
  return merged;
}
export function createDetailedForest(shape:MapShapeId='RING'):THREE.Group{
  const group=new THREE.Group();
  group.name='worldmap-detailed-forest-'+shape.toLowerCase();
  const list=forestPlacements(shape);
  const mat=new THREE.MeshStandardMaterial({
    vertexColors:true,roughness:.89,metalness:0,flatShading:false
  });
  const transform=new THREE.Object3D(),tone=new THREE.Color();
  for(const kind of ['broadleaf','pine'] as const){
    const trees=list.filter(tree=>tree.kind===kind);
    const mesh=new THREE.InstancedMesh(treeGeometry(kind,shape),mat,trees.length);
    mesh.name='worldmap-detailed-'+kind;
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.frustumCulled=false;
    for(let i=0;i<trees.length;i++){
      const tree=trees[i];
      transform.position.set(tree.x,tree.y-.025,tree.z);
      transform.rotation.set(0,tree.rotation,0);
      transform.scale.setScalar(tree.scale);
      transform.updateMatrix();
      mesh.setMatrixAt(i,transform.matrix);
      // Slight per-tree tonal variation without separate materials.
      const brightness=.90+.13*random(i*17+(kind==='pine'?31:9));
      mesh.setColorAt(i,tone.setRGB(brightness,brightness,brightness));
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    group.add(mesh);
  }
  return group;
}
