import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Verdict",
    short_name: "Verdict",
    description: "Put your skincare on trial. Keep it or send it back, with evidence.",
    start_url: "/app",
    display: "standalone",
    background_color: "#edefea",
    theme_color: "#edefea",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
