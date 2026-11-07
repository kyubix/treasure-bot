# Board dice roll cinematic v2 — 2026-11-07

## Objective
Reference the lively, colorful animated dice ritual of **Glint Glitters**
with original Three.js geometry and animation—not copied source assets.
Maintain the premium stylized miniature aesthetic and mobile performance.

## Player flow
1. Hold Roll: avatar on the Board lifts both arms using the **actual
   LeftArm/RightArm joints** of the already-loaded chibi actor; two 3D dice
   spin above the avatar. Numeric fallback tiles are **hidden immediately**
   on the initial pointer hold, even while the Three.js module imports.
2. Release: avatar swings arms down, both 3D dice fly in a curved throw
   toward the Board's floor position with increasing downward speed.
   The server receives **one unchanged ROLL request** immediately.
3. Land: dice bounce/tumble and settle on the floor-like contact shadows.
   If the server replies early, the final faces are queued until the arc
   finishes. Quaternion rotation points authoritative face 1–6 toward
   the user for each of the two dice.
4. Result: only **after landing and settling** does the interface reveal
   `dice[0] + dice[1]`, resume Board animation/movement and shop processing.
   The server result, turn rules and outcomes are never fabricated or changed.
5. Hide result, stop the small renderer, and restore idle avatar pose.

## Visual design
- Original glossy *electric-blue / cyan* dice, rounded corners, dark
  cobalt outer rim and white pips; bold, playful contrast inspired by
  the bright color language of the PlayStation game, not a claim of
  exact frame/palette replication.
- Legacy dice face elements are still mounted only for WebGL context-loss
  and renderer-import failure fallback; **never shown as a placeholder
  during normal loading**.
- 320×194 transparent Three canvas moves from avatar-hand area to visible
  lower Board floor during throw, without resizing the game canvas.
- Existing Board camera, world map, dice button and gameplay inputs remain.

## Implementation
- `dice-timing.ts`: pure authoritative display-delay timing; start=760ms
  throw then 520ms settle, adjusted for real network response time.
- `dice-three.ts`: arc, bounce, quaternion outcome orientation, lazy canvas.
- `board-view-three.ts` + `board.ts`: 60FPS transient avatar arm gesture,
  with search-action transition for existing actors; no extra GLTF models.
- `main.ts`: phase plumbing, delay numeric result, hold Board state visual
  until landing, then resume existing Phaser tween. It still sends ROLL
  immediately and uses only server-reported faces.

## Known limitations / QA
- No original exact game footage/color sample supplied; style and motion
  are an interpretation rather than asset-perfect reproduction.
- Animation is on an anchored transparent 3D overlay with a floor-shadow
  projection, not yet physically simulated with a rigid body inside the
  board scene. Verify visual alignment with the avatar at different screen
  sizes/angles.
- Tests cover math, first-press fallback behavior, avatar joint wiring.
- Actual Android GPU timings, match flow, scene alignment, and fallback
  behavior require device verification even after CI/Cloudflare success.
