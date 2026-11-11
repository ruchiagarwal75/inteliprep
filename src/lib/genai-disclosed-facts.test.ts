import { expect, it } from "vitest";
import { genaiEngineFixture } from "@/lib/fixtures/genai-engine-test";
import { disclosedGenaiFacts } from "@/lib/genai-facts";
it("keeps facts disclosed when labels are quoted or text is wrapped", () => {
  const problem = genaiEngineFixture();
  expect(
    disclosedGenaiFacts(problem, "senior", [
      {
        role: "assistant",
        content: 'There are 20,000 "employees".\n\nTHERE ARE 5M\n documents.',
      },
    ]).map((f) => f.id),
  ).toEqual(["mmq7-employees", "mmq7-docs"]);
  expect(
    disclosedGenaiFacts(problem, "senior", [
      { role: "assistant", content: "There are 2,000 employees." },
    ]),
  ).toEqual([]);
});
