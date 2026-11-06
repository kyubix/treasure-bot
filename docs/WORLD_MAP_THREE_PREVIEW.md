# World Map Three.js preview — V1 (opt-in)

## Purpose and visual direction
Player-approved reference: an original colorful island diorama with tiered sandstone
cliffs, dense forests, pale beaches, blue sea, shallow lagoon and colored perimeter
board. The reference is for composition; do not copy proprietary game art.

This first preview is **not** a finished visual match. The scene uses lightweight
Three.js geometry; there are no external AI-generated textures or licensed art.

## Mobile preview on the same production host
- Default: `https://treasure.endeavor.lt/` stays on Phaser.
- Opt in: `https://treasure.endeavor.lt/?map3d=1`
- Existing room: `https://treasure.endeavor.lt/?room=CODE&map3d=1`
- Enter game, open World Map, rotate left and right.
- Room URL retains `map3d=1` during session navigation.
- Leave out `map3d=1` to restore the procedural Phaser World Map.

## Architecture
`src/client/world-map-three.ts` is imported **lazily** only in preview mode.
Three WebGL draws a static master island mesh behind a transparent Phaser CANVAS.
All live game state remains in Phaser: board tiles, owners, missions, dispatch
origin, robot trails, player markers, hit targets and energy HUD. The server,
Durable Objects, Gallery rules and map projection are unchanged.

`drawWorldIsland(...,renderScenery:false)` suppresses only Phaser's original
ocean/trees/mesas. Its interactive board and server-authoritative overlays are
not replaced by 3D objects. The master Three group rotates in 90-degree steps;
there are no separately generated camera-angle images.

When WebGL initialization or scene rendering fails, the Phaser renderer falls
back to its existing procedural scenery. The 3D layer is disposed when the game
scene is destroyed. The preview caps device pixel ratio at 1.5 and does not run
a continuous animation loop, to conserve battery on Android.

## Acceptance before default promotion
1. Main branch CI (smoke, unit, typecheck, build).
2. Cloudflare production deployment actually contains the commit. GitHub CI
   alone is NOT deployment and cannot prove production is updated.
3. Android portrait and landscape screenshots at all four rotations.
4. Ensure color board route remains clear of the 3D coastline and that overlay
   locations correspond visually to the world landmarks.
5. Confirm click targets, site IDs, avatar position, robot launch origin A,
   robot route, energy and Gallery behavior remain unchanged.
6. Check that no visible first-open resize/jump or 3D WebGL context loss occurs.
7. Review GPU memory/frame time and rollback with plain URL if performance poor.

## Known V1 limitations
- The scenic mesh is stylized low-poly, not identical to the PS1 target.
- Phaser dynamic overlay uses its existing 2D map projection, while 3D scenery
  uses a tuned orthographic viewpoint. Full 3D anchor alignment for each
  interactive site and proper 3D board tiles should be a later reviewed step.
- The water is static to avoid continuous GPU work; animated waves can be added
  after Android performance validation.
- Phaser CANVAS is used in preview to avoid two concurrent WebGL contexts.
