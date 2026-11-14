import "server-only";
import { BRAND } from "@/lib/brand";
import type { ApprovalEmailPayload } from "@/lib/approval-email";

export const OWNER_NOTIFICATION_EMAIL = "ruchiii75@gmail.com";
export type NotificationKind =
  "welcome" | "new_user" | "spend_warning" | "spend_cap";
const sender = () => `${BRAND.name} <hello@${BRAND.domain}>`;

export function welcomeNotification(email: string): ApprovalEmailPayload {
  return {
    from: sender(),
    to: [email],
    subject: `Welcome to ${BRAND.name}!`,
    text: `Welcome to ${BRAND.name}!\n\nStart your AI engineer practice at ${BRAND.url}/play. Learn RAG in short rounds, then try the RAG mock when you unlock it.\n\nSign in with Google using ${email}.\n\nSee you there,\n${BRAND.name}`,
  };
}
export function newUserNotification(
  email: string,
  at: string,
): ApprovalEmailPayload {
  return {
    from: sender(),
    to: [OWNER_NOTIFICATION_EMAIL],
    subject: `New ${BRAND.name} user`,
    text: `${email} signed in to ${BRAND.name} for the first time at ${at} (UTC).\n\nManage access: ${BRAND.url}/admin/access\nView users: ${BRAND.url}/admin/users`,
  };
}
export function spendNotification(
  kind: "spend_warning" | "spend_cap",
  day: string,
  spent: number,
  reserved: number,
): ApprovalEmailPayload {
  return {
    from: sender(),
    to: [OWNER_NOTIFICATION_EMAIL],
    subject:
      kind === "spend_warning"
        ? `${BRAND.name}: $5 daily AI warning`
        : `${BRAND.name}: daily AI budget allocated`,
    text: `${kind === "spend_warning" ? "Estimated AI spending has reached the $5 warning." : "The $25 shared daily AI budget has been spent or reserved. New paid work may pause until budget is available."}\n\nProduction, ${day} (UTC)\nEstimated spend: $${spent.toFixed(2)}\nReserved for calls and ongoing mocks: $${reserved.toFixed(2)}\n\nUnknown usage stays reserved, so these are conservative estimates, not a provider invoice. The budget resets at midnight UTC.\n\n${BRAND.url}/admin`,
  };
}
