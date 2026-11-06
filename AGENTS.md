# AI Agent Handoff — Treasure Bots

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
- Global reverse for **3 TURNS = 3 COMPLETE ROUNDS** of all players,
  NOT 3 individual player actions. The start boundary for an event
  triggered mid-round is still to be decided.
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
  Reverse effect lasts 3 full rounds; mid-round activation boundary
  is still open. Current code uses join-order turns and static
  WIN_ASSETS=20_000.
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
