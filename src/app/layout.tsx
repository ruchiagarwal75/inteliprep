import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import {
  parseTheme,
  THEME_COOKIE,
  THEME_BOOTSTRAP,
} from "@/lib/theme-preference";
import { AppViewerTracker } from "@/components/app-viewer-tracker";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { siteMetadata } from "@/lib/site-metadata";

// Request-specific CSP nonces cannot be embedded in statically generated HTML.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displayFont = Lora({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = siteMetadata;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme =
    parseTheme((await cookies()).get(THEME_COOKIE)?.value) ?? "light";
  const policy = (await headers()).get("Content-Security-Policy") ?? "";
  const nonce = /'nonce-([^']+)'/u.exec(policy)?.[1];
  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} h-full antialiased`}
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider initialTheme={theme}>
          <Suspense fallback={null}>
            <AppViewerTracker />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
