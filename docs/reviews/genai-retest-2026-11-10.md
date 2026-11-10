# GenAI retest, 10 November 2026

Scope: beta preview only. Main and Production remain at `8b3f4b33015c84106d2c6c73df4f94dd6086f8e4`. Existing saved interviews and the eight core problem JSON files were not changed.

## Changes by item

1. Replaced GenAI fact regexes with a small strict structured classifier. It selects IDs and never sees or authors the fact values. The server validates IDs and returns every requested level value. Unknown values invite a candidate assumption; provider/schema errors remain retryable errors.
2. Added the exact requested questions unchanged, plus two Staff cases. Split permission timing from residency, GPU capacity from ten-minute warmup, and mistake severity from action reversibility. Senior RAG has no residency requirement. Agent undo guarantees remain unspecified at Mid/Senior and irreversible at Staff, matching the supplied facts.
3. Fact replies are quiet on most clarification turns, with varied prompts on every third turn. General requests do not disclose or suggest topics. Consecutive unspecified-value replies keep an actionable assumption invitation.
4. Discussion checks earlier verified answers, including explanations before a pending question. Only evidence that establishes a mechanism closes an issue. Weak answers get a specific gap probe. GenAI topics stop after two attempts and cannot be revived by fallback. Retirement does not grant assessment credit.
5. The private arithmetic checker now retains a verified reasonable verdict. Accepted estimates bypass both fact lookup and further estimate-input prompts, including estimates ending with a confirmation question. Core estimation behavior is unchanged.
6. Added three Senior buzzword transcripts with matching diagrams and explicit opportunities to explain the missing details. All fail the existing Senior bar without changing rubrics or weights. Added a no-em-dash instruction for GenAI feedback.
7. Diagram labels retain their spelling and are quoted even after articles. Presentation quotes and wrapping do not erase already-disclosed facts.
8. Added the exact beta callback checklist to [authentication.md](../authentication.md). Dashboard settings and secrets were not changed.

## Verification

- `npm run check` and `npm run build` passed after each item commit.
- Exact factual paraphrases: 23 real-model cases passed, including all 21 requested strings and two Staff constraints.
- Live clarification pacing, general unknown questions, older-answer discussion, two-attempt retirement and wrong-then-corrected GPU arithmetic passed.
- Full check: 1,438 tests passed, with two existing skips. Chromium browser regression: 21 tests passed, including the GenAI multipart fact flow, simulated 45/60-minute flows, reply retry, timeout/draft preservation, saved-session recovery and native browser zoom checks.
- Build privacy scanner confirms private facts and rubrics are absent from browser chunks.
- No full 45- or 60-minute cost benchmark was run. Earlier cost estimates refer to short scripted exchanges plus a scorecard, not a full interview.

## Browser and provider boundaries

Story: select a GenAI problem in the Brief, start one interview, ask a multipart factual question, receive both authoritative values, and end on Results.

| Boundary | Evidence |
| --- | --- |
| Browser and client API | Chromium GenAI test passed with one start request, both employee/document values rendered, and no page errors. |
| Server to provider | Separate real-model tests passed the 23 fact selections, clarification pacing, earlier-answer and two-attempt discussion checks, corrected estimate and three buzzword grades. |
| Persistence and recovery | Existing browser tests passed refresh/results, reply retry, active deadline with an unsent draft, expired verified transcript handling, history and feedback boundaries. |
| Provider response to UI | Browser suite used a local stubbed model and isolated account/database fixtures; real-provider behavior was tested separately, not with a live Google browser session. |

Actual Google OAuth on the beta hostname remains an operator check after adding the callback URL. No Supabase dashboard settings, invitations, secrets or deployment environment variables were changed.

## Live corrected-estimate reply

Wrong estimate:

> Could you redo that estimate, showing the units and assumptions at each step?

Corrected estimate:

> Yes, that estimate is consistent with your stated assumptions, before spare capacity.
> 
> Anything else you'd like to clarify before drawing?

## Buzzword scorecards

These are real model outputs for synthetic Senior transcripts. They evaluate content without a simulated session duration. This intentionally exercises grading calibration rather than the elapsed-time gate. They are not real user interviews.

### Design an enterprise RAG assistant

Signal: **strong no**.

Summary: The diagram presents a plausible high-level RAG pipeline, and you recognized important workload and freshness constraints. However, most answers named components or deferred to defaults without explaining their behavior, tradeoffs or validation. The evidence does not support a Senior-level recommendation.

