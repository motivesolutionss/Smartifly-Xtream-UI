import { useContext, useMemo, useSyncExternalStore } from "react";
import { FocusContext } from "./focusContext";

const getServerSnapshot = () => null;

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useFocus must be used within a FocusProvider");
  }

  const focusedId = useSyncExternalStore(
    context.subscribe,
    context.getFocusedId,
    getServerSnapshot
  );

  return useMemo(
    () => ({
      focusedId,
      setFocus: context.setFocus,
      setFocusScope: context.setFocusScope,
      registerElement: context.registerElement,
      unregisterElement: context.unregisterElement,
    }),
    [context, focusedId]
  );
};

export const useFocusActions = () => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useFocusActions must be used within a FocusProvider");
  }
  return context;
};

export const useIsFocused = (id: string) => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useIsFocused must be used within a FocusProvider");
  }

  return useSyncExternalStore(
    context.subscribe,
    () => context.getFocusedId() === id,
    () => false
  );
};
