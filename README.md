# Star Trek Ascendancy Companion App (Playtest v1)

This repository contains the companion app spec and starter state/logic helpers for a desktop tracker that supports the homebrew playtest rules.

## Contents

- `docs/playtest_v1.md` — Full playtest requirements and rules summary.
- `src/types.ts` — Data model types for seats, empires, systems, and game state.
- `src/logic.ts` — Pure helpers for phases, initiative, earnings, and defense strength calculations.
- `src/defaultState.ts` — Default game state with the three seat names.

## Goals

- Track state, resources, and turn structure.
- Provide clarity and explicit user control.
- Avoid combat simulation or rules enforcement.