| Area | Score / 4 | Rationale |
| --- | --- | --- |
| Requirements and estimation | 2 | You confirmed the employee/document workload, edit and revocation deadlines, and cost target. You did not translate these requirements into capacity estimates, state representation assumptions, or establish latency goals. |
| Ingestion and retrieval | 2 | You proposed incremental indexing and connected ingestion, embeddings, hybrid retrieval and reranking into a coherent high-level pipeline. Parsing, chunk boundaries, retrieval tradeoffs and delete propagation remained unspecified. |
| Grounded answers and citations | 1 | You named a context builder, citations and an LLM judge, but relied on those components rather than explaining source-to-claim validation or weak-evidence abstention. The answer path also lacked an explicit latency budget. |
| Freshness and reliability | 1 | You proposed incremental indexing, replication, retries and circuit breakers. Default settings did not explain outage behavior, replica recovery, or how freshness would be maintained during failures. |
| Cost, operations and evolution | 1 | Caching, observability and a cost dashboard were identified, but no per-question cost accounting or trace structure was explained. A dashboard alone does not establish how an expensive or incorrect answer would be diagnosed. |
| Evaluation and quality | 1 | You proposed an LLM judge and human feedback, but evaluating whether results 'look good' did not establish a test-set plan, retrieval/answer metrics, or a defined process for checking judge accuracy. |
| Safety and security | 2 | The diagram places ACL filtering before retrieval, establishing an appropriate enforcement point. However, reliance on defaults did not explain bounded revocation propagation, permission-scoped caching, or a concrete prompt-injection defense. |

Evidence:

- **Requirements and estimation**: “I would use the stated Senior workload and goals: 20,000 employees, 5M documents and 100K questions a day, with 15-minute edits, five-minute revokes and the two-cent target.”
- **Ingestion and retrieval**: “Connectors, chunking, embeddings, incremental indexing and hybrid search are the components I would use.”
- **Grounded answers and citations**: “A reranker, context builder, LLM, citations and an LLM judge will give us good grounded answers.” “I would rely on those components to do their jobs.”
- **Freshness and reliability**: “Connectors, chunking, embeddings, incremental indexing and hybrid search are the components I would use.” “Replication, retries, circuit breakers and high availability will handle failures.” “I would use the default settings.”
- **Cost, operations and evolution**: “Caching, observability and a cost dashboard will keep cost under control.” “The dashboard should tell us what we need.”
- **Evaluation and quality**: “I would use an LLM judge and an eval dashboard with human feedback.” “We can check whether the results look good.”
- **Safety and security**: “ACL filters, cache invalidation and guardrails will handle those security concerns.” “I would follow the usual defaults.”

Strengths:

- Recognized the core workload, edit and revocation deadlines, and per-question cost target.
- Established a sensible high-level pipeline with hybrid retrieval, reranking and ACL filtering ahead of retrieval.

Gaps:

- Although ACL filtering precedes retrieval, the security answer does not establish how five-minute revocation, cache isolation or malicious retrieved instructions are handled. Specify permission propagation and cache-key rules, explain how retrieved text is treated as untrusted input, and test revoked-access, cross-user cache and injected-document cases.
- Grounding depends on named components, while evaluation ultimately relies on whether answers look good; this can miss fluent but unsupported answers. Define a labeled test set, retrieval and claim/citation metrics, human validation of judge decisions, and an explicit weak-evidence abstention rule.
- Default retries and replication, paired with a cost dashboard, leave outage behavior and retry-driven spending undefined. Work through a model-service outage with bounded retries and fallback behavior, then define per-question token/call accounting that includes retry amplification and traces each attempt.

Next practice: Redesign one complete query path and one permission-revocation path. Explain concrete ACL/cache behavior, propagation bounds and failure handling, then validate them with a small labeled evaluation set, security test cases and per-question usage accounting.

This grading call estimate: $0.04279. Calls with unavailable cost: 0. This is grading cost only, not the cost of a complete interview.

### Design an AI chat assistant

Signal: **strong no**.

Summary: The diagram and discussion identify appropriate high-level components, but explanations remain mostly component names and default patterns. Capacity, inference behavior, failure handling and release decisions lack the concrete reasoning needed for a Senior-level design.

| Area | Score / 4 | Rationale |
| --- | --- | --- |
| Requirements and capacity estimation | 1 | Recognized the workload and token assumptions, but did not calculate token throughput or provisioned GPU capacity. The assertion that GPUs can scale does not establish that peak demand can be served. |
| Chat, context and history | 2 | Identified conversation storage, summarization and prompt caching, with storage separated from the chat service on the board. Context budgets, summarization triggers and per-user history access were not explained. |
| Inference and streaming | 2 | Selected SSE, continuous batching, KV caching and idempotency keys, but did not explain their operation or interactions. In particular, the reconnect claim does not establish how stream progress is recovered, and batching and KV-cache resource behavior remain unspecified. |
| Overload and reliability | 1 | Recognized queues, retries, autoscaling and replicas, but delegated GPU saturation and mid-answer node failure to unspecified defaults. No concrete admission, retry or in-flight recovery policy was established. |
| Tiers, cost and rollout | 2 | Recognized large/small model routing, tier limits, paid-user priority and canary rollout. Routing rules, limit enforcement, resource tradeoffs and rollout decisions were not developed beyond those labels. |
| Evaluation and quality | 1 | Proposed an LLM judge and A/B testing, but the shipping criterion remained that outputs look good. No defined evaluation criteria or actionable release and rollback gate supported that decision. |
| Safety and security | 2 | Acknowledged input moderation, output guardrails, authentication and permissions. The answer did not explain conversation ownership enforcement or how output checks interact with streamed tokens and first-token latency. |

