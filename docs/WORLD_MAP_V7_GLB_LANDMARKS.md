# World Map V7 — original authored GLB hero landmarks

Updated: 2026-11-07. Art direction: **Stylized Detailed 3D**, never PS1.

## Delivered
- 6 self-contained original binary glTF 2.0 assets in `public/assets/worldmap/landmarks/`:
  `lighthouse.glb`, `ruins.glb`, `camp.glb`, `dock.glb`, `crystals.glb`, `stones.glb`.
- Reproducible source in `scripts/generate-world-landmarks.mjs`, using only Node built-ins and deterministic geometry generators. Run `node scripts/generate-world-landmarks.mjs` to regenerate. No marketplace models, external server, license dependency, or renderer-side mesh generation for these hero assets.
- Hero models use multiple PBR surface materials with varied roughness, low metallic factors and restrained emissive highlights. Mesh detail includes lighthouse balcony/railings, port windows, ruins columns/capitals/moss, expedition tent/ropes/lantern, dock planks/boat/reeds, crystal facets and engraved standing stones.
- At stage load, `world-map-landmarks.ts` asynchronously loads same-origin GLB via `GLTFLoader`; it caches templates, creates per-stage instances with independently disposable geometry/material, and places them atop the shared terrain heightfield.
- **Atomic fallback:** existing procedural landmark groups stay visible until every required GLB for that stage succeeds. If any asset fails or stage changes before completion, the procedural landmarks remain visible. No ghost models after shape switch.
- Ring uses Lighthouse + Ruins + Camp; Lagoon uses Dock; Clover uses Crystal Shrine + Standing Stones.
- Gameplay and Gallery numbering remain entirely server-owned and unchanged. No numbered Gallery landmarks.

## Asset budget
Six models total roughly 607 kB; 6 to 14 grouped meshes each and a few thousand triangles. No texture download; colors and material response are encoded as GLB PBR materials. This is a first detailed-asset step, not equivalent to professional baked-texture art.

## QA
- CI: `npm test`, `npm run test:unit` (GLTFLoader binary parse, material integrity, fallback/swaps), `npm run build`.
- Real Android screenshots, 360° orbit, lighthouse beacon alignment, dock/lagoon overlap, shape switching during load, FPS and Cloudflare deployment need separate visual QA.
- To reach higher-quality reference art, next add sculpted glTF textures/normal maps, authored vegetation and lighting calibration after mobile screenshots.
