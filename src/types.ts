export type Civilization =
  | "Federation"
  | "Klingon"
  | "Romulan"
  | "Cardassian"
  | "Ferengi"
  | "Dominion"
  | "Borg"
  | "Andorian"
  | "Vulcan"
  | "Custom / Other";

export type Phase = "Initiative" | "Command" | "Building" | "Recharge";

export type SeatId = "seat-1" | "seat-2" | "seat-3";

export interface Resources {
  production: number;
  research: number;
  culture: number;
  dollars: number;
}

export interface StarSystem {
  id: string;
  name: string;
  production: number;
  research: number;
  culture: number;
  control: number;
}

export interface Empire {
  id: string;
  name: string;
  civilization: Civilization;
  ascendancyTokens: number;
  commandTokens: number;
  resources: Resources;
  starbases: number;
  weaponLevel: number;
  shieldLevel: number;
  systems: StarSystem[];
}

export interface Seat {
  id: SeatId;
  name: string;
  empireIds: string[];
}

export interface InitiativeOrder {
  seatId: SeatId;
  rank: number;
}

export interface GameState {
  round: number;
  phase: Phase;
  seats: Seat[];
  empires: Empire[];
  unownedSystems: StarSystem[];
  initiative: InitiativeOrder[];
  activeEmpireId: string | null;
  log: string[];
}
