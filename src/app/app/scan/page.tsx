import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { store } from "@/lib/data";
import { youcamEnabled } from "@/lib/youcam";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scan" };

export default async function ScanPage({ searchParams }: PageProps<"/app/scan">) {
  const viewer = await getViewer();
  const sp = await searchParams;
  const trialId = typeof sp.trial === "string" ? sp.trial : undefined;
  const trial = trialId ? await store.getTrial(viewer.id, trialId) : null;
  const product = trial ? await store.getProduct(viewer.id, trial.productId) : null;
  return (
    <Scanner
      key={`${trialId ?? "any"}-${sp.baseline ?? ""}`}
      trialId={trial?.id}
      trialName={product ? `${product.brand} ${product.name}` : undefined}
      baseline={sp.baseline === "1"}
      live={youcamEnabled()}
    />
  );
}
