import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/sign-in", "/privacy", "/terms"].map((path) => ({
    url: new URL(path, BRAND.url).href,
  }));
}
