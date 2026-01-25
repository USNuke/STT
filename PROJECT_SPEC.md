# Star Trek Ascendancy – Companion App

## Project Specification (Playtest v1)

## 1. Purpose

This application is a **desktop companion app** for playtesting a modified, co-op / competitive version of **Star Trek Ascendancy**.

The app **does not simulate combat**.
It **tracks state**, **resources**, and **turn structure** to reduce bookkeeping overhead.

Target audience:

* 3 human players
* No NPCs
* Tabletop play with physical components

---

## 2. Core Game Concepts

### 2.1 Seats (Players)

* There are **exactly 3 Seats**.
* Seats represent *players*, not factions.
* Each Seat:

  * Has a **Seat Name**
  * Controls **1 or more Empires**

Default seat names:

* Seat 1: Jason
* Seat 2: Christine
* Seat 3: Jacob

Seats never change ownership mid-game.

---

### 2.2 Empires (Civilizations)

* An **Empire** represents a faction/civilization.
* A Seat may control **multiple Empires** (takeovers, alliances, Borg assimilation, etc).

Each Empire has:

* `id`
* `name`
* `civilization` (string)
* `ascendancyTokens` (int ≥ 0)
* `commandTokens` (int ≥ 0)
* `resources`:

  * `production (P)`
  * `research (R)`
  * `culture (C)`
  * `dollars ($)`
* `starbases` (int ≥ 0)
* `weaponLevel` (int ≥ 0)
* `shieldLevel` (int ≥ 0)
* `systems[]` (owned star systems)

---

### 2.3 Civilization List

The following civilizations must be selectable everywhere:

* Federation
* Klingon
* Romulan
* Cardassian
* Ferengi
* Dominion
* Borg
* Andorian
* Vulcan
* Custom / Other

Borg **must** be valid system owners.

---

## 3. Star Systems

### 3.1 System Definition

A **Star System** is defined as:

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

* **Production (P)** → generates Production resources
* **Research (R)** → generates Research resources
* **Culture (C)** → generates Culture resources
* **Control (CTRL)** → generates Dollars ($)

---

### 3.2 System Ownership

A system is either:

* **Owned by an Empire**
* **Unowned**

Rules:

* Unowned systems are tracked globally
* Systems can be:

  * Added as Unowned
  * Claimed by an Empire
  * Edited (nodes changed)
  * Transferred between Empires
  * Returned to Unowned

---

## 4. Turn Structure

### 4.1 Rounds

* Game progresses in **Rounds** (integer, starting at 1).
* Advancing to the next round:

  * Increments Round
  * Resets Phase to **Initiative**

---

### 4.2 Phases

Each Round has exactly four phases, in order:

1. Initiative
2. Command
3. Building
4. Recharge

Phase navigation:

* Previous / Next Phase buttons
* Wraps cyclically
* Manual override allowed (GM authority)

---

### 4.3 Initiative

Initiative is determined **each round**.

Rules:

* Each Seat receives a **unique rank**: `1`, `2`, `3`
* Lower number = earlier turn
* Stored per round

Two methods:

1. **Manual selection** (dropdowns)
2. **Random Initiative Button**

   * Randomly shuffles the 3 Seats
   * Assigns ranks automatically
   * Sets “active” Seat/Empire to first in order

Initiative is displayed as:

```
Jason > Christine > Jacob
```

---

## 5. Production & Resources

### 5.1 Node Totals

For each Empire:

* Sum all node values across owned systems

---

### 5.2 Earnings Calculation (Building Phase)

Default MVP rule:

| Node Type  | Generates |
| ---------- | --------- |
| Production | +1 P      |
| Research   | +1 R      |
| Culture    | +1 C      |
| Control    | +1 $      |

Earnings popup:

* Displays per-Empire breakdown
* Requires explicit **Apply**
* Cancel = no changes

---

### 5.3 Resource Tracking

Resources persist across rounds.

Manual adjustment:

* Plus / minus buttons for:

  * Dollars
  * P
  * R
  * C

No automatic spending logic (v1).

---

## 6. Empire Military Stats

Each Empire tracks:

* `starbases`
* `weaponLevel`
* `shieldLevel`

These are **manual counters** (GM/player controlled).

---

### 6.1 Defensive Strength Calculation

Displayed as **informational only**.

MVP Formula:

```
Defense Strength =
  (Starbases × 10)
+ (Weapon Level × 2)
+ (Shield Level × 2)
+ (Total Control Nodes)
```

UI Requirements:

* Select Target Empire
* Display:

  * Final numeric value
  * Formula breakdown text

---

## 7. Active Empire & UI Theme

* One Empire is marked as **Active**
* Active Empire determines:

  * UI accent color
  * Top bar styling

Rules:

* Active Empire can be manually selected
* Random Initiative sets Active Empire automatically
* Theme colors are derived from civilization

---

## 8. Logging

The app maintains an append-only log with timestamps.

Log entries include:

* Game start
* Round changes
* Phase changes
* Initiative set/randomized
* Empire added/edited
* System added/edited/transferred/deleted
* Earnings applied

Log features:

* Copy to clipboard
* Export to `.txt`

---

## 9. Persistence

### 9.1 Autosave

* Autosave after every state-changing action

### 9.2 Export / Import

* Export full state as JSON
* Import restores **entire game state**
* Import must:

  * Validate structure
  * Backfill missing fields safely

### 9.3 Reset

* Resets to default 3-seat initial state

---

## 10. Non-Functional Requirements

* Desktop application (Windows 10/11)
* Offline
* No browser required
* No raw code rendered in UI
* No broken buttons
* No pop-up blocking issues
* Stable rendering

---

## 11. Explicit Non-Goals (v1)

* No combat simulation
* No dice rolling
* No AI opponents
* No networking
* No rules enforcement beyond tracking

---

## 12. Guiding Principle for Codex

> **This app is a state tracker, not a rules engine.**
> Favor clarity, stability, and explicit user control over automation.

---

If you want, next I can:

* Split this into **multiple markdown files** (`systems.md`, `initiative.md`, etc.)
* Add a **JSON schema** Codex can validate against
* Convert this directly into a **.NET WPF design spec** or **PySide UI layout spec**

Just say the word.
