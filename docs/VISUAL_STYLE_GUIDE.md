# Treasure Bots — Visual Art Direction (authoritative)

**Approved 2026-11-07.** This document supersedes historical references to a "PS1", "retro", "pixelated", or intentionally coarse visual target. **The user wants stylized detailed 3D**, not PS1. A miniature fantasy diorama with high-quality organic terrain, strong silhouettes, material richness, polished lighting, and expressive chibi characters is the target.

## Visual pillars

1. **Modern stylized detailed 3D:** visually rich but not photorealistic; soft surfaces, intentional gradients, varied materials, carefully modeled props. Never artificially reduce resolution, use pixelation filters or faceting just to simulate PS1.
2. **Board readability:** the authoritative board path, Gallery numbers printed on board tiles, player colors, item/site markers, hit targets, and actors stay legible at the default portrait Android camera. Gallery No.N is **not** a building inside the island.
3. **Miniature living world:** compelling from all 360-degree camera angles; no floating mountains, detached waterfall, intersecting terrain layers, ocean cracks, or identical island landmarks.
4. **Consistent visual language:** buildings, terrain, vegetation, waterfalls and characters share material response, shape language and scale.
5. **Android first:** optimize texture and mesh budgets, batching/instancing, LOD where useful, invisible updates pause, quality adapts without compromising input reliability.

## Style targets and required behaviors

| Area | Target | Non-negotiable |
| --- | --- | --- |
| Land/shore | Sculpted-looking coastline, natural raised slopes, smooth shared heightfield normals, subtle grass/soil/rock gradients, authored details | Preserve board-conformal stage cap and apron; **never** introduce sea slivers |
| Mountains/cliffs | Organic mountains with exposed rock, shaded folds, smooth terrain transitions and occasional stepped strata only where artistically justified | Avoid disconnected tier cylinders, z-fighting, hiding/covering perimeter tiles |
| Ocean | Subtle waves, shallow-water color, rim foam beyond stage foot, restrained highlights | Preserve existing 24 FPS visible-only update loop until profiled |
| Waterfall | Multiple soft flowing streaks hugging rock, fine spray, believable source/pool | Positions derive from the same terrain heightfield and terminate inside lagoon |
| Trees/plants | Varied layered crowns, trunks, shrubs and rocks, themed distributions | Keep repeatable deterministic scatter and batch small props |
| Landmarks | Ring: expedition camp + ruins/lighthouse; Lagoon: docks/sand/reeds; Clover: crystals/standing stones | Stage identity must be recognizable without counting tiles |
| Characters | Expressive chibi, textured or carefully shaded materials, high-quality animation transitions | Keep player/robot identity, locomotion and authoritative state |
| Lighting | Warm key + cool fill, soft stable shadows, natural material response | No washed-out highlights or flat unlit appearance; avoid untested expensive post FX |

## Rendering and asset pipeline

- Three.js + TypeScript remain the World Map renderer. Phaser remains Board View/fallback as currently wired.
- GLB/glTF + GLTFLoader + AnimationMixer are the preferred path for high-quality authored models and animation; procedural primitives are acceptable for prototypes and invisible scaffolding, not the final asset quality.
- Prefer PBR MeshStandardMaterial, smooth vertex normals for *organic* terrain, calibrated roughness/metalness, compressed textures (KTX2 where supported), shared atlases, reusable meshes, instancing and optional LOD.
- **Do not mistake higher polygon count for visual quality.** Silhouette, material, light, composition and edge cohesion matter more.
- Render at native-ish screen resolution with antialiasing and conservative capped DPR. Never deliberately upscale a 0.85× blurry or pixelated map as an art choice.
- Budget for playable Android portrait. Initial review targets (not measured guarantees): 30 FPS on a midrange device, avoid noticeably slow interactions and memory pressure; 60 FPS on stronger devices if feasible. Real-device measurements and screenshots are required.

## Implementation phases

### P1 — Foundation and organic terrain
- Audit board/terrain overlap on Ring/Lagoon/Clover for 3/4/5 Galleries and 360° orbit.
- Maintain exact board-conformal stage foundation and apron topology.
- Shift the main organic heightfield from PS1 facet shading to smooth analytical normals.
- Upgrade mountain silhouettes, natural erosion, shoreline transitions *without changing any logical map geometry*.

### P2 — Environment polish
- Improve flowing waterfall shader/ribbons, coastal foam, restrained water lighting and coherent pools.
- Improve vegetation variety, scale, and stage-specific detail; replace visible placeholder cones/icosahedra with modular authored assets where feasible.
- Calibrate daylight, exposure, shadow, materials via Android screenshots.

### P3 — Hero assets
- Replace placeholder landmark, avatar and robot meshes with coherent stylized-detailed GLB assets (where available); preserve animation names/states, companions and fallback loading.

### P4 — Quality and performance
- Add LOD, GPU-friendly material/mesh packing, mobile quality presets grounded in benchmarks; check rotation, scene re-entry, context loss, reduced-motion and disposal.

## Visual acceptance checklist

- No ocean visible through board/terrain joins for any shape/gallery count or 360° angle.
- Mountains and waterfalls are terrain-attached, not vertically stacked unrelated props; no clipping with colored board.
- Rich enough surface variation to avoid obvious primitives, but board numerals, colored cells and mission markers remain readable.
- Stage variety is visually obvious and not merely tinted copies.
- Crisp rendering on Android; no intentional PS1/pixelated look.
- Camera pinch/orbit, tile taps, dice input guard, Send Robot and End Turn work as before.
- Gameplay, economy, four-player setup, server commands and Gallery state are unchanged by cosmetic work.
- CI passing is **not** proof of visual quality or Android performance: require screenshots and device QA before marking visual acceptance.

## Source of truth / handoff

- Current implementation: `src/client/world-map-three.ts`, `world-map-terrain.ts`, `world-map-stage.ts`, `world-map-waterfall.ts`, `world-map-water.ts`, `world-map-board.ts`.
- Map geometry: `src/engine/map-shapes.ts` is authoritative.
- Older `docs/WORLD_MAP_V5.md` and `AGENTS.md` entries are historical records; some may describe prior PS1 visuals. **Do not restore those choices.**
- Record each delivered visual increment and verification results in `AGENTS.md` so another agent can continue without guessing.
