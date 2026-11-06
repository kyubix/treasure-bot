import * as THREE from 'three';

/**
 * Static, original low-poly 3D diorama for the opt-in ?map3d=1 preview.
 *
 * Only the *scenery* is rendered here. Phaser stays authoritative for the
 * numbered/colored board, players, robots, route and clickable site IDs.
 * Geometry is made once and the same island is rotated in 90-degree steps.
 */
export interface WorldThreeLayer {
  draw(width:number,height:number,turns:number):boolean;
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
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055*size,.08*size,.42*size,6),bark);
  place(trunk,x,.25*size,z);root.add(trunk);
  const crown=new THREE.Group();
  place(crown,x,.56*size,z);root.add(crown);
  const leaf=foliageMaterials[n%3];
  const bits=[
    [-.16,.02,-.03,.34],[.17,.02,.09,.31],[.01,.22,-.04,.37],[-.04,.08,.19,.31]
  ];
  for(const [dx,dy,dz,r] of bits){
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r*size,1),leaf);
    m.position.set(dx*size,dy*size,dz*size);
    crown.add(m);
  }
}
function pine(root:THREE.Group,x:number,z:number,size:number,n:number):void{
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.044*size,.068*size,.52*size,5),bark);
  place(trunk,x,.24*size,z);root.add(trunk);
  for(let layer=0;layer<3;layer++){
    const cone=new THREE.Mesh(new THREE.ConeGeometry((.38-layer*.07)*size,.58*size,7),
      foliageMaterials[(n+layer)%3]);
    place(cone,x,(.40+layer*.23)*size,z);
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
function island(scene:THREE.Scene):THREE.Group{
  const root=new THREE.Group();
  scene.add(root);

  // The same coastline mesh is rotated, never four independently generated views.
  const under=new THREE.Mesh(new THREE.CylinderGeometry(3.50,3.63,.54,64),[rockShade,rockShade,rockShade]);
  place(under,0,-.17,0);root.add(under);
  const foamRing=new THREE.Mesh(new THREE.RingGeometry(3.51,3.73,72),foam);
  foamRing.rotation.x=-Math.PI/2;place(foamRing,0,-.40,0);root.add(foamRing);
  const beach=new THREE.Mesh(new THREE.CylinderGeometry(3.49,3.52,.16,64),[sandy,rim,rock]);
  place(beach,0,.14,0);root.add(beach);
  const turf=new THREE.Mesh(new THREE.CylinderGeometry(3.18,3.33,.22,64),[darkGrass,grass,rock]);
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

  forest(root,-1.64,-.52,8,7);
  forest(root,-2.02,1.25,8,18);
  forest(root,.78,-2.22,9,32);
  forest(root,1.92,1.23,8,45);
  forest(root,-.26,2.10,7,58);

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
  scene.add(new THREE.HemisphereLight(0xdff5fa,0x786349,2.55));
  const sun=new THREE.DirectionalLight(0xffefcb,2.5);
  sun.position.set(-5,9,7);scene.add(sun);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({
    color:0x1786b6,roughness:.40,metalness:.03
  }));
  sea.rotation.x=-Math.PI/2;
  sea.position.y=-.48;
  scene.add(sea);
  const land=island(scene);
  const camera=new THREE.OrthographicCamera(-4.85,4.85,4.1,-4.1,.1,100);
  camera.position.set(8,11,8);
  camera.lookAt(0,.11,0);
  camera.updateProjectionMatrix();
  let lastW=0,lastH=0,lastTurn=-1,dead=false;
  const contextLost=(e:Event)=>{e.preventDefault();canvas.style.display='none';};
  canvas.addEventListener('webglcontextlost',contextLost);
  const stage:WorldThreeLayer={
    draw(width,height,turns){
      if(dead)return false;
      const w=Math.round(width),h=Math.round(height);
      if(w<40||h<40)return false;
      try{
        if(w!==lastW||h!==lastH){
          renderer.setSize(w,h,false);
          lastW=w;lastH=h;lastTurn=-1;
        }
        const quarter=((turns%4)+4)%4;
        if(quarter!==lastTurn){
          land.rotation.y=-quarter*Math.PI/2;
          lastTurn=quarter;
        }
        renderer.render(scene,camera);
        canvas.style.display='block';
        return true;
      }catch{
        canvas.style.display='none';
        return false;
      }
    },
    visible(value){if(!dead)canvas.style.display=value?'block':'none';},
    dispose(){
      if(dead)return;
      dead=true;
      canvas.removeEventListener('webglcontextlost',contextLost);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(o=>{
        if(o instanceof THREE.Mesh){
          geometries.add(o.geometry);
          const m=o.material;
          if(Array.isArray(m))for(const entry of m)materials.add(entry);
          else materials.add(m);
        }
      });
      for(const g of geometries)g.dispose();
      for(const m of materials)m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    }
  };
  return stage;
}
