# Match Setup, Winning Goals and Reverse-Direction Events

## 2026-11-07 Stage route shapes (new implementation)

`START.mapShapeId` selects a validated stage loop independently of
the 3/4/5 Gallery layout. Valid shapes are `RING`, `LAGOON`,
`CLOVER`; the immutable choice persists in `GameState.board.shapeId`.
Saved rooms without `shapeId` use the classic RING. Shared
`boardPathFrame` and `boardPathQuad` make 3D meshes, character
movement anchors, Gallery numbers, hit polygons and Phaser fallback
consistent. No original-specific landform or artwork is claimed.
See `docs/MAP_SHAPES_V1.md` for user-facing controls and tests.


## 2026-11-07 Reverse Direction implementation (M04/M05)

Code shipped in `src/engine/game.ts`, `src/engine/types.ts`,
`src/client/board.ts`, `src/client/board-view-three.ts`,
`src/client/world-map-actors.ts`, `src/client/main.ts` and
`tests/reverse-direction.test.ts`.

**Authoritative state:** `reverseEffect` persists source player ID,
three remaining trigger-player cycles and explicit duration basis.
`movementDirection` records the direction of the just-resolved
roll (+1 normal, -1 reversed). The next player-turn start for the
triggering player decrements the effect; the third such start expires
before the player can act. A new EVENT cancels/replaces the modifier.

**Trigger:** Provisional fourth random EVENT outcome (25% of Event
outcomes) activates Reverse immediately; the previous reward/loss/
maintenance outcomes remain present with revised probabilities.
Event trigger rates are NOT verified from the original game; they
must remain labeled provisional and can be rebalanced later.

The legacy board follows the same rules; alternate map shapes remain
unimplemented. Unit tests cover 2P-anchored timer, reverse movement,
backward wrap, next-event cancellation, and automatic restoration.



## 2026-11-07 Implementation progress and updated requirements

**Confirmed by user:** Every NEW match requires four player slots
(1P→2P→3P→4P), filled with humans and/or CPU players. No 2-player
match mode in the new lobby. Original game also has multiple MAP
SHAPES, not merely Gallery counts. Current choice of 3/4/5 Galleries
still uses one circular/ring-shaped map. Actual alternate geometries
and verified stage layouts are a SEPARATE outstanding workstream.

**Implemented in new match-setup code:**
- `SET_PROFILE`: each human can choose a unique 1P–4P slot, a unique
  blue/green/magenta/yellow player color and chibi avatar H01–H04
  during lobby. This is saved atomically to GameState with versioning;
  colors and slot ownership are server-validated.
- Host starts a configured match with exactly four occupants,
  automatically filling remaining seats with CPU, sorting by slot,
  and persisting the winning condition. Old/unconfigured START payloads
  retain two-player compatibility solely for previously saved rooms.
- WinningRule: `{kind:'WEALTH_TARGET',amount}` or
  `{kind:'TURN_LIMIT',rounds}`. Wealth target winner is checked after
  authoritative actions; fixed-round mode checks at the END of the
  final complete 1P→1P round. Equal top wealth = DRAW (provisional).
  Numeric input bounds: 1000..10000000 G or 1..500 rounds.
- H01..H04 currently share the original chibi model with distinctive
  original 3D accessories. Bespoke full 3D asset catalog remains future.
- Current 3/4/5 Gallery map choices are ring-layout variants ONLY.
- Reverse direction is NOT implemented by this release.

**Remaining important work:** Alternate map shape IDs + actual geometry,
navigation/rendering/animation collision QA; real Android visual QA;
server-authoritative global reverse effect with trigger-player anchored
3-cycle timer; tie-break rules if a non-draw result is later wanted.



Status: **NEWLY AGREED PRODUCT REQUIREMENTS + HISTORICAL RESEARCH. DESIGN ONLY;
NOT IMPLEMENTED.** Updated 2026-11-06.
Repo: `kyubix/treasure-bot`, development from Android, commit to `main`
in small, tested releases. Read this BEFORE changing game rules.

## CONFIRMED 2026-11-06 — EFFECT-SPECIFIC TRIGGER-ANCHORED DURATION

**Supersedes the earlier suggestion to count ALL effect timers from 1P.**

- Match turn/round numbering and `TURN_LIMIT` winning mode retain the
  **1P→next 1P** full-round boundary; slot order is always 1P,2P,3P,4P
  (skip empty slots).
