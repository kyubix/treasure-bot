# Board View — Next Implementation Plan (Player Colors, R→L, HD Polish)

Status: **APPROVED DESIGN CONTRACT + TASK BREAKDOWN; NOT YET IMPLEMENTED**.
Updated: 2026-11-06. Reference: user-provided screenshots of the original
Glint Glitters close-up Board View, mini-board, robot shop, recovery/ticket
screens, event panels, character/robot movement, and gallery/shop entrances.
These screenshots are **visual/mechanical references**, not reusable assets.

## Non-negotiable user corrections

1. **Base board tile colors represent PLAYERS, NOT tile types or Gallery numbers.**
   Player slot 1 = BLUE, slot 2 = GREEN, slot 3 = MAGENTA, slot 4 = YELLOW.
   Example UI palette (proposed hex only, adjust through Android review):
   `P1 #2489EA`, `P2 #44C767`, `P3 #E254C5`, `P4 #F5CF32`.
   Color identity/order is confirmed; exact hex/shading is not.
2. **Gallery number is an independent property** shown in large black digits
   on the white/light top plate. Gallery numbers do NOT encode a player.
   The existing `galleryNumberAt(tileIndex)` mapping is still PROVISIONAL.
   Do not interpret Gallery No.1 as Player 1.
3. **Tile type is independent of the base color**. START, SHOP, EVENT,
   SUPPORT, GALLERY, PLAIN get distinguishing icons, badges, frames,
   dedicated arrival scenes or FX; these do not silently replace P1–P4.
   Exact original category-specific graphics/rules need verification.
4. **When advancing, the avatar must visually move RIGHT → LEFT** in the
   close-up Board View. Keep the authoritative server's positive/wrapping
   TILES index and correct intermediate dice steps; never reverse game
   progression or charge/trigger encounters in reverse order to fix visuals.
5. **Buildings/facades show only on a matching landed tile after movement
   stops**, as already fixed by `stoppedEncounterTile()`. A parallax biome
   backdrop is NOT an encounter landmark. Do not regress the async Three.js
   boot flash fix or the Phaser/Android fallback.
6. Art direction: polished/HD stylized allowed, not mandatory PS1/low-poly;
   create original graphics and geometry, not extracted proprietary assets.

## IMPORTANT unknown — do not fabricate a tile→player mapping

The supplied screenshots and user confirmation establish the P1–P4
palette, but **do not yet unambiguously establish which individual board
tile belongs to which player**, nor what colors special/unassigned cells
should have. `state.players` order identifies players, and the server's
current `Gallery.displaysByPlayerId` is a multi-player collection, NOT
exclusive per-tile ownership. A tile index, tile category, Gallery No.N,
or a player's temporary location must **never** be treated as proof of
ownership.

Before wiring base-cell colors, audit/verify the source of that
association. Implement a single explicit visual mapping (for example
`playerSlotForTile(tile,state): 1|2|3|4|null`) only after authoritative
game evidence or the user's confirmation. Unknown/unassigned cells
should use a clearly documented neutral material, not a made-up player.
Do not change persisted room state to support an unverified color rule.

## Concrete implementation tasks (in dependency order)

### B01 — [P0] Separate player palette from tile semantics

**Files:** `src/engine/game.ts`, `src/engine/types.ts`,
`src/engine/gallery.ts`, NEW `src/client/board-visual-rules.ts`,
`src/client/board-view-three.ts`, `src/client/world-map-board.ts`,
`src/client/board.ts`, `src/client/world-map.ts`.

- Create one source of truth `PLAYER_SLOT_COLORS` (P1 blue / P2 green /
  P3 magenta / P4 yellow). Do not use `GALLERY_COLORS[number]` as ownership.
- Current audit finding: `src/engine/game.ts` has `COLORS =
  ['#69d7ce','#f4be70','#dba5ed','#94abfa']`, in the wrong P1–P4
  order. Plan a room/lobby color migration or a presentation adapter
  before changing stored `Player.color`; test bots, room reconnect,
  and existing persisted rooms explicitly.
- Current audit finding: `boardVisualColor(index)` currently maps
  `galleryNumberAt()` / `TILES[index]` to the base material. That MUST
  be refactored. Keep Gallery number and tile kind separately in
  `TileVisualState`.
- Ensure World Map, Board View, mini-board strip, player avatars,
  robots, scoreboard and fallback Phaser agree on P1–P4 identity.
  No gameplay action/state mutation from this rendering change.
- **Blocker:** exact per-tile player association is unverified; do not
  assign every 4th tile to a player or infer via Gallery number.
- **Acceptance:** P1..P4 palette unit tests, all renderer consistency
  tests, no Gallery number↔player coupling, no older room color corruption.

### B02 — [P0] Right-to-left presentation of forward movement

**Files:** `src/client/board-view-three.ts`,
`src/client/board.ts`, `src/client/board-view-three.css`,
`tests/board-view-three.test.ts`, NEW movement tests.

- Introduce a tested mapping from logical progress/tween to screen X,
  enforcing `forward step => next tile visually LEFT of previous tile`.
- Keep server's `TILES` ordering and `roll/step` computation unchanged;
  do not just subtract server positions or reverse the game array.
