import * as THREE from 'three';

/** Scene-owned resources, animated by the existing 24 FPS visibility-aware loop. */
export function createWorldAmbience(land:THREE.Group,beaconPosition:THREE.Vector3):{update(t:number):void}{
  const foliage:THREE.Object3D[]=[];
  land.traverse(node=>{if(typeof node.userData.swayPhase==='number')foliage.push(node);});
  const streaks=new THREE.InstancedMesh(new THREE.BoxGeometry(.018,.14,.016),
    new THREE.MeshBasicMaterial({color:0xddfafa,transparent:true,opacity:.65,depthWrite:false}),12);
  streaks.name='waterfall-streaks';streaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  streaks.frustumCulled=false;land.add(streaks);
  const splash=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.018,0),
    new THREE.MeshBasicMaterial({color:0xbcebea,transparent:true,opacity:.55,depthWrite:false}),10);
  splash.name='waterfall-spray';splash.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  splash.frustumCulled=false;land.add(splash);
  const beacon=new THREE.Group();beacon.name='lighthouse-beacon';beacon.position.copy(beaconPosition);land.add(beacon);
  const lens=new THREE.Mesh(new THREE.SphereGeometry(.075,6,4),
    new THREE.MeshBasicMaterial({color:0xffdf8d}));beacon.add(lens);
  // A short translucent beam, no expensive dynamic point light or shadow map.
  const beam=new THREE.Mesh(new THREE.ConeGeometry(.18,.90,6,1,true),
    new THREE.MeshBasicMaterial({color:0xffe6ac,transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide}));
  beam.rotation.z=Math.PI/2;beam.position.x=.45;beacon.add(beam);
  const matrix=new THREE.Matrix4();
  function update(t:number){
    for(const crown of foliage){
      const phase=crown.userData.swayPhase;
      crown.rotation.z=Math.sin(t*1.25+phase)*.022;
      crown.rotation.x=Math.cos(t*.91+phase)*.012;
    }
    for(let i=0;i<12;i++){
      const phase=(t*1.1+i/12)%1;
      matrix.makeTranslation(.46+(i%4)*.035,1.14-phase*.63,.493+(i%3)*.008);
      streaks.setMatrixAt(i,matrix);
    }
    for(let i=0;i<10;i++){
      const phase=(t*.8+i/10)%1,angle=i*2.4;
      matrix.makeTranslation(.53+Math.cos(angle)*phase*.19,.48+Math.sin(phase*Math.PI)*.10,.48+Math.sin(angle)*phase*.13);
      splash.setMatrixAt(i,matrix);
    }
    streaks.instanceMatrix.needsUpdate=true;splash.instanceMatrix.needsUpdate=true;
    beacon.rotation.y=t*.55;
  }
  update(0);return {update};
}
