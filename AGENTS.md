## 2026-11-07: Board first-view resizing + Ring mountain/tent overlap fix

- On Android, Phaser Board initialization no longer starts at 640×480 and visibly resizes. Seed RESIZE scale from actual board host dimensions; defer first paint until three stable layout frames and do not reveal a stale-sized board frame. Preserve Phaser and Three fallback, all Board input/turn/dice logic.
- Ring tent was at (-1.45,1.53) inside the western mountain slope. Now shares a flat clearing at (-2.30,0) between `world-map-landmark-layout.ts`, GLB positions and legacy procedural tent. Instanced trees are excluded from the campsite.
- Tests check cold-start viewport seed and campsite terrain variance, mountain separation, forest clearance. CI/deployment and real Android QA still required.

## 2026-11-07: V8 PBR microtextures, UV-bearing original GLBs and filmic lighting

- **Stylized Detailed 3D only**, not PS1. Read `docs/VISUAL_STYLE_GUIDE.md` and `docs/WORLD_MAP_V8_MATERIAL_LIGHTING.md`.
- Six original GLBs regenerated with face-oriented UV attributes for proper texture/normal sampling, all still self-contained and local.
- New world-owned `world-map-materials.ts` builds tileable 96×96 neutral albedo+normal DataTextures for stone, wood, fabric, foliage, soil, applying them to matched GLB surface names and to terrain/stage foundation/apron. Metals, crystal, glass keep clean PBR shading.
- Shared textures are allocated once on the Three World Map layer and disposed with it, not per island shape or animation frame. Render uses ACES tone mapping, warm key/cool sky fill, soft shadow map 1024.
- All Gallery/board path logic, actors, input, economy, robot turns and Phaser fallback unchanged.
- Texture/UV/material and gameplay tests in CI. Must **not** claim phone visual/FPS acceptance without real Android screenshot and 360° QA.

## 2026-11-07: V7 original GLB landmark upgrade

- Target **stylized detailed 3D**, never PS1. Read `docs/VISUAL_STYLE_GUIDE.md` and `docs/WORLD_MAP_V7_GLB_LANDMARKS.md`.
- Six original self-contained PBR GLB hero landmark files under `public/assets/worldmap/landmarks/`, reproducible by `node scripts/generate-world-landmarks.mjs`.
- The Three World Map now loads those landmark sets via `GLTFLoader` and caches read-only templates. Instance geometry/materials are cloned and disposed per stage.
- Stage-level procedural fallback remains until all required assets finish loading; full rollback on load failure and cancellation during shape switch. No additional gameplay state, backend calls, or Gallery No. landmark buildings.
- Ring: camp, ruins, lighthouse; Lagoon: dock/boat; Clover: crystal shrine and standing stones.
- Tests cover GLB parsing and fallback races. Android 360°, performance, shader/texture acceptance and cloud deployment still need manual inspection. GLB models are scripted original geometry with PBR colors; a professional baked texture/normal-map pass is still open.

## 2026-11-07: V6 stylized detailed 3D environment upgrade (Android QA pending)

- **Not PS1**. Read `docs/VISUAL_STYLE_GUIDE.md` and `docs/WORLD_MAP_V6_DETAILED_ENVIRONMENT.md` before continuing.
- Procedural mountain contours improved with smooth eroded profiles and gradient rock coloring; common heightfield remains the source of truth for ground/waterfall/sites.
- Instanced detailed broadleaf/pine forest replaces hundreds of primitive tree draw calls; placement keeps clear of outer board and pond. Two instanced meshes and stage palettes. Trees are static to reduce mobile animation cost; original lighthouse animation remains.
- Waterfall adds attached moving glints with no separate RAF loop and no per-frame allocations of scene meshes.
- No gameplay, economy, Gallery, server, input, or map path changes.
- Test and build through CI; real Android screenshots/360-degree orbit and FPS still unverified.

## APPROVED 2026-11-07 — NEW VISUAL DIRECTION: STYLIZED DETAILED 3D

