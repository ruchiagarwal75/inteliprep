import "server-only";
import { z } from "zod";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
import { reportingDb } from "@/lib/reporting-db";
import { deferReporting } from "@/lib/reporting-write";
import { queueNotification, drainNotifications } from "@/lib/notifications";
import {
  welcomeNotification,
  newUserNotification,
} from "@/lib/notification-templates";

/** Only called after verified Google identity and account-access checks. */
export async function onboardAccount(userId: string, email: string) {
  if (
    reportingEnvironment() !== "production" ||
    excludedUserIds().includes(userId)
  )
    return;
  const sql = reportingDb();
  await sql.begin(async (tx) => {
    const [fresh] = await tx<
      { at: string }[]
    >`insert into interview_admin.account_onboarding(user_id,environment)
      values(${userId},'production') on conflict do nothing returning first_access_at::text as at`;
    if (!fresh) return;
    await queueNotification(
      tx,
      "welcome",
      `welcome/${userId}`,
      welcomeNotification(email),
    );
    await queueNotification(
      tx,
      "new_user",
      `new-user/${userId}`,
      newUserNotification(email, fresh.at),
    );
  });
}
export function observeAccountAccess(userId: string, email: unknown) {
  const parsed = z.email().max(254).safeParse(email);
  if (!parsed.success || reportingEnvironment() !== "production") return;
  deferReporting(async () => {
    await onboardAccount(userId, parsed.data.trim().toLowerCase());
    await drainNotifications();
  });
}
