# Faithful Gameplay Rebuild — gap analysis and acceptance criteria

**Status:** the existing v0.1 is a generic prototype, NOT a faithful reproduction. This branch is isolated from main until reviewed and tested. This plan is evidence-oriented, and does not claim that unknown PS1 formulas have been reproduced.

## Verified gameplay to preserve

1. Human characters move around the perimeter using two dice; robots explore spatial destinations inside the island.
2. Treasure exploration supports **treasure-icon targeting** and **location targeting**. Normal treasure needs travel followed by search. Treasure Keepers trigger battles on encounter and can award treasure without a separate search action.
3. Robots have E/W/S/B attributes, swappable head/body/arm/leg parts, A–D terrain suitability, tools for terrain trouble, energy and forced return when damaged.
4. Player-color galleries can display at most 10 treasures each. Opponents landing on them pay a base fee of 20% of displayed treasure value, subject to modifiers and G-Ticket protection. Galeries are not generic purchasable properties.
5. Shops are accessible when passed or landed on; they sell robot parts, equipment and items, and allow treasure selling. Stop on the shop gives loyalty points.
6. Robot Center awards starting money on pass and twice starting money on exact stop. Events may change gallery fee multipliers, reverse direction, skip turns, launch missions, or competitions.
7. Victory settings should distinguish asset threshold and turn limit where supported.

## Current implementation v0.1 — critical differences

- `src/client/board.ts` draws a fixed 28-tile geometric border with decorative center; there is **no playable inner exploration map**.
- `SEND_ROBOT` chooses only three terrains, does not choose a destination in map coordinates; `robotTick` auto-resolves treasure after exactly 2 turns at a hardcoded 70% success rate.
- `CLAIM_GALLERY` purchases unowned galleries for 800G, unlike color-associated showrooms in the original.
- Robot W/S/B stats have no substantive effect on exploration; there is no keeper fight, terrain trouble, tools or robot part system.
- Landing on `SHOP` gives a free card; the source-original purchasing interaction is missing.
- Passed Robot Center awards fixed 500G and exact stop awards fixed 200G, instead of proportional starting cash.
- Event system consists of three generic outcomes rather than original varied game events.

## Non-negotiable acceptance tests for faithful vertical slice

- [ ] A game screen exposes **two distinct linked play spaces** (perimeter and an inner map), and 2–4 player pieces remain visible independently of robot locations.
- [ ] Tap a visible treasure icon to inspect target, distance, terrain and associated risk; select it as a launch destination. Also support choosing an unmarked location.
- [ ] Robot visibly moves across inner map over player turns; movement can be interrupted by trouble.
- [ ] Non-keeper treasure requires arrival then search; keeper encounter resolves a battle based on robot capability.
- [ ] Robot's carried finds remain distinct from displayed gallery treasures; retrieval/delivery has a clear gameplay event.
- [ ] Galeries are associated with player colors and have item display management with capacity 10; payment calculation uses 20% before event modifiers.
- [ ] Shop is accessible when landed on **or passed** and purchases deduct cash.
- [ ] Two-dice movement triggers Center, Shop, Support, Event and Gallery at the correct time.
- [ ] Cloudflare server remains authoritative on dice, rewards, ownership, money and battles.
- [ ] UI supports Android touch input, and English/Indonesian/Japanese strings.
- [ ] Tests prove movement, delivery, keeper battle, shop access, gallery transfer and reconnect.
- [ ] All assumptions not established by original-game evidence are flagged as **PROVISIONAL**, never described as original rule.

## Technical approach

Refactor `src/engine/types.ts` into an explicit `IslandMap` (two linked layers), `RobotState` (coordinates, mission, carried treasure, equipment), `GalleryState` and `TurnPhase`. Keep all mechanics deterministic so the DO can apply each command transactionally. Implement the map visually before adding thousands of treasure entries.

Source research:
- https://ja.wikipedia.org/wiki/%E3%82%B0%E3%83%AA%E3%83%B3%E3%83%88%E3%82%B0%E3%83%AA%E3%83%83%E3%82%BF%E3%83%BC
- https://ameblo.jp/b8a8l8l8r8o8o8m8/entry-12211956601.html
- https://mimora.mimoza.jp/yao_game/retro/contents/ctg_main/memorandum/PS/detail/gmr_PS-0008.php

No copyrighted game assets, original artwork, audio, or code to be copied.