The user **explicitly rejected PS1/retro low-poly**. All future Treasure Bots
World Map, terrain, water, waterfalls, buildings, robots and avatars must use
**stylized detailed 3D / miniature fantasy diorama** quality.
See authoritative `docs/VISUAL_STYLE_GUIDE.md`. Historical PS1-related
notes are implementation history only; do not revert to that art style.

Initial implementation: `world-map-terrain.ts` now computes continuous
heightfield surface normals and uses smooth PBR lighting, without changing
mesh topology, coastline, board path, gameplay or actor anchors.
The mobile render loop/budget remains unchanged. Automated unit checks
cover radial-seam normal continuity. Android visual/thermal QA remains open.

# AI Agent Handoff — Treasure Bots

## 2026-11-07: World Map edge-only polish (main)

- Corrected the apron mapping: each coast vertex now uses the angular direction of its paired `boardPathFrame`; it previously used raw 0..2π progress despite the board's angle offset, which twisted the road-to-land transition (especially Lagoon/Clover).
- Replaced two-point flat apron with four continuous lanes, sampled terrain heights and blended grass/earth/sandy trim colours. The border remains underneath the board top, and interactive tiles, Gallery numbers, actors and logic are unchanged.
- Gave the solid stage foundation six sculpted rock bands with gentle periodic erosion and a wider submerged foot, while keeping its top seal EXACTLY board-conformal to avoid sea slivers. Foam now starts beyond the eroded foot.
- Updated `tests/world-map-stage-alignment.test.ts` to verify closed geometry, coast/board correspondence around all three shapes, and clear foam placement. Requires CI and real Android 360° QA (3/4/5 Galleries, touch targets, clipping, FPS); do not assume deployment or visual acceptance.


## 2026-11-07: Android gameplay and fidelity hotfix

- Users observed dice apparently ROLL when they touched World Map /
  Send Robot. Cause was a permissive `rollButton.click` fallback that
  treated Android pointer-synthesized click as a new roll, even with
  view transitions. Fix: arm a specific pointer ID on the physical
  dice button and release only that pointer while Board View is
  active. World navigation and Send Robot cancel any held roll.
  Accessible synthetic clicks are allowed **only when detail===0 and
  the dice button has focus in Board View**. Server still validates
  dice actions. Regression: `tests/dice-intent.test.ts`.
- World Map was rendering at fixed **0.85× CSS pixel ratio** with
  antialiasing off, then upscaled, blurring HD models. It now uses
  capped device pixel ratio (1–1.5) and MSAA; no pixelated canvas
  upscaling. Board Three.js cap slightly increased to 1.65.
  24 FPS water cap and visible-only rendering are unchanged.
- Previous continuous foundation looked like an oversized brown slab.
  `createStageFoundation` now makes a narrower overhang and four
  tapering, colored cliff bands down to the ocean, while maintaining
  continuous, board-aligned coast geometry. Top remains below tiles.
  `tests/world-map-stage-alignment.test.ts` checks the new topology.
- New code requires CI+Workers validation and mobile Android QA.
  Do not claim manual visual acceptance from automated tests alone.

## 2026-11-07 screenshot-driven World Map edge/decor fix

- User Android screenshots showed **blue sea peeking between the perimeter
  board and island**, particularly when camera yaw changes. User also
  noted every map looks almost identical inside despite shape options.
- `src/client/world-map-stage.ts` is the new world-aligned stage
  foundation: continuous solid top/side wall follows `boardPathFrame`
  around the entire board, with a matching grass/sand apron connecting
  irregular terrain to the INSIDE tile trim. Do not restore the separate
  `organicCylinder` cliff/beach/turf stack, which reintroduces seams.
- The offshore foam band now uses board normal offsets, so shoreline
  foam never disappears underneath the platform or cuts across
  Gallery tiles. Existing server Gallery numbering and colors unchanged.
