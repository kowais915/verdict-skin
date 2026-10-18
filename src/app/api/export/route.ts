import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { store } from "@/lib/data";

export async function GET() {
  const viewer = await getViewer();
  const [products, trials, scans, checkIns, events] = await Promise.all([
    store.listProducts(viewer.id),
    store.listTrials(viewer.id),
    store.listScans(viewer.id),
    store.listCheckIns(viewer.id),
    store.listAgentEvents(viewer.id),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), profile: viewer, products, trials, scans, checkIns, agentNotes: events }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="verdict-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
