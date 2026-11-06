// Reproducible original assets, no third-party models or textures.
import {writeFile} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createOriginalActor,disposeActorModel} from '../src/client/world-map-models.ts';
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{
    this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();
  });}
};
for(const kind of ['avatar','robot']){
  const model=createOriginalActor(kind);
  const data=await new GLTFExporter().parseAsync(model.scene,{animations:model.animations});
  const json=JSON.stringify(data);
  await writeFile(new URL(`../public/assets/worldmap/actors/${kind}-v5.gltf`,import.meta.url),json+'\n');
  console.log(`${kind}: ${json.length} bytes; ${data.meshes.length} meshes; ${data.animations.length} clips`);
  disposeActorModel(model);
}
