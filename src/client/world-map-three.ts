import * as THREE from 'three';

/**
 * One original, camera-orbitable island shared by WebGL scenery and Phaser's
 * interactive overlay. Every marker and board tile is projected by THIS camera.
 * This optional layer never owns gameplay or changes GameState.
 */
export type ScreenPoint={x:number;y:number};

/** The one shared mapping between authoritative logical coordinates and 3D. */
export function siteWorldPosition(x:number,y:number,elevation=.48):THREE.Vector3{
  return new THREE.Vector3((x-2)*1.16,elevation,(y-2)*1.16);
}
export function boardTileWorldPosition(index:number,radius=3.48,elevation=.49):THREE.Vector3{
  // The first tile is at the camera-near end with the default 45° azimuth.
  const angle=(index/28)*Math.PI*2+Math.PI/2-Math.PI/4;
  return new THREE.Vector3(Math.cos(angle)*radius,elevation,Math.sin(angle)*radius);
}
export interface WorldThreeLayer {
  draw(width:number,height:number):boolean;
  projectSite(x:number,y:number,elevation?:number):ScreenPoint;
  projectTile(index:number,elevation?:number):ScreenPoint;
  tilePolygon(index:number):ScreenPoint[];
  orbit(deltaX:number,deltaY:number):void;
  zoom(amount:number):void;
  rotateBy(radians:number):void;
  visible(value:boolean):void;
  dispose():void;
}

const grass = new THREE.MeshStandardMaterial({color:0x72b85f,roughness:1,flatShading:true});
const darkGrass = new THREE.MeshStandardMaterial({color:0x4d9861,roughness:1,flatShading:true});
const sandy = new THREE.MeshStandardMaterial({color:0xf4d49a,roughness:1,flatShading:true});
const rock = new THREE.MeshStandardMaterial({color:0x98714c,roughness:1,flatShading:true});
const rockShade = new THREE.MeshStandardMaterial({color:0x674f3d,roughness:1,flatShading:true});
const rim = new THREE.MeshStandardMaterial({color:0xc29d63,roughness:1,flatShading:true});
const bark = new THREE.MeshStandardMaterial({color:0x78563e,roughness:1});
const leafA = new THREE.MeshStandardMaterial({color:0x286e4f,roughness:1,flatShading:true});
const leafB = new THREE.MeshStandardMaterial({color:0x41895b,roughness:1,flatShading:true});
const leafC = new THREE.MeshStandardMaterial({color:0x62a96e,roughness:1,flatShading:true});
const water = new THREE.MeshStandardMaterial({color:0x28a1bf,roughness:.32,metalness:.09,flatShading:true});
const foam = new THREE.MeshBasicMaterial({color:0xb7e9dc,transparent:true,opacity:.70,side:THREE.DoubleSide});
const temple = new THREE.MeshStandardMaterial({color:0xe7ddbc,roughness:1,flatShading:true});
const white = new THREE.MeshStandardMaterial({color:0xf2eee1,roughness:1});
const red = new THREE.MeshStandardMaterial({color:0xd35f5d,roughness:1});
const foliageMaterials = [leafA,leafB,leafC];

