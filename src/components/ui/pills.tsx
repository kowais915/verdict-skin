import { IconBox, IconClock } from "./icons";

export function ReturnPill({ daysLeft, retailer, className = "" }: { daysLeft: number; retailer?: string; className?: string }) {
  const tone =
    daysLeft < 0 ? "bg-mist text-smoke" : daysLeft <= 3 ? "bg-ditch-wash text-ditch" : daysLeft <= 10 ? "bg-unsure-wash text-[#8a5d05]" : "bg-mist text-ink";
  const text =
    daysLeft < 0 ? "Return window closed" : daysLeft === 0 ? "Returns close today" : daysLeft === 1 ? "Returns close tomorrow" : `${daysLeft} days to return`;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${tone} ${className}`}>
      <IconBox width={14} height={14} />
      {text}
      {retailer && daysLeft >= 0 ? <span className="font-normal opacity-80">at {retailer}</span> : null}
    </span>
  );
}

export function DuePill({ dueIn, label }: { dueIn: number; label: string }) {
  const tone = dueIn <= 0 ? "bg-ink text-vial" : dueIn === 1 ? "bg-serum text-ink" : "bg-mist text-ink";
  const when = dueIn < 0 ? "overdue" : dueIn === 0 ? "today" : dueIn === 1 ? "tomorrow" : `in ${dueIn} days`;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${tone}`}>
      <IconClock width={14} height={14} />
      {label} {when}
    </span>
  );
}
