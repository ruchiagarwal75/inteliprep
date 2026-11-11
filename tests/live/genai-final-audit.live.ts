import { expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { chatMessageSchema } from "@/lib/chat";
import { getProblem } from "@/lib/problems";
import { auditFullInterview } from "./full-genai-audit";
import { calls } from "./model-meter";
import { fullInterviewUsage } from "./full-genai-usage";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
const observation = z
  .object({
    label: z.string(),
    estimatedUsd: z.number().nullable(),
    normalizedUsage: z
      .object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        cachedTokens: z.number(),
        cacheWriteTokens: z.number().optional(),
      })
      .nullable(),
  })
  .passthrough();
const storedSchema = z
  .object({
    transcript: z.array(chatMessageSchema),
    calls: z.array(observation),
    scorecard: z.object({ signal: z.string() }).passthrough(),
  })
  .passthrough();
it.concurrent.each([
  ["enterprise-rag-assistant", "strong"],
  ["ai-chat-assistant", "strong"],
  ["tool-using-ai-agent", "strong"],
  ["enterprise-rag-assistant", "buzzword"],
])(
  "independently audits every delivered ask in %s %s",
  async (problemId, quality) => {
    const label = `${problemId}-${quality}`;
    const path = `artifacts/genai-retest-3/${label}-adaptive.json`;
    const stored = storedSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const facts = getProblem(problemId)?.genai?.facts.map((fact) => ({
      id: fact.id,
      text: fact.answers.senior,
    }));
    const audit = await auditFullInterview(stored.transcript, label, facts);
    const observations = [
      ...stored.calls,
      ...calls.filter((c) => c.label === label + ":audit"),
    ];
    writeFileSync(
      path,
      JSON.stringify(
        {
          ...stored,
          ...audit,
          calls: observations,
          auditUsage: fullInterviewUsage(
            observations.filter((c) => c.label === label + ":audit"),
          ),
          allUsage: fullInterviewUsage(observations),
        },
        null,
        2,
      ),
    );
    expect(audit.repeatedSentences).toEqual([]);
    expect(audit.topicsOverTwice).toEqual([]);
    expect(audit.cannedFallbacks).toEqual([]);
    expect(audit.findings).toEqual([]);
    expect(stored.scorecard.signal).toMatch(
      quality === "strong" ? /^(?:strong_)?yes$/u : /^(?:strong_)?no$/u,
    );
  },
);
