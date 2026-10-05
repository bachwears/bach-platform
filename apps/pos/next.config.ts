import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // a stamp per build: open tabs compare it with /api/version to offer a reload
  env: { NEXT_PUBLIC_BUILD_ID: process.env.GITHUB_SHA ?? process.env.BUILD_ID ?? String(Date.now()) },
  transpilePackages: ["@bach/ui", "@bach/i18n", "@bach/types", "@bach/services"],
};

export default nextConfig;
