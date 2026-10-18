"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadSampleData } from "@/app/app/actions";
import { Button } from "./ui/button";

/** Loads a realistic month of trials, scans and logs so every screen can be explored right away. */
export function SampleDataButton({
  label = "Explore with sample trials",
  then = "/app",
  variant = "secondary",
  size = "md",
}: {
  label?: string;
  then?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await loadSampleData();
          router.push(then);
          router.refresh();
        })
      }
    >
      {pending ? "Loading sample trials…" : label}
    </Button>
  );
}
