import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: { default: "Verdict: put your skincare on trial", template: "%s · Verdict" },
  description:
    "Verdict runs a measured trial on every new skincare product with YouCam Skin AI, and tells you to keep it or send it back before the return window closes.",
  applicationName: "Verdict",
  appleWebApp: { capable: true, title: "Verdict", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#edefea",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
