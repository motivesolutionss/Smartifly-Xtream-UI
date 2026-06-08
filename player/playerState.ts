export type PlayerState =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "PLAYING"
  | "PAUSED"
  | "BUFFERING"
  | "SEEKING"
  | "ENDED"
  | "ERROR"
  | "RELEASING";

export type PlayerStateSnapshot = {
  state: PlayerState;
  errorMessage?: string;
};
