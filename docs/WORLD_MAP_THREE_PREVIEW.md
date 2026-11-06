# World Map Three.js preview — V3 visual terrain upgrade

Updated 2026-11-06. Direct-to-main visual-only improvement inspired by the
procedural terrain + PS1 renderer *techniques* in the user-supplied Claude HTML.
The original PS1 screenshot is compositional reference only; no proprietary
pixels, copyrighted textures, models, music, sprites or code were imported.

## Mobile preview, with NO new buttons
- Phaser fallback: `https://treasure.endeavor.lt/`
- Opt-in Three.js: `https://treasure.endeavor.lt/?map3d=1`
- Room code: `?room=CODE&map3d=1`
- **Existing controls unchanged**: one-finger drag = free 360° orbit;
  vertical drag = tilt; two fingers = pinch; existing left/right arrows =
  45° camera rotation. No PS1 toggle or other new UI control.
- PS1-inspired style is the built-in rendering preset for the opt-in 3D
  scene, not a new setting: coarse pixel ratio 0.85, crisp pixel scaling,
  flat-shaded polygon edges, limited color palettes and low-poly props.
  Phaser board text and live indicators retain their sharp resolution.

## Updated procedural environment
- `src/client/world-map-terrain.ts`: deterministic radial terrain heightmap,
  layered plateau/ridge noise, cliff-colored slopes and grassy heights.
  Board footprint stays outside the terrain's green rim; the lagoon stays
  near the original water clearing.
- Terrain vertices use physical elevation and slope for color decisions.
  Surface resolution: 120 angular sectors × 45 rings (bounded for mobile).
- Details are created as three `THREE.InstancedMesh` batches of grass,
  shrubs and rocks. Trees and scenic structures use sampled heights.
- Coastline foam follows the irregular rim. Ocean reflections are batched
  into one lightweight line mesh. No water animation loop is added.
- Scene meshes cast/receive existing mobile-sized shadows (768 px) without
  expanding the GPU shadow-map allocation.
- `src/client/world-map-three.ts` retains the existing camera, projection,
  orbit/zoom/rotation functions and all screen-space 3D marker mapping.

## Zero gameplay changes
- Dynamic board perimeter tiles and owners, robot routes/launch tile A,
  clickable target IDs, player positions and HUD remain Phaser overlays
  driven by the server state. No new Gallery number mapping is invented.
- Board screen, multiplayer state, Durable Objects, rules, inventory,
  dispatch, purchases and WebSocket behavior are unchanged.
- `map3d=1` is still opt-in. Browser/WebGL failure falls back to Phaser.

## Water upgrade (November 6, 2026)
The user-provided Claude HTML was used as a *technical comparison*, not
imported: it animates a subdivided translucent Three.js water plane by changing
vertex heights each frame. Treasure Bots now applies the same general idea with
new original implementation `src/client/world-map-water.ts`.

- Ocean vertex positions and near-shore water colors update with three gentle
  intersecting wave components, capped at ~24 FPS while World Map is visible.
- One batched group of drifting sea glints, with small concentric pond ripples.
- Uses the existing coastline foam geometry; no new buttons or camera changes.
- The water animation pauses automatically in Board View and in background
  tabs, and stops/disposes when the room exits.
- Renderer is still opt-in via `?map3d=1`; Phaser fallback, all board markers,
  Android drag/orbit, target hit testing and game rules remain unchanged.
- The animated plane uses a 56×56 segment grid to limit CPU/GPU load.
- `tests/world-map-water.test.ts` verifies water movement and stable buffers.

## V4 — animated Three.js player and robot models

This phase promotes **only the World Map characters and robot companions**
from Phaser sprites to real low-poly Three.js meshes. It keeps Board View,
the world board tiles and interactive target hit areas in Phaser. This is
intentional so no gameplay/turn mechanics are migrated together with visuals.

- `src/client/world-map-actors.ts` creates original PS1-style chibi player
  rigs and small robot models, each keyed by the server's stable player ID.
  Character idle/bob motion uses `THREE.AnimationClip`,
  `THREE.NumberKeyframeTrack` and `THREE.AnimationMixer`.
- `GameState.players[].position` anchors each player mesh to the existing
  exact 3D board tile coordinates, including multiple players on one tile.
- Robot models follow the real `robot.mission`, including its immutable
  `launchTile`, destination site and discrete phase/progress. Client
  interpolation only smooths the appearance; it never mutates game state.
- `src/client/world-map-three.ts` updates actors on the existing capped
  24 FPS ocean render loop. It stops on Board View, hidden tab and cleanup.
  No extra animation controls, camera buttons or gameplay actions.
- When Three.js is rendering and actors are available, Phaser suppresses
  only its own player/robot drawings; mission routes, board, target markers,
  tap areas, player ownership and the normal Phaser fallback remain intact.
- No external GLB, rig files, paid models or third-party character assets
  have been imported. Model swaps can later use animated glTF/GLB clips
  without rewriting server state mapping.
- `tests/world-map-actors.test.ts` verifies unique persistent meshes,
  idle animation, multiple players in one tile, and launch origin A.

**Preview:** `https://treasure.endeavor.lt/?map3d=1`; the URL without
`map3d=1` still uses the complete Phaser World Map. V4 requires Android
visual/performance QA before it becomes the default.

## QA gates
1. GitHub Actions: smoke, unit, TypeScript build, and new heightfield tests.
2. Verify Cloudflare deploy to the *actual* production host independently:
   a green GitHub CI result does NOT prove a deployment.
3. Android visual QA on real game: all board cells visible, 360° drag/zoom,
   landmarks stable, no resize jitter, old control labels/buttons unchanged.
4. Tap and selection work, drag never selects a site. Robot launch route
   remains attached to current authoritative position.
5. Inspect visual proximity to the PS1 reference. Adjust visual density,
   pixelation and memory only after seeing an actual phone screenshot.

## Limits
3D terrain is now continuous, but the clickable board and markers remain
2D Phaser overlays projected through the shared 3D camera, not 3D meshes.
They can visually overlay the front face of hills. True depth occlusion,
mesh raycasting and more realistic materials are future opt-in tasks.

## V5 — glTF animation and living scenery

See [WORLD_MAP_V5.md](WORLD_MAP_V5.md) for the current implementation and handoff. V5 retains this opt-in URL and all existing controls. Original avatar/robot models load through GLTFLoader with idle/walk/run/search/return clips, tree sway, waterfall streaks/spray and a rotating lighthouse beacon. Engine/server and Phaser Board View are unchanged.
