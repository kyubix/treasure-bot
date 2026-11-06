# World Map Three.js preview — V2 (opt-in)

Updated 2026-11-06. This is an original mobile-first 3D island diorama,
inspired by the *composition* of a PS1 board-game map, with no copied assets.

## Test directly on Cloudflare / Android
- Default Phaser: `https://treasure.endeavor.lt/`
- Three.js 360° preview: `https://treasure.endeavor.lt/?map3d=1`
- Existing room: `https://treasure.endeavor.lt/?room=ROOMCODE&map3d=1`

Open World Map, then **drag with one finger to orbit freely 360°**.
Drag vertically to tilt (28–76°), pinch with two fingers to zoom
(with a safe range that retains the whole island). The left/right HUD
buttons rotate 45° at a time. Tap a destination briefly to select; a
drag never dispatches a location selection. Board View and rules unchanged.

## Architecture
- `src/client/world-map-three.ts`: one original 3D master island and
  a single orthographic orbit camera. Meshes are reused across camera angles.
  Deterministic island coastline, cliff tiers, forests, lagoon, sea, rocks,
  environmental ruins and lighthouse. Low-power WebGL, pixel ratio capped 1.5,
  bounded zoom and shadows, no continuous animation loop.
- `src/client/world-map.ts`: Phaser overlays (authoritative tile colors,
  Gallery ownership, players, robot missions, selectable target IDs).
  In V2, uses `project3D` to project all 28 board tile corners and each
  target/player/robot start/end through the very same Three camera. In
  standard mode the old Phaser map projection remains unchanged.
- `src/client/board.ts`: handles Phaser touch/click, 360° orbit gesture,
  pinch zoom and redraw throttling; leaves the Three canvas pointer-inert.
  Tap vs drag is explicitly distinguished so a gesture does not select a
  site or send robot commands.
- `src/client/world-map-geometry.ts` and all engine/server mechanics
  are unchanged. Gameplay remains server-authoritative. The fixed robot
  launch tile A remains the real mission source.
- On a failed WebGL context / lazy import, fallback is the procedural
  Phaser map (and its original 90° controls).

## Acceptance checks
1. GitHub Actions: smoke, unit, typecheck and build, on commit in main.
2. **Verify the Cloudflare production deployment separately.** The GitHub
   workflow validates but does not deploy the Worker.
3. On Android, confirm 360° drag, tilt/pinch, left/right buttons, and
   no jumping on first open or after switching Board/World.
4. Confirm markers, board path, player positions and mission launch A
   follow the island at arbitrary camera angles, without drift.
5. Verify each target tap selects the correct site ID, while dragging
   NEVER selects sites. Confirm no dice or End Turn in World Map.
6. Android portrait/landscape: no path clipping, stable FPS/memory.
7. Roll back instantly by loading the site without `?map3d=1`.

## V2 limitations
The colored board and live markers are still Phaser 2D drawings
**projected from the real 3D camera**, not physical mesh tiles;
interactions remain hit circles in the transparent Phaser overlay.
Foreground objects will draw over some 3D scenery, not be occluded by
geometries. More precise 3D mesh-level occlusion/raycasting and higher
quality environmental materials remain future visual work, separate
from game mechanics.
