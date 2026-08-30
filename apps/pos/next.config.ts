import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bach/ui", "@bach/i18n", "@bach/types", "@bach/services"],
};

export default nextConfig;
