"use client";
import { InterviewDialog } from "@/components/interview-dialog";
import { PracticeFeedbackForm } from "@/components/practice-feedback-form";
export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  return (
    <InterviewDialog open title="Send feedback" onClose={onClose}>
      <PracticeFeedbackForm onComplete={onClose} />
    </InterviewDialog>
  );
}
