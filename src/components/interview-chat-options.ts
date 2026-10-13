import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { InterviewStart } from "@/lib/interview-selection";
import type { InterviewPhase } from "@/lib/interview-phase";
import type {
  SavedInterview,
  InterviewSaveUpdate,
} from "@/lib/saved-interview";

export type InterviewChatOptions = {
  getScene: () => WhiteboardScene;
  interview?: InterviewStart;
  onBusyChange: (busy: boolean) => void;
  onPhaseChange: (phase: InterviewPhase) => void;
  disabled?: boolean;
  restored?: SavedInterview;
  onSave: (update: InterviewSaveUpdate) => Promise<void>;
  getResumeToken: () => string | undefined;
  canSubmit: () => boolean;
};
