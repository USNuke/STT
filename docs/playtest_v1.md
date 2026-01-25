# Star Trek Ascendancy – Companion App (Playtest v1)

This document captures the rules and tracking requirements for the desktop companion app.

## Purpose

- Desktop companion app for a modified, co-op / competitive version of Star Trek Ascendancy.
- Tracks state, resources, and turn structure to reduce bookkeeping.
- Does **not** simulate combat.

## Seats (Players)

- Exactly 3 seats.
- Seats represent players, not factions.
- Seats never change ownership mid-game.

Default seat names:

1. Jason
2. Christine
3. Jacob

## Empires (Civilizations)

An Empire represents a faction/civilization. A seat may control multiple empires.

Each empire tracks:

- `id`
- `name`
- `civilization`
- `ascendancyTokens` (int ≥ 0)
- `commandTokens` (int ≥ 0)
- `resources`
  - `production` (P)
  - `research` (R)
  - `culture` (C)
  - `dollars` ($)
- `starbases` (int ≥ 0)
- `weaponLevel` (int ≥ 0)
- `shieldLevel` (int ≥ 0)
- `systems[]` (owned star systems)

### Civilization List

The following civilizations must be selectable everywhere:

- Federation
- Klingon
- Romulan
- Cardassian
- Ferengi
- Dominion
- Borg
- Andorian
- Vulcan
- Custom / Other

Borg must be valid system owners.

## Star Systems

A star system is defined as:

```json
{
  "name": "Vulcan",
  "production": 1,
  "research": 2,
  "culture": 0,
  "control": 1
}
```

Node meanings:

- Production (P) → generates Production resources
- Research (R) → generates Research resources
- Culture (C) → generates Culture resources
- Control (CTRL) → generates Dollars ($)

### Ownership

A system is either:

- Owned by an Empire
- Unowned

Rules:

- Unowned systems are tracked globally.
- Systems can be added as unowned, claimed, edited, transferred, or returned to unowned.

## Turn Structure

### Rounds

- Game progresses in rounds (integer, starting at 1).
- Advancing to the next round increments the round and resets phase to Initiative.

### Phases

Each round has exactly four phases, in order:

1. Initiative
2. Command
3. Building
4. Recharge

Phase navigation supports previous/next with cyclic wrapping, with manual override allowed.

### Initiative

- Each seat receives a unique rank: 1, 2, 3 (lower = earlier).
- Stored per round.
- Manual selection or randomized shuffle.
- Random initiative sets active seat/empire to first in order.

Displayed as: `Jason > Christine > Jacob`

## Production & Resources

### Node Totals

For each empire, sum all node values across owned systems.

### Earnings Calculation (Building Phase)

Default MVP rule:

| Node Type | Generates |
| --- | --- |
| Production | +1 P |
| Research | +1 R |
| Culture | +1 C |
| Control | +1 $ |

Earnings popup:

- Displays per-empire breakdown.
- Requires explicit Apply.
- Cancel = no changes.

### Resource Tracking

Resources persist across rounds. Manual adjustment with plus/minus for Dollars, P, R, C.

## Empire Military Stats

Track manual counters:

- `starbases`
- `weaponLevel`
- `shieldLevel`

### Defensive Strength (informational)

Formula:

```
Defense Strength =
  (Starbases × 10)
+ (Weapon Level × 2)
+ (Shield Level × 2)
+ (Total Control Nodes)
```

UI Requirements:

- Select target empire.
- Display final numeric value and formula breakdown.

## Active Empire & UI Theme

One empire is marked as active:

- Determines UI accent color and top bar styling.
- Active empire can be selected manually.
- Random initiative sets active empire automatically.
- Theme colors derived from civilization.

## Logging

Append-only log with timestamps. Log entries include:

- Game start
- Round changes
- Phase changes
- Initiative set/randomized
- Empire added/edited
- System added/edited/transferred/deleted
- Earnings applied

Log features:

- Copy to clipboard
- Export to .txt

## Persistence

### Autosave

Autosave after every state-changing action.

### Export / Import

- Export full state as JSON.
- Import restores entire game state.
- Import validates structure and backfills missing fields safely.

### Reset

Reset to default 3-seat initial state.

## Non-Functional Requirements

- Desktop application (Windows 10/11)
- Offline
- No browser required
- No raw code rendered in UI
- No broken buttons
- No pop-up blocking issues
- Stable rendering

## Explicit Non-Goals (v1)

- No combat simulation
- No dice rolling
- No AI opponents
- No networking
- No rules enforcement beyond tracking

## Guiding Principle

This app is a state tracker, not a rules engine. Favor clarity, stability, and explicit user control over automation.
