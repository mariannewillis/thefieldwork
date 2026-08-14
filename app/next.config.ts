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
  experimental: {
    serverActions: {
      // A photograph is posted to a server action, and the default ceiling on
      // one is 1 MB — which no picture off a camera clears. This matches
      // MAX_UPLOAD_BYTES in src/lib/media/encode.ts with room for the
      // multipart framing on top; the two have to agree, or the refusal comes
      // from the framework with no words she can read.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
