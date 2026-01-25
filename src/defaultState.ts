import { GameState } from "./types";
import { buildInitiativeOrder } from "./logic";

export const defaultState: GameState = {
  round: 1,
  phase: "Initiative",
  seats: [
    { id: "seat-1", name: "Jason", empireIds: [] },
    { id: "seat-2", name: "Christine", empireIds: [] },
    { id: "seat-3", name: "Jacob", empireIds: [] },
  ],
  empires: [],
  unownedSystems: [],
  initiative: [],
  activeEmpireId: null,
  log: ["Game start"],
};

export function buildDefaultState(): GameState {
  return {
    ...defaultState,
    initiative: buildInitiativeOrder(defaultState.seats),
  };
}
