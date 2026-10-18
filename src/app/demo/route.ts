import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GUEST_COOKIE } from "@/lib/auth";
import { store } from "@/lib/data";
import { buildSampleFor } from "@/lib/data/seed";

/**
 * GET /demo
 * Starts (or resumes) a guest session with a month of sample trials already
 * loaded, so anyone can explore the full app and run real YouCam scans without
 * creating an account. Guest data lives in the same database, keyed by a random id.
 */
export async function GET(req: Request) {
  const jar = await cookies();
  let id = jar.get(GUEST_COOKIE)?.value;
  if (!id || !(await store.getProfile(id))) {
    id = `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await store.saveProfile({
      id,
      name: "Guest",
      email: "",
      skinType: "combination",
      goals: ["redness", "pore", "texture"],
      onboarded: true,
      reminderTime: "08:00",
    });
    await store.importSample(buildSampleFor(id, "Guest"));
  }
  const res = NextResponse.redirect(new URL("/app", req.url));
  res.cookies.set(GUEST_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
