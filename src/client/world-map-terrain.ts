import * as THREE from 'three';

/**
 * Original, deterministic PS1-inspired landscape.
 *
 * Matches the existing 3D island master (radius ~3.18, floor y=.42), the
 * real board path (radius 3.29-3.68) and the lagoon at (.75,.61).
 * No gameplay data or player/robot IDs are placed in this mesh.
 */
const TAU=Math.PI*2;
const BASE=.421;
export const terrainRadius=(angle:number):number=>
  3.17*(1+.024*Math.sin(angle*5+.33)+.016*Math.sin(angle*9-1.1)
    +.010*Math.cos(angle*13+.3));
const fract=(n:number)=>n-Math.floor(n);
const hash=(x:number,z:number)=>fract(Math.sin(x*127.1+z*311.7+75.3)*43758.5453);
function noise(x:number,z:number):number{
  const a=Math.floor(x),b=Math.floor(z),u=x-a,v=z-b;
  const sx=u*u*(3-2*u),sz=v*v*(3-2*v);
  const c=THREE.MathUtils.lerp(hash(a,b),hash(a+1,b),sx);
  const d=THREE.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),sx);
  return THREE.MathUtils.lerp(c,d,sz);
}
const fbm=(x:number,z:number)=>
  .56*noise(x,z)+.29*noise(x*2.1,z*2.1)+.15*noise(x*4.17,z*4.17);
