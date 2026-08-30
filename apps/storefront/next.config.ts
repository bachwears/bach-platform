import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@bach/ui", "@bach/i18n", "@bach/types", "@bach/services"],
};

export default nextConfig;
