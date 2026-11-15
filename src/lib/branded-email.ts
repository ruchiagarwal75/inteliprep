import "server-only";
import { BRAND } from "@/lib/brand";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/** Only app links become anchors. Recipient text remains escaped, never markup. */
function paragraph(value: string): string {
  return value
    .split(/(https?:\/\/[^\s<>"']+)/gu)
    .map((part) => {
      if (/^https?:\/\//u.test(part)) {
        const text = part.replace(/[.,)]$/u, "");
        const link = URL.parse(text);
        if (link?.origin === BRAND.url && !link.username && !link.password)
          return `<a href="${escapeHtml(link.href)}" style="color:inherit;text-decoration:underline">${escapeHtml(text)}</a>${escapeHtml(part.slice(text.length))}`;
      }
      return escapeHtml(part).replace(/\n/gu, "<br>");
    })
    .join("");
}

/** Freeze this HTML in the outbox at enqueue time, alongside its text fallback. */
export function brandEmail<T extends { subject: string; text: string }>(
  payload: T,
): T & { html: string } {
  const logo = `${BRAND.url}/brand/email/shardling-logo-v1.png`;
  const body = payload.text
    .split(/\n\n+/u)
    .map(
      (text) =>
        `<p style="margin:0 0 20px;line-height:1.6;overflow-wrap:anywhere">${paragraph(text)}</p>`,
    )
    .join("");
  return {
    ...payload,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(payload.subject)}</title></head><body style="margin:0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px"><tr><td style="padding:0 0 28px"><a href="${escapeHtml(BRAND.url)}" aria-label="${escapeHtml(BRAND.name)} home"><img src="${escapeHtml(logo)}" width="194" height="48" alt="${escapeHtml(BRAND.name)}" style="display:block;border:0;max-width:100%;height:auto"></a></td></tr><tr><td>${body}</td></tr></table></td></tr></table></body></html>`,
  };
}