const place=(o:THREE.Object3D,x:number,y:number,z:number)=>{
  o.position.set(x,y,z);return o;
};
function seeded(n:number):number{return (Math.sin(n*74.37+11.27)*25711.71)%1 + (Math.sin(n*74.37+11.27)*25711.71 < 0 ? 1 : 0);}
function disk(radius:number,material:THREE.Material,y:number,x:number,z:number):THREE.Mesh{
  const m=new THREE.Mesh(new THREE.CircleGeometry(radius,48),material);
  m.rotation.x=-Math.PI/2;
  m.position.set(x,y,z);
  return m;
}
function mesa(root:THREE.Group,x:number,z:number,radius:number,height:number):void{
  const group=new THREE.Group();
  root.add(group);group.position.set(x,0,z);
  const baseShadow=disk(radius*1.22,new THREE.MeshBasicMaterial({
    color:0x1d4c3d,transparent:true,opacity:.32,depthWrite:false
  }),.423,0,0);
  baseShadow.scale.y=.78;group.add(baseShadow);
  group.add(disk(radius*1.24,darkGrass,.04,0,0));
  const tiers=[
    {y:.09,h:height*.45,r:radius*1.04,top:radius*.91},
    {y:.09+height*.45,h:height*.35,r:radius*.78,top:radius*.68},
    {y:.09+height*.80,h:height*.20,r:radius*.48,top:radius*.42}
  ];
  for(let i=0;i<tiers.length;i++){
    const t=tiers[i];
    const geo=new THREE.CylinderGeometry(t.top,t.r,t.h,11,1,false);
    const body=new THREE.Mesh(geo,[i%2?rock:rockShade,rock,rockShade]);
    body.position.y=t.y+t.h/2;body.rotation.y=i*.22;
    body.castShadow=true;
    group.add(body);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(t.top*.99,t.top*1.015,.105,11),
      [grass,grass,darkGrass]
    );
    cap.position.y=t.y+t.h+.024;group.add(cap);
    const ledge = new THREE.Mesh(
      new THREE.TorusGeometry(t.r*.86,.036,5,24),
      rim
    );
    ledge.rotation.x=Math.PI/2;
    ledge.position.y=t.y+.07;group.add(ledge);
  }
  for(let j=0;j<5;j++){
    const theta=j*2.40,r=radius*(1.03+.14*(j%2));
    const rubble=new THREE.Mesh(new THREE.DodecahedronGeometry(.10+.035*(j%3),0),j%2?rock:rim);
    rubble.position.set(Math.cos(theta)*r,.12,Math.sin(theta)*r);
    rubble.rotation.y=theta;
    group.add(rubble);
  }
}
function broadTree(root:THREE.Group,x:number,z:number,size:number,n:number):void{
  const shadow=disk(.42*size,new THREE.MeshBasicMaterial({
    color:0x1e5841,transparent:true,opacity:.19,depthWrite:false
  }),.424,x,z);
  shadow.scale.y=.70;root.add(shadow);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055*size,.08*size,.42*size,6),bark);
  place(trunk,x,.66*size,z);root.add(trunk);
  const crown=new THREE.Group();
  place(crown,x,.94*size,z);root.add(crown);
  const leaf=foliageMaterials[n%3];
  const bits=[
    [-.16,.02,-.03,.34],[.17,.02,.09,.31],[.01,.22,-.04,.37],[-.04,.08,.19,.31]
  ];
  for(const [dx,dy,dz,r] of bits){
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r*size,1),leaf);
    m.position.set(dx*size,dy*size,dz*size);
    m.castShadow=true;
    crown.add(m);
  }
}
function pine(root:THREE.Group,x:number,z:number,size:number,n:number):void{
  const shadow=disk(.30*size,new THREE.MeshBasicMaterial({
    color:0x175644,transparent:true,opacity:.20,depthWrite:false
  }),.425,x,z);shadow.scale.y=.70;root.add(shadow);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.044*size,.068*size,.52*size,5),bark);
  place(trunk,x,.70*size,z);root.add(trunk);
  for(let layer=0;layer<3;layer++){
    const cone=new THREE.Mesh(new THREE.ConeGeometry((.38-layer*.07)*size,.58*size,7),
      foliageMaterials[(n+layer)%3]);
    place(cone,x,(.84+layer*.23)*size,z);
    cone.castShadow=true;
    root.add(cone);
  }
}
function forest(root:THREE.Group,x:number,z:number,count:number,seed:number):void{
  for(let i=0;i<count;i++){
    const a=i*2.39996,r=.14+.45*Math.sqrt((i+.5)/count);
    const tx=x+Math.cos(a)*r, tz=z+Math.sin(a)*r;
    // Keep stands off the central lagoon and the main mesa ledges.
    if(Math.hypot(tx-.66,tz-.72)<.73)continue;
    if(Math.hypot(tx-.1,tz+1.18)<.75)continue;
    if(Math.hypot(tx+.61,tz-.82)<.79)continue;
    const size=.72+.43*seeded(seed+i*3.7);
    if(i%5===3)pine(root,tx,tz,size,seed+i);
    else broadTree(root,tx,tz,size,seed+i);
  }
}
function ruins(root:THREE.Group,x:number,z:number):void{
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.37,.43,.13,8),rim);
  place(base,x,.13,z);root.add(base);
  for(let k=0;k<4;k++){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.049,.063,.48,6),temple);
    place(col,x+(k%2? .22:-.22),.43,z+(k<2?.20:-.20));root.add(col);
  }
  const roof=new THREE.Mesh(new THREE.BoxGeometry(.59,.11,.58),temple);
  place(roof,x,.73,z);root.add(roof);
}
function lighthouse(root:THREE.Group,x:number,z:number):void{
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(.085,.14,.63,9),white);
  place(tower,x,.37,z);root.add(tower);
  const stripe=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.15,9),red);
  place(stripe,x,.39,z);root.add(stripe);
  const top=new THREE.Mesh(new THREE.ConeGeometry(.20,.18,9),red);
  place(top,x,.80,z);root.add(top);
}
function organicCylinder(top:number,bottom:number,height:number):THREE.CylinderGeometry{
  const geometry=new THREE.CylinderGeometry(top,bottom,height,72,1,false);
  const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i);
    const angle=Math.atan2(z,x);
    // Same deterministic irregular shore for caps, walls and every viewpoint.
    const scale=1+.024*Math.sin(angle*5+.33)+.016*Math.sin(angle*9-1.1)
      +.010*Math.cos(angle*13+.3);
    positions.setX(i,x*scale);
    positions.setZ(i,z*scale);
  }
  positions.needsUpdate=true;
  geometry.computeVertexNormals();
  return geometry;
}
function island(scene:THREE.Scene):THREE.Group{
  const root=new THREE.Group();
  scene.add(root);

  // The same coastline mesh is rotated, never four independently generated views.
  const under=new THREE.Mesh(organicCylinder(3.50,3.62,.62),[rockShade,rockShade,rockShade]);
  under.castShadow=true;
  place(under,0,-.17,0);root.add(under);
  const foamRing=new THREE.Mesh(new THREE.RingGeometry(3.51,3.73,72),foam);
  foamRing.rotation.x=-Math.PI/2;place(foamRing,0,-.40,0);root.add(foamRing);
  const beach=new THREE.Mesh(organicCylinder(3.49,3.52,.19),[sandy,rim,rock]);
  place(beach,0,.14,0);root.add(beach);
  const turf=new THREE.Mesh(organicCylinder(3.18,3.33,.24),[darkGrass,grass,rock]);
  turf.receiveShadow=true;
  place(turf,0,.29,0);root.add(turf);

  // Organic green patches give relief without baking any gameplay information.
  for(let i=0;i<27;i++){
    const a=i*2.39996,r=1.17+1.55*Math.sqrt((i+.5)/27);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    root.add(disk(.23+(i%3)*.07,i%2?grass:darkGrass,.415,x,z));
  }
  mesa(root,.1,-1.12,.82,1.74);
  mesa(root,-.72,.90,1.02,1.88);

  // Single compact turquoise lagoon in a clearing with a real shoreline.
  root.add(disk(.69,sandy,.416,.75,.61));
  root.add(disk(.59,water,.423,.75,.61));
  const pondFoam=new THREE.Mesh(new THREE.RingGeometry(.54,.62,36),foam);
  pondFoam.rotation.x=-Math.PI/2;place(pondFoam,.75,.427,.61);root.add(pondFoam);
  const fall=new THREE.Mesh(new THREE.BoxGeometry(.17,.75,.12),water);
  place(fall,.53,.80,.42);root.add(fall);
  const fallBright=new THREE.Mesh(new THREE.BoxGeometry(.045,.73,.125),white);
  place(fallBright,.50,.79,.47);root.add(fallBright);

  forest(root,-1.64,-.52,11,7);
  forest(root,-2.02,1.25,11,18);
  forest(root,.78,-2.22,13,32);
  forest(root,1.92,1.23,12,45);
  forest(root,-.26,2.10,11,58);

  ruins(root,2.10,-1.50);
  lighthouse(root,1.86,2.28);

  // Sparse rocks and flowers stay decorative, independent from site IDs.
  const stone = new THREE.MeshStandardMaterial({color:0xb4a581,roughness:1,flatShading:true});
  for(let i=0;i<20;i++){
    const a=i*2.4,r=.95+1.80*seeded(i+4);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x-.75,z-.61)<.85)continue;
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.085+.055*seeded(i*5+2),0),stone);
    place(m,x,.48,z);root.add(m);
  }
  return root;
}

