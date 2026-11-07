# Three.js Dice — Treasure Bots (2026-11-07)

## Product direction
The existing roll remains **hold -> release**; change only its appearance.
Two actual rounded **Three.js 3D dice** replace number-only tiles while
rolling. They follow the premium stylized fantasy miniature direction:
warm ivory faces, navy pips, subtle glaze, directional and fill lighting.

## Interaction and authority
- The user still holds/release the **same Roll button**. Touch, keyboard,
  game eligibility, server action and all turn rules remain unchanged.
- The Roll button now keeps a die icon beside a **real translatable text
  label**, rather than having its children destroyed by `textContent`
  updates. Accessibility `aria-describedby` and `rollHelp` remain.
- During **holding**: rotate both physical dice with slightly different axes.
- During **waiting**: continue rotating while the server determines results.
- During **result**: animate a quaternion settlement for each die, with its
  actual authoritative 1–6 face turned toward the front camera. The result
  sum remains visible in the existing `diceTotal` status.
- Opposite faces sum to 7; material order is +X=3,-X=4,+Y=2,-Y=5,+Z=1,-Z=6.
- Falling back to the original numeral dice if WebGL fails does not stop
  input handling or alter a roll's outcome.

## Runtime performance
- Three renderer lazily imported and constructed on first roll, not on
  every Board/World render and not in the initial game bundle.
- Small 320 × 166 transparent canvas, capped 1.5 DPR; two shared meshes,
  six pip textures with compact 256² canvas art, two fake shadows and just
  three lights (no shadow-map pass).
- Animates only while the overlay is holding/waiting/settling. A completed
  result retains its rendered final frame; pause on hide.
- Honors `prefers-reduced-motion` by showing static faces. Dispose renderer,
  WebGL context, textures, meshes and events when leaving the room.
- Do **not** add a permanent third full-screen WebGL canvas or another
  scene render loop. Existing Board and World renderers are unaffected.

## QA
- Unit tests verify six pip counts, opposite-face mapping, visible face
  quaternion orientation, and application integration.
- GitHub build validates TypeScript/Vite; manual Android check required
  for visual size, actual frame rate, heat, accessibility, ghost touch and
  Roll->World Map navigation.
