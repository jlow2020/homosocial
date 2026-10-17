import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Profile photos and Realness Check frames are shrunk in the browser,
    // but leave room for the occasional big one.
    serverActions: { bodySizeLimit: "8mb" },
  },
  webpack: (config) => {
    // The face library's package.json points bundlers at its Node build.
    // Force the browser build; it only ever runs on the member's phone.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@vladmandic/human$": path.join(process.cwd(), "node_modules/@vladmandic/human/dist/human.esm.js"),
    };
    return config;
  },
};

export default nextConfig;
