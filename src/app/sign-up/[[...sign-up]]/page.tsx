import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthShell, DemoAuthNote } from "@/components/auth-shell";
import { clerkPublicEnabled } from "@/lib/flags";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthShell title="Put your skincare on trial." body="Free to start. Your photos stay on your device; we keep the scores.">
      {clerkPublicEnabled ? <SignUp appearance={{ elements: { rootBox: "w-full", cardBox: "w-full shadow-none border border-hairline rounded-[1.75rem]" } }} /> : <DemoAuthNote />}
    </AuthShell>
  );
}
