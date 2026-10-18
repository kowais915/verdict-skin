"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleTrial } from "../../../actions";
import { Button } from "@/components/ui/button";
import { IconCheck, IconCopy } from "@/components/ui/icons";
import type { Verdict } from "@/lib/types";

export function Decision({ trialId, verdict, settled }: { trialId: string; verdict: Verdict; settled?: Verdict }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<Verdict | undefined>(settled);

  const act = (d: "keep" | "ditch") =>
    start(async () => {
      await settleTrial(trialId, d);
      setDone(d);
      router.refresh();
    });

  if (done && done !== "inconclusive") {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-mist px-4 py-3 text-[15px]">
        <IconCheck className={done === "keep" ? "text-keep" : "text-ditch"} />
        {done === "keep" ? "Kept. It's on your shelf now." : "Marked for return. It's off your shelf."}
      </p>
    );
  }
  const primary = verdict === "ditch" ? "ditch" : "keep";
  return (
    <div className="flex flex-wrap gap-3">
      {primary === "keep" ? (
        <>
          <Button variant="keep" size="lg" disabled={pending} onClick={() => act("keep")}>
            Keep it
          </Button>
          <Button variant="secondary" size="lg" disabled={pending} onClick={() => act("ditch")}>
            Return it anyway
          </Button>
        </>
      ) : (
        <>
          <Button variant="ditch" size="lg" disabled={pending} onClick={() => act("ditch")}>
            Return it
          </Button>
          <Button variant="secondary" size="lg" disabled={pending} onClick={() => act("keep")}>
            Keep it anyway
          </Button>
        </>
      )}
    </div>
  );
}

export function CopyBlock({ text, label = "Copy message" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-hairline bg-porcelain">
      <pre className="whitespace-pre-wrap p-4 font-sans text-[15px] leading-relaxed">{text}</pre>
      <div className="border-t border-hairline px-3 py-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold hover:bg-mist"
        >
          {copied ? <IconCheck width={16} height={16} /> : <IconCopy width={16} height={16} />}
          {copied ? "Copied" : label}
        </button>
      </div>
    </div>
  );
}
