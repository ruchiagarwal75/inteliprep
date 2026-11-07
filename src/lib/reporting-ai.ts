import "server-only";
import { reportingDb } from "@/lib/reporting-db";
import { safeReporting } from "@/lib/reporting-write";
import { reportingEnvironment } from "@/lib/admin-config";
import type { ReportingContext } from "@/lib/reporting-context";
import { estimatedAiCost, tokenUsage } from "@/lib/reporting-cost";

export type AiObservation = {
  id: string;
  context: ReportingContext;
  operation: string;
  model: string;
  startedAt: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  finishedAt?: string;
  providerRequestId?: string;
  usage?: unknown;
};
export async function recordAiCall(call: AiObservation) {
  const usage = tokenUsage(call.usage);
  const cost = estimatedAiCost(
    call.model,
    usage,
    process.env.AI_MODEL_RATES_USD_PER_MILLION,
  );
  await safeReporting(async () => {
    const sql = reportingDb(),
      context = call.context;
    await sql`insert into interview_admin.ai_calls
      (id,request_id,interview_id,user_id,environment,is_test,operation,model,started_at,finished_at,status,provider_request_id,input_tokens,output_tokens,cached_tokens,cache_write_tokens,estimated_cost_usd,pricing_version)
      values (${call.id},${context.requestId},${context.interviewId ?? null},${context.userId ?? null},${reportingEnvironment()},${context.isTest ?? false},${call.operation},${call.model},${call.startedAt},${call.finishedAt ?? null},${call.status},${call.providerRequestId ?? null},${usage?.inputTokens ?? null},${usage?.outputTokens ?? null},${usage?.cachedTokens ?? null},${usage?.cacheWriteTokens ?? null},${cost},${cost === null ? null : process.env.AI_MODEL_RATES_USD_PER_MILLION ? "configured" : "openai-standard-2026-11-06"})
      on conflict (id) do update set finished_at=excluded.finished_at,status=excluded.status,model=excluded.model,
        provider_request_id=excluded.provider_request_id,input_tokens=excluded.input_tokens,output_tokens=excluded.output_tokens,
        cached_tokens=excluded.cached_tokens,cache_write_tokens=excluded.cache_write_tokens,estimated_cost_usd=excluded.estimated_cost_usd,pricing_version=excluded.pricing_version
      where ai_calls.finished_at is null or excluded.finished_at >= ai_calls.finished_at`;
  });
}
