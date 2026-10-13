import { createInterviewStart, getProblem } from "@/lib/problems";
import { newSavedInterview } from "@/lib/saved-interview";
import { whiteboardFixture } from "@/lib/fixtures/whiteboard-test";

export function savedFixture() {
  const problem = getProblem("single-server-scaling");
  if (!problem) throw new Error("Missing fixture problem");
  return newSavedInterview(
    createInterviewStart(problem, "mid"),
    whiteboardFixture(),
  );
}
