import { ChatPanel } from "@/components/chat-panel";
import { WhiteboardPlaceholder } from "@/components/whiteboard-placeholder";

export const metadata = { title: "Interview" };

export default function InterviewPage() {
  return (
    <main className="flex h-dvh flex-col gap-3 p-3 lg:flex-row">
      {/* Spec: whiteboard takes about 65% of the width, chat the rest. */}
      <div className="min-h-64 flex-1 lg:basis-[65%]">
        <WhiteboardPlaceholder />
      </div>
      <div className="flex min-h-0 flex-1 lg:basis-[35%]">
        <ChatPanel />
      </div>
    </main>
  );
}
