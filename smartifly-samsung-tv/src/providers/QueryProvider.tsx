import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

type QueryProviderProps = {
  children: ReactNode;
};

export const QueryProvider = ({ children }: QueryProviderProps) => {
  useEffect(() => {
    const handleOnline = () => {
      void appQueryClient.invalidateQueries({
        predicate: (query) => query.state.status === "error",
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return <QueryClientProvider client={appQueryClient}>{children}</QueryClientProvider>;
};

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 2_000,
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
