import type { AgentEvent } from "@/lib/types";
import { formatDay } from "@/lib/dates";
import { IconAgent, IconAlert, IconCheck, IconClock } from "./ui/icons";

const ICON = {
  plan: IconAgent,
  insight: IconAgent,
  warn: IconAlert,
  reminder: IconClock,
  verdict: IconCheck,
};
const TONE = {
  plan: "bg-serum text-serum-deep",
  insight: "bg-serum text-serum-deep",
  warn: "bg-unsure-wash text-[#8a5d05]",
  reminder: "bg-mist text-ink",
  verdict: "bg-keep-wash text-keep",
};

export function AgentFeed({ events, products }: { events: AgentEvent[]; products?: Record<string, string> }) {
  if (!events.length) return <p className="text-smoke">Notes from your trial agent show up here after each scan.</p>;
  return (
    <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-hairline">
      {events.map((e) => {
        const Icon = ICON[e.kind];
        return (
          <li key={e.id} className="relative flex gap-4">
            <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full ${TONE[e.kind]}`}>
              <Icon width={16} height={16} />
            </span>
            <div className="min-w-0 pt-1">
              <p className="font-semibold leading-snug">{e.title}</p>
              <p className="mt-0.5 text-[15px] leading-relaxed text-ink/80 measure">{e.body}</p>
              <p className="mt-1 text-2xs text-smoke">
                {formatDay(e.at)}
                {products?.[e.trialId] ? `, ${products[e.trialId]}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