function smooth(a:number,b:number,x:number):number{
  const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);
  return t*t*(3-2*t);
}
function mountain(x:number,z:number,cx:number,cz:number,r:number,h:number):number{
  const dx=x-cx,dz=z-cz,angle=Math.atan2(dz,dx);
  const uneven=1+.085*Math.sin(angle*6+cx*2)+.045*Math.sin(angle*11+cz*3);
  const d=Math.hypot(dx,dz)/(r*uneven);
  const lower=1-smooth(.53,1.01,d);
  const middle=1-smooth(.30,.57,d);
  const summit=1-smooth(.12,.32,d);
  return h*(.28*lower+.39*middle+.33*summit);
}
export function terrainHeight(x:number,z:number):number{
  const micro=(fbm(x*1.16,z*1.16)-.5)*.065;
  const ridgeA=mountain(x,z,.10,-1.12,.93,1.73);
  const ridgeB=mountain(x,z,-.72,.90,1.12,1.86);
  // The pond is a maintained flat clearing, not a mesh buried in the cliff.
  const pond=1-smooth(.65,1.03,Math.hypot(x-.75,z-.61));
  return BASE+(1-pond)*Math.max(ridgeA,ridgeB)+micro*(1-pond*.8);
}
const baseGrass=new THREE.Color(0x66aa45);
const sunGrass=new THREE.Color(0x8bc35a);
const rock=new THREE.Color(0x8b7158);
const rockLight=new THREE.Color(0xc09d72);
const soil=new THREE.Color(0x4c8c43);
const terrainMat=new THREE.MeshStandardMaterial({
  vertexColors:true,flatShading:true,roughness:1,side:THREE.DoubleSide
});
export function createTerrainMesh():THREE.Mesh{
  // Radial topology follows the exact irregular rim without square grid cuts.
  const sectors=120,rings=45;
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const tint=new THREE.Color();
  for(let j=0;j<=rings;j++){
    const fraction=j/rings;
    for(let i=0;i<=sectors;i++){
      const a=i/sectors*TAU,r=terrainRadius(a)*fraction;
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      const h=terrainHeight(x,z);
      positions.push(x,h,z);
      const e=.067;
      const slope=Math.hypot(terrainHeight(x+e,z)-terrainHeight(x-e,z),
        terrainHeight(x,z+e)-terrainHeight(x,z-e))/(e*2);
      const rocky=smooth(.43,.93,slope);
      const colourNoise=fbm(x*3.9,z*3.9);
      tint.copy(baseGrass).lerp(sunGrass,.22+.62*colourNoise);
      tint.lerp(soil,Math.max(0,.18-.15*colourNoise));
      tint.lerp(rock.clone().lerp(rockLight,.20+.45*colourNoise),
        rocky*(.80+.15*smooth(.7,1.4,h)));
      // Mild sandy tint is limited to the outer grass edge.
      tint.lerp(rockLight, smooth(.94,.999,fraction)*.25);
      colors.push(tint.r,tint.g,tint.b);
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++){
    const n=j*(sectors+1)+i,b=n+sectors+1;
    // Counter-clockwise as seen from above: the sun lights grass, not the
    // underside of the island.
    indices.push(n,n+1,b,b,n+1,b+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,terrainMat);
  mesh.castShadow=true;mesh.receiveShadow=true;
  return mesh;
}
const green=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true});
const stone=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true});
const olive=[0x376d3f,0x4a8c47,0x5a9b4b,0x7fb356];
const gray=[0x927d61,0xafa087,0x75614e];
function validGround(x:number,z:number):boolean{
  const d=Math.hypot(x,z),a=Math.atan2(z,x);
  if(d>terrainRadius(a)-.34||d<.19)return false;
  if(Math.hypot(x-.75,z-.61)<.90)return false;
  if(Math.hypot(x-.1,z+1.12)<1.00)return false;
  if(Math.hypot(x+.72,z-.90)<1.17)return false;
  // Clear the decorative ruin/lighthouse areas.
  if(Math.hypot(x-2.1,z+1.5)<.53||Math.hypot(x-1.86,z-2.28)<.43)return false;
  const e=.09;
  return Math.hypot(terrainHeight(x+e,z)-terrainHeight(x-e,z),
    terrainHeight(x,z+e)-terrainHeight(x,z-e))/(e*2)<.35;
}
function scatter(
  root:THREE.Group,
  count:number,
  geometry:THREE.BufferGeometry,
  material:THREE.Material,
  palette:number[],
  factor:number,
  heightOffset:number
):void{
  const points:{x:number;z:number;scale:number;rot:number}[]=[];
  for(let i=1;points.length<count&&i<1900;i++){
    const angle=i*2.39996323;
    const r=2.87*Math.sqrt(((i*137)%997)/997);
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    if(!validGround(x,z))continue;
    points.push({x,z,scale:factor*(.76+.48*hash(i,7)),rot:i*.23});
  }
  const mesh=new THREE.InstancedMesh(geometry,material,points.length);
  const transform=new THREE.Object3D(),colour=new THREE.Color();
  for(let i=0;i<points.length;i++){
    const p=points[i];
    transform.position.set(p.x,terrainHeight(p.x,p.z)+heightOffset,p.z);
    transform.rotation.set(0,p.rot,0);
    transform.scale.setScalar(p.scale);
    transform.updateMatrix();
    mesh.setMatrixAt(i,transform.matrix);
    mesh.setColorAt(i,colour.setHex(palette[i%palette.length]));
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.frustumCulled=false;
  mesh.castShadow=false;mesh.receiveShadow=true;
  root.add(mesh);
}
export function addTerrainDetail(root:THREE.Group):void{
  // Mobile-friendly batched decorations: just three draw calls.
  scatter(root,175,new THREE.IcosahedronGeometry(.155,0),green,olive,1.0,.10);
  scatter(root,125,new THREE.ConeGeometry(.095,.27,5),green,olive,.9,.12);
  scatter(root,65,new THREE.DodecahedronGeometry(.12,0),stone,gray,1.0,.085);
}

/** One contiguous low-cost shoreline foam strip matching the irregular rock rim. */
export function createSurfBand():THREE.Mesh{
  const positions:number[]=[],faces:number[]=[];
  const count=120;
  for(let i=0;i<=count;i++){
    const a=i/count*TAU,shore=terrainRadius(a)/3.17;
    for(const r of [3.52*shore,3.72*shore]){
      positions.push(Math.cos(a)*r,-.393,Math.sin(a)*r);
    }
  }
  for(let i=0;i<count;i++){
    const n=i*2;faces.push(n,n+2,n+1,n+1,n+2,n+3);
  }
  const g=new THREE.BufferGeometry();
  g.setIndex(faces);
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({
    color:0xbbeee2,transparent:true,opacity:.66,side:THREE.DoubleSide,
    depthWrite:false
  }));
  return m;
}
