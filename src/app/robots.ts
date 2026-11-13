import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
export default function robots(): MetadataRoute.Robots {
  // Crawling was unrestricted; the existing page-level noindex/nofollow remains.
  return {
    rules: { userAgent: "*", allow: "/" },
    host: BRAND.url,
    sitemap: `${BRAND.url}/sitemap.xml`,
  };
}
