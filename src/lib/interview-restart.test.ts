import { describe, expect, it, vi } from "vitest";
import {
  finishBeforeSwitch,
  nextInterviewSelection,
} from "@/lib/interview-restart";

describe("starting another interview safely", () => {
  it.each([1, 45])(
    "starts a regular 45-minute interview after a %i-minute session while keeping its problem and difficulty",
    (durationMinutes) => {
      const current = {
        problemId: "url-shortener",
        level: "senior" as const,
        durationMinutes,
      };
      expect(nextInterviewSelection(current)).toEqual({
        problemId: "url-shortener",
        level: "senior",
        durationMinutes: 45,
      });
      expect(current.durationMinutes).toBe(durationMinutes);
    },
  );
  it("does not replace the interview before its ended state and scorecard finish saving", async () => {
    let finish: (value: boolean) => void = () => {};
    const ended = new Promise<boolean>((resolve) => {
      finish = resolve;
    });
    const switchInterview = vi.fn();
    const pending = finishBeforeSwitch(() => ended, switchInterview);
    expect(switchInterview).not.toHaveBeenCalled();
    finish(true);
    expect(await pending).toBe(true);
    expect(switchInterview).toHaveBeenCalledOnce();
  });
  it("keeps the current interview when ending could not be confirmed", async () => {
    const switchInterview = vi.fn();
    expect(await finishBeforeSwitch(async () => false, switchInterview)).toBe(
      false,
    );
    expect(switchInterview).not.toHaveBeenCalled();
  });
});
