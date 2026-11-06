# Gallery System — Approved Gameplay Specification

## New dynamic board generator — phase 2 (2026-11-06)

- New matches receive explicit Gallery count 3/4/5 from lobby host;
  `src/engine/board-layout.ts` places 8 consecutive Gallery cells
  per number in exactly BLUE BLUE GREEN GREEN YELLOW YELLOW
  MAGENTA MAGENTA sequence. The relevant player color is a board
  cell identity, **not ownership of the Gallery number or others'
  treasure**.
- The generator adds provisional SHOP/EVENT/SUPPORT cells BETWEEN
  numbered Gallery runs; map sizes are 29 / 38 / 47 including START.
- `GameState.board` stores tiles, gallery numbers, color slots and
  Gallery count for the entire match. Existing rooms without this
  field are intentionally left on their original 28-tile layout.
- The server changes `state.galleries` at START to 3/4/5 rows with
  exactly ten treasures per player per numbered Gallery; no mid-match
  size switching.
- Original special-cell locations and original map size presets
  beyond the numbered Gallery counts remain unverified.


Status: USER CONFIRMED rules as of 2026-11-06. Numbered Gallery implementation is now in progress; exact tile mapping, original visitor fee distribution, Treasure Sets and bonus formulas remain UNVERIFIED.

## Crucial difference: tile number vs building
Gallery No.N is a NUMBER MARKED ON A COLORED PERIMETER BOARD SPACE. No Gallery No.1/2/3/etc buildings exist as fixed island-interior landmarks in the World Map. A Gallery facade MAY appear in a board close-up when interacting with the tile, separately from World Map scenery. A Treasure Set is a collection of items and is NOT the same as a Gallery number.

## Confirmed rules
1. Every numbered Gallery offers independent display capacity of 10 items FOR EACH PLAYER. Four players may simultaneously own separate 10-slot rows in Gallery No.1.
2. When a robot returns carrying treasure, its owner chooses WHERE to display that newly recovered item: Gallery No.1, No.2, etc. This selection does NOT require standing on the Gallery's board tile.
3. If that player's Gallery No.N has <10 items, the new treasure fills an available slot.
4. If full (10/10), the user MUST choose: (a) replace a displayed item X, which is IMMEDIATELY and AUTOMATICALLY SOLD while incoming T occupies its place, OR (b) SELL the newly recovered T directly. No hidden overflow inventory as a solution, and no option to transfer displaced X to another gallery.
5. Reorganizing/moving already displayed items is allowed only when the player's avatar is standing on the board tile bearing the corresponding Gallery number. Precise cross-Gallery transfer sub-flow remains to be verified; never enable a transfer through replace-and-sell.
6. Treasure Set completion is calculated from items within the SAME numbered Gallery; exact set catalog, bonuses and prices are not user confirmed.

## Correct interactive flow
Robot returns -> new treasure T -> choose Gallery No.N ->
  if capacity available: display T;
  if full: replace item X (server atomically removes and sells X, adds T) OR sell T directly.
Recalculate gallery value, treasure sets, fee/accounting, net worth and broadcast updated state. Never assume the client can change money, transfer or duplicate items.

## Proposed server data shape (design suggestion, NOT existing)
GalleryNumberState: { number, boardTileIndex, displaysByPlayerId: Map<playerId, Treasure[]> }.
User-confirmed capacity applies to each displaysByPlayerId row. Actual TypeScript schema may use stable arrays/records for JSON/DO compatibility.
Important actions: choose target Gallery, place, replace-and-sell, sell incoming, location-validated rearrange.
Validate item identity, owner, gallery number, capacity, replay ID, current phase, atomic sale price and saved-room compatibility.


## Implemented feature contract (V1 numbered Gallery)

- A **provisional** mapping groups the twenty existing Gallery tiles into five
  numbers (No.1–5), four consecutive board spaces per number, in
  `src/engine/gallery.ts`. This is a playable approximation only:
  **actual Glint Glitters number placement has not been established**.
- World Map Three.js uses depth-tested 3D numbers on those board tiles;
  Phaser fallback and Board View render the same numbers from one mapping.
- Server `Gallery` state has independent `displaysByPlayerId` rows, with ten
  slots each, in each numbered Gallery. Old single-owner gallery data is
  migrated to numbered rows: displaced over-capacity historical assets
  are returned to the rightful player's inventory, not destroyed.
- Robot delivery adds newly recovered IDs to
  `Player.pendingGalleryTreasureIds`. The owner selects a numbered Gallery
  regardless of their board position or current turn; the mobile dialog
  opens automatically upon a new delivered item.
- If full, select old item X -> server atomically sells X at the current
  **PROVISIONAL** resale rate (60%) and replaces the same slot with T.
  Or sell newly delivered T directly, without a shop requirement.
  No overflow stash or cross-gallery transfer through replacement.
- Rearrangement swaps positions **only within the same Gallery row** while
  avatar is on a board tile carrying that exact Gallery number. Cross-Gallery
  transfers and Treasure Set bonuses remain unimplemented pending verified
  source rules.
- Visitor fee: while original exact distribution is unverified, the prototype
  currently transfers 20% of each opponent's displayed treasure value in the
  visited numbered Gallery, bounded by visitor's remaining gold.
- Transactions execute in a Durable Object storage transaction guarded by
  `expectedVersion`; replaying a placement/sale with the same item ID fails.
  CPU players use deterministic minimum-occupancy gallery placement.

## Historical code mismatch (before numbered Gallery implementation)
- src/engine/types.ts Gallery = { tile, ownerId, displayed[] }: one owner per tile, not four player rows.
- TILES contains many unnumbered GALLERY spaces, no No.1..No.N ID mapping.
- src/engine/game.ts creates a Gallery for each such space and assigns one owner per Gallery at START.
- displayTreasure auto-picks first player-owned gallery with space; no choice or full capacity resolution.
- resolveTile fee uses one owner. Revisit economics with multi-player display and original rules.
- src/client/world-map.ts draws colored Gallery board tiles but no Gallery number labels. Numbers belong on THESE tiles, never in decorative island buildings.
- UI lacks numbered Gallery management/return placement.

## Must test before shipping
- Per-player independent 10 slots across several numbered Galleries.
- An explicit Gallery number choice after robot return without tile-location requirement.
- Full Gallery: replace-and-auto-sell removes X permanently; or sell incoming T.
- Replay/multiplayer retry cannot duplicate sale money or old item X.
- Rearrangement restricted to matching Gallery board position.
- Treasure Set bonus only when complete in same Gallery.
- Numbered board label persists across camera rotation and never drifts to a landmark.

## Open/unverified
Exact Gallery numbers and positions in each board variation; user screenshot shows No.1-3 and research suggests maps up to 5. Exact item resale formula, visitor fees/modifiers, set members/bonus arithmetic, and some Gallery UI flow require footage/evidence; mark provisional, do not invent.
