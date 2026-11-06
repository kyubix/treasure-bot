# Board View Three.js HD — first playable implementation

Date: 2026-11-06. Directly on GitHub **main**, based on the user's four screenshots
of a classic board-game close-up (numbered white top cells, colored lower
cells, characters on the track, and a scenic landmark behind the path).
These screenshots are **layout/design references only**; no original
textures, sprites, models, fonts or game code were copied.

## Rendering contract

- **Main Board View now defaults to Three.js** with higher-resolution,
  antialiased materials, physically lit geometric scenery, soft shadows,
  rich biomes and 3D characters. HD/stylized is allowed — no mandatory
  PS1 pixelation, low-poly filters or extra style-toggle buttons.
- Three scene: \`src/client/board-view-three.ts\`; atmosphere and landmark
  models: \`src/client/board-view-environment.ts\`.
- Top row: raised pearl-white tile with large dark Gallery NUMBER (repeats
  No.1..5 according to \`src/engine/gallery.ts\`, still provisional mapping).
- Bottom row: glossy, colored tile panel. START/SHOP/EVENT/SUPPORT use their
  own sign/icon rather than inventing Gallery ownership.
- Gallery/Shop **facades only appear in the close-up Board View** when the
  current location warrants it. No Gallery buildings are placed on World Map.
- Other encounter views show distinct gates, shrines or old ruins. Scenery
  follows existing \`boardScenery()\` biome zones with layered terrain,
  color palettes and instanced vegetation.
- Characters/robot models reuse the *existing* original V5 GLTF assets and
  AnimationMixer idle/walk behavior when available, with procedural models
  as fallback. The active character stays centered while the track slides
  with the authoritative movement tween (no skipping steps).
- A compact mini-map/turn plaque stays visible, but game controls, turn rules,
  dice, End Turn, shop encounters and Gallery dialog remain HTML/engine-owned.
- Renderer stops 30 fps cosmetic updates when hidden or switched to World Map.
  GPU DPR is capped at 1.6, shadow map at 768. Phaser is Canvas-backed, avoiding
  competition for a second WebGL context from Phaser itself.
- If Three/WebGL cannot be initialized or rendering fails, the full Phaser
  Board View is still drawn automatically. The World Map keeps its existing
  optional \`?map3d=1\` renderer and touch rotation, unchanged.

## Test / rollback

Default: https://treasure.endeavor.lt/

Force legacy Board View: https://treasure.endeavor.lt/?board2d=1

Use the legacy parameter in an existing room, for example:
\`?room=ABC123&board2d=1\`. The parameter is retained during room creation/join.

For World Map Three preview: \`?map3d=1\`; both views can use Three.
**Main Board HD mode is default, not behind the map3d flag.**

Validation required:
- GitHub smoke + unit + TypeScript + Vite build.
- Cloudflare Workers Build successful for the **exact** GitHub commit.
- Phone QA must verify first-open sizing, portrait and landscape, all tile
  Gallery numbers, walking several dice steps, portal/shop flow, Board-World
  transitions, no popup interception, RAM/FPS and touch controls.
- A successful CI/Cloudflare build does not prove the production UI rendered
  or passed these phone checks. Report them separately.

## Limitations / next visual pass
- Geometry/light/material polish can be increased without changing the engine.
- The mountain/forest backdrop is procedural; not a copied movie/photo asset.
- Scene is not a pixel-for-pixel remake; top number plates and colorful
  panel compositions are matched, not proprietary game material.
- No game rules, item values, action schema, or persisted Gallery data are
  modified in this renderer-only change.
- World Map and Board View may each allocate a Three WebGL context when
  \`?map3d=1\`; only the visible renderer animates. Audit device-specific
  GPU memory before enabling both by default.
