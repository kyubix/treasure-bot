# Treasure Bots — Mobile Multiplayer Board Game (Rebuild v0.2 preview)

An **original-art prototype** inspired by the board, robot-exploration and gallery-economy design of the 1999 PlayStation game *Glint Glitters*. No Konami characters, audio, graphics, original code or trademarks are included.

**Current status:** faithful gameplay vertical-slice rebuild (experimental), **not** a faithful/complete recreation yet. Contains original-source documented robot base stats and 20% gallery base fee. The board geometry, treasure tables, probabilistic exploration, shop rewards, prices, victory threshold and event effects are **provisional** until verified against primary gameplay evidence. The code intentionally keeps gameplay rules isolated for future revision.

## Implemented

- Responsive Phaser 3 board with independently visible perimeter and 5×5 inner exploration map (provisional map layout).
- Create/join private room (2–4 total players), guest session tokens and invite URLs.
- Authoritative two-dice rolls, turns, cash, galleries, visit fees, assets and win condition.
- Spatial robot missions with selectable treasure targets, travel → search/battle → return → inventory, 7 documented robot chassis base stats. Travel/search/battle equations are provisional.
- CPU opponents, live multiplayer synchronization via Cloudflare Durable Object WebSockets.
- Durable Object state persistence, reconnect snapshots and polling fallback.
- Indonesian, English and Japanese interface strings; locale selection per client.
- Basic automated engine tests (dependency-free smoke suite plus Vitest suite).

## Not implemented / needs verification

- Exact four original map layouts and tile positions; original map textures. The new 5×5 board is a demonstration, not a PS1 reconstruction.
- All 1,024 treasure identities, set bonuses, prices, robot component customization.
- Real original Search/Walk/Battle equations, terrain grades and trouble probabilities.
- Treasure Keepers, robot-versus-robot battles, detailed tournaments and missions.
- Accurate PS1 turn phase ordering, all original events and local multiplayer. Gallery color assignments in the demo are provisional.
- Security/production hardening: authentication model, anti-abuse, rate limiting, operation idempotency and advanced reconnection.

## Run on local PC

Prerequisites: Node.js 22+ and an accessible Cloudflare Wrangler runtime.

```bash
npm install
npm test
npm run build
npm run dev
```

`npm test` also runs without `npm install` on Node 22+ (using built-in TypeScript stripping). `npm run test:unit` runs the additional Vitest test suite after installing dependencies.

`npm run dev` performs a build then starts a local Wrangler worker serving **both the frontend and backend** at `http://localhost:8787`. Open two browser tabs, create a room in one and join the code from the other. To change frontend code with HMR, run `npm run dev:ui` in a separate terminal while `wrangler dev` is running on port 8787.

## Deploy to Cloudflare

```bash
npx wrangler login
npm run deploy
```

Cloudflare account, selected worker hostname, and any build/deployment settings must be configured by the owner. No account credentials are bundled. Worker serves static assets from `dist/` alongside the Durable Object API. A new namespace uses SQLite via `new_sqlite_classes`.

For GitHub CI, configure a Cloudflare API token with Workers Scripts editing permissions and account ID in GitHub Secrets, and add a workflow with `npm install && npm test && npm run deploy`. Automatic CI deployment is intentionally not enabled until the account is selected.

## Project layout

- `src/engine/`: deterministic game rules, action handling and data models.
- `src/server/worker.ts`: HTTP API, room Durable Object and WebSocket sync.
- `src/client/`: Phaser board and responsive mobile UI.
- `tests/`: Vitest game rules.

## Roadmap

1. Validate original PS1 game data using authorized gameplay recordings, then replace provisional balance tables.
2. Expand deterministic robot simulation: destinations, terrain A–D, parts, energy, trouble, Search, Battle, Treasure Keepers.
3. Build gallery sets and the full catalog; reproduce four boards, shops, tournaments and card effects.
4. Harden multiplayer: validated commands, transaction retries, command IDs, rate limiting, idle room cleanup, observability.
5. Add PWA installability, audio options, accessibility, rich animations and cross-browser mobile tests.

## License

Source in this package is original for this prototype. Do not incorporate the source assets of the referenced commercial game without rights clearance. Choose your own license before making the GitHub repository public.
