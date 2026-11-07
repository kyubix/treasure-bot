import * as THREE from 'three';

/**
 * V8 mobile-first, original tileable PBR micro-surfaces.
 * Neutral albedo preserves the color identity authored into each GLB and
 * terrain vertex. Normal maps add subtle stone, wood and fabric relief.
 *
 * No Canvas, network, image decode, randomness or per-frame GPU updates.
 * 5 materials × 2 RGBA 96² textures ≈ 360 KiB raw pixel data.
 */
export type SurfaceKind='stone'|'wood'|'fabric'|'foliage'|'soil';
export const SURFACE_SIZE=96;
const TAU=Math.PI*2;
const clamp=(x:number,min=0,max=1)=>Math.min(max,Math.max(min,x));

export function surfaceHeight(kind:SurfaceKind,x:number,y:number):number{
 const u=((x%SURFACE_SIZE)+SURFACE_SIZE)%SURFACE_SIZE/SURFACE_SIZE;
 const v=((y%SURFACE_SIZE)+SURFACE_SIZE)%SURFACE_SIZE/SURFACE_SIZE;
 const a=Math.sin(TAU*u),b=Math.sin(TAU*v);
 const fine=Math.sin(TAU*(u*13+v*7))*.10+
  Math.cos(TAU*(u*17-v*11))*.065;
 if(kind==='wood'){
  const grain=Math.sin(TAU*(v*11+.16*Math.sin(TAU*u*3)+.055*Math.sin(TAU*v*2)));
  const growth=Math.sin(TAU*(v*21+.12*Math.sin(TAU*u*5)));
  return clamp(.50+grain*.24+growth*.09+fine*.31);
 }
 if(kind==='stone'){
  const row=u*5+.11*Math.sin(TAU*v*2);
  const column=v*4+.08*Math.cos(TAU*u*3);
  const seam=Math.min(Math.abs(row-Math.round(row)),
   Math.abs(column-Math.round(column)));
  const veins=Math.sin(TAU*(u*5+v*8+.14*Math.sin(TAU*v*3)));
  return clamp(.54+.16*veins+.18*a*b+fine*.6-(seam<.045?.23:0));
 }
 if(kind==='fabric'){
  const weave=Math.sin(TAU*u*23)*Math.sin(TAU*v*22);
  return clamp(.52+.20*weave+.12*Math.cos(TAU*u*4)+fine*.42);
 }
 if(kind==='foliage'){
  return clamp(.48+.18*a*b+.11*Math.sin(TAU*(u*9+v*6))
    +.14*Math.cos(TAU*(u*5-v*7))+fine*.48);
 }
 return clamp(.50+.19*Math.sin(TAU*(u*7+v*5))
  +.12*Math.cos(TAU*(u*3-v*9))+.13*a*b+fine*.52);
}

export interface SurfacePair {
 readonly color:THREE.DataTexture;
 readonly normal:THREE.DataTexture;
}
export function createSurfacePair(kind:SurfaceKind):SurfacePair{
 const n=SURFACE_SIZE,albedo=new Uint8Array(n*n*4);
 const normal=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,h=surfaceHeight(kind,x,y);
  // Neutral modulation, not a second art palette: maintain PBR color
  // factors, tile identity and the stage's authored vertex colors.
  const shade=Math.round(216+39*h);
  albedo[i]=shade;albedo[i+1]=shade;albedo[i+2]=shade;albedo[i+3]=255;
  const dx=(surfaceHeight(kind,x-1,y)-surfaceHeight(kind,x+1,y))*.72;
  const dy=(surfaceHeight(kind,x,y-1)-surfaceHeight(kind,x,y+1))*.72;
  const length=Math.hypot(dx,dy,1);
  normal[i]=Math.round(255*(dx/length*.5+.5));
  normal[i+1]=Math.round(255*(dy/length*.5+.5));
  normal[i+2]=Math.round(255*(1/length*.5+.5));
  normal[i+3]=255;
 }
 const make=(bytes:Uint8Array,srgb:boolean):THREE.DataTexture=>{
  const texture=new THREE.DataTexture(bytes,n,n,THREE.RGBAFormat);
  texture.wrapS=THREE.RepeatWrapping;
  texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;
  texture.anisotropy=2;
  if(srgb)texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  return texture;
 };
 return {color:make(albedo,true),normal:make(normal,false)};
}

export function landmarkSurfaceKind(name:string):SurfaceKind|null{
 if(['wood','darkWood','lightWood','bark'].includes(name))return 'wood';
 if(['stone','stoneDark','sandstone','plaster','plasterDark','cream'].includes(name))return 'stone';
 if(['canvas','canvasLight','canvasShade','rope'].includes(name))return 'fabric';
 if(['moss','grass','olive'].includes(name))return 'foliage';
 // Metal, glass, crystals and lanterns intentionally remain untiled.
 return null;
}
export interface WorldSurfaceLibrary{
 apply(material:THREE.Material,kind?:SurfaceKind):void;
 dispose():void;
 readonly count:()=>number;
}
export function createWorldSurfaceLibrary():WorldSurfaceLibrary{
 const textures=new Map<SurfaceKind,SurfacePair>();
 let disposed=false;
 return {
  apply(material,kind){
   if(disposed||!(material instanceof THREE.MeshStandardMaterial))return;
   const surface=kind??landmarkSurfaceKind(material.name);
   if(!surface)return;
   let pair=textures.get(surface);
   if(!pair){pair=createSurfacePair(surface);textures.set(surface,pair);}
   material.map=pair.color;
   material.normalMap=pair.normal;
   const strength=surface==='stone'?.29:surface==='wood'?.21:.17;
   material.normalScale.set(strength,strength);
   material.needsUpdate=true;
  },
  count:()=>textures.size,
  dispose(){
   if(disposed)return;
   disposed=true;
   for(const pair of textures.values()){pair.color.dispose();pair.normal.dispose();}
   textures.clear();
  }
 };
}
