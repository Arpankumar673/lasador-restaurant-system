"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Flame, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("L'Asador Application Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center bg-asador-bg">
      <div className="mx-auto max-w-md space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-asador-surface border border-asador-border">
          <Flame className="h-8 w-8 text-asador-ember" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-asador-parchment">
            Something went awry at the hearth
          </h2>
          <p className="text-sm text-asador-silver leading-relaxed">
            {error.message ||
              "An unexpected error occurred while processing your request. Please try again."}
          </p>
        </div>

        <div className="flex justify-center">
          <Button variant="default" onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rekindle (Try Again)
          </Button>
        </div>
      </div>
    </div>
  );
}
