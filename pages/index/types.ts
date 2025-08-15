export type TileState = "correct" | "partial" | "incorrect" | "empty";

export interface Motion {
  command: string;
  state: TileState;
}

export interface Attempt {
  motions: Motion[];
  timestamp?: number;
}

export interface GameState {
  attempts: Attempt[];
  currentAttempt: number;
  maxAttempts: number;
  targetMotions: string[];
  isComplete: boolean;
  isWon: boolean;
}