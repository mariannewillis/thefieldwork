import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Replit runs a single Reserved VM (docs/DECISIONS-BUILD.md D-4), so the
  // default Node server is right — no static export, no adapter.
  images: {
    // the media pipeline (D-6) already emits AVIF/WebP/JPEG at two widths,
    // so Next's optimiser has nothing left to do and would only add latency.
    unoptimized: true,
  },
};

export default nextConfig;
