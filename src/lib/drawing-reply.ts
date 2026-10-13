/** Keep acknowledgements and factual answers while the candidate has the floor. */
export function withoutQuestions(reply: string): string {
  return reply
    .split(/(?<=[.!?？])\s+/u)
    .filter((sentence) => {
      const text = sentence.trim();
      return (
        !/[?？]["'”’)\]]*$/u.test(text) &&
        !/^(?:please )?(?:tell me|walk me through|explain (?:how|why|your)|describe (?:how|your)|what\b|how\b|why\b|can you\b|could you\b)/iu.test(
          text,
        )
      );
    })
    .join(" ")
    .trim();
}

export const DRAWING_WAIT_REPLY =
  "Take your time with the whiteboard. I'll hold questions while you draw. Choose Explain my design when you're ready.";

export const EXPLANATION_WAIT_REPLY =
  "Go ahead with your explanation. I'll listen across as many messages as you need. Choose Done explaining when you're ready for questions.";
