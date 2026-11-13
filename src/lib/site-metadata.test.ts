import { expect, it } from "vitest";
import { BRAND } from "./brand";
import { siteMetadata, pageMetadata } from "./site-metadata";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
it("uses the exact title template and description for social and search metadata", () => {
  expect(siteMetadata).toMatchObject({
    title: {
      default: "Shardling: AI mock system design interviews",
      template: "%s | Shardling",
    },
    description:
      "Practice system design and AI/ML system design interviews with an AI interviewer, a whiteboard, and a scorecard.",
    alternates: { canonical: BRAND.url },
    openGraph: { url: BRAND.url, images: [{ width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
    robots: { index: false, follow: false },
  });
  expect(pageMetadata("Sign in", "/sign-in")).toMatchObject({
    title: "Sign in",
    alternates: { canonical: `${BRAND.url}/sign-in` },
  });
});
it("keeps crawling unrestricted with noindex pages and only lists public URLs", () => {
  expect(robots()).toEqual({
    rules: { userAgent: "*", allow: "/" },
    host: BRAND.url,
    sitemap: `${BRAND.url}/sitemap.xml`,
  });
  expect(sitemap().map((item) => item.url)).toEqual(
    ["/", "/sign-in", "/privacy", "/terms"].map(
      (path) => new URL(path, BRAND.url).href,
    ),
  );
});
