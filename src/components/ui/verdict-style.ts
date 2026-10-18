import type { Verdict } from "@/lib/types";

export const VERDICT_WORD: Record<Verdict, string> = { keep: "Keep", ditch: "Ditch", inconclusive: "Not yet" };
export const VERDICT_TEXT: Record<Verdict, string> = { keep: "text-keep", ditch: "text-ditch", inconclusive: "text-unsure" };
export const VERDICT_BG: Record<Verdict, string> = { keep: "bg-keep", ditch: "bg-ditch", inconclusive: "bg-unsure" };
export const VERDICT_WASH: Record<Verdict, string> = { keep: "bg-keep-wash", ditch: "bg-ditch-wash", inconclusive: "bg-unsure-wash" };
