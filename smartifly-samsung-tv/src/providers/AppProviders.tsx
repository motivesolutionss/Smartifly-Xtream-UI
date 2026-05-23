import type { ReactNode } from "react";
import { FocusProvider } from "./FocusProvider";
import { QueryProvider } from "./QueryProvider";

type AppProvidersProps = {
  children: ReactNode;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <QueryProvider>
      <FocusProvider>{children}</FocusProvider>
    </QueryProvider>
  );
};
