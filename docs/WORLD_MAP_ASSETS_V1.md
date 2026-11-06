# World Map Asset Pack v1 — Corrected Design Contract

Status: APPROVED ART DIRECTION, assets NOT yet delivered as 4 consistent production views.

## Important correction
On the original World Map, Gallery No.1/No.2/No.3/etc is printed DIRECTLY ON THE PERIMETER BOARD TILE. It is NOT a 3D building/landmark on the island. The AI mockup that placed numbered Gallery buildings in the island interior is REJECTED for world geography. No gallery-number signs/billboards on ruins or mountain.

## Target layout
- Full island and colored perimeter board route visible on mobile, no cropped cells; reserve 8–12% safe margin around route.
- Original, colorful stylized island with real geography: mountains, forests, coast, river, waterfalls, rocks, ruins, lighthouse if map-appropriate. These are environmental landmarks, NOT numbered Gallery facilities.
- Independent game layers: (1) ocean, (2) island scenery, (3) colored board path, (4) dynamic board tile labels including numbered Gallery markers, (5) dynamic player/robot/treasure/launchTile/path/selection, (6) sci-fi HUD containing energy and map controls.
- World Map MUST NOT contain dice, End Turn, or permanent robot report; board screen remains separate.
- Energy value and robot mission path come from server state. Robot launch origin A remains fixed after player changes board position B.

## Master and rotations
Preferred: one structured original 3D master (e.g. Blender scene) with all landmarks and board anchors at stable 3D coordinates. Export orthographic views from camera angles 0, 90, 180 and 270 degrees; same master, scale, lighting and canvas. Four independent AI images do not qualify as geometry-consistent rotation because landmarks drift. If source master is unavailable, ship one approved viewpoint first and retain procedural view for other rotations until coherence can be proven.

## Production targets (proposed, NOT files already produced)
- assets/worldmap/master/ — master scene and tile/landmark anchor registry.
- public/assets/worldmap/island_front.webp
- public/assets/worldmap/island_right.webp
- public/assets/worldmap/island_back.webp
- public/assets/worldmap/island_left.webp
- public/assets/worldmap/ocean.webp
- optional transparent environmental props and HUD chrome.
No characters, robot trails, text, Gallery number, energy bar fill or treasure status embedded in static images.

## Implementation integration
- src/client/world-map.ts renders current procedural 2.5D island, colored path, players, robot route and targets. Keep gameplay state driving the foreground layers.
- src/client/world-map-geometry.ts handles rotation and logical coordinates. Map texture must use precisely matching anchor registry; number on Gallery tile is bound to tile ID and projected with its tile, not baked into background.
- src/engine/types.ts TILES is an UNNUMBERED provisional layout: define correct numbered Gallery-to-tile mapping in coordination with Gallery system redesign. Do not cosmetically assign random numbers without verified mapping.
- src/client/world-hud.css is a valid UI base. Preserve mobile width hotfix and stable controls.

## Asset QA acceptance gates
1. All perimeter cells visible at every angle and tested mobile aspect ratio.
2. Same specific tree/mountain/river/ruins coordinates across 4 views.
3. Gallery number overlays stay attached to their numbered board tiles after rotation.
4. Tapping locations always returns the correct logical target ID.
5. Fixed robot launch A, active robot route and live energy work after avatar moves.
6. Production files are original and optimized for phone memory/frame times.
7. Manual Android screenshots and build/smoke tests, no regression to dice/end-turn Board view.
