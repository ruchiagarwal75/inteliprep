import { expect, it, vi } from "vitest";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { gradeWrittenAnswer } from "./written-grader";
import { probeFixture } from "./fixtures/drills";
import {
  startPlayPostgres,
  PLAY_TEST_USER,
} from "../../../tests/fixtures/play-postgres";
import { reserveAiGrade } from "./ai-usage";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
it("rejects guests before a written grade or its AI quota reservation", async () => {
  if (probeFixture.type !== "pick_probe") throw Error("Wrong fixture");
  vi.mocked(requireCandidateIdentity).mockRejectedValue(
    new CandidateAuthError(),
  );
  await expect(
    gradeWrittenAnswer(probeFixture, {
      type: "pick_probe",
      text: "How do you stop stale permissions from exposing documents after revocation?",
    }),
  ).rejects.toMatchObject({ status: 401 });
  expect(model).not.toHaveBeenCalled();
  const db = await startPlayPostgres();
  try {
    await expect(
      db.runtime.begin((sql) => reserveAiGrade(sql, PLAY_TEST_USER)),
    ).rejects.toMatchObject({ status: 401 });
    const [row] =
      await db.operator`select count(*)::int as n from practice_game.daily_ai_usage`;
    expect(row.n).toBe(0);
  } finally {
    await db.close();
  }
});
