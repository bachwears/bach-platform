import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@bach/ui", "@bach/i18n", "@bach/types", "@bach/services"],
  // retired product pages → their replacement, so shared links and search results keep working
  async redirects() {
    return [
      // 2026-10-05: the mixed-logo beanie was split into three logo-specific products
      { source: "/products/ribbed-knit-beanie", destination: "/products/ribbed-knit-beanie-embroidered-logo", permanent: true },
    ];
  },
};

export default nextConfig;
