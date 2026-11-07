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

it("keeps pacing controls out of chat bubbles without changing their stored content", () => {
  const messages = [
    { role: "assistant" as const, content: "Full configured problem brief." },
    {
      role: "user" as const,
      content: "I'd like time to draw.",
      source: "control" as const,
      action: "draw" as const,
    },
    {
      role: "assistant" as const,
      content:
        "Take your time with the whiteboard. I'll hold questions while you draw. Choose Ready to explain when you're ready.",
    },
    { role: "user" as const, content: "The cache serves reads." },
  ];
  const before = JSON.stringify(messages);
  const html = renderToStaticMarkup(
    createElement(ChatTranscript, {
      logRef: createRef<HTMLDivElement>(),
      messages,
      imageWarning: null,
      openingMessage: messages[0].content,
    }),
  );
  expect(html).toContain("Let&#x27;s start with requirements");
  expect(html).toContain("The cache serves reads.");
  expect(html).toContain("MockMeAI interviewer");
  expect(html).not.toContain("Full configured problem brief");
  expect(html).not.toContain("Started explaining");
  expect(html).not.toContain("Choose Ready to explain");
  expect(JSON.stringify(messages)).toBe(before);
});
