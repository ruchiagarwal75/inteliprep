import { expect, it } from "vitest";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { chatMessageSchema, type ChatMessage } from "@/lib/chat";
import { getProblem } from "@/lib/problems";
import { auditTranscript, type AuditFinding } from "@/lib/transcript-audit";

const saved = z.object({
  level: z.enum(["mid", "senior", "staff"]).optional(),
  turns: z.array(
    z.object({
      minute: z.number(),
      message: chatMessageSchema,
      reply: z.string(),
    }),
  ),
});
it("audits saved retest-3 delivered turns without any model calls", () => {
  const root = "artifacts/genai-retest-3";
  const observations = new Set<string>();
  const findings = new Map<
    string,
    AuditFinding & { file: string; minute: number }
  >();
  let files = 0;
  for (const relative of readdirSync(root, { recursive: true })
    .filter((p): p is string => typeof p === "string" && p.endsWith(".json"))
    .sort()) {
    const file = join(root, relative);
    const parsed = saved.safeParse(JSON.parse(readFileSync(file, "utf8")));
    if (!parsed.success) continue;
    const problem = [
      "enterprise-rag-assistant",
      "ai-chat-assistant",
      "tool-using-ai-agent",
    ]
      .map(getProblem)
      .find((p) => p && relative.includes(p.id));
    if (!problem) continue;
    files++;
    const level = parsed.data.level ?? "senior";
    const facts = problem.genai?.facts.map((fact) => ({
      id: fact.id,
      text: fact.answers[level],
    }));
    const messages: ChatMessage[] = parsed.data.turns.flatMap((turn) => {
      observations.add(
        JSON.stringify([turn.message.content, turn.reply, turn.minute]),
      );
      return [
        turn.message,
        { role: "assistant" as const, content: turn.reply },
      ];
    });
    for (const finding of auditTranscript(messages, facts).findings) {
      const turn = parsed.data.turns[Math.floor(finding.messageIndex / 2)];
      const key = JSON.stringify([
        finding.kind,
        finding.factId,
        turn.minute,
        turn.message.content,
        turn.reply,
      ]);
      if (!findings.has(key))
        findings.set(key, { ...finding, file, minute: turn.minute });
    }
  }
  const counts = Object.fromEntries(
    ["internal_id", "on_topic_redirect", "repeated_fact", "order_wrap_up"].map(
      (kind) => [
        kind,
        [...findings.values()].filter((f) => f.kind === kind).length,
      ],
    ),
  );
  const report = {
    modelCalls: 0,
    transcriptFiles: files,
    distinctRecordedTurns: observations.size,
    counts,
    method:
      "Delivered turn records only. Copies are deduplicated by kind, fact ID, minute, candidate message and reply. Re-sent facts match normalized configured values; redirects require technical narration. These checks do not prove semantic novelty or catch all paraphrases. Diagnostic provider request logs are not delivered transcripts.",
    findings: [...findings.values()],
  };
  mkdirSync("artifacts/genai-retest-4", { recursive: true });
  writeFileSync(
    "artifacts/genai-retest-4/saved-transcript-audit.json",
    JSON.stringify(report, null, 2),
  );
  console.info(
    JSON.stringify({
      transcriptFiles: files,
      distinctRecordedTurns: observations.size,
      counts,
      modelCalls: 0,
    }),
  );
  expect(files).toBeGreaterThan(0);
});
