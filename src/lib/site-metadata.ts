import type { Metadata } from "next";
import { BRAND } from "./brand";

const image = {
  url: "/brand/og-image-1200x630.png",
  width: 1200,
  height: 630,
  alt: `${BRAND.name} interview practice`,
};
export function pageMetadata(title: string, path: string): Metadata {
  return {
    title,
    alternates: { canonical: new URL(path, BRAND.url).href },
    openGraph: {
      title: `${title} | ${BRAND.name}`,
      url: new URL(path, BRAND.url).href,
      description: BRAND.description,
      images: [image],
      siteName: BRAND.name,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${BRAND.name}`,
      description: BRAND.description,
      images: [image],
    },
  };
}
export const siteMetadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  applicationName: BRAND.name,
  title: { template: `%s | ${BRAND.name}`, default: BRAND.title },
  description: BRAND.description,
  alternates: { canonical: BRAND.url },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: BRAND.title,
    url: BRAND.url,
    description: BRAND.description,
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.title,
    description: BRAND.description,
    images: [image],
  },
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/brand/apple-touch-icon-180.png",
  },
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
};
