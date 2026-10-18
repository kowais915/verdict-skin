import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { today } from "@/lib/dates";
import { NewTrial } from "./new-trial";

export const metadata: Metadata = { title: "New trial" };

export default async function NewTrialPage() {
  await getViewer();
  return <NewTrial today={today()} />;
}
