import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
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