- Islands now have genuinely DIFFERENT readable landmarks:
  Ring = expedition tents/camp, ruins + lighthouse;
  Lagoon = coastal dock, sand/lily details and reed stands;
  Clover = violet crystal ring and standing stones; no common
  lighthouse/ruins on the latter two. Pine/broadleaf blend differs.
- Lighthouse ambience is hidden without the Ring lighthouse.
- Existing game state / backcompat unaffected; Three-only environment,
  no new dependencies, no per-frame mesh rebuild.
- New regression tests: `tests/world-map-stage-alignment.test.ts`.
  **Manual screenshot QA on Android required; do not claim screenshot
  parity based on CI alone.**

## IMPLEMENTED 2026-11-07 — stage-aware world scenery V2

- The selection RING / LAGOON / CLOVER now changes the **terrain,
  shoreline, coast cliffs/skirts, instanced plants, water colors and
  waterfall**, not only the path tiles. Pure shape math remains in
  `src/engine/map-shapes.ts`. `stageRadialScale(angle,shape)` is a
  shared ray/board-conformal shoreline scale, applied to the heightfield
  and all coastal layers. `src/client/world-map-three.ts` owns stage
  switching and rebuilds scenery ONLY when shape changes.
- `src/client/world-map-terrain.ts` exports backward-compatible
  `terrainRadius(angle,shape='RING')`, `terrainHeight(x,z,shape)`,
  `createTerrainMesh(shape)`, `createSurfBand(shape)`,
  `addTerrainDetail(root,shape)`. The default Ring output remains
  the 28-tile fallback design.
- `world-map-waterfall.ts` now drapes the cascade on the current
  terrain (not above a disconnected layered cliff) and adjusts its
  source by stage. Its pool/foam remain at the shared central lagoon.
- `world-map-water.ts`: `ocean.setShape(shape)` resamples shoreline
  shimmer and re-colors the shallow sea once per stage, while reusing
  existing wave vertex buffers. No new per-frame geometry allocations.
- Low-cost instanced pale coastal shells/reeds (Lagoon) and mossy
  rocky features (Clover) provide visible differentiation.
- `siteWorldPosition()` and robot/site anchors read the chosen
  terrain height to prevent floating expedition markers.
- Existing rooms without `shapeId` remain RING. Gameplay, Gallery
  colors/numbers, robot destination IDs, reverse effect and shop rules
  are UNCHANGED. No original-game terrain copies or unverified claims.
- `tests/world-map-stage-visual.test.ts` covers shore spacing, scene
  mesh topology, waterfall attachment, water reuse and map shapes.
  CI/Cloudflare are separate from required real Android screenshot QA.
- Further work: richer hand-authored per-stage landmarks, terrain
  thematic diversity, visual inspection of mobile waterfall/parallax.



## IMPLEMENTED 2026-11-07 — selectable stage route silhouettes

- Host now selects `RING`, `LAGOON` (wide oval) or `CLOVER`
  (four-lobed path) independently of 3/4/5 Gallery count in the
  mobile-friendly lobby. A live SVG path preview is derived from the
  same immutable mathematical geometry used at game start.
- Server validates `START.mapShapeId`, persists the chosen value in
  `state.board.shapeId` and defaults to `RING` for older generated
  boards and pre-upgrade/legacy 28-cell rooms.
- `src/engine/map-shapes.ts` is the ONE source of truth for the periodic
  loop path and frame/tangent/outward normal. `src/client/world-map-board.ts`
  builds colored tile meshes, side walls, trim, start/shop symbols and
  Gallery 3D numerals from it. `world-map-three.ts` positions
  avatars, robots and interactive tile polygons using identical
  shape geometry. `world-map-geometry.ts` maps the same path into
  Phaser fallback; `world-map.ts` passes the shape ID.
- Stage shapes are **Treasure Bots original-inspired variants**, NOT a
  verified copy of any particular original Glint Glitters map. Island
  terrain, waterfall, World Map scenery and expedition spots remain
  the shared stage. Different island terrain themes and non-loop
  topologies need a separate future implementation.
