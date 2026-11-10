/** Keep acknowledgements and factual answers while the candidate has the floor. */
export function withoutQuestions(reply: string): string {
  return reply
    .split(/(?<=[.!?？])\s+/u)
    .filter((sentence) => {
      const text = sentence.trim();
      return (
        !/[?？]["'”’)\]]*$/u.test(text) &&
        !/^(?:please )?(?:tell me|walk me through|redo\b|recalculate\b|explain (?:how|why|your)|describe (?:how|your)|what\b|how\b|why\b|can you\b|could you\b)/iu.test(
          text,
        )
      );
    })
    .join(" ")
    .trim();
}

export const DRAWING_WAIT_REPLY =
  "Take your time with the whiteboard. I'll hold questions while you draw. Choose Ready to explain when you're ready.";

export const EXPLANATION_WAIT_REPLY =
  "Write your explanation across as many messages as you need. Choose Done explaining when you're ready for questions.";

export const EXPLANATION_UPDATE_REPLY =
  "Your earlier explanation is saved. Describe just what changed, or choose Done explaining to continue.";
