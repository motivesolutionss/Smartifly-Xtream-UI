import { useEffect } from "react";

type UsePlayerRootClassesArgs = {
  isBrowserMode: boolean;
};

export const usePlayerRootClasses = ({ isBrowserMode }: UsePlayerRootClassesArgs) => {
  useEffect(() => {
    const classNames = ["smartifly-player-active"];
    if (!isBrowserMode) {
      classNames.push("smartifly-avplay-active");
    }

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    classNames.forEach((className) => {
      html.classList.add(className);
      body.classList.add(className);
      root?.classList.add(className);
    });

    return () => {
      classNames.forEach((className) => {
        html.classList.remove(className);
        body.classList.remove(className);
        root?.classList.remove(className);
      });
    };
  }, [isBrowserMode]);
};
