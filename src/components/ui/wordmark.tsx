import Link from "next/link";

export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`} aria-label="Verdict home">
      <span className="flex h-5 items-end gap-[3px]" aria-hidden>
        <span className="h-3 w-[5px] rounded-[2px] bg-ditch" />
        <span className="h-4 w-[5px] rounded-[2px] bg-unsure" />
        <span className="h-5 w-[5px] rounded-[2px] bg-keep" />
      </span>
      <span className="display text-[26px] leading-none">Verdict</span>
    </Link>
  );
}
