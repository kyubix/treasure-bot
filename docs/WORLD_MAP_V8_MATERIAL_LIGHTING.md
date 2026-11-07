# World Map V8 — original microtextures and calibrated lighting

## Approved target
Stylized Detailed 3D mini fantasy diorama, **not PS1**. Build on V7's six self-contained landmark GLBs and V6's smooth terrain. No server/board/input/economy changes.

## Implemented
1. Rebuilt the six original GLB landmark assets with **TEXCOORD_0** projected by polygon face orientation, so standard Three.js PBR textures/normal maps can be applied at runtime; generated reproducibly with `node scripts/generate-world-landmarks.mjs`.
2. Added `src/client/world-map-materials.ts`, a deterministic, tileable, neutral PBR microtexture generator for stone, timber, fabric, foliage, soil. It creates paired 96×96 sRGB albedo / linear normal maps once per scene; no third-party downloads, browser canvas or render-loop allocations. Palette in GLB and vertex colors remains authoritative.
3. Applied shared relief to GLB stone, plaster, wood, ropes, cloth and foliage; kept metal/glass/crystal untouched for crisp specular detail.
4. Terrain and board-conformal foundation/apron add UVs without changing physical vertices, shore alignment or Gallery tile placement; subtle maps increase surface fidelity.
5. Calibrated Three.js light with ACES tone mapping, conservative exposure and soft shadow. No postprocessing passes or extra lights.

## Memory budget and lifecycle
- Six UV-bearing GLBs total ~805 KB (each < 260 KB); 5 material pairs at 96×96 RGBA (~360 KiB pixel storage), mipmaps add GPU overhead.
- Textures are shared per world scene and disposed on final scene teardown; mesh materials/geometries remain stage-owned. Shape switching does not regenerate/reupload the texture sets.
- Same-origin assets with procedural fallback if loading fails.

## Verification
- GitHub CI runs smoke, unit tests including UV-buffer GLB round trips and material/normal pairs, TypeScript and Vite build.
- Manual Android checks are required for pixel clarity, panel/board readability, shadow aliasing, 360° seams, texture orientation, thermal/FPS, fallback when assets fail and Cloudflare deployment.
- This is a material pass, **not** professional handcrafted PBR textures, HDR environment maps or photorealism. Further passes require screenshots and device measurements.