- **For certain effects** (including the discussed reverse-direction
  timer), the duration instead counts **complete cycles of the player who
  triggered the event**. If **2P** triggers at any point in their turn,
  the **next 2P turn start marks 1 effect turn**, the second return marks
  2, and the third return marks 3; after that third return the effect
  expires **before** that player's next move.
- An effect activates **immediately on triggering**, even when triggered
  mid-round. It applies to its stated targets (global Reverse applies
  to all players, including CPU) while active.
- Example with four occupied slots:
  `2P(trigger)→3P→4P→1P→2P(1)→3P→4P→1P→2P(2)→
  3P→4P→1P→2P(3,expire)`.
- Event effects must expose an **explicit duration counting policy**;
  do not automatically make every existing/future effect trigger-based.
  Recommended `durationBasis: 'TRIGGER_PLAYER_CYCLE' |
  'MATCH_ROUND' | 'INDIVIDUAL_ACTION'` per effect definition.
- Persist `triggeringPlayerId`, `triggeringSlot`, `durationBasis`,
  `remainingCycles` (and a stable activation sequence/id) on the
  server. Update the counter once when the next turn starts for the
  triggering slot, not on every player action or when `state.turn`
  changes. Server-side expiry must occur before any actions for that
  new turn; never depend on camera or client time.
- Test 1P,2P,3P,4P triggers; empty seats, CPU players, wraparound,
  multiplayer/reconnect, effect overwrite/cancellation by subsequent
  event, and no double decrement from replayed END_TURN.
- The source's "three turns or until next event" describes the
  reverse rule at a high level. Trigger-anchored interpretation is a
  **user-approved Treasure Bots rule**, not independently verified
  original-game timer implementation.
- **STATUS: SPECIFICATION ONLY; server/UI change not yet deployed.**

## CONFIRMED TURN ORDER AND ROUND UNIT — SUPERSEDES DICE-ORDER SPECULATION

**User decision, 2026-11-06 (use this in implementation):**
- During lobby setup players choose/occupy explicit slots **1P, 2P, 3P,
  4P**, as seen in the uploaded original game's "4P settings" reference.
  Active game order is **1P → 2P → 3P → 4P → 1P**, skipping any
  empty slots. **NO dice roll to determine player order.** This is a
  Treasure Bots rule confirmed by the user, irrespective of the unknown
  historical original's dice ceremony.
- **One "turn" = one FULL ROUND**, defined as from player **1P's turn
  start to the next 1P turn start**, after all occupied slots have had
  their turns. If players 1P/2P/3P/4P are present, all four act before
  the round counter advances. The game's existing `state.turn` scheme
  already increments after the last player (with join-order array), but
  lobby-assigned slot order must now be authoritative.
- **Reverse-direction event lasting "three turns" means three complete
  trigger-player cycles**, not three individual player actions and NOT
  always 1P-anchored. Example: 2P triggers → 2P returns (1) → 2P (2)
  → 2P (3, expire). Reverse movement is global, right→left becomes
  left→right for ALL players. Activate immediately; expiry at the third
  return to the triggering player's turn start.
- The user already wants selectable **avatar and color** per player
  before play. Slot (1P…4P), selected avatar, chosen unique player
  color, gallery number and tile positions are separate concepts.
  Color names in screenshot illustrate default slot palette but are
  not a verified requirement to lock P1 blue permanently.
- Do not implement randomized turn order as a default, nor re-open
  this decision without new user instruction.

## Evidence and certainty (never mix these)

### A. User-confirmed requirements for Treasure Bots
- A match host can choose a winning goal: **(1) a fixed number of turns,
  then rank by each player's total wealth**, or **(2) first to reach a
  selected wealth threshold**. Exact UI presets and tie-breaks need design.
- Players can **choose their avatar and color BEFORE the match begins**.
  Four available base player colors: blue, green, magenta, yellow. Previous
  user examples used P1 blue / P2 green / P3 magenta / P4 yellow. Those labels
  describe the palette, NOT a permanent link between player color,
  gallery number and the order in which players take turns.
- Historical dice-based order is still unverified, but the user has now
  **chosen slot-based 1P→2P→3P→4P order** for Treasure Bots, with no order roll.
- Reverse-direction event exists in original gameplay and should eventually
  be reproduced. Normal Board View visual travel is RIGHT->LEFT, reversed
  travel LEFT->RIGHT. World Map path indexes must stay consistent.

