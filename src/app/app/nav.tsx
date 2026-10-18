"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLog, IconScan, IconShelf, IconToday, IconTrials } from "@/components/ui/icons";

const ITEMS = [
  { href: "/app", label: "Today", Icon: IconToday, exact: true },
  { href: "/app/trials", label: "Trials", Icon: IconTrials },
  { href: "/app/scan", label: "Scan", Icon: IconScan, primary: true },
  { href: "/app/shelf", label: "Shelf", Icon: IconShelf },
  { href: "/app/log", label: "Log", Icon: IconLog },
];

function useActive() {
  const path = usePathname();
  return (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
}

export function SideNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, Icon, exact, primary }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors ${
              primary
                ? "mt-2 mb-2 bg-ink text-vial hover:bg-ink/90"
                : active
                  ? "bg-vial text-ink shadow-[inset_0_0_0_1px_var(--color-hairline)]"
                  : "text-smoke hover:text-ink hover:bg-mist"
            }`}
          >
            <Icon />
            {primary ? "Take a scan" : label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBar() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-porcelain/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-end justify-between px-3 pt-1.5 pb-1.5">
        {ITEMS.map(({ href, label, Icon, exact, primary }) => {
          const active = isActive(href, exact);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 text-[11px] font-medium ${active ? "text-ink" : "text-smoke"}`}
              >
                {primary ? (
                  <span className="-mt-5 grid size-14 place-items-center rounded-full bg-ink text-vial ring-4 ring-porcelain">
                    <Icon width={24} height={24} />
                  </span>
                ) : (
                  <span className={`grid h-8 w-12 place-items-center rounded-full ${active ? "bg-vial shadow-[inset_0_0_0_1px_var(--color-hairline)]" : ""}`}>
                    <Icon />
                  </span>
                )}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
