# Gap Backlog — Treasure Bots

## 2026-11-07 perimeter/edge polish patch

- Updated world island edge meshes without touching match logic: corrected coast-to-board apron angle mapping; replaced flat 2-lane apron with 4 colour-blended terrain-following lanes; sculpted 6 progressively eroded rock strata and widened the foot; moved surf foam beyond the rock.
- Kept board-sealing top contour exact to avoid reintroducing exposed sea between numbered Gallery tiles and land. Added all-shape alignment checks and preserved fixed tile/click positions.
- **Pending:** CI build/test confirmation; Android screenshot comparison at 360° for Ring/Lagoon/Clover and 3/4/5 Gallery sizes, especially outer tile seam, waterfall, FPS, and touch controls. These are not verified by mesh tests alone.


## 2026-11-07 Android incident: dice ghost roll, blur, oversized island rim

- UI: pointerdown/up now must match a single dice-button pointer ID.
  Moving to World Map, returning to Board View or selecting Send Robot
  cancels pending gesture. Pointer-generated click cannot auto-ROLL.
- Quality: world Three.js renders at capped mobile DPR (1.5) instead
  of .85 pixel ratio; enable antialiasing and smooth CSS sampling.
  Board View 3D receives slight 1.65 DPR cap.
- Appearance: foundation vertical slab replaced by four layered,
  tapering PS1-style rock banks, keeping ocean below the under-wall
  and terrain/board apron sealed. No game economy changes.
- Tests: `tests/dice-intent.test.ts`,
  `tests/world-map-stage-alignment.test.ts`.
- Open: actual device multi-view touch regression (touch on World
  Map must NOT roll dice); compare 3/4/5 Galleries, Ring/Lagoon/
  Clover; inspect 360° edge, FPS, water animation and browser zoom.

## 2026-11-07 Mobile screenshot review — board / island geometry

- User observed blue ocean slivers between outer island wall and board,
  as well as minimal scenery differences between the selected map shapes.
- Replaced old island concentric-cliff stack by a solid continuous
  *board-following* stage platform, plus a terrain-to-board apron.
  Foam now sits outside the actual board-aligned wall.
- Distinct recognizable props: Ring camp/lighthouse, Lagoon coastal
  docks/reeds, Clover stone circle/crystals and stage pine mix.
- Need manual Android checks: rotate full 360° on 3/4/5 Galleries
  Ring/Lagoon/Clover, confirm no ocean between land and board and
  no overlap of island geometry over tile colors. Verify FPS and
  visual scale of props; scene still intentionally PS1-style.
- Important: open items still include original game shape parity,
  more handcrafted decorative props and waterfall smoothing.

## 2026-11-07 Stage-aware World Map V2 visual upgrade

- Ring/Lagoon/Clover now reshape **actual island terrain and coast**;
  synced skirt/beach/heightfield/foam geometry follows board shape.
- Distinct ridge height profiles, flora/rock tint and pooled waterfall
  routes by stage. No extra animated mesh generation per frame.
- Dynamic scene stage rebuild only on map change, with old resources
  disposed; animated sea reused via `ocean.setShape`.
- Regresion: `tests/world-map-stage-visual.test.ts`.
- **Pending** manual Android review: water/coast alignment, FPS,
  mountain overlapping any Gallery panels, waterfall plausibility,
  Phaser fallback differences, mobile old-room behavior.



## 2026-11-07 Map shape V1 — implementation complete, Android QA pending

- **M-SHAPE-V1** selectable independent stage silhouettes:
  `RING` classic, `LAGOON` oval, `CLOVER` four-lobed loop.
  Shapes are server-persisted, independent of 3/4/5 Gallery count
  and rendered consistently by World Map 3D, actor/robot anchors,
  interactive tile polygons, Gallery digits and Phaser fallback.
- The lobby now includes a shape selector and vector silhouette preview.
  All ring/shape geometry uses `src/engine/map-shapes.ts`; saved
  rooms without a shape default to `RING`. Gameplay rules unchanged.
- **Still outstanding:** original-specific map designs, different
  island landforms and waterfall/terrain backgrounds per stage,
  more complex non-loop paths, mobile screenshots and device QA.
  Do not call the three geometries exact original game maps.
- Verification: `tests/map-shapes.test.ts`, all smoke/unit tests,
  TypeScript/build, Cloudflare, and actual Android visual review.



