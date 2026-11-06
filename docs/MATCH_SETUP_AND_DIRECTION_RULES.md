# Match Setup, Winning Goals and Reverse-Direction Events

Status: **NEWLY AGREED PRODUCT REQUIREMENTS + HISTORICAL RESEARCH. DESIGN ONLY;
NOT IMPLEMENTED.** Updated 2026-11-06.
Repo: `kyubix/treasure-bot`, development from Android, commit to `main`
in small, tested releases. Read this BEFORE changing game rules.

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
- The USER remembers initial play order may be settled by a dice roll;
  historical confirmation has NOT yet been located.
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
  initialOrderRule: 'LOBBY' | 'DICE_ROLL'; // no original-proof yet
}
interface PlayerSelection {
  avatarId: string;
  color: PlayerColor;
  ready: boolean;
}
interface TravelModifier {
  direction: 1 | -1;
  expiresAfterTurnIndex?: number;  // precise interpretation pending
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
- If dice-order is enabled: collect one dice result per participant,
  resolve ties fairly and deterministically from server RNG, persist
  an explicit turn-order permutation. **Do not claim this matches the
  original until gameplay/manual proof exists.**
- Wealth goals: reuse the single authoritative `netWorth` method
  (gold + inventory + displayed Gallery treasures + robot cargo) and
  apply threshold at a documented action boundary. Never trust the UI.
- Turn-limit mode: choose what counts as a **round** (prefer a complete
  cycle with every player acting once), finalize all server actions at
  the boundary, compare wealth across players, and record tie rules
  before shipping. `state.turn` is currently incremented after the
  last player only and should be tested for shuffled order.
- Reverse event must change the **server** movement calculation and
  per-step stop/pass logic, not just animate the character backwards.
  For direction = +1: next=(old+steps)%N. For direction = -1:
  next=(old-steps%N+N)%N. Keep shop pass/stop behavior, income, START
  crossing, dice roll, robot mission timeline and bot behavior sound.
- Screen X presentation: forward normal should move R->L; reverse
  should move L->R. Ensure the Board View actor and robot face the
  correct direction; World Map marker positions remain tied to indexes.
- Reverse applies to ALL players, including CPU, until the fixed timer
  expires or a new event occurs (source says next event cancels/replaces
  it). The exact start/expiry boundary is pending verification.
  Avoid decrementing one 'turn' for every player if three *full rounds*
  were intended; document the chosen interpretation.

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

### M03 [P1] Pregame dice-order research and option
Search authentic startup footage/manual first. If still unknown,
implement an optional original-*inspired* fair lobby dice ceremony
rather than calling it a confirmed original rule. Test ties, bots,
disconnects, duplicate submissions and identical seed reproducibility.

### M04 [P0] Server-authoritative global reverse effect
Implement event dispatch/selection, direction state, turn/round timer,
'next event' replacement/cancellation, movement/landmarks/shop/START
pass-and-stop, bot behavior, multi-step trajectory and replay-safe DO
updates. Test wrapping index 0↔N-1, returning to normal, and
multi-player timer consistency.

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

- Original dice-based initial turn order: still unverified; what
  happens on ties; whether players get dice before/after color selection.
- Full-round versus single-player-turn meaning of reverse event's
  '3 turns'. New event replacement and exact expiry timing.
- Exact wealth goals / turn presets, whether host can type custom values,
  whether a fixed-limit game allows early finish on wealth.
- Tie resolution at the turn limit, avatar/color uniqueness rules.
- How player color selected in lobby affects pre-existing saved games
  and previously assigned numbered Gallery tiles.

No game mechanics are changed by this documentation commit.
