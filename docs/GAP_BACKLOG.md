# Gap Backlog — Treasure Bots

Updated 2026-11-06. Read AGENTS.md, docs/GALLERY_SYSTEM_SPEC.md and docs/WORLD_MAP_ASSETS_V1.md before coding.

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
