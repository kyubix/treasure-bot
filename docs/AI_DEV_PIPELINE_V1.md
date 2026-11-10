# AI Development Pipeline V1 — bounded, evidence-first changes

## Problem being solved
Treasure Bots has automated engine and unit coverage, but code changes can still
cause unexpected Android layout, WebGL loading, and navigation regressions.
Repeated unguided AI retries waste paid model usage and can undo prior fixes.

## Status
- Existing `.github/workflows/ci.yml`: engine smoke, Vitest, TypeScript, Vite build.
- Added `.github/workflows/visual-smoke.yml`: headless Chromium on Android-sized
  viewport, real local Wrangler backend and original Three.js/Vite frontend.
- Test evidence: screenshots of home, lobby, board, world, board-return, plus
  browser diagnostics and Playwright trace on failure.
- This is **browser smoke + visual evidence**, not pixel-diff visual regression yet.
  It cannot certify the final visual quality of 3D assets or real device FPS.
- No model API is called by CI. No AI edits or deployment occur automatically.

## Use from Android
1. Open the pull request on GitHub and inspect the existing Validate Treasure Bots
   workflow and the Visual Smoke (Android viewport) workflow.
2. In its Actions run, open artifact **visual-smoke-evidence**.
3. Review five screenshots, especially clipped HUD, board alignment, sea gaps,
   wrong map renderer and Board ↔ World return.
4. Merge only after functional tests pass **and** visual evidence looks correct.
   A green CI badge alone is not visual approval.

## Agent work protocol (all future coding tasks)
1. Work on **one defect or feature per branch and PR**, never push to `main`.
2. Read `AGENTS.md`, `docs/VISUAL_STYLE_GUIDE.md`, and the relevant system spec.
3. Before editing, record expected behavior, actual failure, an exact reproduction,
   forbidden changes, and measurable acceptance criteria.
4. Change the fewest files possible. Preserve 4-player rules, server-authoritative
   game logic, 3D/fallback modes and existing touch controls unless in scope.
5. Run engine tests, unit tests, build and browser smoke. Inspect screenshot output.
6. Allow **at most two targeted AI repair attempts** per failure. If both fail,
   STOP and report root-cause hypotheses with a relevant stack trace/diff; request
   investigation rather than repeatedly re-prompting.
7. Avoid retries that simply adjust visuals by intuition. Supply before/after
   screenshots with exact viewport, scenario and camera angle.
8. The human approves merging and deployment. Do not auto-merge or auto-deploy.

## Suggested task contract

```markdown
### Goal
One observable change.

### Reproduction
Route, device/viewport, UI steps and expected vs actual.

### In scope
Exact modules/screens.

### Out of scope
Gameplay, payment, backend, other assets (unless required).

### Acceptance
- npm test
- npm run test:unit
- npm run build
- Playwright browser smoke
- Screenshots reviewed by a person, including Android when applicable

### Repair budget
Maximum 2 reasoned fixes; otherwise STOP and report evidence.
```

## Next increment (not yet implemented)
- Approved deterministic image baselines and controlled pixel/region diff.
- Ring/Lagoon/Clover × 3/4/5 gallery variants and multiple camera angles.
- Baseline changes must be reviewed; avoid auto-updating snapshots.
- Reusable diagnostic issue template for a coding agent.
- Optional AI code agent behind explicit credentials/budget limits and PR-only
  permissions; never grant a broad agent unrestricted write access.
