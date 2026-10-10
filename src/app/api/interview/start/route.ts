import { interviewSelectionSchema } from "@/lib/interview-selection";
import { createInterviewStart, getProblem } from "@/lib/problems";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const parsed = interviewSelectionSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid interview selection",
      },
      { status: 400 },
    );
  const problem = getProblem(parsed.data.problemId);
  if (!problem)
    return Response.json(
      { error: "Unknown interview problem" },
      { status: 404 },
    );
  return Response.json(createInterviewStart(problem, parsed.data.level), {
    headers: { "Cache-Control": "no-store" },
  });
}
