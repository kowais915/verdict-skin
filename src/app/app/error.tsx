"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl">
      <h1 className="display text-5xl">That didn&apos;t load.</h1>
      <p className="mt-3 text-lg text-ink/80">{error.message || "Something went wrong on our side. Your trials and scans are safe."}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
