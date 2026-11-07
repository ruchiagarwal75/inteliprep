import "server-only";
import { z } from "zod";

export function configuredAdminId(): string | undefined {
  const result = z.uuid().safeParse(process.env.ADMIN_USER_ID);
  return result.success ? result.data : undefined;
}
export function excludedUserIds() {
  return [
    ...new Set(
      [
        configuredAdminId(),
        ...(process.env.ADMIN_TEST_USER_IDS ?? "").split(","),
      ]
        .filter((id): id is string => z.uuid().safeParse(id?.trim()).success)
        .map((id) => id.trim()),
    ),
  ];
}
export function reportingEnvironment() {
  return (
    process.env.VERCEL_ENV ??
    (process.env.NODE_ENV === "production" ? "production" : "development")
  );
}
