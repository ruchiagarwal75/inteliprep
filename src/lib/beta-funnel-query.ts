import { z } from "zod";
import { adminQuery } from "@/lib/admin-query";
export const FUNNEL_STEPS = [
  ["signed_in", "Signed in"],
  ["started", "Started an interview"],
  ["score_threshold_passed", "Passed the score threshold"],
  ["finished", "Finished"],
  ["scorecard_opened", "Opened the scorecard"],
  ["sent_feedback", "Sent feedback"],
  ["second_started", "Started a second interview"],
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number][0];
export type FunnelCounts = Record<FunnelStep, number>;
export function betaFunnelQuery(params: URLSearchParams, now = Date.now()) {
  const from = z.iso
    .date()
    .parse(
      params.get("from") ??
        new Date(now - 6 * 86400000).toISOString().slice(0, 10),
    );
  const to = z.iso
    .date()
    .parse(params.get("to") ?? new Date(now).toISOString().slice(0, 10));
  z.object({ from: z.iso.date(), to: z.iso.date() })
    .refine((value) => value.from <= value.to, {
      message: "Start date must be before end date",
    })
    .parse({ from, to });
  return {
    ...adminQuery(params),
    from,
    to,
    until: new Date(Date.parse(to) + 86400000).toISOString(),
  };
}
