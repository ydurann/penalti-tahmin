import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Yönetim ekranı ve API uçları taranmaz; sitemap adresi yayın adresine göre. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/yonetim", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