Evidence:

- **Requirements and capacity estimation**: “I would use the stated 20M daily users and 15 messages each, three-times peak, 2,000 input tokens and 400 output tokens.” “We have GPUs and can scale them, so capacity should work.”
- **Chat, context and history**: “A chat service, conversation store, context builder, summarization and prompt caching are the right components.”
- **Inference and streaming**: “We will use continuous batching, a KV cache, SSE and idempotency keys.” “Those mechanisms should handle concurrency and reconnects.”
- **Overload and reliability**: “Queues, retries, autoscaling and replicas are standard reliability patterns.” “I would use their defaults to handle those cases.”
- **Tiers, cost and rollout**: “A large/small model router, tier limits, cost dashboards and canary rollout will handle cost and releases.” “Paid users can have higher priority.”
- **Evaluation and quality**: “I would use an LLM judge, A/B testing and a quality dashboard.” “If outputs look good we can ship.”
- **Safety and security**: “Input moderation, output guardrails, authentication and permissions should make the system safe.” “We will use standard middleware.”

Strengths:

- Identified relevant building blocks across context management, streaming inference and tier-aware routing, providing a useful starting architecture.

Gaps:

- GPU sufficiency was asserted without token-based capacity calculations, while saturation and node failure were delegated to defaults. This leaves peak latency and recovery unsupported; calculate token demand and GPU capacity, then specify bounded admission, how priority affects admission, and what happens to an interrupted generation.
- Summarization and idempotency were named without defining context bounds or stream-progress recovery. This leaves context growth and duplicate or lost output behavior unresolved; specify a context token budget and summarization trigger, then walk through disconnect recovery using persisted progress or an explicit restart policy.
- The proposed judge and moderation controls were not connected to an enforceable release or streaming-safety policy. Subjective shipping decisions can admit quality regressions, and unchecked partial output can reach users; define evaluation pass/fail criteria, rollback triggers, and when generated tokens are checked before emission.

Next practice: Calculate token-based peak GPU capacity, then trace free and paid requests through saturation and a mid-stream node failure. Specify admission, retry and stream-resume behavior rather than relying on component defaults.

This grading call estimate: $0.04715. Calls with unavailable cost: 0. This is grading cost only, not the cost of a complete interview.

### Design an AI agent with tools

Signal: **no**.

Summary: The answers and diagram identify relevant building blocks, but mostly stop at naming them. Requirements recognition was reasonable; execution correctness, safety enforcement, measurable quality, and task economics were not developed enough to support a positive senior-level assessment.

| Area | Score / 4 | Rationale |
| --- | --- | --- |
| Requirements and task budgets | 2 | Confirmed traffic, average and maximum steps, the latency target, and the seriousness of wrong emails. Mistake-handling requirements remained at “best practices” rather than concrete constraints. |
| Agent loop and tool contracts | 2 | Identified the main loop components and explicitly proposed loop detection and a step limit. Did not explain tool selection and schema validation, read/write contracts, or how stopping conditions are enforced. |
| Durable execution and recovery | 2 | Proposed checkpoints, retries, idempotency keys, and a durable task store. However, the answer did not explain persistence boundaries or how an ambiguous email timeout is reconciled before retrying. |
| Tool platform and observability | 2 | Named audit logs, tracing, and replay as debugging tools. Did not specify the recorded events, correlation identifiers, or replay behavior needed to reconstruct yesterday’s wrong action. |
| Latency and cost per task | 1 | Proposed monitoring, token budgets, and a cost dashboard, but did not provide the requested latency breakdown or per-task cost model. Those monitoring mechanisms alone do not establish that the task budget is feasible. |
| Evaluation and quality | 2 | Proposed mocked tools, an evaluation suite, and an LLM judge, but described acceptance as inspecting whether outputs look right. Concrete scenarios and measurable task-success or wrong-action release criteria were not specified. |
| Safety and security | 2 | Explicitly chose scoped delegated credentials and human approval. The response did not explain the exact action being approved, recipient-policy enforcement, or how retrieved instructions are prevented from authorizing writes. |

Evidence:

