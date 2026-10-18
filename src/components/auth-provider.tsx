import { ClerkProvider } from "@clerk/nextjs";
import { clerkPublicEnabled } from "@/lib/flags";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!clerkPublicEnabled) return <>{children}</>;
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#231d35",
          colorBackground: "#fafbf8",
          colorForeground: "#231d35",
          colorMutedForeground: "#676276",
          colorInput: "#fafbf8",
          colorBorder: "#d6d8d1",
          borderRadius: "0.75rem",
          fontFamily: "'Bricolage Grotesque Variable', system-ui, sans-serif",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
