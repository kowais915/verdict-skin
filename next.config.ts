import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      // YouCam result masks are served from pre-signed storage URLs
      { protocol: "https", hostname: "**.makeupar.com" },
      { protocol: "https", hostname: "**.perfectcorp.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
