import * as THREE from 'three';
import type {BoardBiome} from './board-environment.ts';
import {BOARD_BIOME_PALETTE} from './board-environment.ts';
import {createBoardBackdropDetail} from './board-view-background-detail.ts';

const biomes:Record<BoardBiome,{rock:number;grass:number;forest:number;accent:number}>={
 meadow:{rock:0xa3b49c,grass:0x74b388,forest:0x3c8868,accent:0xf3db9a},
 forest:{rock:0x8a9d8b,grass:0x4b8d6f,forest:0x246947,accent:0xd8eaae},
 cliffs:{rock:0xb8aa91,grass:0x7c9e85,forest:0x428366,accent:0xd8c5a2},
 coast:{rock:0xc3b89d,grass:0x83bbb2,forest:0x339c82,accent:0x8cdae7},
 desert:{rock:0xcfa37c,grass:0xdcb980,forest:0x859a71,accent:0xffe6ae},
 volcano:{rock:0x685b68,grass:0x7a6976,forest:0x5c5769,accent:0xf58c63},
 ice:{rock:0x9eb8c7,grass:0xb4d7df,forest:0x8ec3c6,accent:0xe9faff}
};
const noise=(x:number,z:number)=>Math.sin(x*.44+z*.25)*.48+
 Math.sin(z*.73-x*.22)*.37+Math.sin(x*1.31+z*.67)*.14;
const mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.86});
const add=(root:THREE.Group,g:THREE.BufferGeometry,m:THREE.Material,
 x:number,y:number,z:number)=>{
 const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;
 o.receiveShadow=true;root.add(o);return o;
};
export function buildBoardBackdrop(biome:BoardBiome):THREE.Group{
 const group=new THREE.Group();group.name='board-hd-scenery';
 const c=biomes[biome],p=BOARD_BIOME_PALETTE[biome];
 const cols=70,rows=28;
 // One surface equation positions scenery and terrain consistently.
 const terrainY=(x:number,z:number):number=>{
  const far=THREE.MathUtils.clamp((-3.1-z)/(rows*.74),0,1);
  const ridge=Math.max(0,noise(x,z)+Math.sin(x*.19+z*.20)*.6);
  return .20+far*(2.6+(biome==='cliffs'||biome==='volcano'?2:0))
   +ridge*(.3+far*2.4);
 };
 const positions:number[]=[],colors:number[]=[],index:number[]=[];
 const soil=new THREE.Color(c.grass),stone=new THREE.Color(c.rock);
 for(let j=0;j<=rows;j++){
  const z=-3.1-j*.74,far=j/rows;
  for(let i=0;i<=cols;i++){
   const x=(i/cols-.5)*54;
   const ridge=Math.max(0,noise(x,z)+Math.sin(x*.19+z*.20)*.6);
   const y=terrainY(x,z);
   positions.push(x,y,z);
   const color=soil.clone().lerp(stone,Math.min(.86,far*.6+ridge*.20));
   const light=1+Math.sin(i*4.3+j*6.9)*.035;
   colors.push(color.r*light,color.g*light,color.b*light);
  }
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const a=j*(cols+1)+i,b=a+cols+1;
  index.push(a,a+1,b,a+1,b+1,b);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setIndex(index);
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 const hills=add(group,geometry,new THREE.MeshStandardMaterial({
  vertexColors:true,side:THREE.DoubleSide,roughness:1
 }),0,0,0);
 hills.castShadow=false;
 const ground=add(group,new THREE.PlaneGeometry(115,50),mat(c.grass),0,.04,-9);
 ground.rotation.x=-Math.PI/2;ground.castShadow=false;
 const forest=biome==='forest'||biome==='meadow'||biome==='coast';
 const count=forest?100:biome==='desert'?36:56;
 const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),count);
 const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.19,1.5,7),
  mat(0x695945),count);
 const obj=new THREE.Object3D(),color=new THREE.Color();
 for(let i=0;i<count;i++){
  const x=((i*31%103)/103-.5)*49;
  const z=-4-((i*47%97)/97)*18;
  const size=.55+((i*23%37)/37)*.70;
  const height=terrainY(x,z);
  obj.position.set(x,height+size*1.20,z);
  obj.scale.set(size*.77,size*.79,size*.77);
  obj.rotation.y=i*.23;obj.updateMatrix();leaves.setMatrixAt(i,obj.matrix);
  color.setHex(c.forest).lerp(new THREE.Color(c.accent),.09+.18*((i*13%17)/17));
  if(biome==='ice')color.setHex(0xc6e9ef);
  if(biome==='volcano')color.setHex(0x6e666c);
  leaves.setColorAt(i,color);
  obj.position.set(x,height+size*.42,z);
  obj.scale.setScalar(size*.65);obj.updateMatrix();
  stems.setMatrixAt(i,obj.matrix);
 }
 leaves.instanceMatrix.needsUpdate=true;stems.instanceMatrix.needsUpdate=true;
 leaves.frustumCulled=false;stems.frustumCulled=false;
 leaves.castShadow=false;stems.castShadow=false;
 group.add(leaves,stems);
 if(biome==='coast'||biome==='ice'){
  const water=add(group,new THREE.PlaneGeometry(90,9),
   new THREE.MeshPhysicalMaterial({color:biome==='ice'?0x99dbe7:0x46b9c8,
    roughness:.24,clearcoat:.7,clearcoatRoughness:.14}),
   0,.07,-9);
  water.rotation.x=-Math.PI/2;water.castShadow=false;
 }
 group.add(createBoardBackdropDetail(biome,c,terrainY));
 group.userData.sky=p.sky;
 return group;
}
export function makeBoardLandmark(
 type:'gallery'|'shop'|'event'|'support'|'plain',number:number|null
):THREE.Group{
 const root=new THREE.Group();root.name='board-location-landmark';
 const ivory=mat(0xf6e4bf),gold=mat(0xd9ad62),deep=mat(0x344e65);
 const wall=mat(type==='shop'?0xe7b18f:type==='gallery'?0xcbbae0:0x9ad3d4);
 if(type==='event'){
  const gate=add(root,new THREE.TorusGeometry(1,.14,10,30),gold,0,1.45,-.6);
  gate.rotation.y=.12;
  const gem=add(root,new THREE.OctahedronGeometry(.7,1),
   new THREE.MeshStandardMaterial({color:0x7edbe0,emissive:0x277888,
    emissiveIntensity:.46,roughness:.16}),0,1.54,-.6);
  gem.castShadow=false;
 }else if(type==='support'){
  add(root,new THREE.CylinderGeometry(.77,.9,.33,14),ivory,0,.21,-.53);
  add(root,new THREE.CylinderGeometry(.32,.37,1.53,12),wall,0,1.13,-.53);
  add(root,new THREE.IcosahedronGeometry(.48,2),
   new THREE.MeshStandardMaterial({color:0xa3f5cb,emissive:0x2e7961,
    emissiveIntensity:.36}),0,2.10,-.53);
 }else if(type==='plain'){
  for(const sign of [-1,1])add(root,new THREE.CylinderGeometry(.16,.19,1.57,10),
   ivory,sign*.66,.86,-.63);
  add(root,new THREE.BoxGeometry(1.75,.20,.65),gold,0,1.72,-.63);
 }else{
  // Gallery facade is a BOARD close-up encounter; World Map has only numbers.
  add(root,new THREE.BoxGeometry(2.48,2,1.1),wall,0,1.20,-.89);
  add(root,new THREE.BoxGeometry(2.78,.22,1.33),gold,0,2.36,-.89);
  add(root,new THREE.BoxGeometry(2.96,.14,1.39),ivory,0,2.55,-.89);
  for(const side of [-1,1]){
   add(root,new THREE.CylinderGeometry(.13,.18,1.8,10),ivory,
    side*1.06,1.12,-.27);
   const glass=add(root,new THREE.BoxGeometry(.32,.56,.055),
    new THREE.MeshPhysicalMaterial({color:0x71c6d8,roughness:.16,
     metalness:.05,clearcoat:.8}),side*.75,1.48,-.30);
   glass.castShadow=false;
  }
  add(root,new THREE.BoxGeometry(.98,1.28,.08),deep,0,.82,-.26);
  add(root,new THREE.BoxGeometry(.77,1.08,.09),mat(0x548297),0,.79,-.20);
  add(root,new THREE.SphereGeometry(.055,10,8),gold,.29,.78,-.12);
  root.userData.sign=type==='shop'?'ROBOT SHOP':'GALLERY No.'+String(number??1);
 }
 return root;
}
export function disposeEnvironment(root:THREE.Object3D):void{
 const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>();
 root.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  gs.add(o.geometry);
  for(const m of (Array.isArray(o.material)?o.material:[o.material]))ms.add(m);
 });
 gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());
 root.parent?.remove(root);
}