- Game rules, Gallery numbering, B-B/G-G/Y-Y/M-M fair distribution,
  dice order, timed reverse effect and robot missions remain unchanged.
  Read `docs/MAP_SHAPES_V1.md` for geometry and Android verification.
  CI success does NOT establish visual correctness on a mobile device.



## 2026-11-07 Reverse Direction M04 — IMPLEMENTED (Android QA needed)

- Server event resolver now has a **provisional fourth event outcome**
  that activates global REVERSE (dice/event probability is provisional).
- Normal forward movement (logical +1) appears right→left. While
  REVERSE active, server moves -1 per step, visually left→right.
  Shop pass-through, START crossing, Gallery arrival and replay-safe
  END_TURN state transitions retain the same authoritative logic.
- On event trigger, set `state.reverseEffect = {triggerPlayerId,
  remainingCycles:3,durationBasis:'TRIGGER_PLAYER_CYCLE'}`; **immediate
  activation** and all players affected.
- On next turn start for THAT trigger player, decrement once. Expires
  before acting on their third return (2P→next 2P→next 2P→next 2P).
  Do not decrement on each individual player action or 1P turn.
- Any subsequent EVENT cancels/replaces previous reverse and may
  start a new instance. The exact event table and occurrence rates
  are still provisional, not proven from original Glint Glitters.
- `state.movementDirection` records the direction for the roll
  *before* landing-event resolution. Board View Three/Phaser and World
  Map Three actors use this captured direction for correct travel
  animation even if the final EVENT reverses the NEXT player's route.
- Event timer, source and direction survive Durable Object snapshots,
  reconnect and CPU players. See `tests/reverse-direction.test.ts`.
- Manual Android check required: reverse travel & robot facing in both
  views, wraparound, shop interruption, CPU turns, and expiry.
- Other existing effect types do NOT automatically use trigger-based
  duration; each effect must declare its basis.



## In progress: 4-player match setup & selectable victory (2026-11-07)

New configured matches (START with galleryCount/winningRule) MUST fill
exactly **four 1P–4P seats**, with humans or CPU; empty slots auto-fill
using CPU count in the lobby request. Seat order is saved and sorted on
START, never randomized. Each human has server-validated pre-match
`SET_PROFILE` for distinct slot, color from P1 blue/P2 green/P3
magenta/P4 yellow, and H01–H04 chibi avatar variants. No other user
can change your profile or claim a seat/color already taken.
Existing saved players default to their stored color; they are not
recolored. Legacy unconfigured START messages remain supported for
old-room/test compatibility (these older rooms may contain two players).

Host selects **WEALTH_TARGET** (first reaching threshold) or
**TURN_LIMIT** (after N complete 1P→1P rounds, richest wins).
Equal top wealth ends in a draw (provisional, not an original rule).
Win selection is persisted and all validation/scoring happens on server.
Four avatar variants are original procedural headwear on the same
base chibi model (not four bespoke character models).
Selected winning-rule bounds: 1–500 rounds, or 1,000–10,000,000 G.

**Map shape / stage designs remain unimplemented**. The existing
3/4/5-gallery choice changes only gallery count and circular/ring
size, not the island topology or a different stage shape. The original
has multiple stage shapes; plan immutable `mapShapeId` separately
from `galleryCount`, define actual visual tile paths/3D anchors,
and synchronize World Map and Board View before presenting shape choices.
Do not imply multiple map shapes exist yet. Keep mobile/android QA.

**Global reverse event M04 is still NOT implemented.** Its timing is
trigger-player anchored. Continue separately after lobby/goal release.



## IMPLEMENTED — configurable 3/4/5 numbered Gallery maps (2026-11-06)

- Host selects **Small / Medium / Large** in Lobby before START. A new
  `START.galleryCount: 3 | 4 | 5` creates and persists immutable
  `state.board` with 29 / 38 / 47 tiles respectively. Every Gallery
  No.N has exactly **8 contiguous GALLERY spaces**, shared visual
  order **1P blue x2, 2P green x2, 4P yellow x2, 3P magenta x2**.
  Gallery number is independent of player identity and display ownership.
