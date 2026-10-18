import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "keep" | "ditch";
type Size = "sm" | "md" | "lg";

const V: Record<Variant, string> = {
  primary: "bg-ink text-vial hover:bg-ink/90",
  secondary: "border border-hairline bg-vial text-ink hover:border-ink/40",
  ghost: "text-ink hover:bg-mist",
  keep: "bg-keep text-white hover:bg-keep/90",
  ditch: "bg-ditch text-white hover:bg-ditch/90",
};
const S: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${V[variant]} ${S[size]} ${extra}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
