import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthShell, DemoAuthNote } from "@/components/auth-shell";
import { clerkPublicEnabled } from "@/lib/flags";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back." body="Your trials kept counting while you were away.">
      {clerkPublicEnabled ? <SignIn appearance={{ elements: { rootBox: "w-full", cardBox: "w-full shadow-none border border-hairline rounded-[1.75rem]" } }} /> : <DemoAuthNote />}
    </AuthShell>
  );
}
