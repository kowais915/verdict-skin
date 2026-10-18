const DAY = 86_400_000;

/** Today's date as YYYY-MM-DD (UTC). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parse(d: string) {
  return new Date(d.length === 10 ? `${d}T00:00:00Z` : d);
}

export function addDays(date: string, n: number): string {
  return new Date(parse(date).getTime() + n * DAY).toISOString().slice(0, 10);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  const da = parse(a.slice(0, 10)).getTime();
  const db = parse(b.slice(0, 10)).getTime();
  return Math.round((db - da) / DAY);
}

export function formatDay(date: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return parse(date).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export function formatDateTime(date: string) {
  return parse(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function relativeDays(n: number) {
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
