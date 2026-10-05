import { Compass } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

/** Catches render errors and failed lazy-route loads, so the user never sees a blank page. */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  return (
    <div className="mx-auto max-w-lg py-12">
      <ErrorState error={error} onRetry={() => window.location.reload()} />
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="font-mono text-sm text-accent-text">404</p>
      <h1 className="mt-2 text-2xl font-semibold">This page wandered off</h1>
      <p className="mt-2 text-fg-muted">The link may be old, or the page may have moved.</p>
      <Button asChild variant="primary" className="mt-6">
        <Link to="/">
          <Compass className="size-4" aria-hidden="true" />
          Back to events
        </Link>
      </Button>
    </div>
  );
}
