import type { ChatTurnRequest } from "@/lib/chat-turn";
import type { ProblemDefinition } from "@/lib/problems";
import { getCachedSession } from "@/lib/interview-session-store";
import { prepareTranscriptTurn } from "@/lib/interview-transcript";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import { retryInterviewerReply } from "@/lib/interviewer-retry";
import { streamInterviewerReply } from "@/lib/llm";
import { sceneToGraph } from "@/lib/scene-graph";
import { graphToText } from "@/lib/scene-to-text";
import { diffSceneGraphs } from "@/lib/scene-diff";

/** Use the same prepare, stream, transcript and stage commit order as /api/chat. */
export async function fullGenaiTurn(
  problem: ProblemDefinition,
  payload: ChatTurnRequest,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const conversation = prepareTranscriptTurn(payload);
    const request = conversation.request;
    if (!request) throw new Error("Unexpected benchmark replay");
    const controller = new AbortController();
    const turn = await prepareInterviewTurn(
      problem,
      request,
      controller.signal,
    );
    try {
      let reply = "";
      for await (const part of retryInterviewerReply(
        (signal) =>
          streamInterviewerReply(
            request.messages,
            graphToText(sceneToGraph(request.scene)),
            diffSceneGraphs(
              sceneToGraph(request.scene),
              request.previousScene
                ? sceneToGraph(request.previousScene)
                : undefined,
            ),
            signal,
            request.diagramImage,
            turn.context,
          ),
        controller.signal,
      ))
        reply += part;
      conversation.commit(reply, Boolean(turn.context.listening));
      turn.commit(reply);
      const checkpoint = turn.checkpoint?.();
      if (!checkpoint) throw new Error("Missing benchmark checkpoint");
      const stage = getCachedSession(payload.sessionId)?.phaseIndex;
      if (stage === undefined) throw new Error("Missing benchmark stage");
      return {
        reply,
        checkpoint,
        stage,
        step: turn.context.progress.step,
        topic: turn.context.selectedTopic,
      };
    } catch (cause) {
      if (attempt) throw cause;
    } finally {
      turn.release();
    }
  }
  throw new Error("Benchmark turn did not complete");
}
