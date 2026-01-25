import { Empire, GameState, InitiativeOrder, Phase, Seat, StarSystem } from "./types";

const PHASES: Phase[] = ["Initiative", "Command", "Building", "Recharge"];

export function nextPhase(current: Phase): Phase {
  const index = PHASES.indexOf(current);
  const nextIndex = (index + 1) % PHASES.length;
  return PHASES[nextIndex];
}

export function previousPhase(current: Phase): Phase {
  const index = PHASES.indexOf(current);
  const previousIndex = (index - 1 + PHASES.length) % PHASES.length;
  return PHASES[previousIndex];
}

export function buildInitiativeOrder(seats: Seat[]): InitiativeOrder[] {
  return seats.map((seat, index) => ({ seatId: seat.id, rank: index + 1 }));
}

export function randomizeInitiative(seats: Seat[]): InitiativeOrder[] {
  const shuffled = [...seats];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return buildInitiativeOrder(shuffled);
}

export function initiativeDisplay(order: InitiativeOrder[], seats: Seat[]): string {
  const seatById = new Map(seats.map((seat) => [seat.id, seat]));
  return order
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => seatById.get(entry.seatId)?.name ?? entry.seatId)
    .join(" > ");
}

export function calculateSystemTotals(systems: StarSystem[]) {
  return systems.reduce(
    (totals, system) => {
      totals.production += system.production;
      totals.research += system.research;
      totals.culture += system.culture;
      totals.control += system.control;
      return totals;
    },
    { production: 0, research: 0, culture: 0, control: 0 }
  );
}

export function calculateEmpireEarnings(empire: Empire) {
  const totals = calculateSystemTotals(empire.systems);
  return {
    production: totals.production,
    research: totals.research,
    culture: totals.culture,
    dollars: totals.control,
  };
}

export function applyEarnings(empire: Empire) {
  const earnings = calculateEmpireEarnings(empire);
  return {
    ...empire,
    resources: {
      production: empire.resources.production + earnings.production,
      research: empire.resources.research + earnings.research,
      culture: empire.resources.culture + earnings.culture,
      dollars: empire.resources.dollars + earnings.dollars,
    },
  };
}

export function calculateDefenseStrength(empire: Empire): number {
  const totals = calculateSystemTotals(empire.systems);
  return (
    empire.starbases * 10 +
    empire.weaponLevel * 2 +
    empire.shieldLevel * 2 +
    totals.control
  );
}

export function transferSystem(
  source: Empire | null,
  target: Empire | null,
  systemId: string,
  unownedSystems: StarSystem[]
) {
  const pullFrom = (systems: StarSystem[]) => {
    const index = systems.findIndex((system) => system.id === systemId);
    if (index === -1) {
      return { system: null, systems };
    }
    const [system] = systems.splice(index, 1);
    return { system, systems };
  };

  let system: StarSystem | null = null;

  if (source) {
    const result = pullFrom([...source.systems]);
    system = result.system;
    source.systems = result.systems;
  } else {
    const result = pullFrom([...unownedSystems]);
    system = result.system;
    unownedSystems = result.systems;
  }

  if (!system) {
    return { source, target, unownedSystems };
  }

  if (target) {
    target.systems = [...target.systems, system];
  } else {
    unownedSystems = [...unownedSystems, system];
  }

  return { source, target, unownedSystems };
}

export function advanceRound(state: GameState): GameState {
  return {
    ...state,
    round: state.round + 1,
    phase: "Initiative",
  };
}
