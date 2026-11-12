import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("is silent by default and only synthesizes original square waves when enabled", async () => {
  let on = false;
  const tones: { type: string; frequency: { value: number } }[] = [];
  const create = vi.fn(() => ({
    type: "",
    frequency: { value: 0 },
    connect() {},
    disconnect() {},
    start() {},
    stop() {},
    onended: null,
  }));
  class TestAudio {
    state = "running";
    currentTime = 0;
    destination = {};
    resume() {
      return Promise.resolve();
    }
    createOscillator() {
      const tone = create();
      tones.push(tone);
      return tone;
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  vi.stubGlobal("localStorage", { getItem: () => (on ? "true" : null) });
  const ctor = vi.fn(function () {
    return new TestAudio();
  });
  vi.stubGlobal("AudioContext", ctor);
  const { prepareGameSounds, playGameSound } = await import("./game-sounds");
  prepareGameSounds();
  playGameSound("correct");
  expect(ctor).not.toHaveBeenCalled();
  on = true;
  prepareGameSounds();
  for (const kind of ["correct", "wrong", "levelup", "chest"] as const)
    playGameSound(kind);
  expect(ctor).toHaveBeenCalledTimes(1);
  expect(tones).toHaveLength(11);
  expect(tones.every((t) => t.type === "square" && t.frequency.value > 0)).toBe(
    true,
  );
});
