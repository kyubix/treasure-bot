# Gallery System — Approved Gameplay Specification

Status: USER CONFIRMED through 2026-11-06; features below are not yet implemented in the current engine.

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

## Verified current code mismatch
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
