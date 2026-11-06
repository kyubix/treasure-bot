# World Map V5 — implementation and AI handoff

Baseline: verified `main` at `81087c05f7465fec512e1c13cb4a8969e4630458` on 2026-11-06. User explicitly requested direct `main`, no branch/PR. Scope is the opt-in World Map only: https://treasure.endeavor.lt/?map3d=1 . The normal URL keeps Phaser World Map; Board View always remains Phaser.

## Models and assets

- `world-map-models.ts` is the original model/animation source. Avatar: faceted head, cap, eyes, tunic, scarf, belt, backpack, boots and jointed limbs. Robot: colored armor, visor, antenna, backpack and separate arms/legs. No proprietary models, textures, screenshots or external asset services.
- `scripts/generate-world-actors.mjs` reproducibly exports `public/assets/worldmap/actors/{avatar,robot}-v5.gltf` using Three's GLTFExporter. Run `node --experimental-strip-types scripts/generate-world-actors.mjs` with installed dependencies (Node 22+). Commit source and generated assets together.
- Both glTF files are self-contained with embedded buffers; together ~192 KB uncompressed. Each model uses 10 merged meshes (per rigid joint/material) and fewer than 1,500 triangles, no textures, bones, decoder or skinning dependency. Vertex colors and `PlayerPaint` material preserve player identity. Five seamless clips: `idle`, `walk`, `run`, `search`, `return`.
- `world-map-actor-assets.ts` loads both once per map layer via GLTFLoader. The procedural model is immediately available and stays functional on download failure. Successfully loaded models replace only the visual child, preserving world anchor, player ID and current animation. Late assets are disposed after map exit; removed players are not resurrected.
- Animation translation channels must use VectorKeyframeTrack/VEC3. Scalar `.position[y]` tracks can animate procedurally but export invalid glTF translation channels. The round-trip glTF tests catch this.

## State mapping

| Visible condition | Animation |
| --- | --- |
| Player standing / robot awaiting next state tick | idle |
| Avatar moving through board waypoints; normal outbound robot | walk |
| DASH robot moving outbound | run |
| Robot at authoritative SEARCH destination | search |
| Robot moving INBOUND or completing return to companion position | return |

`world-map-actors.ts` reads state only. Movement interpolates between authoritative snapshots and does not predict turns, spend energy, select destinations, or issue commands. Avatar paths follow consecutive perimeter tiles including wraparound, never a straight chord across the island. Initial/reconnected snapshots snap directly. Routes are bounded to one lap; hidden/Board View snapshots snap to latest state rather than replaying stale turns on resume. Existing mission `launchTile` mapping remains immutable while a mission exists. After mission removal the existing companion behavior places robot beside its owner.

Locomotion stops after visual arrival even when the mission remains OUTBOUND/INBOUND waiting for the next turn. SEARCH waits for arrival. Repeated camera/resize redraws must not reset a pending return animation. Actions are reused and cross-faded over 0.16s on state changes. Joint animation never writes world anchors.

## Environment and Android costs

`world-map-environment.ts` gently sways tagged tree crowns, updates 12 instanced waterfall streaks plus 10 spray droplets, and rotates a short translucent lighthouse beacon. All resources belong to the existing scene. No additional light/shadow map or render loop. These effects, ocean and character mixers share the existing capped 24 FPS loop, which stops in Board View, hidden tabs, context loss and disposal. Simulation time pauses instead of jumping on tab return.

Retain 0.85 pixel ratio, low-power WebGL and existing 768px shadow map; disable multisample antialiasing for the pixel-art preset. Cache coastline lighting and eliminate CPU normal rebuilding for flat-shaded ocean geometry (face normals come from shader derivatives). Reuse scratch vectors and instance buffers. Dispose instance buffers, cloned model resources, mixers, cached templates and sun shadow resources on exit. `prefers-reduced-motion` freezes cosmetic environment/rig cycles while state-position transitions continue.

## Preserved boundaries

No engine/server/DO schema, commands, economy, inventory, multiplayer, shop, gallery or Board View changes. No new controls. Existing free 360° drag, tilt, pinch, camera arrows, marker projection and tap IDs stay in place. Gallery numbers are not invented or attached to scenery. Phaser remains the WebGL fallback. This phase uses rigid-joint animation rather than skinned GLB; the loader can accept a future model but node/clip contracts and disposal must be retested.

## Validation and limits

- `npm test`: 30 engine/gameplay smoke checks.
- `npm run test:unit`: full suite, including real GLTFLoader round trips, mesh/asset budgets, all five clips, launch origin, locomotion settling, redraw return, hidden snapshot coalescing, reduced motion, async disposal/fallback and stable environment buffers.
- `npm run build`: TypeScript and Vite production build; Vite still warns about >500 KB chunks (Phaser and lazy Three bundle). No claim of reduced total JS download size.
- Local browser preview unavailable in this Work environment: preview runner injects Vite-style `--host`/`--strictPort` flags into the project's Wrangler dev command. The production dev/server configuration was preserved. Deployment/browser verification is recorded separately after pushing.
- Real Android FPS, thermal load and visual quality remain device-validation items; automated geometry budgets are not an FPS benchmark. Keep V5 opt-in until these are checked.

Phone acceptance: open preview, start a match, switch to World Map, orbit all 360° with drag and pinch, select destinations, dispatch, advance turns through search/return, switch Board/World, background/foreground app, and verify all board tiles/markers stay aligned. Failed glTF download must leave animated original fallback actors. Normal URL must retain Phaser map and board interactions.
