# Star Trek Ascendancy Companion App

This repository contains a desktop companion app for tracking state in a modified Star Trek Ascendancy playtest.
The app focuses on bookkeeping: seats, empires, systems, resources, phases, and logs.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Electron app:
   ```bash
   npm start
   ```

## Features (Playtest v1)

- Configurable player count (1–5) with optional Borg/Dominion NPC seats.
- Empire tracking with civilization presets and active empire theming.
- Star system tracking with editable node values and ownership.
- Round and phase controls with initiative ordering.
- Seat-focused player interface summary for quick reference.
- Seat-level fleet counters for attack shuttles, frigates, and capital ships.
- Earnings calculation popup for Building phase.
- Persistent state via localStorage with JSON import/export.
- Append-only log with clipboard and export support.

## Notes

- This MVP does not simulate combat or enforce rules beyond tracking.
- Intended for offline, desktop playtesting.