- New `src/engine/board-layout.ts` builds layouts; all rules use
  `boardTiles(state)` and `galleryNumberAt(tile,state)`, replacing
  static `TILES.length` assumptions where needed.
- World Map 3D ring rebuilds meshes and Gallery glyphs on map changes;
  3D actor positions, camera projection and Phaser fallback all use the
  persisted number of tiles. Board View and Gallery modal use the same
  server-owned map, player palette and gallery count.
- SPECIAL spaces (START, SHOP, EVENT, SUPPORT) have provisional
  placements, not a verified original game route. All current economics
  and shop pass-through behavior remain authoritative on the server.
- **OLD ROOMS** without `state.board` keep the previous 28-cell,
  5-Gallery layout; they are NOT renumbered/recolored/reset by new map
  code. Omitting START.galleryCount in legacy tests also opts out.
- Other agreed future features STILL NOT IMPLEMENTED: selectable
  avatar/color and slot order UX, selectable wealth/turn-limit win
  condition, reverse-direction event and richer background art.
- Validate tests and Cloudflare build, then MANUALLY verify Android
  (3/4/5 maps, Gallery digits on 360° World Map, wraparound and robot
  paths). Do not equate successful CI with proof the phone renders well.


## IMPLEMENTED: 2026-11-06 visual phase 1 (Android QA still needed)

- `src/engine/player-palette.ts` provides default P1 blue, P2 green,
  P3 magenta, P4 yellow and Gallery tile order blue→green→yellow→magenta.
  Per-gallery distribution is equal. On the existing 28-tile layout,
  this is **one Gallery tile per color per Gallery No.**, not two;
  fulfilling two tiles per color requires the still-pending larger
  map / variable-gallery-count engine refactor.
- Fresh players use the P1–P4 colors, saved players' colors are unchanged.
  Player-choice lobby, victory-mode settings and reverse-direction
  events are NOT implemented by this visual phase.
- In Three.js Board View, incrementing logical position renders to
  negative screen X (right-to-left advance), while the scenery slides
  right. Avatar AND companion robot use their `walk` AnimationMixer
  clips and face left while traveling. Phaser fallback reverses tile
  presentation too. Both World Map renderers use the same Gallery colors.
- Shop/Start/Event/Support remain independently styled special cells
  rather than being incorrectly associated with a particular player.
- Run CI and manual phone QA before claiming complete original parity.

## Approved 2026-11-06 Board View correction — READ FIRST

User corrected earlier review: the **base tile colors are player identities**:
P1 **blue**, P2 **green**, P3 **magenta**, P4 **yellow**. Colors are NOT
inherently Shop/Gallery/Event/Start/Support category colors, and Gallery
No.1 is NOT Player 1. Distinguish tile type through numbers/frames/icons/FX
on top of the player-colored base. Do not infer exact tile→player assignment
from the screenshots: that mapping is not confirmed.

Normal advancement must be presented **right to left** in Board View,
while engine/TILES order and gameplay rules remain authoritative and
unchanged. Shop/Gallery/encounter facades remain hidden while traveling and
only appear on a matching landed tile. HD/stylized (not necessarily PS1).

**Mandatory next-work task breakdown:** `docs/BOARD_VIEW_VNEXT_IMPLEMENTATION_PLAN.md`
(B01–B07). These tasks are **not yet implemented**; prior type/color-based
`boardVisualColor()`, `GALLERY_COLORS` and engine `COLORS` currently do
not match the corrected design. Fix them in a staged, testable update after
resolving the exact tile→player association. Preserve existing Three.js,
Phaser fallback and production flow via direct main commits.



## CONFIRMED 2026-11-06 TURN RULE (highest priority)