## 2026-11-07 Reverse Direction — implemented, manual QA pending

- M04: global reverse event, server-owned 3-cycle trigger-player timer,
  immediate activation, next-event cancellation/replacement and
  backward tile traversal implemented. No dice-order shuffle.
- M05: Board View travel tween and character/robot facing adapt to
  captured server direction; World Map Three actor route handles
  backward traversal. HUD shows reverse source/remaining cycles.
- Tests for trigger 2P, 3 completed 2P cycles, next-event cancellation
  and backward wrap. Original event frequency **provisional**.
- Map shape variations still outstanding; ring is the only actual
  topology for current 3/4/5-gallery choices.
- CI and Android visual QA required before declaring full parity.



## 2026-11-07 New confirmed scope and delivery status
- **Four seats mandatory** for configured new matches; fill 1P–4P
  with humans and/or CPU. Old 28-tile/unconfigured room compatibility
  retained. Lobby selection of slot/color/avatar + server unique
  validation implemented (code release requires CI/Android QA).
- **Victory setup implemented:** Wealth target or fixed N full rounds,
  highest net worth after last 4P turn; ties are drawn.
- **AVATAR H01–H04:** original model variants via low-cost procedural
  chibi accessories; full character catalog is a later task.
- **MAP SHAPES OUTSTANDING:** 3/4/5 Galleries currently all ring layouts.
  User explicitly confirms original game has multiple map shapes;
  must implement selectable map topology and different tile positions
  separately from Gallery count. Do NOT claim multiple stage shapes.
- **REVERSE M04 OUTSTANDING:** global reversal for three cycles anchored
  to triggering player's turn; not yet playable.



## Dynamic map selection — implemented phase 2 (2026-11-06)

- Host selects 3, 4 or 5 numbered Galleries in the lobby; each
  Gallery group uses 2x Blue, 2x Green, 2x Yellow, 2x Magenta.
  29 / 38 / 47 board spaces including START / provisional special cells.
- GameState.board is serialized for new games; old 28-tile rooms remain
  unchanged. All board visual layers and robot path calculations now
  use the board count from state. Shared Gallery row capacity remains
  ten treasures per player per numbered Gallery.
- Special tile placement still provisional; winning goals, pregame
  avatar/color/seat choice, reverse events and HD background still TODO.
- Requires manual Android viewport and gameplay QA even with green CI.


## New planned match mechanics (M01–M06) — 2026-11-06

Source and architecture: `docs/MATCH_SETUP_AND_DIRECTION_RULES.md`.
- M01: players select colors and avatar before match; keep identity/color
  independent of match turn order, Gallery No.N and board tile position.
- M02: host picks (a) fixed rounds then wealth ranking, or (b) first
  player to reach goal wealth. Original versus game supports both
  categories; numeric presets/ties still pending decisions.
- M03: **user settled deterministic slot order 1P→2P→3P→4P**,
  selected before match (skip unoccupied seats); do NOT randomize
  or roll dice to determine order. Original historical rules not verified.
- M04: global reverse **逆回り** targets ALL players. User corrected
  event timer: **3 cycles anchored to the triggering player**,
  e.g. 2P triggers → next 2P (1) → next 2P (2) → next 2P (3, expire
  before acting). Activates immediately, cancels/replaces on next
  qualifying event. Match turn/win-limit remains 1P→1P. Other effects
  may use different explicit duration bases. Needs server persistence,
  replay-safe countdown and tests. **Not implemented yet.**
- M05: sync reversed path, actor direction/robot and both Three/Phaser
  renderers. Server tile order and rules are authoritative.
- M06: tests, older-room migrations, bots and live Android/Cloudflare
  verification. **STATUS: DESIGN ONLY, NOT IMPLEMENTED.**


## Approved Board View corrections / next planned tasks (2026-11-06)

- **B01 [P0]** Player palette: P1 blue, P2 green, P3 magenta,
  P4 yellow. Base panel colors are player-related, **not** tied to
  Gallery number or Shop/Start/Event/Support type. Existing engine
  `COLORS`, `boardVisualColor()` and `GALLERY_COLORS` need separation.
  Exact tile→player association is **unverified**; don't fabricate it.
- **B02 [P0]** Visual step progression must be right→left on the
  close-up Board View; keep the server TILES order/roll mechanics untouched.
