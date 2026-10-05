import "./styles/index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Tooltip } from "radix-ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { router } from "./app/router";
import { ViewerProvider } from "./features/role/viewer";
import { ThemeProvider } from "./features/theme/theme";
import { ApiError } from "./lib/api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only transient failures; a 404 or 403 won't fix itself.
      retry: (failureCount, error) => error instanceof ApiError && error.isTransient && failureCount < 2,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ViewerProvider>
          {/* Honour the OS "reduce motion" setting for every motion component. */}
          <MotionConfig reducedMotion="user">
            <Tooltip.Provider delayDuration={200}>
              <RouterProvider router={router} />
            </Tooltip.Provider>
          </MotionConfig>
        </ViewerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