- Before the match, assign available slots **1P, 2P, 3P, 4P**.
  Turns occur in **1P→2P→3P→4P→1P** slot order (skip empty slots);
  **NO randomized/dice order**. Choice of avatar and player color
  happens before match and is independent of slot and Gallery No.
- **1 turn = 1 entire round**, from the beginning of 1P's action
  until 1P becomes active again; every occupied slot acts once.
- **CORRECTION: effect-specific duration is anchored to the player who
  TRIGGERS that effect.** For global reverse triggered by 2P,
  2P→next 2P = 1 effect turn, after 3 returns to 2P the
  effect expires before 2P acts; activation is immediate. Only the
  **match round/win-limit counter** is 1P→1P. Do not apply trigger
  anchoring to every effect automatically; declare per-effect basis.
- Source of truth: `docs/MATCH_SETUP_AND_DIRECTION_RULES.md`. These
  are APPROVED rules, but gameplay changes are NOT YET IMPLEMENTED.

## Match Setup / victory / direction — verified research + NEW pending work

- Read `docs/MATCH_SETUP_AND_DIRECTION_RULES.md` before altering lobby,
  turn order, player colors, win conditions or board movement.
- User wants pregame avatar + color selection (4 base colors), and host
  choice of fixed-round highest-wealth win or target-wealth first win.
- Original Glint Glitters Japanese-language reference confirms versus
  win rules by turn count or assets and a global `逆回り` (reverse)
  event lasting **three turns or until the next event**, moving
  left-to-right rather than normal right-to-left.
- Original dice-rolled order is historically unverified and not needed:
  user has **selected fixed slot order** (1P→2P→3P→4P).
  Reverse effect counts 3 full cycles of the TRIGGER PLAYER
  (not necessarily 1P); immediate activation and expiry at the third
  trigger-player turn start are confirmed. Current code uses
  join-order turns and static WIN_ASSETS=20_000.
- Keep player COLOR and AVATAR independent from seat/turn order and
  Gallery number; the 3-/4-/5-Gallery board mapping remains provisional.
- **All match setup / reverse tasks M01–M06 are documentation/planning only,
  NOT implemented.** Preserve the current game until server, UI and
  regression tests ship together.

Read this FIRST before changing assets or gameplay. The older README describes v0.2 and is stale. This note summarizes user-confirmed decisions as of 2026-11-06.

## Mandatory reference order
1. docs/GALLERY_SYSTEM_SPEC.md — final user-confirmed rules.
2. docs/WORLD_MAP_ASSETS_V1.md — corrected art/rotation direction.
3. docs/GAP_BACKLOG.md — implementation gaps and roadmap.
4. docs/FAITHFUL_REBUILD.md — older gameplay research, distinguish verified from provisional.

## Latest visual implementation
- Read `docs/WORLD_MAP_V5.md` for the opt-in Three.js V5 model pipeline, animation/state contract, performance budgets, verification and remaining Android QA.
- `world-map-models.ts` is the source for generated glTF; regenerate and test both assets after changing it. Never change server rules to drive cosmetic animation.

## Numbered Gallery System — implementation/handoff

- Read `src/engine/gallery.ts` for **provisional** five-number / four-tiles-
  per-number board mapping; same helper drives Three and Phaser labels.
  Do NOT assert that tile positions or original fee details are verified.
- `Gallery.displaysByPlayerId` holds independent 10-slot collections per
  player in each numbered Gallery, replacing the old single `ownerId`.
- Robot delivery prompts gallery selection irrespective of tile location;
  full Gallery requires replace + immediate server sale or sale of newly
  returned loot. Reordering is limited to the matching Gallery tile.
- Existing old-room Gallery arrays migrate to the new schema; overflow
  historical items return to inventory. See docs/GALLERY_SYSTEM_SPEC.md.
- Treasure Sets and cross-gallery transfers are still open/unverified.
- Gallery dialog lives in `src/client/gallery-dialog.ts`; server, UI,
  Three board digit meshes, Phaser fallback and bot action tests all use
  the numbered mapping. Keep no-numbered-gallery-buildings rule.

