# World Map V6 — Stylized Detailed 3D environment upgrade

Implemented for Treasure Bots World Map Three.js renderer. Authorized direction is **stylized detailed 3D**, **not PS1**. Read `docs/VISUAL_STYLE_GUIDE.md` first.

## Scope
- Existing server/game/board tile logic, Gallery numbering, labels, hit targets, shapes, avatar/robot animation and 360-degree camera are unchanged.
- Rounded, irregular mountain profiles now blend foothill/body/peak with deterministic spatial erosion instead of three horizontal mesa-like bands. The existing pond clearing and waterfall source/target remain anchored to the same heightfield.
- Terrain retains continuous analytical vertex normals; height-adjusted rock gradients and two-frequency soil/grass colors produce more organic transitions without textures or network requests.
- New `src/client/world-map-vegetation.ts` generates more detailed broadleaf and pine silhouettes with organic leaf clumps, stylized trunks, tiered spruce crowns and stage-dependent palettes. Deterministic placement snaps tree bases to the shared terrain height, skips steep ground/pond/board-edge clearance, and batches all trees into **two InstancedMeshes**. No glTF server dependencies.
- Waterfall keeps its existing attached 53×5 channel ribbon and in-place vertex color animation, with slightly winding contour and **24 batched traveling glints** whose positions come from `waterfallPoint`; no additional render loop.
- Preserve current apron/board-conformal foundation (already closes ocean seam); this release does not tamper with the board-facing edge.

## Verification
- Engine smoke tests, unit tests (including new forest deterministic placement and batching checks), and `npm run build` run in GitHub Actions on push.
- Test for all RING/LAGOON/CLOVER map shapes; 3/4/5 Gallery counts depend on existing board alignment tests.
- **Still required**: real Android screenshots and 360-degree orbit of each shape, visual judgment of waterfall and canopy, Gallery numbers visible at default portrait scale, touch/dispatch/end-turn, frame rate / heating. CI cannot establish artistic quality.
- Further improvement toward Littlest Tokyo detail likely requires authored GLB textures/props and device-calibrated lighting; these procedural geometry upgrades are not a complete art overhaul.
