import { useEffect } from "react";

type UseTvBackOptions = {
  capture?: boolean;
};

type TizenHwKeyEvent = Event & {
  keyName?: string;
};

const isBackKey = (event: KeyboardEvent) => {
  return (
    event.key === "Backspace" ||
    event.key === "Escape" ||
    event.key === "BrowserBack" ||
    event.key === "GoBack" ||
    event.keyCode === 10009
  );
};

export const useTvBack = (
  onBack: () => void,
  enabled: boolean = true,
  options: UseTvBackOptions = {}
) => {
  const { capture = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleBack = (event: KeyboardEvent) => {
      if (!isBackKey(event)) return;

      event.preventDefault();
      event.stopPropagation();
      onBack();
    };

    const handleTizenBack = (event: TizenHwKeyEvent) => {
      if (event.keyName !== "back") return;
      event.preventDefault();
      event.stopPropagation();
      onBack();
    };

    window.addEventListener("keydown", handleBack, { capture });
    window.addEventListener("tizenhwkey", handleTizenBack as EventListener, { capture });
    return () => {
      window.removeEventListener("keydown", handleBack, { capture });
      window.removeEventListener("tizenhwkey", handleTizenBack as EventListener, { capture });
    };
  }, [capture, enabled, onBack]);
};
