import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const IconToday = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>
);
export const IconTrials = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="8" width="3.2" height="8" rx="1" /><rect x="8.4" y="8" width="3.2" height="8" rx="1" /><rect x="13.8" y="8" width="3.2" height="8" rx="1" /><rect x="19.2" y="8" width="1.8" height="8" rx=".9" /></svg>
);
export const IconScan = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><ellipse cx="12" cy="12" rx="4" ry="5.2" /></svg>
);
export const IconShelf = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 20h18" /><rect x="5" y="9" width="4.5" height="11" rx="1.4" /><path d="M6.4 9V6.5h1.7V9" /><rect x="11.5" y="13" width="7" height="7" rx="1.6" /><path d="M11.5 15.5h7" /></svg>
);
export const IconLog = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4.5" y="3.5" width="15" height="17" rx="2.5" /><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" /></svg>
);
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconBack = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>);
export const IconNext = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M9 5l7 7-7 7" /></svg>);
export const IconCamera = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.3" r="3.4" /></svg>
);
export const IconUpload = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>);
export const IconAgent = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3.5c.6 3.8 2.7 5.9 6.5 6.5-3.8.6-5.9 2.7-6.5 6.5-.6-3.8-2.7-5.9-6.5-6.5 3.8-.6 5.9-2.7 6.5-6.5z" /><path d="M18.5 16.5c.2 1.4 1 2.2 2.4 2.4-1.4.2-2.2 1-2.4 2.4-.2-1.4-1-2.2-2.4-2.4 1.4-.2 2.2-1 2.4-2.4z" /></svg>
);
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17.2v.1" /></svg>);
export const IconClock = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>);
export const IconBox = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z" /><path d="M3.5 8 12 12l8.5-4M12 12v8" /></svg>);
export const IconCopy = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>);
export const IconSun = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="3.5" /><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21" /></svg>);
export const IconMoon = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" /></svg>);
