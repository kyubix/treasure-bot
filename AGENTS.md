# AI Agent Handoff — Treasure Bots

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

## Engineering guardrails
Stack: TypeScript, Phaser 3, Cloudflare Workers/Durable Objects. Server authoritative; respect persistent state migrations and multiplayer reconnection. Avoid full Phaser scene reconstruction per animation frame; preserve Android fullscreen width/canvas hotfix. Run smoke/unit/typecheck/build and manual phone visual checks. Do not assume GitHub merge confirms Cloudflare deployment. Original assets only: do not copy proprietary PS1 pixels, sprites, audio or code.
