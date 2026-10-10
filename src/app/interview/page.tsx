import { InterviewWorkspace } from "@/components/interview-workspace";
import { listProblems } from "@/lib/problems";

export const metadata = { title: "Interview" };

export default function InterviewPage() {
  return <InterviewWorkspace problems={listProblems()} />;
}
