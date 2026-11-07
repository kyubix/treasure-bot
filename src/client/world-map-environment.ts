import * as THREE from 'three';

/** Scene-owned resources, animated by the existing 24 FPS visibility-aware loop. */
export function createWorldAmbience(land:THREE.Group,beaconPosition:THREE.Vector3,
 showBeacon=true):{update(t:number):void}{
  const foliage:THREE.Object3D[]=[];
  land.traverse(node=>{if(typeof node.userData.swayPhase==='number')foliage.push(node);});
  // Waterfall ribbon and impact spray are now co-located and owned by
  // world-map-waterfall.ts, avoiding V5's free-floating particle coordinates.
  const beacon=new THREE.Group();beacon.name='lighthouse-beacon';
  beacon.position.copy(beaconPosition);beacon.visible=showBeacon;land.add(beacon);
  const lens=new THREE.Mesh(new THREE.SphereGeometry(.075,6,4),
    new THREE.MeshBasicMaterial({color:0xffdf8d}));beacon.add(lens);
  // A short translucent beam, no expensive dynamic point light or shadow map.
  const beam=new THREE.Mesh(new THREE.ConeGeometry(.18,.90,6,1,true),
    new THREE.MeshBasicMaterial({color:0xffe6ac,transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide}));
  beam.rotation.z=Math.PI/2;beam.position.x=.45;beacon.add(beam);
  function update(t:number){
    for(const crown of foliage){
      const phase=crown.userData.swayPhase;
      crown.rotation.z=Math.sin(t*1.25+phase)*.022;
      crown.rotation.x=Math.cos(t*.91+phase)*.012;
    }
    beacon.rotation.y=t*.55;
  }
  update(0);return {update};
}
