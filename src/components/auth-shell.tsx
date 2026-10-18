import Link from "next/link";
import { Wordmark } from "./ui/wordmark";
import { Litmus } from "./ui/litmus";
import { buttonClass } from "./ui/button";

const STRIP = [
  { day: 0, state: "baseline" as const },
  { day: 7, state: "inconclusive" as const },
  { day: 14, state: "inconclusive" as const },
  { day: 21, state: "ditch" as const },
  { day: 28, state: "ditch" as const },
];

/** Split layout shared by sign-in and sign-up. */
export function AuthShell({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-ink p-12 text-vial lg:flex">
        <Wordmark className="[&_span.display]:text-vial" />
        <div>
          <p className="display text-7xl">Ditch.</p>
          <p className="mt-4 max-w-sm text-lg text-vial/80">
            Hydration moved +1.2 points, inside the ±5 noise band. Returned with two days left on the window.
          </p>
          <Litmus cells={STRIP} size="md" className="mt-8 max-w-sm [&_.bg-ink]:bg-vial" />
        </div>
        <p className="text-sm text-vial/60">Skin analysis by YouCam Skin AI.</p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <Wordmark className="lg:hidden" />
        <div className="m-auto w-full max-w-md py-10">
          <h1 className="display text-5xl">{title}</h1>
          <p className="mt-3 text-lg text-ink/80">{body}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-sm text-smoke">
            Just looking?{" "}
            <a href="/demo" className="font-semibold text-ink underline underline-offset-4">
              Try the demo without an account
            </a>
            . It comes with a month of sample trials and runs real YouCam scans.
          </p>
        </div>
      </main>
    </div>
  );
}

export function DemoAuthNote() {
  return (
    <div className="rounded-vial border border-hairline bg-vial p-6">
      <p className="font-semibold">Sign-in isn&apos;t set up on this copy.</p>
      <p className="mt-1 text-[15px] text-smoke">
        Add your Clerk keys to <code className="rounded bg-mist px-1.5 py-0.5 text-sm">.env.local</code> to turn on accounts. Until then you can explore with a demo account that already has trials running.
      </p>
      <Link href="/app" className={buttonClass("primary", "lg", "mt-5 w-full")}>
        Continue with the demo account
      </Link>
    </div>
  );
}
