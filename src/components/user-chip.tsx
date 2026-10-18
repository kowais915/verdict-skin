import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { clerkPublicEnabled } from "@/lib/flags";
import type { UserProfile } from "@/lib/types";

export function Avatar({ profile, size = 36 }: { profile: Pick<UserProfile, "name" | "avatarUrl">; size?: number }) {
  return profile.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.avatarUrl} alt="" width={size} height={size} className="rounded-full object-cover" />
  ) : (
    <span style={{ width: size, height: size }} className="grid place-items-center rounded-full bg-serum font-semibold text-serum-deep">
      {profile.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function UserChip({ profile, compact = false }: { profile: UserProfile; compact?: boolean }) {
  if (clerkPublicEnabled && compact) return <UserButton />;
  if (clerkPublicEnabled) {
    return (
      <div className="flex items-center gap-3 rounded-full p-1.5 pr-3">
        <UserButton />
        <Link href="/app/settings" className="min-w-0 hover:underline">
          <span className="block truncate text-sm font-semibold">{profile.name}</span>
          <span className="block truncate text-2xs text-smoke">Settings</span>
        </Link>
      </div>
    );
  }
  return (
    <Link href="/app/settings" className="flex items-center gap-3 rounded-full p-1.5 pr-3 hover:bg-mist">
      <Avatar profile={profile} />
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{profile.name}</span>
          <span className="block truncate text-2xs text-smoke">Settings</span>
        </span>
      )}
    </Link>
  );
}
