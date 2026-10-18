import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { store } from "./data";
import type { UserProfile } from "./types";

/**
 * Auth seam. When Clerk keys are present we read the Clerk session; otherwise the
 * whole app runs as a single demo user so it can be explored without accounts.
 */
export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
export const DEMO_USER_ID = "demo-user";

export const getUserId = cache(async (): Promise<string> => {
  // Always render per request: data is per user and dates move every day.
  await connection();
  if (!clerkEnabled) return DEMO_USER_ID;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
});

/**
 * The signed-in user's profile. First visit after sign-up creates the row from
 * Clerk's user record and sends them through onboarding.
 */
export const getViewer = cache(async (opts: { allowNew?: boolean } = {}): Promise<UserProfile> => {
  const userId = await getUserId();
  let profile = await store.getProfile(userId);
  if (!profile) {
    const clerk = clerkEnabled ? await (await import("@clerk/nextjs/server")).currentUser() : null;
    profile = await store.saveProfile({
      id: userId,
      name: clerk?.firstName ?? clerk?.username ?? "there",
      email: clerk?.primaryEmailAddress?.emailAddress ?? "",
      avatarUrl: clerk?.imageUrl,
      skinType: "normal",
      goals: [],
      onboarded: false,
      reminderTime: "08:00",
    });
  }
  if (!profile.onboarded && !opts.allowNew) redirect("/onboarding");
  return profile;
});
