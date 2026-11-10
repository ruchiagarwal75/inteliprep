/** Measurement filter, not an authentication or anti-abuse boundary. Never store the UA. */
export function isAutomatedViewer(userAgent: string | null, webdriver = false) {
  return (
    webdriver ||
    /bot(?:[\s/;)]|$)|crawler|spider|headlesschrome|playwright|puppeteer|vercel-screenshot|chatgpt-user|facebookexternalhit/iu.test(
      userAgent ?? "",
    )
  );
}
