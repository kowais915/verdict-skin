/** Safe to import from client components: only reads public env vars. */
export const clerkPublicEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
