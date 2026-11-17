/** A UX hint only. Never use user-agent strings for authorization. */
export function isInAppBrowser(agent: string) {
  return (
    /LinkedIn|Reddit|Twitter|FBAN|FBAV|Instagram|Line\//iu.test(agent) ||
    /Android.*;\s*wv[;)\s]/iu.test(agent) ||
    (/(?:iPhone|iPad|iPod).*AppleWebKit/iu.test(agent) &&
      !/Safari|CriOS|FxiOS|EdgiOS|OPiOS/iu.test(agent))
  );
}
