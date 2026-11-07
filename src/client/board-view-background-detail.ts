import * as THREE from 'three';
import {BOARD_BIOME_PALETTE} from './board-environment.ts';
import type {BoardBiome} from './board-environment.ts';

/** Original scenery geometry only. All objects are deterministic and shared
 * by InstancedMesh; no per-frame textures, network assets or shader passes.
 * The existing board biome's color palette remains authoritative.
 */
export interface BoardBackdropColors {
 rock:number;
 grass:number;
 forest:number;
 accent:number;
}
export function createBoardBackdropDetail(
 biome:BoardBiome,
 colors:BoardBackdropColors,
 groundHeight:(x:number,z:number)=>number
):THREE.Group{
 const root=new THREE.Group();
 root.name='board-hd-background-detail';
 const palette=BOARD_BIOME_PALETTE[biome];
 const skyColor=new THREE.Color(palette.sky);
 const horizonColor=new THREE.Color(palette.horizon);
 const farColor=new THREE.Color(palette.far);
 const nearColor=new THREE.Color(palette.near);
 const mesh=(geometry:THREE.BufferGeometry,material:THREE.Material,name:string)=>{
  const object=new THREE.Mesh(geometry,material);
  object.name=name;
  object.castShadow=false;
  object.receiveShadow=false;
  root.add(object);
  return object;
 };
 // A subtle vertex-gradient sky behind the full-length mountain silhouettes.
 // Unlike a single flat background color, it adds atmospheric depth without
 // HDR maps, texture downloads or a costly full-screen shader pass.
 const skyGeometry=new THREE.PlaneGeometry(160,90,1,16);
 const skyPositions=skyGeometry.getAttribute('position') as THREE.BufferAttribute;
 const skyColors:number[]=[];
 for(let i=0;i<skyPositions.count;i++){
  const t=THREE.MathUtils.clamp((skyPositions.getY(i)+45)/90,0,1);
  const col=horizonColor.clone().lerp(skyColor,Math.pow(t,.62));
  skyColors.push(col.r,col.g,col.b);
 }
 skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(skyColors,3));
 const sky=mesh(skyGeometry,new THREE.MeshBasicMaterial({
  vertexColors:true,side:THREE.DoubleSide,fog:false,depthWrite:false
 }),'gradient-sky');
 sky.position.set(0,15,-66);
 // Far ridge silhouettes have soft, asymmetrical outlines with parallax.
 for(let layer=0;layer<2;layer++){
  const z=-31-layer*12;
  const positions:number[]=[],vertexColors:number[]=[],indices:number[]=[];
  const low=farColor.clone().lerp(skyColor,layer*.48);
  const topColor=low.clone().lerp(horizonColor,.24);
  const count=128;
  for(let i=0;i<=count;i++){
   const x=(i/count-.5)*74;
   const ridge=Math.sin(x*.18+layer*1.31)*1.35+
     Math.sin(x*.43-layer*.82)*.61+
     Math.cos(x*.84+layer)*.25;
   const y=4.6+layer*2.4+ridge*(layer?1.23:1.55);
   positions.push(x,-2,z,x,y,z);
   vertexColors.push(low.r*.73,low.g*.78,low.b*.81,
     topColor.r,topColor.g,topColor.b);
   if(i<count){
    const k=i*2;
    indices.push(k,k+1,k+2,k+1,k+3,k+2);
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
  geometry.computeVertexNormals();
  mesh(geometry,new THREE.MeshStandardMaterial({
   vertexColors:true,roughness:1,side:THREE.DoubleSide
  }),layer?'misty-distant-peaks':'layered-mid-ridge');
 }
 // Distant soft clouds are repeated using one geometry and material.
 const cloudCount=13;
 const clouds=new THREE.InstancedMesh(
  new THREE.SphereGeometry(1,12,8),
  new THREE.MeshBasicMaterial({
   color:biome==='volcano'?0xd8aaa2:biome==='desert'?0xffecd0:0xf1f8f4,
   transparent:true,opacity:.38,depthWrite:false,fog:false
  }),cloudCount);
 clouds.name='distant-cloud-banks';
 const dummy=new THREE.Object3D();
 for(let i=0;i<cloudCount;i++){
  const x=((i*47%103)/103-.5)*76;
  dummy.position.set(x,10+(i*13%11)*1.04,-41-(i*7%17));
  dummy.rotation.set(0,(i%5)*.07,(i%3)*.05);
  dummy.scale.set(1.7+(i%4)*.85,.16+(i%3)*.13,.65+(i%4)*.19);
  dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);
 }
 clouds.instanceMatrix.needsUpdate=true;
 clouds.frustumCulled=false;
 root.add(clouds);
 // Naturalized rocks, grasses and blooms are instanced and deliberately
 // low-cost; each geometry supports all seven Board biomes.
 const addScatter=(
  name:string,geometry:THREE.BufferGeometry,
  material:THREE.Material,count:number,
  position:(i:number,object:THREE.Object3D)=>void,
  colorFor?:(i:number)=>THREE.Color
 )=>{
  const batch=new THREE.InstancedMesh(geometry,material,count);
  batch.name=name;batch.castShadow=false;batch.receiveShadow=true;
  batch.frustumCulled=false;
  for(let i=0;i<count;i++){
   position(i,dummy);
   dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
   if(colorFor)batch.setColorAt(i,colorFor(i));
  }
  batch.instanceMatrix.needsUpdate=true;
  if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
  root.add(batch);
 };
 const placements=(i:number,salt=0)=>{
  const x=((i*37+salt*17)%127/127-.5)*49;
  const z=-3.55-(((i*53+salt*29)%131)/131)*19;
  return {x,z,y:groundHeight(x,z)};
 };
 const rockColor=new THREE.Color(colors.rock);
 addScatter('scattered-worn-boulders',
  new THREE.IcosahedronGeometry(1,1),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95}),47,
  (i,obj)=>{
   const {x,z,y}=placements(i,2);
   const radius=.20+((i*17%19)/19)*.38;
   obj.position.set(x,y+radius*.29,z);
   obj.rotation.set((i%5)*.16,i*1.17,(i%7)*.07);
   obj.scale.set(radius*1.46,radius*.63,radius*.98);
  },i=>rockColor.clone().lerp(nearColor,(i%9)*.046));
 addScatter('grasses-and-low-shrubs',
  new THREE.ConeGeometry(1,1,7),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,
   side:THREE.DoubleSide}),82,
  (i,obj)=>{
   const {x,z,y}=placements(i,5);
   const size=.22+((i*13%27)/27)*.24;
   obj.position.set(x,y+size*.25,z);
   obj.rotation.set(0,i*2.43,.10*Math.sin(i*13));
   obj.scale.set(size*.65,size,size*.65);
  },i=>new THREE.Color(colors.forest).lerp(
   new THREE.Color(colors.grass),.23+(i%8)*.08));
 const blossomCount=biome==='forest'||biome==='meadow'||biome==='coast'?69:26;
 addScatter('biome-wildflowers-and-sparks',
  new THREE.SphereGeometry(1,8,6),
  new THREE.MeshStandardMaterial({
   color:0xffffff,roughness:biome==='volcano'?.29:.72,
   emissive:biome==='volcano'?0x7a2816:0x000000,
   emissiveIntensity:biome==='volcano'?.65:0
  }),blossomCount,
  (i,obj)=>{
   const {x,z,y}=placements(i,11);
   const size=.045+((i*7%13)/13)*.075;
   obj.position.set(x,y+.12+size*.6,z);
   obj.rotation.set(0,0,0);
   obj.scale.set(size,size*.88,size);
  },i=>new THREE.Color(colors.accent).lerp(
   horizonColor,(i%6)*.085));
 root.userData.detailVersion='stylized-detailed-v1';
 return root;
}
