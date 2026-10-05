import { createBrowserRouter } from "react-router";

import { Layout } from "./Layout";
import { NotFound, RouteError } from "./RouteError";

/**
 * Each page is its own chunk (route-level code splitting). Visitors never
 * download the organiser form or the admin queue.
 */
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    // Shown for the split second while the first page's chunk downloads.
    hydrateFallbackElement: <div className="min-h-dvh bg-canvas" aria-busy="true" />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: page(() => import("@/features/events/DiscoverPage")) },
          { path: "events/:eventId", lazy: page(() => import("@/features/events/EventDetailPage")) },
          { path: "organiser", lazy: page(() => import("@/features/organiser/OrganiserDashboard")) },
          { path: "organiser/events/new", lazy: page(() => import("@/features/organiser/EventEditorPage")) },
          { path: "organiser/events/:eventId/edit", lazy: page(() => import("@/features/organiser/EventEditorPage")) },
          { path: "admin", lazy: page(() => import("@/features/admin/ReviewQueuePage")) },
          { path: "admin/activity", lazy: page(() => import("@/features/admin/ActivityPage")) },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
