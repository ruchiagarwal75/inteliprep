import { z } from "zod";

export const betaInviteEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());
export const betaInviteChange = z.strictObject({
  email: betaInviteEmail,
  approved: z.boolean(),
});
export const betaEmailRetry = z.strictObject({ notificationId: z.uuid() });