### B. External descriptions found, NOT official manual
1. Japanese Wikipedia on `グリントグリッター`, game modes and events:
   https://ja.wikipedia.org/wiki/グリントグリッター
   - Versus mode allows 1-4 players, selection among ten character designs,
     four stages, and a victory condition by turn count or total assets.
   - Event `逆回り` (reverse direction): ALL players travel in the
     opposite direction, left-to-right instead of normal right-to-left.
     It lasts **three turns OR until the next event occurs**.
   - The precise unit of the 'three turns' timer (full rounds vs
     individual turns) is NOT defined in this source. Do not invent it.
   - The wiki also describes up to 5 numbered Galleries depending on map,
     10 items per player's own color in each and several event categories.
2. PSX Data Center listing for Japanese game SLPM-86200:
   https://psxdatacenter.com/games/SLPM-86200.html
   - First story game's target is described as 20,000 G; this is NOT
     evidence that all modes must have a fixed 20,000 G threshold.
3. The wiki verifies **selection of character**, not necessarily free
   re-coloring of those characters in the original title. Selectable
   color is therefore a user-approved feature of Treasure Bots; its
   exact original implementation remains UNKNOWN.
4. No game-specific manual/demo proof was found for initial
   **dice-rolled player order**, exact dice tie handling, or rules
   for choosing an order after a tie. Keep these UNVERIFIED.

### C. Current code, before implementing these requirements
- `src/engine/game.ts`: `COLORS=['#69d7ce','#f4be70','#dba5ed','#94abfa']`,
  hardcoded `WIN_ASSETS=20_000`; `createPlayer(...colorIndex)` and
  `addGuest()` assign colors by join order, not selection.
- `GameState.currentPlayerIndex` increments by joined player array order.
  No pregame order-roll state/action.
- `GameState` has no `winCondition`, `roundLimit`,
  `globalTravelDirection`, `reverseTurnsRemaining`,
  `avatarId`, or a separate `turnOrder` array.
- `src/client/main.ts`: lobby has name, invite, CPU player count and
  Start; no avatar/color picker, target wealth or turn limit selector.
- `src/client/board.ts`: travel tween always uses
  `(newPos-oldPos+TILES.length)%TILES.length`. This assumes forward
  movement and will animate incorrect paths after a reverse event.
- `src/client/board-view-three.ts`: character facing, strip order,
  camera and walking must track a server-owned direction flag.
- `src/engine/gallery.ts`: current number/color mapping is provisional,
  and MUST NOT be confused with player color selection. Continue using
  one explicit immutable tile→color-owner mapping per generated board.

## Proposed state contract (implementation architecture, NOT existing)

```ts
type PlayerColor = 'BLUE' | 'GREEN' | 'MAGENTA' | 'YELLOW';
type WinningRule =
  | { kind: 'TOTAL_WEALTH_GOAL'; amount: number }
  | { kind: 'TURN_LIMIT'; rounds: number };

interface MatchConfiguration {
  winningRule: WinningRule;
  mapId: string;
  galleryCount: 3 | 4 | 5; // bounds only: exact map choices TBD
  initialOrderRule: 'SLOT_ORDER'; // CONFIRMED user choice: 1P -> 2P -> 3P -> 4P
}
interface PlayerSelection {
  avatarId: string;
  color: PlayerColor;
  ready: boolean;
}
interface TravelModifier {
  direction: 1 | -1;
  triggeringPlayerId: string;
  triggeringSlot: 1 | 2 | 3 | 4;
  durationBasis: 'TRIGGER_PLAYER_CYCLE'; // other effect policies may differ
  remainingCycles: number; // e.g. 3, decrease on trigger player's next turn start
  activationId: string; // idempotent for multiplayer/replay
  replacesOnNextEvent: boolean;
  sourceEventId?: string;
}
```

Design rules:
- Separate immutable **playerId**, **player color / avatar**,
  **lobby seat**, **turn order**, **board tile owner/color** and
  **Gallery number**. Never use one as a shortcut to derive another.
- Each lobby member selects a unique color (if that constraint is
  accepted for the new game), avatar may be selected independently.
  CPU players choose unused colors deterministically/randomly under
  server control. Conflicting picks must be rejected transactionally.
- Host locks match configuration at Start. Save it in Durable Object
  state and include in every snapshot/reconnect. Older saved rooms
  should migrate to the existing 20,000 G goal and join-order turns
  unless the user specifically changes them.
