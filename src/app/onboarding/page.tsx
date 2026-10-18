import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { Wordmark } from "@/components/ui/wordmark";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const viewer = await getViewer({ allowNew: true });
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
        <Wordmark />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <Onboarding profile={viewer} />
      </main>
    </div>
  );
}