- **B03 [P0]** Large Gallery/board numbers on white top plates, player
  colors on lower panels, special-category identity via icons/trim/FX,
  never use color alone as a tile-type legend.
- **B04 [P1]** Original high-quality HD multi-depth background by biome.
  Do not move encounter facades with the avatar.
- **B05 [P1]** Avatar walk/idle and robot trailing/hover/walk synced to
  authoritative tween; face forward left in Board View.
- **B06 [P2]** State-confirmed arrival overlays (ticket/recovery/etc.)
  separate from permanent scenery; screenshot is not proof of game rules.
- **B07 [P0]** CI, Cloudflare build + real Android tests, room recovery,
  multiplayer, Phaser fallback, World 360° drag.
- Technical file-level details, acceptance tests, dependencies and open
  questions: `docs/BOARD_VIEW_VNEXT_IMPLEMENTATION_PLAN.md`.
- **Status: PLAN ONLY.** None of these corrections is marked implemented.


Updated 2026-11-06. Read AGENTS.md, docs/GALLERY_SYSTEM_SPEC.md and docs/WORLD_MAP_ASSETS_V1.md before coding.

## Numbered Gallery implementation — 2026-11-06
- G01–G04: implemented as a first playable pass, including provisional
  No.1–5 repeated board tile mapping, per-player rows of ten items, explicit
  destination choice, full-gallery replace+immediate sell or direct sale,
  and server-side replay/ownership checks.
- G05: in-gallery reorder implemented and restricted to standing on a matching
  numbered board tile; cross-Gallery rearrangement remains unverified.
- G06: Treasure Set catalog/bonus mechanics **not implemented** without
  verified source data.
- Older exclusive-gallery room state migrates on load; any over-capacity
  historical treasures are preserved in player inventory.
- These notes supersede the status of G01–G05 in the historical backlog below;
  mapping and economic assumptions remain provisional.

## P0 — blocked on new model / must fix
- G01: NO numbered Gallery IDs in perimeter TILES. Add Gallery No.N numbers on board cells. Exact tile-to-number mapping still to be verified.
- G02: Gallery currently has exclusive ownerId + one displayed array. Replace with 10-slot collections PER PLAYER PER numbered Gallery.
- G03: DISPLAY_TREASURE auto-selects first free owned Gallery. Robot-return treasure requires explicit Gallery number selection regardless of avatar location.
- G04: Full 10/10: replace selected old item, immediately auto-SELL old in atomic server transaction; OR sell incoming treasure. Never transfer replaced old item to another Gallery.
- G05: Rearrange displayed items only when avatar occupies tile of that Gallery number.
- G06: Treasure Sets and in-gallery set bonuses absent; exact rules catalog unverified.
- W01: World map artistic level remains prototype; four consistent asset views must derive from one source master and maintain uncropped path.
- W02: Previous AI illustration wrongly put Gallery No.N buildings in island. This is rejected. Gallery numbers are on BOARD perimeter cells.

## P1 — further gameplay
- R01 DONE: Robot dispatch origin A persisted as launchTile; owner moves to B without changing robot path (PR #14).
- R02 PARTIAL: Robot terrain, energy, troubles, encounters and retargeting still provisional.
- R03 NOT DONE: Temporary beginning-of-turn robot report; not permanent World Map footer.
- S01 PARTIAL: Shop choice/entry animation and provisional catalog.
- C01 PARTIAL: Multi-step bot animation and mobile polish.
- M01 KEEP: Android fullscreen flex/canvas width hotfix and lightweight dispatch portal.
- E01 UNKNOWN: Exact Gallery visitor fee, resale formula, Treasure Set bonuses, special modifiers.

## Proposed order
1. Finish numbered Gallery-to-tile map specification; do NOT introduce island Gallery buildings.
2. Establish a single structured island scene with stable numbered tile anchors and full-path safe zone.
3. Export matching four map views and test all tile positions on Android.
4. Migrate persistent gallery state and server commands with transactional validation and backwards compatibility.
5. Implement UI to choose Gallery on robot return, 10/10 replace/sell, location-gated rearrange.
6. Add Treasure Set bonuses after authoritative data is available; end-to-end QA of all angles and multiplayer snapshots.

## Validation protocol
Use PR branch, npm test, npm run test:unit, npm run build, manual Android viewport and gameplay tests. GitHub merge != confirmed Cloudflare deployment.