- **Requirements and task budgets**: “I would design for the stated 20,000 employees, 50K tasks a day, six steps on average, a 30-step cap and a 60-second target.” “Wrong emails are serious, so we should use best practices.”
- **Agent loop and tool contracts**: “A planner, agent runner, tool registry and tool executor form the loop.” “I would add loop detection and a step limit.”
- **Durable execution and recovery**: “Durable state, checkpoints, retries and idempotency keys are the standard solution.” “I would rely on those primitives to prevent duplication.”
- **Tool platform and observability**: “Audit logs, tracing and replay will let us debug the task.” “We should log useful events.”
- **Latency and cost per task**: “We will have latency monitoring, token budgets and a cost dashboard.” “Those should keep tasks fast and affordable.”
- **Evaluation and quality**: “I would use an LLM judge, mocked tools and an eval suite.” “We can inspect outputs and see whether they look right.”
- **Safety and security**: “Scoped tokens, delegated permissions, human approval and guardrails will protect writes.” “I would use the normal security defaults.”

Strengths:

- Established useful execution bounds by confirming a 30-step cap and proposing loop detection.
- Identified scoped delegated permissions and human approval as necessary controls for write actions.

Gaps:

- Approval and guardrails were named without an enforceable action contract, leaving protection against changed recipients or retrieved instructions unestablished. Define a policy gate that checks recipients, binds approval to the exact action payload, and rejects retrieved content as authorization to write.
- Idempotency keys and checkpoints were proposed, but the ambiguous-timeout case was not resolved: an email may have been sent even when the response is lost. Walk through persisted action states, stable retry keys, and reconciliation or escalation when the external outcome remains unknown.
- The evaluation proposal relies on outputs looking right, which can miss a plausible summary sent to the wrong person. Add mocked-tool scenarios with explicit assertions for recipients, approval enforcement, and duplicate sends, alongside task-success and unsafe-action metrics with pass/fail criteria.

Next practice: Trace one email task end to end: define tool contracts, exact-action approval, persisted send states, and ambiguous-timeout recovery. Then specify mocked-tool pass/fail tests and a per-task latency and token-cost budget.

This grading call estimate: $0.03710. Calls with unavailable cost: 0. This is grading cost only, not the cost of a complete interview.

## Files changed

- `CLAUDE.md`
- `docs/interviewer-keywords.md`
- `docs/problem-catalog.md`
- `docs/spec.md`
- `src/lib/clarification-continuation.ts`
- `src/lib/configured-clarifications.ts`
- `src/lib/diagram-label-copy.test.ts`
- `src/lib/diagram-label-copy.ts`
- `src/lib/discussion-reply.ts`
- `src/lib/fixtures/genai-engine-test.ts`
- `src/lib/genai-accepted-estimate.test.ts`
- `src/lib/genai-buzzwords.test.ts`
- `src/lib/genai-catalog.test.ts`
- `src/lib/genai-chat-assumptions.test.ts`
- `src/lib/genai-clarification-pace.test.ts`
- `src/lib/genai-clarification-pace.ts`
- `src/lib/genai-config.ts`
- `src/lib/genai-disclosed-facts.test.ts`
- `src/lib/genai-discussion-quotes.ts`
- `src/lib/genai-engine.test.ts`
- `src/lib/genai-estimate-detection.ts`
- `src/lib/genai-estimation.ts`
- `src/lib/genai-fact-paraphrases.test.ts`
- `src/lib/genai-fact-router.test.ts`
- `src/lib/genai-fact-router.ts`
- `src/lib/genai-facts.ts`
- `src/lib/genai-interviewer.ts`
- `src/lib/genai-probe-memory.test.ts`
- `src/lib/genai-probe-memory.ts`
- `src/lib/interview-grading.ts`
- `src/lib/interview-instructions.ts`
- `src/lib/interview-turn.ts`
- `src/lib/interviewer-state.ts`
- `src/lib/llm.ts`
- `src/lib/open-question-queue.ts`
- `src/lib/problems/ai-chat-assistant.json`
- `src/lib/problems/enterprise-rag-assistant.json`
- `src/lib/problems/tool-using-ai-agent.json`
- `src/lib/review-probes.ts`
- `tests/e2e/fixture-service.mjs`
- `tests/e2e/genai.spec.ts`
- `tests/fixtures/genai-buzzwords.json`
- `tests/fixtures/genai-fact-paraphrases.json`
- `tests/live/genai-buzzwords.live.ts`
- `tests/live/genai-corrected-estimate.live.ts`
- `tests/live/genai-discussion.live.ts`
- `tests/live/genai-evaluation.live.ts`
- `tests/live/genai-facts.live.ts`
- `tests/live/genai-pacing.live.ts`
- `docs/authentication.md` (beta callback checklist)
- `docs/reviews/genai-retest-2026-11-10.md` (this verification record and full synthetic scorecards)
