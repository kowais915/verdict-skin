import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { store } from "@/lib/data";
import { getActive } from "@/lib/agent/actives";
import { addDays, formatDay } from "@/lib/dates";
import { Vial } from "@/components/ui/vial";
import { ButtonLink } from "@/components/ui/button";
import { IconAlert, IconMoon, IconPlus, IconSun } from "@/components/ui/icons";
import type { Product } from "@/lib/types";

export const metadata: Metadata = { title: "Shelf" };

const STATUS: Record<Product["status"], { label: string; cls: string }> = {
  on_trial: { label: "On trial", cls: "bg-serum text-serum-deep" },
  kept: { label: "Proven", cls: "bg-keep-wash text-keep" },
  ditched: { label: "Sent back", cls: "bg-ditch-wash text-ditch" },
  shelf: { label: "Untested", cls: "bg-mist text-smoke" },
};

export default async function ShelfPage() {
  const viewer = await getViewer();
  const [products, trials] = await Promise.all([store.listProducts(viewer.id), store.listTrials(viewer.id)]);
  const active = products.filter((p) => p.status !== "ditched");
  const returned = products.filter((p) => p.status === "ditched");
  const am = active.filter((p) => p.slot === "am" || p.slot === "both");
  const pm = active.filter((p) => p.slot === "pm" || p.slot === "both");

  // Clashes: actives that shouldn't share a slot.
  const clashes: { a: Product; b: Product; why: string }[] = [];
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const sameSlot = a.slot === "both" || b.slot === "both" || a.slot === b.slot;
      if (!sameSlot) continue;
      for (const x of a.actives)
        for (const y of b.actives)
          if (getActive(x.key)?.clashes.includes(y.key))
            clashes.push({ a, b, why: `${getActive(x.key)!.name} and ${getActive(y.key)!.name} in the same routine` });
    }

  const untested = active.filter((p) => p.status === "shelf");
  const spentProven = products.filter((p) => p.status === "kept").reduce((s, p) => s + p.price, 0);
  const spentUntested = untested.reduce((s, p) => s + p.price, 0);

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl sm:text-6xl">Shelf</h1>
          <p className="mt-3 text-lg text-ink/80 measure">
            ${spentProven} of your routine is proven to work on your skin. ${spentUntested} hasn&apos;t been tested yet.
          </p>
        </div>
        <ButtonLink href="/app/trials/new" variant="secondary">
          <IconPlus width={18} height={18} /> Test something new
        </ButtonLink>
      </header>

      {clashes.length > 0 && (
        <section aria-labelledby="clash-h" className="rounded-vial bg-unsure-wash/70 p-5 sm:p-6">
          <h2 id="clash-h" className="flex items-center gap-2 font-semibold">
            <IconAlert /> {clashes.length === 1 ? "One clash in your routine" : `${clashes.length} clashes in your routine`}
          </h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            {clashes.map((c) => (
              <li key={`${c.a.id}-${c.b.id}-${c.why}`}>
                <span className="font-semibold">{c.a.name}</span> and <span className="font-semibold">{c.b.name}</span>: {c.why}. Alternate nights, or one cancels out the other&apos;s results.
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        {[
          { title: "Morning", Icon: IconSun, list: am },
          { title: "Night", Icon: IconMoon, list: pm },
        ].map(({ title, Icon, list }) => (
          <section key={title} aria-labelledby={`${title}-h`}>
            <h2 id={`${title}-h`} className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Icon /> {title}
            </h2>
            <ol className="mt-4 space-y-3">
              {list.map((p) => {
                const t = trials.find((x) => x.productId === p.id);
                return (
                  <li key={p.id}>
                    <Link
                      href={t ? `/app/trials/${t.id}` : "/app/trials/new"}
                      className="flex items-center gap-4 rounded-vial border border-hairline bg-vial p-4 hover:border-ink/30"
                    >
                      <Vial tint={p.tint} category={p.category} label={p.brand} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.name}</p>
                        <p className="truncate text-sm text-smoke">
                          {p.brand}
                          {p.actives.length ? `, ${p.actives.map((a) => a.label + (a.pct ? ` ${a.pct}%` : "")).join(", ")}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-2xs font-semibold ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {returned.length > 0 && (
        <section aria-labelledby="ret-h">
          <h2 id="ret-h" className="text-2xl font-semibold tracking-tight">
            Sent back
          </h2>
          <ul className="mt-3 divide-y divide-hairline">
            {returned.map((p) => {
              const t = trials.find((x) => x.productId === p.id);
              return (
                <li key={p.id} className="flex items-center gap-4 py-3">
                  <Vial tint={p.tint} category={p.category} label={p.brand} size={28} className="opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-smoke">
                      Returned to {p.retailer}
                      {t?.verdictAt ? ` on ${formatDay(t.verdictAt)}` : ""}, window was open until {formatDay(addDays(p.purchasedAt, p.returnWindowDays))}
                    </p>
                  </div>
                  <span className="display text-2xl text-ditch numeral">${p.price}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
