import "server-only";
import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { logServerEvent } from "@/lib/server-events";
import { z } from "zod";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
import { reportingConfigured, reportingDb } from "@/lib/reporting-db";
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
      select ${userId}::uuid,'production' where not exists(select 1 from interview_admin.beta_invites where email=${email} and not approved)
      on conflict do nothing returning first_access_at::text as at`;
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
  if (!reportingConfigured()) return;
  // Account notifications must not inherit an unrelated reporting backoff.
  const work = async () => {
    try {
      await onboardAccount(userId, parsed.data.trim().toLowerCase());
      await drainNotifications();
    } catch (cause) {
      logServerEvent(
        {
          event: "notification_failure",
          requestId: randomUUID(),
          kind: "notification_storage",
        },
        cause,
      );
    }
  };
  try {
    after(work);
  } catch {
    void work();
  }
}