- Make character facing direction, walk clip orientation, robot follow
  formation and lower mini-board strip agree. Allow camera smoothing, but
  screen movement must be perceptibly right→left, not a permanently fixed
  character with a conflicting label strip.
- Handle 27→0 wrap, one step, multiple dice steps, shop interruption,
  CPU movement, reconnect, reduced-motion and view switching.
- Never show Gallery/Shop facade during intermediate travel; only at
  completed landing according to current gameplay rules.
- **Acceptance:** integration tests with recorded X coordinates strictly
  decreasing across visible forward steps, no duplicate/skipped step
  triggers, start/end indices unchanged.

### B03 — [P0] Faithful two-level, readable HD tiles

**Files:** `src/client/board-view-three.ts`,
`src/client/world-map-board.ts`, `src/client/board.ts`,
`src/client/world-map.ts`, visual-rule module.

- Upper row: light/white number plate with sharp large black digits.
  Lower row: player-associated base color P1/P2/P3/P4 when mapping is
  known. Use distinct trim/icons for START, SHOP, EVENT, SUPPORT,
  GALLERY and other special cells (not color alone).
- Gallery No.N can repeat on neighboring board cells, and remains
  separate from the four player colors. Start/shop/event iconography
  does not imply ownership. Keep the mini-strip in the same order.
- Device scale: legible at 360px portrait with sufficient text contrast;
  ensure smooth Android render and no board clipping at 360° World Map.
- **Acceptance:** user-approved screenshots at 360px/Android portrait,
  visible white numbers / player colors / special-type badges, consistent
  Three and Phaser fallbacks.

### B04 — [P1] Richer original HD scenic backgrounds

**Files:** `src/client/board-view-environment.ts`,
`src/client/board-environment.ts`, `src/client/board-view-three.ts`.

- Layer sky/horizon, distant cliffs, jungle/trees, water, rocks, midground
  and subtle foreground vegetation; animate gentle parallax.
- Build biome-specific scenes rather than moving a shop/gallery building
  behind the character during travel. Scenic assets are attached to
  biomes, encounter facades to the stopped player tile only.
- Original stylized-HD materials, coherent lighting and atmospheric fog.
  Budget with instancing, compressed/reusable assets, capped DPR/shadows,
  visibility-aware animation and Android memory checks.
- **Acceptance:** no visual pop/rebuild every small step, buildings do
  not chase the moving player, 30fps target on typical Android where
  feasible and fallback retained.

### B05 — [P1] Avatar/robot locomotion polish

**Files:** `src/client/board-view-three.ts`,
`src/client/world-map-models.ts`,
`src/client/world-map-actor-assets.ts`, movement tests.

- Avatar: real walk cycle, turn LEFT during forward travel, idle on stop,
  believable legs/arms/bob; smooth transitions via `AnimationMixer`.
- Companion robot: leg/hover/bounce and trailing position appropriate to
  robot type; move alongside owner only when no dispatched mission.
  Robot on expedition must not teleport back beside avatar.
- Use server position/tween as the sole movement authority; animations
  do not decide dice steps or turn outcome. Reuse existing GLTF rigs and
  a tested procedural fallback if assets cannot load.
- **Acceptance:** no static sliding, no duplicate model spawn, pause on
  background tab, cleanup/no memory leaks and stops on same final cell.

### B06 — [P2] Arrival/event UX, not fake buildings

**Files:** `src/client/board-view-three.ts`, `src/client/main.ts`,
`src/client/board-view-environment.ts`, UI/FX tests.

- Separate stopped-tile facades (e.g. Gallery/Shop) from temporary,
  state-driven overlays (e.g. recovery, ticket, reward, point-card,
  shop selection, robot stats). Screenshot examples show visual styles,
  NOT proof that all underlying mechanics currently exist.
- Add cosmetic effects only on real server-confirmed event/action,
  with clear dismissal timing and accessible/mobile-sized captions.
- Do NOT invent energy rewards, prices, special item effects, new
  cards, Gallery ownership, or transactions from reference screenshots.
- **Acceptance:** no popup during transit; no repeated reward animation on
  reconnect; no blocked Board/World buttons.

### B07 — [P0 release gate] Full regression + deployment

- `npm test`, `npm run test:unit`, `npm run build`; check current
  CI also covers typecheck and frontend build.
- Match the exact commit SHA to GitHub Actions AND Cloudflare Workers
  Build, then separately verify the live site on Android (build success
  alone does not prove deployed UI).
- Android: cold load (no Phaser flash), right→left forward travel,
  board and mini-strip parity, all P1–P4 colors, Gallery numbers,
  correct Shop/Start/Event/Special icons, moving vs stopped landmarks,
  multiplayer/bot turns, return robot, responsive resize, WebGL loss.
- Forced fallbacks: `?board2d=1` and `?map3d=0`; preserve existing
  360° drag in World Map. Never build a feature branch for this
  user's direct-mobile Cloudflare testing workflow: commit tested
  changes to `main` in small coherent increments.

## Implementation order / handoff

B01 color source audit & tests (resolve open mapping) → B02 direction →
B03 tile materials and special symbols → B04 backgrounds → B05 character
and robot animation → B06 arrival effects → B07 final QA. This file is
a **planning artifact only**; checkboxes are pending, not implemented.
Document new verified references before replacing any provisional rule.
