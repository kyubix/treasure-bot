# Board motion & background polish (2026-11-07)

Visual target remains **premium Stylized Detailed 3D** (not retro PS1).
This milestone improves the existing Board/World gameplay without changing
server protocol, robot eligibility, dice economy or board geometry.

## Simplified World Map UI
- **Remove "Robot dispatched!" popup** after sending a robot. Keep the portal
  animation; real error messages still display via toast. Bot dispatch remains
  automatic without extra notifications.
- **Remove the two rotate buttons** from the World Map HUD; layout becomes
  Back Board + Send Robot with room for finger taps.
- Three.js **one-finger drag orbit**, pinch zoom and Phaser interactive target
  hits remain available. No server-side input is changed.

## Smooth walking
- Phaser remains the authoritative movement tween with exactly the original
  destination, number of steps, direction and completion callback.
- Board 3D uses ~60Hz movement updates when hardware permits; Phaser 2D
  retains its low-power ~30Hz path.
- During movement, `paintMotionFrame` redraws only the existing Three canvas
  instead of destroying and recreating Phaser containers / interactive areas.
- AnimationMixer advances with **accumulated elapsed time**, not the last rAF
  delta after skipped frames, so GLTF walking cadence is consistent.
- Avoid redundant GPU renders when Phaser already submitted the 3D frame.
- Cache the top plaque / mini-map SVG until the logical tile or turn changes.
- Board scenery parallax now uses a continuous 28-tile sine cycle rather than
  resetting abruptly every four tiles.

## Background upgrade
- Original, biome-aware **atmospheric gradient sky**, two distinct distant
  smooth ridge layers, wispy cloud banks, terrain-conformal tree anchors,
  detailed rock scatter, shrubs and accent flowers/embers/snow by biome.
- Geometry and color are deterministic. Clouds, foliage, rocks and floral
  details are `THREE.InstancedMesh`, not individual draw calls.
- No downloadable textures, external server dependencies, post-processing
  or per-frame procedural mesh regeneration.
- Existing board visibility, gallery numbers and biome types are preserved.
- All new scene resources follow `disposeEnvironment` lifecycle on biome
  transition or renderer disposal.

## Verification and QA
- CI unit tests validate scenery objects in every biome, count budgets,
  simplified controls, and 3D motion pacing.
- Test on an actual Android device for perceived FPS, temperature, background
  readability, actor gait, biome changes, Send/Back touch behavior and
  360-degree World Map orbit. CI success is not visual QA.
