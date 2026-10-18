import Link from "next/link";
import { clerkEnabled } from "@/lib/auth";
import { storeMode } from "@/lib/data";
import { Wordmark } from "@/components/ui/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { TrendChart } from "@/components/ui/trend-chart";
import { HeroTrial } from "@/components/landing/hero-trial";
import { METRICS, METRIC_KEYS } from "@/lib/metrics";
import { IconAgent, IconAlert, IconClock } from "@/components/ui/icons";

const SAMPLE = [
  { day: 0, value: 60.9 },
  { day: 0, value: 59.7 },
  { day: 7, value: 61.4 },
  { day: 14, value: 59.2, excluded: true },
  { day: 14, value: 61.9 },
  { day: 21, value: 64.9 },
  { day: 25, value: 67.6 },
].map((p, i) => ({ ...p, excluded: Boolean(p.excluded), scanId: `sample-${i}` }));

export default function Landing() {
  const start = clerkEnabled ? "/sign-up" : "/app";
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
          <a href="#how" className="hidden rounded-full px-3 py-2 text-[15px] text-smoke hover:text-ink sm:block">
            How it works
          </a>
          <a href="#science" className="hidden rounded-full px-3 py-2 text-[15px] text-smoke hover:text-ink sm:block">
            The science
          </a>
          <Link href={clerkEnabled ? "/sign-in" : "/app"} className="rounded-full px-3 py-2 text-[15px] font-medium hover:bg-mist">
            Sign in
          </Link>
          <ButtonLink href={start} size="sm">
            Start a trial
          </ButtonLink>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="display text-[clamp(4.5rem,13vw,9.5rem)]">Is it working?</h1>
            <p className="mt-6 text-xl leading-relaxed text-ink/80 measure sm:text-[22px]">
              Verdict puts every new skincare product on trial. Scan with YouCam Skin AI on a schedule built around the product&apos;s ingredients, and get a keep-or-return verdict before the
              return window closes.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href={start} size="lg">
                Start a trial
              </ButtonLink>
              <ButtonLink href={storeMode === "demo" ? "/app/trials/t_calmfix" : "/demo"} size="lg" variant="secondary" prefetch={false}>
                Try the live demo
              </ButtonLink>
            </div>
          </div>
          <HeroTrial />
        </section>

        {/* Problem */}
        <section className="border-y border-hairline bg-vial">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:py-20">
            <div>
              <p className="display text-6xl numeral">4–12 weeks</p>
              <p className="mt-3 text-[17px] text-ink/80">is how long most actives take to show a change you could measure. Retinoids can look worse before they look better.</p>
            </div>
            <div>
              <p className="display text-6xl numeral">30 days</p>
              <p className="mt-3 text-[17px] text-ink/80">is a typical beauty return window. Most people find out whether a serum worked after they can no longer send it back.</p>
            </div>
            <div>
              <p className="display text-6xl">One selfie</p>
              <p className="mt-3 text-[17px] text-ink/80">can swing more from lighting and angle than the product does. Mirror checks and before-and-afters can&apos;t tell the difference.</p>
            </div>
          </div>
        </section>

        {/* Science */}
        <section id="science" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-28">
          <div>
            <h2 className="display text-5xl sm:text-6xl">A test, not a hunch.</h2>
            <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink/85 measure">
              <p>
                Every trial starts with two baseline scans taken a minute apart. How much they disagree is your personal noise: what the readings do when nothing has changed.
              </p>
              <p>
                From then on, a change only counts when it clears twice that noise, after the point where the ingredient is known to start working. Dim or lopsided photos are caught
                on your phone and set aside. Statistics run on YouCam&apos;s raw scores, not the friendlier display scores.
              </p>
              <p>Your daily log marks the weeks that could muddy things, like a period, a beach day or a bad night, so a rough week isn&apos;t blamed on a good product.</p>
            </div>
          </div>
          <figure className="rounded-vial border border-hairline bg-vial p-5 sm:p-7">
            <figcaption className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">Redness, Calm Fix Serum</span>
              <span className="rounded-full bg-keep-wash px-2.5 py-1 text-2xs font-semibold text-keep">Clears the noise on day 21</span>
            </figcaption>
            <div className="mt-4">
              <TrendChart label="Redness" points={SAMPLE} baseline={60.3} noise={2.2} durationDays={42} today={26} onsetDay={21} state="improving" markers={[{ day: 18, label: "period" }, { day: 20, label: "high stress" }]} />
            </div>
            <p className="mt-3 text-sm text-smoke">
              Grey band: noise from the two baselines. Hollow dot: a dim-light scan, set aside. Dots under the axis: days you logged something unusual.
            </p>
          </figure>
        </section>

        {/* How */}
        <section id="how" className="scroll-mt-20 bg-ink text-vial">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className="display text-5xl sm:text-6xl">How a trial runs.</h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
              {[
                ["Paste the label", "The agent reads the actives and works out what should change, when, what could go wrong, and whether it all fits the return window."],
                ["Two baseline scans", "Before the first use. A ghost of your first photo lines up every scan after it, so framing stays the same."],
                ["Scan on schedule", "About weekly, in a minute. YouCam Skin AI scores 12 concerns; the strip fills in as the evidence builds."],
                ["Keep or send back", "A verdict with the evidence behind it. Ditch comes with a return note; keep comes with a reorder reminder."],
              ].map(([t, d], i) => (
                <li key={t}>
                  <span className="display text-6xl text-vial/30 numeral">{i + 1}</span>
                  <p className="mt-3 text-xl font-semibold">{t}</p>
                  <p className="mt-2 text-vial/75">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Agent */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-28">
          <div>
            <h2 className="display text-5xl sm:text-6xl">It knows how skincare behaves.</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-ink/85 measure">
              The trial agent plans around the things that make skincare hard to judge: slow actives, purging, clashing routines, two products tested at once, and return deadlines that
              come before results do. It explains each decision in plain words.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              { Icon: IconAgent, tone: "bg-serum text-serum-deep", title: "Breakouts are up: this looks like purging", body: "The rise is inside the retinal's purge window and in your usual T-zone. It doesn't count against the cream. Keep going." },
              { Icon: IconAlert, tone: "bg-unsure-wash text-[#8a5d05]", title: "Clash with your toner", body: "Resurface 7% Toner has glycolic acid and is also a night product. Use it on non-retinal nights so the trial measures one thing." },
              { Icon: IconClock, tone: "bg-mist text-ink", title: "Checkpoint before the window closes", body: "A fair read takes 42 days, but returns close on day 27. I've added a checkpoint scan on day 25." },
            ].map(({ Icon, tone, title, body }) => (
              <li key={title} className="flex gap-4 rounded-vial border border-hairline bg-vial p-5">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tone}`}>
                  <Icon width={18} height={18} />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-1 block text-[15px] text-ink/80">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* YouCam */}
        <section className="border-t border-hairline">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="display text-5xl">Twelve readings per scan.</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink/85 measure">
                Every photo is scored by the YouCam Skin Analysis API, in HD when your camera allows it. Your photo is used for scoring and stays on your phone. We keep the numbers.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3 self-center text-lg sm:grid-cols-3">
              {METRIC_KEYS.map((m) => (
                <li key={m} className="border-b border-hairline pb-2">
                  {METRICS[m].label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Retail */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="rounded-vial bg-keep-wash/70 p-8 sm:p-12">
            <h2 className="display text-4xl sm:text-5xl">Good for the products that work.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink/85 measure">
              Shoppers stop guessing, and good formulas get evidence instead of refunds. A retailer can offer a guarantee backed by measurements rather than vague
              dissatisfaction, and see which products actually move which concerns.
            </p>
            <ButtonLink href={start} size="lg" className="mt-8">
              Put something on trial
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-smoke sm:px-6">
          <Wordmark />
          <p>Skin analysis by YouCam Skin AI. Not a medical device; see a dermatologist for skin conditions.</p>
        </div>
      </footer>
    </div>
  );
}
