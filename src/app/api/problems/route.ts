import { listProblems } from "@/lib/problems";

export function GET(): Response {
  return Response.json({ problems: listProblems() });
}
