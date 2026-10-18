import type { Metadata } from "next";
import { SignOutButton } from "@clerk/nextjs";
import { getViewer, clerkEnabled } from "@/lib/auth";
import { storeMode } from "@/lib/data";
import { youcamEnabled } from "@/lib/youcam";
import { ProfileForm } from "@/components/profile-form";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  const connections = [
    {
      name: "YouCam Skin AI",
      on: youcamEnabled(),
      onText: "Live. Scans are scored by the YouCam Skin Analysis API.",
      offText: "Demo mode. Set YOUCAM_API_KEY to score real photos.",
    },
    {
      name: "Accounts",
      on: clerkEnabled,
      onText: "Signed in with Clerk.",
      offText: "Single demo user. Add Clerk keys to turn on sign-in.",
    },
    {
      name: "Storage",
      on: storeMode === "neon",
      onText: "Saved to Neon Postgres.",
      offText: "In memory. Set DATABASE_URL to keep data between restarts.",
    },
  ];

  return (
    <div className="space-y-14">
      <header>
        <h1 className="display text-5xl sm:text-6xl">Settings</h1>
      </header>

      <section aria-labelledby="p-h" className="max-w-3xl">
        <h2 id="p-h" className="text-2xl font-semibold tracking-tight">
          You
        </h2>
        <div className="mt-6">
          <ProfileForm profile={viewer} />
        </div>
      </section>

      <section aria-labelledby="c-h" className="max-w-3xl">
        <h2 id="c-h" className="text-2xl font-semibold tracking-tight">
          Connections
        </h2>
        <ul className="mt-4 divide-y divide-hairline rounded-vial border border-hairline bg-vial">
          {connections.map((c) => (
            <li key={c.name} className="flex items-start gap-4 p-5">
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${c.on ? "bg-keep" : "bg-unsure"}`} />
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-sm text-smoke">{c.on ? c.onText : c.offText}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="priv-h" className="max-w-3xl">
        <h2 id="priv-h" className="text-2xl font-semibold tracking-tight">
          Your data
        </h2>
        <p className="mt-2 text-[15px] measure">
          Photos are sent to YouCam to be scored and stay on the device that took them. We store the scores, your trials and your log. You can take all of it with you.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="/api/export" className={buttonClass("secondary")} download>
            Download my data
          </a>
          {clerkEnabled && (
            <SignOutButton redirectUrl="/">
              <button className={buttonClass("ghost")}>Sign out</button>
            </SignOutButton>
          )}
        </div>
      </section>
    </div>
  );
}