- Players explicitly select/occupy slot 1P..4P; server persists each
  occupied slot and determines play order by ascending slot (never dice).
  Disallow duplicate slots and validate join/reconnect/CPU fill; skip
  empty seats without changing the order. An optional dice-based
  variant is out of scope unless separately approved.
- Wealth goals: reuse the single authoritative `netWorth` method
  (gold + inventory + displayed Gallery treasures + robot cargo) and
  apply threshold at a documented action boundary. Never trust the UI.
- Turn-limit mode: **one turn is one full 1P→next 1P round**, with
  each occupied slot acting once; increment after the last occupied
  slot. Finalize all server actions at the end boundary, compare
  wealth across players, and define wealth tie rules before shipping.
  `state.turn` currently increments after the final entry in the
  players array and must follow assigned slot order.
- Reverse event must change the **server** movement calculation and
  per-step stop/pass logic, not just animate the character backwards.
  For direction = +1: next=(old+steps)%N. For direction = -1:
  next=(old-steps%N+N)%N. Keep shop pass/stop behavior, income, START
  crossing, dice roll, robot mission timeline and bot behavior sound.
- Screen X presentation: forward normal should move R->L; reverse
  should move L->R. Ensure the Board View actor and robot face the
  correct direction; World Map marker positions remain tied to indexes.
- Reverse applies to ALL players, including CPU, starting immediately
  when the triggering event fires. For this effect, count 3 complete
  cycles anchored at the TRIGGERING PLAYER'S next turn starts (not
  `state.turn`); expire before the triggering player's move on the
  third return or cancel/replace on the next event. Distinguish this
  from normal 1P-anchored match turn numbering and other effect types.

## Implementation tasks — dependent and separately testable

### M01 [P0] Lobby choices + persistence
Player color and avatar picker; CPU fallback, unique choices; host
winning-mode and stage settings. Server-side validation; room reconnect;
color-independent Gallery allocation; migration tests.

### M02 [P0] Selectable victory goals
`TURN_LIMIT` with end-of-round net-worth ranking; or
`TOTAL_WEALTH_GOAL` with immediate victory on threshold.
Ties and allowed numeric presets should be agreed explicitly.
Unit tests for four players, bot turns, empty inventories, cargo,
Gallery value, boundary turn and reconnect.

### M03 [P0] Explicit lobby slot order 1P→2P→3P→4P
Players choose available 1P…4P positions; use ascending occupied
slots for turns, with no dice-order roll. Validate collisions,
CPU/empty slots, reconnection, host leaving, persistence and
full-round increments. Original dice-order research is optional and
cannot override the user's chosen game rule.

### M04 [P0] Server-authoritative global reverse effect
Implement event dispatch/selection and `triggeringPlayerId`/`triggeringSlot`,
`durationBasis='TRIGGER_PLAYER_CYCLE'` plus counter decremented at
the trigger player's next turn starts only; activate immediately;
expire before the third-return action or cancel/replace on next event.
Keep movement/landmarks/shop/START pass-and-stop, bot behavior,
multi-step trajectory and replay-safe DO updates. Test wrapping
index 0↔N-1, returning to normal, 1P/2P/3P/4P triggers, empty
slots and multi-player timer consistency.

### M05 [P1] Three/Phaser visual direction synchronization
R->L normal and L->R reverse, avatar/robot turning, camera travel,
HUD arrows, board strip, responsive controls. Sync both renderers,
retain drag-based 360° World Map and Phaser fallbacks.

### M06 [P0] Full regression and Cloudflare verification
`npm test`, `npm run test:unit`, `npm run build`; GitHub CI;
Cloudflare Workers build; confirm deployed commit separately and
manual Android multiplayer. Server actions and state versioning must
be replay-safe; no new mandatory buttons in the World Map.

## Open items — don't silently assume

- Original dice-based order is historically unverified but NOT a
  product blocker: the user chose deterministic slot order.
- Reverse counts **three trigger-anchored player cycles** (e.g.
  2P→next 2P is 1). The effect starts immediately on activation;
  expiry is before the trigger player's action at the third return.
  Next-event cancellation/replacement must remain idempotent.
- Exact wealth goals / turn presets, whether host can type custom values,
  whether a fixed-limit game allows early finish on wealth.
- Tie resolution at the turn limit, avatar/color uniqueness rules.
- How player color selected in lobby affects pre-existing saved games
  and previously assigned numbered Gallery tiles.

No game mechanics are changed by this documentation commit.
