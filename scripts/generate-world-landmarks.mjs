// Original Treasure Bots landmark mesh generator. No third-party assets.
// Run: node scripts/generate-world-landmarks.mjs
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

function generateLandmarkAssets(){
 const palette={
  cream:["#f4e7c6",.96], plaster:["#ded2af",.92], plasterDark:["#a8a18a",.95],
  sandstone:["#c0a483",.91], stone:["#a79c88",.94], stoneDark:["#797765",.97],
  moss:["#6b8961",.98], gold:["#c9a25a",.36], brass:["#d5b86e",.31],
  roof:["#456b84",.78], roofLight:["#6994a0",.69], coral:["#c87867",.82],
  darkWood:["#70513b",.9], wood:["#a17a52",.86], lightWood:["#c79b63",.82],
  canvas:["#dfb474",.92], canvasLight:["#f1d19b",.89], canvasShade:["#bd8556",.94],
  glass:["#9ad7cc",.21,["#114338",.10]], lantern:["#fff2b1",.37,["#c5a258",.75]],
  lavender:["#8d7bc3",.26,["#2f1a57",.15]], crystal:["#8ccfe6",.21,["#184f87",.28]],
  crystalDark:["#688eb9",.3,["#17294e",.20]],
  grass:["#8db878",.97], olive:["#497f66",.97], steel:["#636c76",.51],
  rope:["#cdb589",.93], dark:["#51463f",.99]
 };
 function unit(v){const n=Math.hypot(...v)||1;return v.map(x=>x/n);}
 function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
 function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
 class SceneModel{
  constructor(name){this.name=name;this.parts=new Map();}
  part(id){if(!this.parts.has(id))this.parts.set(id,[]);return this.parts.get(id);}
  tri(id,a,b,c,na,nb,nc){
   const normal=unit(cross(sub(b,a),sub(c,a)));
   const p=this.part(id);
   for(const [v,n] of [[a,na||normal],[b,nb||normal],[c,nc||normal]])
    p.push(...v,...n);
  }
  quad(id,a,b,c,d){this.tri(id,a,b,c);this.tri(id,a,c,d);}
  box(id,x,y,z,w,h,d){
   const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,f=z-d/2,g=z+d/2;
   this.quad(id,[a,c,g],[b,c,g],[b,e,g],[a,e,g]);
   this.quad(id,[b,c,f],[a,c,f],[a,e,f],[b,e,f]);
   this.quad(id,[a,c,f],[a,c,g],[a,e,g],[a,e,f]);
   this.quad(id,[b,c,g],[b,c,f],[b,e,f],[b,e,g]);
   this.quad(id,[a,e,g],[b,e,g],[b,e,f],[a,e,f]);
   this.quad(id,[a,c,f],[b,c,f],[b,c,g],[a,c,g]);
  }
  cyl(id,x,y,z,r1,r2,h,n=12){
   for(let i=0;i<n;i++){
    const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;
    const v0=[x+r1*Math.cos(a),y,z+r1*Math.sin(a)],
          v1=[x+r1*Math.cos(b),y,z+r1*Math.sin(b)],
          v2=[x+r2*Math.cos(b),y+h,z+r2*Math.sin(b)],
          v3=[x+r2*Math.cos(a),y+h,z+r2*Math.sin(a)];
    const n0=unit([Math.cos(a),(r1-r2)/h,Math.sin(a)]);
    const n1=unit([Math.cos(b),(r1-r2)/h,Math.sin(b)]);
    this.tri(id,v0,v1,v2,n0,n1,n1);this.tri(id,v0,v2,v3,n0,n1,n0);
    this.tri(id,[x,y,z],v1,v0);this.tri(id,[x,y+h,z],v3,v2);
   }
  }
  sphere(id,x,y,z,rx,ry,rz,segments=12,rings=7){
    const p=(u,v)=>{const a=u*Math.PI*2,b=v*Math.PI;
      const sx=Math.sin(b)*Math.cos(a), sy=Math.cos(b), sz=Math.sin(b)*Math.sin(a);
      return {v:[x+rx*sx,y+ry*sy,z+rz*sz],n:unit([sx/rx,sy/ry,sz/rz])};};
    for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
      const a=p(i/segments,j/rings),b=p((i+1)/segments,j/rings),
       c=p((i+1)/segments,(j+1)/rings),d=p(i/segments,(j+1)/rings);
      if(j>0)this.tri(id,a.v,b.v,c.v,a.n,b.n,c.n);
      if(j<rings-1)this.tri(id,a.v,c.v,d.v,a.n,c.n,d.n);
    }
  }
  beam(id,a,b,r,n=7){
    const axis=unit(sub(b,a)),up=Math.abs(axis[1])>.9?[1,0,0]:[0,1,0];
    const side=unit(cross(axis,up)),other=unit(cross(axis,side));
    const c=(o,t)=>o.map((v,j)=>v+r*(Math.cos(t)*side[j]+Math.sin(t)*other[j]));
    for(let i=0;i<n;i++){
      const t=i*Math.PI*2/n,s=(i+1)*Math.PI*2/n;
      const aa=c(a,t),ab=c(a,s),ba=c(b,t),bb=c(b,s);
      this.quad(id,aa,ab,bb,ba);
    }
  }
  prism(id,x,z,y0,h,wx,wz,rotation=0){
   // Irregular tapered crystal/obelisk with chamfered base and sharp tip.
   const sides=6;const angle=rotation; const foot=[];
   const tip=[x+Math.sin(rotation)*wx*.17,y0+h,z+Math.cos(rotation)*wz*.15];
   for(let i=0;i<sides;i++){
    const a=i/sides*Math.PI*2+angle;
    foot.push([x+Math.cos(a)*wx,y0,z+Math.sin(a)*wz]);
   }
   for(let i=0;i<sides;i++)this.tri(id,foot[i],foot[(i+1)%sides],tip);
  }
  roof(id,x,y,z,wx,wz,h){
   const a=[x-wx/2,y,z-wz/2],b=[x+wx/2,y,z-wz/2],
         c=[x+wx/2,y,z+wz/2],d=[x-wx/2,y,z+wz/2];
   const top1=[x,y+h,z-wz/2],top2=[x,y+h,z+wz/2];
   this.quad(id,a,top1,top2,d);this.quad(id,top1,b,c,top2);
   this.tri(id,a,b,top1);this.tri(id,d,top2,c);
  }
  toGLB(){
    const items=[...this.parts].filter(([,a])=>a.length>0);
    const mats=[],meshes=[],nodes=[],accessors=[],views=[],binary=[];
    let length=0;
    function pad(){while(length%4){binary.push(0);length++;}}
    function pushFloats(values){
      pad();const offset=length,dv=new DataView(new ArrayBuffer(values.length*4));
      values.forEach((value,i)=>dv.setFloat32(i*4,value,true));
      const bytes=new Uint8Array(dv.buffer);
      for(const b of bytes)binary.push(b);
      length+=bytes.length;
      return {byteOffset:offset,byteLength:bytes.length};
    }
    for(const [id,verts] of items){
      const material=palette[id];if(!material)throw Error("missing material "+id);
      const materialIndex=mats.length;
      const rgba=material[0].replace("#","");
      const rgb=[0,2,4].map(i=>parseInt(rgba.slice(i,i+2),16)/255);
      const m={name:id,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],
        roughnessFactor:material[1],metallicFactor: id==="gold"||id==="brass"?.42:.01},
        doubleSided:true};
      if(material[2]){
        const h=material[2][0].replace("#","");
        m.emissiveFactor=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255*material[2][1]);
      }
      mats.push(m);
      const positions=[],normals=[],uvs=[];
      for(let i=0;i<verts.length;i+=6){
        positions.push(verts[i],verts[i+1],verts[i+2]);
        normals.push(verts[i+3],verts[i+4],verts[i+5]);
        // UV projection by face orientation: horizontal faces use XZ,
        // vertical X faces use ZY and vertical Z faces use XY.
        // Per-triangle vertices are independent, so seams stay local.
        const x=verts[i],y=verts[i+1],z=verts[i+2];
        const nx=Math.abs(verts[i+3]),ny=Math.abs(verts[i+4]),nz=Math.abs(verts[i+5]);
        if(ny>=nx&&ny>=nz)uvs.push(x*2.75,z*2.75);
        else if(nx>=nz)uvs.push(z*2.75,y*2.75);
        else uvs.push(x*2.75,y*2.75);
      }
      const pv=pushFloats(positions),nv=pushFloats(normals),uv=pushFloats(uvs);
      const positionView=views.push({...pv,buffer:0,target:34962})-1;
      const normalView=views.push({...nv,buffer:0,target:34962})-1;
      const uvView=views.push({...uv,buffer:0,target:34962})-1;
      const bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
      for(let i=0;i<positions.length;i+=3)for(let a=0;a<3;a++){
        bounds[0][a]=Math.min(bounds[0][a],positions[i+a]);
        bounds[1][a]=Math.max(bounds[1][a],positions[i+a]);
      }
      const posAcc=accessors.push({bufferView:positionView,componentType:5126,count:positions.length/3,type:"VEC3",min:bounds[0],max:bounds[1]})-1;
      const nAcc=accessors.push({bufferView:normalView,componentType:5126,count:normals.length/3,type:"VEC3"})-1;
      const uvAcc=accessors.push({bufferView:uvView,componentType:5126,count:uvs.length/2,type:"VEC2"})-1;
      const meshIdx=meshes.push({name:id,primitives:[{attributes:{POSITION:posAcc,NORMAL:nAcc,TEXCOORD_0:uvAcc},mode:4,material:materialIndex}]})-1;
      nodes.push({mesh:meshIdx,name:this.name+"-"+id});
    }
    pad();
    const doc={asset:{version:"2.0",generator:"Treasure Bots original procedural landmark studio"},
      scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,
      materials:mats,buffers:[{byteLength:length}],bufferViews:views,accessors};
    const j=JSON.stringify(doc);const jsonBytes=[];
    for(let i=0;i<j.length;i++)jsonBytes.push(j.charCodeAt(i));
    while(jsonBytes.length%4)jsonBytes.push(32);
    const total=12+8+jsonBytes.length+8+length;
    const data=new Uint8Array(total),dv=new DataView(data.buffer);
    dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);
    dv.setUint32(12,jsonBytes.length,true);dv.setUint32(16,0x4e4f534a,true);
    data.set(jsonBytes,20);const o=20+jsonBytes.length;
    dv.setUint32(o,length,true);dv.setUint32(o+4,0x004e4942,true);
    data.set(binary,o+8);
    return {bytes:data,meshes:meshes.length,triangles:items.reduce((n,[,a])=>n+a.length/18,0)};
  }
 }
 function camp(){
  const s=new SceneModel("ExpeditionCamp");
  s.cyl("stone",0,-.028,0,.42,.39,.08,18);
  s.box("wood",0,.10,0,.76,.11,.64);
  s.roof("canvas",0,.21,0,.78,.74,.51);
  // Two sewn roof bands, tent opening, cloth folds and sturdy ridge.
  s.roof("canvasLight",0,.27,0,.61,.71,.40);
  s.tri("canvasShade",[-.32,.21,.36],[.32,.21,.36],[0,.64,.36]);
  s.tri("dark",[-.08,.24,.373],[.08,.24,.373],[0,.51,.373]);
  s.beam("darkWood",[-.38,.18,-.39],[0,.74,-.39],.022);
  s.beam("darkWood",[.38,.18,-.39],[0,.74,-.39],.022);
  s.beam("rope",[0,.72,-.38],[-.57,.03,-.57],.009,5);
  s.beam("rope",[0,.72,.38],[.57,.03,.58],.009,5);
  for(const x of [-.57,.57])for(const z of [-.55,.55]){
   s.beam("steel",[x,-.02,z],[x,.14,z],.019);
  }
  s.box("wood",-.44,.16,.29,.17,.27,.20);
  s.box("lightWood",-.44,.31,.29,.18,.025,.21);
  s.box("darkWood",-.44,.15,.29,.035,.25,.22);
  s.cyl("stoneDark",.49,.03,-.29,.08,.06,.25,10);
  s.sphere("lantern",.49,.30,-.29,.085,.11,.085,10,6);
  s.cyl("gold",.49,.42,-.29,.11,.11,.04,10);
  s.beam("steel",[.45,.45,-.29],[.45,.58,-.29],.013);
  for(let i=0;i<7;i++){
   const a=i*2.4;
   s.sphere("moss",Math.cos(a)*.54,.00,Math.sin(a)*.48,.04,.03,.05,7,4);
  }
  return s.toGLB();
 }
 function lighthouse(){
  const s=new SceneModel("CoastalLighthouse");
  s.cyl("stoneDark",0,-.08,0,.23,.26,.12,16);
  s.cyl("sandstone",0,.02,0,.22,.195,.09,18);
  s.cyl("cream",0,.06,0,.18,.12,.74,20);
  for(let i=0;i<4;i++)s.cyl("coral",0,.18+i*.15,0,.171-i*.007,.167-i*.007,.025,18);
  // Sailor blue portholes recessed visually with brass frames.
  for(const a of [.2,Math.PI+.2,Math.PI*1.5]){
   const x=.148*Math.cos(a),z=.148*Math.sin(a);
   s.sphere("brass",x,.38,z,.042,.065,.042,10,7);
   s.sphere("glass",x*1.06,.38,z*1.06,.03,.05,.03,10,7);
  }
  s.cyl("gold",0,.79,0,.22,.22,.043,20);
  for(let i=0;i<12;i++){
   const a=i*Math.PI*2/12,x=Math.cos(a)*.217,z=Math.sin(a)*.217;
   s.beam("steel",[x,.81,z],[x,1.04,z],.012);
   const b=a+Math.PI*2/12;
   s.beam("brass",[x,1.04,z],[Math.cos(b)*.217,1.04,Math.sin(b)*.217],.012);
  }
  s.cyl("roofLight",0,.83,0,.12,.12,.20,14);
  s.sphere("lantern",0,.95,0,.105,.115,.105,14,9);
  s.cyl("roof",0,1.04,0,.23,0, .23,16);
  s.cyl("gold",0,1.255,0,.015,.015,.075,9);
  s.sphere("gold",0,1.33,0,.032,.032,.032,9,6);
  // Terrace steps.
  for(let j=0;j<3;j++)s.box("stone",0,.018+j*.047,.28+j*.055,.25+j*.035,.045,.11);
  return s.toGLB();
 }
 function ruins(){
  const s=new SceneModel("MossTemple");
  s.box("stoneDark",0,.045,0,.84,.13,.77);
  s.box("sandstone",0,.12,0,.77,.07,.69);
  for(let i=0;i<5;i++){
   const x=-.31+i*.155;
   s.box(i%2?"plasterDark":"stone",x,.164,.10,.145,.022,.45);
  }
  for(let x of [-.29,.29])for(let z of [-.25,.25]){
    s.box("stoneDark",x,.22,z,.19,.085,.19);
    s.cyl("sandstone",x,.26,z,.069,.061,.40,11);
    s.cyl("plaster",x,.65,z,.094,.082,.075,12);
    s.box("stoneDark",x,.725,z,.20,.07,.20);
    s.box("moss",x,.762,z,.16,.02,.15);
  }
  s.box("plasterDark",0,.79,-.25,.75,.105,.15);
  s.box("sandstone",0,.80,.25,.58,.082,.14);
  s.box("stoneDark",-.19,.91,-.25,.24,.14,.23);
  s.box("stoneDark",.14,.875,-.25,.30,.07,.20);
  s.box("moss",-.11,.973,-.25,.24,.015,.24);
  for(let i=0;i<6;i++){
    const x=-.43+i*.16,z=(i%2?.32:-.34);
    s.sphere(i%3===0?"moss":"stone",x,.12,z,.055,.045,.077,8,5);
  }
  s.box("sandstone",0,.025,.47,.63,.055,.16);
  s.box("stone",0,.003,.60,.76,.04,.14);
  return s.toGLB();
 }
 function dock(){
  const s=new SceneModel("LagoonDock");
  for(const x of [-.42,-.14,.14,.42])for(const z of [-.34,.35]){
    s.cyl("darkWood",x,-.22,z,.053,.045,.65,9);
    s.cyl("rope",x,.38,z,.058,.058,.055,10);
  }
  for(let i=0;i<9;i++){
    const x=-.48+i*.12;
    s.box(i%3===0?"lightWood":"wood",x,.22,0,.104,.065,.92);
    for(const z of [-.36,.36])s.sphere("steel",x,.259,z,.009,.008,.010,6,4);
  }
  for(const z of [-.36,.36])s.box("darkWood",0,.19,z,1.10,.095,.065);
  s.box("wood",.22,.39,.10,.22,.25,.19);
  for(const z of [-.04,.21])s.box("darkWood",.22,.39,z,.24,.024,.025);
  s.cyl("stoneDark",-.30,.28,.07,.15,.13,.12,11);
  s.cyl("rope",-.30,.40,.07,.14,.12,.036,12);
  for(let i=0;i<9;i++){
    const a=i*2.2,x=.56+.19*Math.cos(a),z=.09+.3*Math.sin(a);
    s.beam("olive",[x,-.11,z],[x+.09*Math.sin(a),.19+(i%3)*.13,z],.017,6);
    s.sphere("grass",x,.20+(i%3)*.13,z,.040,.07,.032,6,4);
  }
  // Shallow miniature fishing boat tied beside the dock.
  s.sphere("darkWood",-.62,.01,-.09,.26,.11,.16,14,8);
  s.sphere("wood",-.62,.091,-.09,.20,.045,.105,12,6);
  s.beam("rope",[-.46,.13,-.10],[-.39,.30,-.24],.012);
  s.beam("lightWood",[-.66,.09,-.06],[-.84,.13,.18],.023);
  return s.toGLB();
 }
 function crystals(){
  const s=new SceneModel("VioletCrystalShrine");
  s.cyl("stoneDark",0,-.06,0,.48,.45,.09,16);
  s.cyl("stone",0,.02,0,.42,.40,.065,16);
  s.cyl("gold",0,.074,0,.29,.29,.015,16);
  s.cyl("stoneDark",0,.085,0,.24,.23,.04,16);
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9;
    const r=.31+(i%3)*.06;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const h=.34+(i%4)*.11;
    s.prism(i%3===0?"lavender":i%3===1?"crystal":"crystalDark",
      x,z,.11,h,.10+(i%2)*.035,.092,a*.65);
    s.cyl("stone",x,.06,z,.105,.098,.045,8);
  }
  s.prism("crystal",0,0,.11,.75,.19,.17,.43);
  s.prism("lavender",.06,.01,.18,.56,.14,.14,.38);
  for(let i=0;i<9;i++){
    const a=i*2.399,x=Math.cos(a)*.49,z=Math.sin(a)*.46;
    s.sphere("moss",x,.045,z,.07,.04,.05,7,4);
  }
  return s.toGLB();
 }
 function stones(){
  const s=new SceneModel("CloverStandingStones");
  s.cyl("moss",0,-.03,0,.42,.45,.065,18);
  const a=[[-.27,-.18,.37],[.29,-.22,.45],[-.19,.27,.36],[.23,.24,.49]];
  for(let i=0;i<a.length;i++){
    const [x,z,h]=a[i];
    s.box("stoneDark",x,.06,z,.19,.12,.18);
    s.box(i%2?"stone":"sandstone",x,.09+h/2,z,.15,h,.13);
    s.box("moss",x,.12+h,z,.15,.035,.13);
    s.box("plasterDark",x,.25,z+.069,.05,.07,.014);
  }
  s.box("sandstone",0,.44,0,.79,.17,.16);
  s.box("stoneDark",0,.535,0,.84,.056,.20);
  s.box("moss",.16,.564,-.025,.24,.013,.14);
  for(let i=0;i<7;i++){
    const a=i*2.399,x=.45*Math.cos(a),z=.43*Math.sin(a);
    s.sphere("grass",x,.04,z,.044,.085,.039,7,5);
  }
  return s.toGLB();
 }
 return {camp:camp(),lighthouse:lighthouse(),ruins:ruins(),
  dock:dock(),crystals:crystals(),stones:stones()};
}

const outputs=generateLandmarkAssets();
const folder=fileURLToPath(new URL('../public/assets/worldmap/landmarks/',import.meta.url));
mkdirSync(folder,{recursive:true});
for(const [name,asset] of Object.entries(outputs)){
 writeFileSync(folder+name+'.glb',asset.bytes);
 console.log(name,asset.bytes.length+' bytes',asset.meshes+' materials',Math.round(asset.triangles)+' triangles');
}
