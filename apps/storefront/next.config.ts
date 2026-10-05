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
      // 2026-10-05: same-named pieces — one pair was the same polo (merged), two were different garments (renamed)
      { source: "/products/ribbed-knit-polo-sweater-2", destination: "/products/ribbed-knit-polo-sweater", permanent: true },
      { source: "/products/ribbed-knit-crew-neck-sweater-2", destination: "/products/wide-rib-knit-crew-neck-sweater", permanent: true },
      { source: "/products/slogan-knit-long-sleeve-sweater-2", destination: "/products/noise-slogan-knit-long-sleeve-sweater", permanent: true },
    ];
  },
};

export default nextConfig;
