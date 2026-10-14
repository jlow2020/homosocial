import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Selfies are shrunk in the browser, but leave room for the occasional big one.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
