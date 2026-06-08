import { useEffect } from "react";
import type { PlayerStateSnapshot } from "../../../playback/playerState";

type UsePlayerFocusScopeArgs = {
  playerState: PlayerStateSnapshot["state"];
  error: string | null;
  setFocus: (id: string) => void;
  setFocusScope: (scope: string[] | null, initialFocusId?: string | null) => void;
};

export const usePlayerFocusScope = ({
  playerState,
  error,
  setFocus,
  setFocusScope,
}: UsePlayerFocusScopeArgs) => {
  useEffect(() => {
    setFocusScope(["player-"], "player-playpause");
    return () => setFocusScope(null);
  }, [setFocusScope]);

  useEffect(() => {
    if (playerState === "ERROR" || error) {
      const frame = window.requestAnimationFrame(() => setFocus("player-retry"));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [playerState, error, setFocus]);
};