## Critical correction (confirmed by latest PS1 screenshot)
- Gallery No.1/2/3 etc are NUMBERS DIRECTLY ON COLORED PERIMETER BOARD TILES. They are NOT buildings inside the island.
- Previous AI-generated concept with Gallery No.1–5 landmark buildings inside the island is INCORRECT; do not reuse it as geography.
- Gallery building/facade may appear in a separate close-up board/event scene when standing on gallery tile, but not as a numbered landmark on World Map.
- Each numbered Gallery contains a per-player collection area of MAX 10 items; up to four players each have their OWN 10 slots at Gallery No.N.
- When the robot RETURNS with new treasure, owner chooses the Gallery number for placement even while avatar is elsewhere. Do not auto-use first open Gallery.
- Rearranging displayed items requires the avatar to be on the board tile for that Gallery number.
- When chosen player Gallery is full (10/10), either replace ONE existing item (the displaced item is immediately SOLD and never stashed or transferable) OR sell the new incoming treasure directly. The replace+sell transaction must be atomic, server-owned, replay-safe.
- Treasure Sets within one Gallery can yield bonuses, but their catalog/bonus formulas and resale amounts remain unverified/provisional.
- Robot mission launchTile A is immutable after dispatch, even if player moves to B (PR #14).
- Two separate UI views: Board screen (dice/End Turn/shop) and World Map (energy, rotate, destinations/robot). NO dice, End Turn or permanent turn report in World Map.

## World Map art instructions
Use ONE coherent 3D/layered island master scene and derive all camera rotations (0/90/180/270) from it. Never independently generate 4 unrelated views pretending to rotate. Keep 100% of colored perimeter path visible with margin; markers, Gallery numbers, ownership, players, robot routes and HUD are DYNAMIC OVERLAYS from game state. Do not bake labels/characters into background.

## HD Three.js Board View renderer
- Read `docs/BOARD_VIEW_THREE_HD.md` for implementation, rollback and Android QA.
- Board View **and** World Map use Three.js by default, without query
  parameters. `?board2d=1` forces legacy Phaser Board View; `?map3d=0`
  forces legacy Phaser World Map. These opt-outs persist through room URLs.
  Existing `?map3d=1` links also work, but are no longer required.
  If WebGL fails, the corresponding view falls back to Phaser automatically.
  No new buttons or controls were added.
- Main Board is a close-up with raised white Gallery NUMBER plates, colored
  lower panels, chibi GLTF actors, Gallery/Shop facade, and biomes. Gallery
  facade is permitted in Board View only, never as a numbered World Map site.
- No requirement to keep PS1/low-poly pixelation: user approves polished HD
  graphics; prioritize clarity, cohesive lighting and Android performance.
- Renderer consumes existing authoritative GameState, galleryNumberAt(),
  and old movement tweens. Do not duplicate turn/shop/Gallery logic in Three.

## Board View first-frame and encounter visibility guardrails

- `board-three-pending` is a loading veil to prevent the old Phaser Board
  scene flashing before lazy Three.js initialization. Remove only on first
  successful Three frame or actual import/WebGL failure; keep Phaser fallback.
- Gallery/Shop/Event/Support buildings in close-up Board View must only be
  shown once the active player has **stopped** on the matching tile. During
  a server-authoritative movement tween the destination may already be
  known, but landmarks must stay hidden. See `stoppedEncounterTile()`.
- Scenic parallax is independent of encounter architecture. Do not place
  permanent gallery buildings on the World Map.

## Engineering guardrails
Stack: TypeScript, Phaser 3, Cloudflare Workers/Durable Objects. Server authoritative; respect persistent state migrations and multiplayer reconnection. Avoid full Phaser scene reconstruction per animation frame; preserve Android fullscreen width/canvas hotfix. Run smoke/unit/typecheck/build and manual phone visual checks. Do not assume GitHub merge confirms Cloudflare deployment. Original assets only: do not copy proprietary PS1 pixels, sprites, audio or code.
