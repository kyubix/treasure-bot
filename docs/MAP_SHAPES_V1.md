# Selectable Map Shapes V1 — Treasure Bots

## 2026-11-07 World Map visual update — board shape matches the island

Previous V1 changed only the perimeter road. This update reshapes
the **actual island geometry** and its scenery to follow the selected
road shape without changing game rules or requiring GPU-heavy shaders.

- **RING**: original lush circular island, default for saved rooms.
- **LAGOON**: broader east-west shoreline, low/green mesas, more
  coastal foliage and pale shells/reeds, brighter turquoise surf.
- **CLOVER**: four-lobed shoreline, taller rocky ridges, mossy boulders
  and a deeper blue/green coastal treatment.

A continuous `stageRadialScale(angle,shape)` derives the coastal
radius from the same equations as the board path. The actual island
shore is intentionally set inboard of the coloured perimeter tiles.
Heightfield, beach rim, skirt geometry and foam strip all follow the
same radius (rather than mixing circular terrain with noncircular tiles).

`terrainHeight`, `createTerrainMesh`, `createSurfBand` and the
instanced detail placement accept an optional `shape` argument.
The waterfall source/terrain sampling and expedition site projection
are stage-aware; the destination pool stays central and physically
connected to the ribbon, preventing floating waterfalls.

World Map Three.js builds a new island and reuses ocean/board/actors
when `GameState.board.shapeId` changes, disposing previous static
stage mesh buffers. The water shader's existing vertex buffers are
reused while near-coast color is resampled ONCE per stage; the visible
animation budget stays 24 FPS. No new textures, HTTP asset
dependencies, external models or shadow lights were introduced.

### Verification checklist

- On Android choose Ring, Lagoon, Clover with a new room for each;
  compare the actual shoreline silhouette with the Gallery road.
- The coast must stay inside the path with a visible land/road gap,
  not poke over the Gallery color tiles or bury the START/Shop markers.
- Rotate camera a full 360°; no cliff/terrain layer intersections,
  side-wall holes or waterfall floating above a disconnected cliff.
- Confirm trees, decorative boulders, waterfall spray and pool do not
  overlap Gallery numbering or obscure player/robot markers.
- Test 3/4/5 Gallery size separately; each shape reuses the same
  server board, robot missions, Shop and Reverse Direction gameplay.
- Toggle `?map3d=0`; Phaser fallback remains a 2.5D approximation
  of the same road shape (not the new Three.js terrain model).
- Check FPS on mid-range mobile, WebGL loss/recovery, returning from
  background, new rooms, and old room without `board.shapeId`.

**Still outside this phase:** exact original Glint Glitters maps,
unique interactive island locations and treasure balancing by stage.


Status: **CODED 2026-11-07; CI and Android QA are separate release gates.**
Scope: distinct stage *path geometries*, not exact original game
maps. Original Glint Glitters stage layouts are not yet verified.

## User-approved rules maintained

- Four players per new match, slot order 1P→2P→3P→4P; CPU fills gaps.
- 3 / 4 / 5 numbered Galleries, with eight cells per Gallery distributed
  two blue, two green, two yellow and two magenta.
- Normal player advancement right→left on Board View; Reverse Direction
  event and trigger-player three-cycle countdown remain server-owned.
- No Gallery-numbered buildings on the island; white number markings
  belong on the perimeter tiles. Shop/encounter facades only after landing.

## New map choices

| Stage | ID | Geometry | Intent |
|---|---|---|---|
| Classic Ring | RING | Constant-radius circle | Stable default and legacy |
| Lagoon | LAGOON | Wide, smooth ellipse (x ×1.11, z ×.92) | Longer east/west stretch |
| Clover | CLOVER | Four-lobed smooth loop (7.5% radial modulation) | Distinct corner-like scenic detours |

All retain the same number of ordered tiles, tile type decisions, Gallery
numbers, robot map destinations and winnings. These are three original
Treasure Bots silhouettes, **not licensed/verified Glint Glitters layouts**.

## Architecture

- `src/engine/map-shapes.ts`: `MapShapeId`, `MAP_SHAPES`,
  `boardPathFrame(progress,shape,radius)` and
  `boardPathQuad(index,count,shape,inner,outer)`. Pure math, periodic
  through index N → 0, with normalized tangent and outward normal.
- `src/engine/types.ts`: optional `BoardLayout.shapeId`, optional
  START mapShapeId for backwards compatibility.
- `src/engine/board-layout.ts`: generator accepts mapShapeId, persists
  without changing Gallery distribution.
- `src/engine/game.ts`: server checks known shape names; older saved
  rooms without a shape stay `RING`. Never depend on client-only shape.
- `src/client/world-map-board.ts`: shape-aware board quads, side
  walls, trim, player colors, Shop/START markers and 3D Gallery digits.
  Rebuild geometry only on layout or shape change; reuse on polling.
- `src/client/world-map-three.ts`: live shape is shared by 3D actor
  anchors, projected tile centers, click polygons. Perspective camera
  and full 360° rotation remain unchanged.
- `src/client/world-map-geometry.ts`, `world-map.ts`: Phaser fallback
  projects the same periodic path with its historical camera offset.
- `src/client/main.ts`, `match-setup.css`: host's mobile select +
  vector preview. Shape and gallery count can be chosen independently.

## Regression / Android checklist

1. Create a room with 4 participants (bots allowed); select Ring/Lagoon/
   Clover; repeat with 3, 4, and 5 Galleries, in a new room each time.
2. Before Start, preview visibly changes. After Start, board geometry
   must visibly differ while logical numbered Gallery progression stays
   1→N and blue-blue/green-green/yellow-yellow/magenta-magenta.
3. World Map 3D markers and avatars must stand on tiles, never float
   into water; all four camera rotations/orbit gestures remain functional.
4. Click Shop/event tiles in fallback, confirm hit targets match them;
   switch via `?map3d=0`; compare shape to Three.js.
5. Verify robot launches / return paths, Reverse movement, wraparound
   index N−1→0, resize/orientation changes, WebGL context loss.
6. Existing saved room (no shapeId) continues to show the classic ring.
7. Mobile 360px portrait; check map not clipped and frame pacing;
   no extra terrain or heavy shader allocations per frame.

## Not in this release

Alternative terrain/landforms, geometry for branching road networks,
different board event rules per stage, per-map treasure/robot balancing,
verbatim maps from the original game, decorative asset overhaul.
These need a follow-on staged implementation and visual references.
