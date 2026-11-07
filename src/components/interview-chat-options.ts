import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { InterviewStart } from "@/lib/interview-selection";
import type { InterviewPhase } from "@/lib/interview-phase";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewRecoveryFailure } from "@/lib/interview-recovery";
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
  recoveryFailure?: InterviewRecoveryFailure;
  onRecoveryFailure?: (failure: InterviewRecoveryFailure) => void;
  onSyncRequired?: () => void;
  onAssistantMessage?: () => void;
};

export type ChatPanelProps = InterviewChatOptions & {
  endControlTarget?: HTMLElement | null;
  brief?: string;
  onAssistantMessage?: () => void;
  hasDrawing: boolean;
  phase?: InterviewPhase;
  hasEnded: boolean;
  onEndChange: (ended: boolean) => void;
  onEndConfirmed: (ended: boolean) => void;
  disabled: boolean;
  timeExpired: boolean;
  remainingSeconds?: number;
  leaveAction?: "new" | "problem";
  onCancelLeave: () => void;
  onConfirmLeave: () => void;
  onCloseWithoutScoring: (
    messages: ChatMessage[],
    draft: string,
  ) => Promise<boolean>;
  storageConflict?: boolean;
  onLoadLatest?: (messages: ChatMessage[], draft: string) => Promise<boolean>;
};