/** Create lazily to avoid allocating WebGL contexts in standard Phaser mode. */
export function createThreeWorldLayer(host:HTMLElement):WorldThreeLayer|null{
  let renderer:THREE.WebGLRenderer;
  try{
    renderer=new THREE.WebGLRenderer({
      alpha:false,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false
    });
  }catch{return null;} // WebGL unavailable: full procedural Phaser fallback.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const canvas=renderer.domElement;
  canvas.className='world-map-three';
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none';
  host.insertBefore(canvas,host.firstChild);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x1c7baa);
  scene.add(new THREE.HemisphereLight(0xedf8fa,0x745a3c,2.0));
  scene.add(new THREE.AmbientLight(0xffffff,.23));
  const sun=new THREE.DirectionalLight(0xffeed0,2.4);
  sun.position.set(-5,10,6);
  sun.castShadow=true;
  sun.shadow.mapSize.set(768,768);
  sun.shadow.camera.left=-5;sun.shadow.camera.right=5;
  sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;
  sun.shadow.camera.near=1;sun.shadow.camera.far=23;
  sun.shadow.bias=-.0003;
  scene.add(sun);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({
    color:0x1786b6,roughness:.40,metalness:.03
  }));
  sea.rotation.x=-Math.PI/2;
  sea.position.y=-.48;
  scene.add(sea);
  const land=island(scene);
  const camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,100);
  let yaw=Math.PI/4;
  let pitch=56*Math.PI/180;
  let zoom=1;
  const distance=15;
  const focus=new THREE.Vector3(0,.38,0);
  let lastW=0,lastH=0,dead=false,contextIsLost=false;
  const adjustCamera=()=>{
    // Board never crops: horizontal radius >= 4.7 world units even on
    // portrait phones. Zoom range is deliberately limited for tap safety.
    const aspect=Math.max(.4,lastW/Math.max(1,lastH));
    const halfH=Math.max(5.2,4.85/aspect)/zoom;
    camera.left=-halfH*aspect;camera.right=halfH*aspect;
    camera.top=halfH;camera.bottom=-halfH;
    camera.position.set(
      focus.x+distance*Math.sin(yaw)*Math.cos(pitch),
      focus.y+distance*Math.sin(pitch),
      focus.z+distance*Math.cos(yaw)*Math.cos(pitch)
    );
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  };
  const screen=(x:number,y:number,z:number):ScreenPoint=>{
    const p=new THREE.Vector3(x,y,z).project(camera);
    return {x:(p.x+1)*lastW*.5,y:(1-p.y)*lastH*.5};
  };
  // Game model coordinates are mapped ONCE onto the Three island. They are
  // never rotated independently of the orbit camera.
  const sitePoint=(x:number,y:number,elevation=.48)=>{
    const p=siteWorldPosition(x,y,elevation);
    return screen(p.x,p.y,p.z);
  };
  const tileWorld=(angle:number,radius:number,elevation=.48)=>{
    // Azimuth offset matches the PS1-inspired default angle: tile 0 is at
    // the near / bottom edge of the island, not the back or water.
    const a=angle-Math.PI/4;
    return new THREE.Vector3(Math.cos(a)*radius,elevation,Math.sin(a)*radius);
  };
  const contextLost=(e:Event)=>{
    e.preventDefault();contextIsLost=true;canvas.style.display='none';
  };
  const contextRestored=()=>{contextIsLost=false;lastW=0;};
  canvas.addEventListener('webglcontextlost',contextLost);
  canvas.addEventListener('webglcontextrestored',contextRestored);

  const stage:WorldThreeLayer={
    draw(width,height){
      if(dead||contextIsLost)return false;
      const w=Math.round(width),h=Math.round(height);
      if(w<40||h<40)return false;
      try{
        if(w!==lastW||h!==lastH){
          lastW=w;lastH=h;
          renderer.setSize(w,h,false);
        }
        adjustCamera();
        renderer.render(scene,camera);
        canvas.style.display='block';
        return true;
      }catch{
        canvas.style.display='none';return false;
      }
    },
    projectSite(x,y,elevation=.48){return sitePoint(x,y,elevation);},
    projectTile(index,elevation=.50){
      const theta=(index/28)*Math.PI*2+Math.PI/2;
      const v=boardTileWorldPosition(index,3.48,elevation);
      return screen(v.x,v.y,v.z);
    },
    tilePolygon(index){
      const theta=(index/28)*Math.PI*2+Math.PI/2;
      const half=(Math.PI*2/28)*.48;
      const points=[
        tileWorld(theta-half,3.68,.49),
        tileWorld(theta+half,3.68,.49),
        tileWorld(theta+half,3.29,.49),
        tileWorld(theta-half,3.29,.49)
      ];
      return points.map(v=>screen(v.x,v.y,v.z));
    },
    orbit(deltaX,deltaY){
      yaw+=deltaX*.0078;
      pitch=THREE.MathUtils.clamp(pitch+deltaY*.0055,28*Math.PI/180,76*Math.PI/180);
    },
    zoom(amount){zoom=THREE.MathUtils.clamp(zoom*Math.exp(amount),.82,1.38);},
    rotateBy(radians){yaw+=radians;},
    visible(value){if(!dead)canvas.style.display=value?'block':'none';},
    dispose(){
      if(dead)return;
      dead=true;
      canvas.removeEventListener('webglcontextlost',contextLost);
      canvas.removeEventListener('webglcontextrestored',contextRestored);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(o=>{
        if(o instanceof THREE.Mesh){
          geometries.add(o.geometry);
          const m=o.material;
          if(Array.isArray(m))for(const entry of m)materials.add(entry);
          else materials.add(m);
        }
      });
      for(const geometry of geometries)geometry.dispose();
      for(const material of materials)material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    }
  };
  return stage;
}
