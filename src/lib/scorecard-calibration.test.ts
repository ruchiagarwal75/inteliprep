import { describe, expect, it } from "vitest";
import {
  calibrateBottleneckScore,
  withSessionContext,
} from "@/lib/scorecard-calibration";
import {
  scorecardFixture,
  endedAtFixture,
} from "@/lib/fixtures/scorecard-test";
import { createInterviewTiming } from "@/lib/interview-timer";

describe("score calibration", () => {
  it("requires 20 minutes and two answered stages for scores in a one-hour interview", () => {
    const card = scorecardFixture();
    const at = (elapsed: number, stages: number) =>
      withSessionContext(
        card,
        createInterviewTiming(60, Date.parse(endedAtFixture) - elapsed * 1000),
        stages,
      );
    expect(at(1199, 2).session).toMatchObject({
      allowedSeconds: 3600,
      limited: true,
    });
    expect(at(1200, 1).session?.limited).toBe(true);
    const assessed = at(1200, 2);
    expect(assessed.session?.limited).toBe(false);
    expect(assessed.areas).toEqual(card.areas);
  });
  it("caps bottleneck credit for echoed goals, while retaining concrete diagnostic evidence", () => {
    const card = scorecardFixture();
    expect(calibrateBottleneckScore(card).areas[1].score).toBe(3);
    card.areas[1].evidence = [
      {
        kind: "message",
        messageIndex: 1,
        quote: "We need 1,000 requests per second at under 500 ms.",
      },
    ];
    const result = calibrateBottleneckScore(card);
    expect(result.areas[1].score).toBe(2);
    expect(result.signal).toBe("insufficient_evidence");
    expect(card.areas[1].score).toBe(3);
  });
  it("does not infer diagnosis from a drawn component or component name alone", () => {
    for (const evidence of [
      [{ kind: "diagram" as const, elementId: "api" }],
      [
        {
          kind: "message" as const,
          messageIndex: 1,
          quote: "I use CPU and a database.",
        },
      ],
    ]) {
      const card = scorecardFixture();
      card.areas[1].evidence = evidence;
      expect(calibrateBottleneckScore(card).areas[1].score).toBe(2);
    }
  });
  it("hides scores for a four-minute attempt while keeping quoted feedback", () => {
    const card = scorecardFixture();
    const timing = createInterviewTiming(
      45,
      Date.parse(endedAtFixture) - 4 * 60_000,
    );
    const result = withSessionContext(card, timing);
    expect(result.signal).toBe("insufficient_evidence");
    expect(result.session).toMatchObject({
      elapsedSeconds: 240,
      allowedSeconds: 2700,
      limited: true,
    });
    expect(result.areas.every((area) => area.score === null)).toBe(true);
    expect(result.areas[0].evidence).toEqual(card.areas[0].evidence);
  });
  it("keeps full attempts and legacy cards, while treating test mode as provisional", () => {
    const card = scorecardFixture();
    expect(withSessionContext(card)).toEqual(card);
    expect(
      withSessionContext(
        card,
        createInterviewTiming(45, Date.parse(endedAtFixture) - 40 * 60_000),
      ).signal,
    ).toBe("yes");
    expect(
      withSessionContext(
        card,
        createInterviewTiming(1, Date.parse(endedAtFixture) - 120_000),
        1,
      ).session,
    ).toMatchObject({ elapsedSeconds: 60, limited: true });
    expect(
      withSessionContext(
        card,
        createInterviewTiming(45, Date.parse(endedAtFixture) + 60_000),
      ).session?.elapsedSeconds,
    ).toBe(0);
  });
});
