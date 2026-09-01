import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Transactional and private surfaces carry no search value.
        disallow: ["/cart", "/checkout", "/confirmed", "/account", "/ar/cart", "/ar/checkout", "/ar/confirmed", "/ar/account"],
      },
    ],
    sitemap: "https://bachwears.com/sitemap.xml",
  };
}
