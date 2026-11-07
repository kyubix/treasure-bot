import * as THREE from 'three';
import {stageRadialScale} from '../engine/map-shapes.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';

/**
 * Animated, original low-poly ocean for the opt-in Three.js World Map.
 * Reuses the same buffers every frame. A small 24 fps animation is only
 * scheduled while World Map is visible; no gameplay renderer redraw needed.
 */
export const OCEAN_LEVEL=-.48;
export const WAVE_INTERVAL_MS=1000/24;

export function waveHeight(x:number,z:number,t:number):number{
  // Two crossing long swells and one delicate, faster surface ripple.
  return .044*Math.sin(x*1.62+t*1.18)
    +.031*Math.cos(z*2.03-t*.91)
    +.015*Math.sin((x+z)*3.11+t*1.54);
}

export function coastLight(x:number,z:number,shape:MapShapeId='RING'):number{
  const r=Math.hypot(x,z)/stageRadialScale(Math.atan2(z,x),shape);
  const u=THREE.MathUtils.clamp((6.4-r)/2.7,0,1);
  return u*u*(3-2*u);
}

export interface AnimatedOcean {
 update(timeSeconds:number):void;
 setShape(shape:MapShapeId):void;
}

/** Create once per World Map. Its objects are owned/disposed with the scene. */
export function createAnimatedOcean(scene:THREE.Scene):AnimatedOcean{
  // The sample grid is intentionally bounded: ~3200 vertices is affordable
  // on mid-range Android devices while giving recognizable moving ripples.
  const geometry=new THREE.PlaneGeometry(30,30,56,56);
  geometry.rotateX(-Math.PI/2);
  const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
  const vertexColors=new Float32Array(positions.count*3);
  geometry.setAttribute('color',new THREE.BufferAttribute(vertexColors,3));
  const colors=geometry.getAttribute('color') as THREE.BufferAttribute;
  const shoreLight=Float32Array.from({length:positions.count},(_,i)=>coastLight(positions.getX(i),positions.getZ(i)));
  const base=new THREE.Color(0x167da8);
  const shallow=new THREE.Color(0x3ab8cb);
  const crest=new THREE.Color(0x9edbd7);
  const waterMaterial=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,roughness:.28,metalness:.045,
    transparent:true,opacity:.94,flatShading:true,side:THREE.DoubleSide
  });
  const sea=new THREE.Mesh(geometry,waterMaterial);
  sea.position.y=OCEAN_LEVEL;
  sea.receiveShadow=true;
  scene.add(sea);

  // Batched, fading sea glints beyond the board's coastline.
  const glints=84;
  const segments=new Float32Array(glints*6);
  const layout=new Float32Array(glints*3);
  const positionGlints=(shape:MapShapeId)=>{
    for(let i=0;i<glints;i++){
      const a=i*2.3999632297;
      const shoreScale=stageRadialScale(a,shape);
      const r=(3.92+3.2*((i*57%101)/101))*shoreScale;
      layout[i*3]=Math.cos(a)*r;
      layout[i*3+1]=Math.sin(a)*r;
      layout[i*3+2]=.09+.19*((i*31%79)/79);
    }
  };
  positionGlints('RING');
  const gleamGeometry=new THREE.BufferGeometry();
  gleamGeometry.setAttribute('position',new THREE.BufferAttribute(segments,3));
  const gleamMaterial=new THREE.LineBasicMaterial({
    color:0xd9f8ed,transparent:true,opacity:.28,depthWrite:false
  });
  scene.add(new THREE.LineSegments(gleamGeometry,gleamMaterial));

  // Quiet circular ripples in the shallow lagoon. They sit above the pond
  // geometry, not in the forest or on the raised cliffs.
  const pondRings=Array.from({length:2},(_,i)=>{
    const material=new THREE.MeshBasicMaterial({
      color:0xe4ffff,transparent:true,opacity:0,depthWrite:false,
      side:THREE.DoubleSide
    });
    const ring=new THREE.Mesh(new THREE.RingGeometry(.19,.21,32),material);
    ring.rotation.x=-Math.PI/2;
    ring.position.set(.75,.479+i*.001,.61);
    scene.add(ring);
    return {ring,material,offset:i*.5};
  });

  let activeShape:MapShapeId='RING';
  const setShape=(shape:MapShapeId)=>{
    if(shape===activeShape)return;
    activeShape=shape;
    // Re-sample the shallow water once on a map change. No reallocation
    // or extra scene meshes in the animation loop.
    for(let i=0;i<positions.count;i++)
      shoreLight[i]=coastLight(positions.getX(i),positions.getZ(i),shape);
    positionGlints(shape);
    const tones=shape==='LAGOON'?[0x167c9d,0x53c6c6,0xc4f1e7]:
      shape==='CLOVER'?[0x156e9f,0x40acbf,0x95e2dd]:
      [0x167da8,0x3ab8cb,0x9edbd7];
    base.setHex(tones[0]);shallow.setHex(tones[1]);crest.setHex(tones[2]);
  };
  const update=(t:number)=>{
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i);
      const h=waveHeight(x,z,t);
      positions.setY(i,h);
      const near=shoreLight[i];
      const sparkle=Math.pow(Math.max(0,Math.sin(x*2.6+z*1.7+t*1.25)),9);
      const mix=THREE.MathUtils.clamp(.12+near*.44+sparkle*.22,0,.90);
      const foam=sparkle*(.05+near*.14);
      colors.setXYZ(i,
        base.r*(1-mix)+shallow.r*mix+crest.r*foam,
        base.g*(1-mix)+shallow.g*mix+crest.g*foam,
        base.b*(1-mix)+shallow.b*mix+crest.b*foam
      );
    }
    positions.needsUpdate=true;colors.needsUpdate=true;
    // Flat-shaded material derives face normals in the shader; no CPU normal rebuild.
    for(let i=0;i<glints;i++){
      const x=layout[i*3],z=layout[i*3+1];
      const len=layout[i*3+2];
      const y=OCEAN_LEVEL+waveHeight(x,z,t)+.018;
      const o=i*6;
      segments[o]=x-len;segments[o+1]=y;segments[o+2]=z;
      segments[o+3]=x+len;segments[o+4]=y;segments[o+5]=z-.025;
    }
    gleamGeometry.attributes.position.needsUpdate=true;
    gleamMaterial.opacity=.24+.08*Math.sin(t*.87);
    for(const {ring,material,offset} of pondRings){
      const phase=(t*.18+offset)%1;
      const size=.68+phase*1.60;
      ring.scale.set(size,size,1);
      material.opacity=.23*(1-phase);
    }
  };
  update(0);
  return {update,setShape};
}
