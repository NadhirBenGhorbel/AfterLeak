import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuthProvider } from "./lib/auth-context";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPreload: "intent",
  });

  return router;
};

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);
