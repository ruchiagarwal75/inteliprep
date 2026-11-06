import { expect, it } from "vitest";
import { candidateEchoRemover } from "@/lib/candidate-echo";
import { interviewerReplyFilter } from "@/lib/interviewer-reply-filter";

const answer =
  "Two servers racing at the last slot is safe because Redis owns the key.";
it.each(['"', "“"])("removes a leading candidate quotation (%s)", (quote) => {
  const close = quote === "“" ? "”" : quote;
  expect(
    candidateEchoRemover([answer])(
      `${quote}${answer}${close} How would you test a provider outage?`,
    ),
  ).toBe("How would you test a provider outage?");
});
it("removes unquoted and inline long echoes without removing a real question", () => {
  const remove = candidateEchoRemover([answer]);
  expect(remove(answer + " How would you test this under load?")).toBe(
    "How would you test this under load?",
  );
  expect(remove(`You said: "${answer}" What if the owner fails?`)).toBe(
    "What if the owner fails?",
  );
  expect(remove(`For "${answer}", what if the owner fails?`)).not.toContain(
    answer,
  );
});
it("preserves short technical names and quoted diagram labels", () => {
  const remove = candidateEchoRemover([answer]);
  expect(remove('"Redis" owns this key. What happens after a timeout?')).toBe(
    '"Redis" owns this key. What happens after a timeout?',
  );
  expect(remove('How does "API 2" reach "DB"?')).toBe(
    'How does "API 2" reach "DB"?',
  );
});
it.each([1, 5, 500])(
  "does not leak multi-sentence quoted echoes across %i-character chunks",
  (size) => {
    const candidate = answer + " Each update is atomic on the owner.";
    const source = `"${candidate}" How do you test failover?`;
    const filter = interviewerReplyFilter([
      { role: "user", content: candidate },
    ]);
    let text = "";
    for (let i = 0; i < source.length; i += size)
      text += filter.push(source.slice(i, i + size));
    text += filter.finish();
    expect(text).toBe("How do you test failover?");
  },
);
