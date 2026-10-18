import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { store } from "@/lib/data";
import { formatDay, today } from "@/lib/dates";
import { CheckInForm } from "./checkin-form";

export const metadata: Metadata = { title: "Log" };

export default async function LogPage() {
  const viewer = await getViewer();
  const checkIns = await store.listCheckIns(viewer.id);
  const T = today();
  const todays = checkIns.find((c) => c.date === T);
  const history = checkIns.filter((c) => c.date !== T).slice(0, 21);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section>
        <h1 className="display text-5xl sm:text-6xl">Today&apos;s log</h1>
        <p className="mt-3 text-lg text-ink/80 measure">
          Thirty seconds a day. These show up as markers on your trial charts, so a rough week gets the blame instead of a good product.
        </p>
        <div className="mt-8">
          <CheckInForm date={T} existing={todays} />
        </div>
      </section>

      <section aria-labelledby="hist-h">
        <h2 id="hist-h" className="text-2xl font-semibold tracking-tight">
          Last three weeks
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead className="text-sm text-smoke">
              <tr>
                <th className="py-2 pr-3 font-medium">Day</th>
                <th className="py-2 pr-3 font-medium">Sleep</th>
                <th className="py-2 pr-3 font-medium">Stress</th>
                <th className="py-2 pr-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {history.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 pr-3 whitespace-nowrap numeral">{formatDay(c.date)}</td>
                  <td className={`py-2.5 pr-3 numeral ${c.sleepHours < 6 ? "font-semibold text-ditch" : ""}`}>{c.sleepHours}h</td>
                  <td className="py-2.5 pr-3">
                    <span className="flex gap-0.5" aria-label={`Stress ${c.stress} of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={`h-3 w-1.5 rounded-sm ${n <= c.stress ? (c.stress >= 4 ? "bg-ditch" : "bg-ink") : "bg-pending"}`} />
                      ))}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-sm">
                    {[c.onPeriod && "period", c.sun === "lots" && "lots of sun", c.newProduct && "new product"].filter(Boolean).join(", ") || <span className="text-smoke">none</span>}
                    {c.note && <span className="block text-smoke">{c.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
