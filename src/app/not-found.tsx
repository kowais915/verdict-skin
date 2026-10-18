import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4">
      <Wordmark />
      <h1 className="display mt-10 text-6xl">Nothing here.</h1>
      <p className="mt-3 text-lg text-ink/80">That page doesn&apos;t exist, or the trial was removed.</p>
      <ButtonLink href="/app" className="mt-8 self-start">
        Go to today
      </ButtonLink>
    </main>
  );
}
