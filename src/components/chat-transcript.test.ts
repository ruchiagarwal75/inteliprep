import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ChatTranscript } from "@/components/chat-transcript";
it("shows old interviewer formatting as plain text while retaining the original user text", () => {
  const html = renderToStaticMarkup(
    createElement(ChatTranscript, {
      logRef: createRef<HTMLDivElement>(),
      imageWarning: null,
      messages: [
        {
          role: "assistant",
          content:
            "**Idempotency and Notification Jobs:**\nWhat is your retry policy?",
        },
        { role: "user", content: "Use 3*4 workers." },
      ],
    }),
  );
  expect(html).toContain("Idempotency and Notification Jobs:");
  expect(html).not.toContain("**Idempotency");
  expect(html).toContain("Use 3*4 workers.");
});
