import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  // Messaging previews can use ordinary browser user agents and only read the
  // initial head, so wait for dynamic metadata before sending HTML.
  htmlLimitedBots: /.*/,
  experimental: {
    // A 2800 KiB image budget across up to four pages becomes ~3.83 MB as base64.
    // Leave room for action serialization while staying below hosting limits.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Referrer-Policy", value: "origin" }],
    }];
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    // Private and revocable share media must never enter the shared optimizer cache.
    remotePatterns: [],
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/guide-*.png", search: "" },
      { pathname: "/guides-bkg.png", search: "" },
      { pathname: "/our-story-bkg.png", search: "" },
      { pathname: "/pricing-bkg.png", search: "" },
    ],
  },
  // Sign-up and the password flows folded into /sign-in. These paths are in
  // bookmarks and old emails, so they redirect rather than 404. Query strings
  // carry over automatically, which preserves `?next=` and `?email=`.
  async redirects() {
    return [
      { source: "/sign-up", destination: "/sign-in", permanent: true },
      { source: "/forgot-password", destination: "/sign-in", permanent: true },
      { source: "/reset-password", destination: "/sign-in", permanent: true },
    ];
  },
};

export default nextConfig;
