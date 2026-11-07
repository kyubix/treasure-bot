import * as THREE from 'three';
import {terrainHeight} from './world-map-terrain.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';

/**
 * A curved, terrain-attached waterfall from the high western mesa to the
 * lagoon. Generated from the SAME heightfield as the mountain: no floating
 * blue box, billboard, or separately animated "fall" on another coordinate.
 */
const WATER_START={x:-.57,z:.78} as const;
const WATER_END={x:.57,z:.61} as const;
const FLOW_SEGMENTS=52;
const CHANNELS=5;
const waterDeep=new THREE.Color(0x159ab9);
const waterFoam=new THREE.Color(0xe2ffff);

export function waterfallPoint(t:number,side=0,shape:MapShapeId='RING'):THREE.Vector3{
  const u=THREE.MathUtils.clamp(t,0,1);
  // Shape-themed creek sources stay on real mesas and all flow into
  // the same central clearing without introducing floating water tiles.
  const source=shape==='LAGOON'?{x:-.72,z:.90}:
    shape==='CLOVER'?{x:-.83,z:1.01}:WATER_START;
  const x=THREE.MathUtils.lerp(source.x,WATER_END.x,u)
    +Math.sin(u*Math.PI*1.9)*.045;
  const z=THREE.MathUtils.lerp(source.z,WATER_END.z,u)
    +Math.sin(u*Math.PI*1.6)*.061;
  const width=.068+.061*Math.sin(u*Math.PI);
  const zz=z+side*width;
  // Always above the actual physical terrain or the near-flat lagoon.
  const ground=terrainHeight(x,zz,shape);
  const y=Math.max(.479,ground+.065);
  return new THREE.Vector3(x,y,zz);
}
export interface CascadingWaterfall {
  readonly mesh:THREE.Mesh;
  update(time:number):void;
}
export function createCascadingWaterfall(land:THREE.Group,shape:MapShapeId='RING'):CascadingWaterfall{
  const positions:number[]=[],indices:number[]=[],colours:number[]=[];
  for(let i=0;i<=FLOW_SEGMENTS;i++){
    const t=i/FLOW_SEGMENTS;
    for(let j=0;j<CHANNELS;j++){
      const p=waterfallPoint(t,j/(CHANNELS-1)*2-1,shape);
      positions.push(p.x,p.y,p.z);
      colours.push(waterDeep.r,waterDeep.g,waterDeep.b);
    }
  }
  for(let i=0;i<FLOW_SEGMENTS;i++)for(let j=0;j<CHANNELS-1;j++){
    const a=i*CHANNELS+j,b=a+CHANNELS;
    indices.push(a,a+1,b,a+1,b+1,b);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({
    vertexColors:true,transparent:true,opacity:.91,depthWrite:false,
    roughness:.18,metalness:.02,flatShading:false,side:THREE.DoubleSide
  });
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='waterfall-cascade';
  mesh.renderOrder=1;
  land.add(mesh);

  // A small base pool of foamy splash, fully contained in the lagoon.
  const base=new THREE.Mesh(new THREE.RingGeometry(.115,.15,32),
    new THREE.MeshBasicMaterial({
      color:0xd6ffff,transparent:true,opacity:.40,depthWrite:false,
      side:THREE.DoubleSide
    }));
  base.rotation.x=-Math.PI/2;
  base.position.set(.49,.480,.61);
  land.add(base);

  const spray=new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(.019,0),
    new THREE.MeshBasicMaterial({
      color:0xd5ffff,transparent:true,opacity:.66,depthWrite:false
    }),14
  );
  spray.name='waterfall-spray';
  spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  spray.frustumCulled=false;
  land.add(spray);
  // Compact glints travel downhill on the SAME heightfield ribbon. All
  // buffers are allocated once, not rebuilt during the 24 FPS update.
  const glints=new THREE.InstancedMesh(
    new THREE.SphereGeometry(.018,6,4),
    new THREE.MeshBasicMaterial({
      color:0xc9ffff,transparent:true,opacity:.58,depthWrite:false
    }),24
  );
  glints.name='waterfall-flow-glints';
  glints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glints.frustumCulled=false;
  land.add(glints);
  const matrix=new THREE.Matrix4();
  const glintPosition=new THREE.Vector3();
  const glintScale=new THREE.Vector3();
  const glintRotation=new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0,1,0),.72
  );
  const colour=geometry.getAttribute('color') as THREE.BufferAttribute;
  const blend=new THREE.Color();

  function update(time:number):void {
    for(let i=0;i<=FLOW_SEGMENTS;i++){
      const flow=i/FLOW_SEGMENTS;
      for(let j=0;j<CHANNELS;j++){
        const sideways=j/(CHANNELS-1);
        const ribbon=Math.pow(Math.sin(sideways*Math.PI),2);
        const moving=Math.pow(.5+.5*Math.sin(time*9.2-flow*39+sideways*13),4);
        const foam=THREE.MathUtils.clamp(.10+moving*.48+ribbon*.16,0,.80);
        blend.copy(waterDeep).lerp(waterFoam,foam);
        colour.setXYZ(i*CHANNELS+j,blend.r,blend.g,blend.b);
      }
    }
    colour.needsUpdate=true;
    for(let i=0;i<spray.count;i++){
      const p=(time*.82+i/spray.count)%1;
      const a=i*2.39996;
      const radius=.035+p*.19;
      matrix.makeTranslation(
        .49+Math.cos(a)*radius,
        .48+.06*Math.sin(Math.PI*p),
        .61+Math.sin(a)*radius*.72
      );
      spray.setMatrixAt(i,matrix);
    }
    spray.instanceMatrix.needsUpdate=true;
    for(let i=0;i<glints.count;i++){
      const flow=(time*.30+i*.079)%1;
      const channel=Math.sin(i*2.31)*.75;
      const p=waterfallPoint(flow,channel,shape);
      // Elongated highlights follow the direction of the falling stream.
      glintPosition.set(p.x,p.y+.018,p.z);
      glintScale.set(.65,1,.36+Math.sin(i*1.7+time*8)*.12);
      matrix.compose(glintPosition,glintRotation,glintScale);
      glints.setMatrixAt(i,matrix);
    }
    glints.instanceMatrix.needsUpdate=true;
    const swell=.9+.22*Math.sin(time*3.6);
    base.scale.set(swell,swell,1);
  }
  update(0);
  return {mesh,update};
}
