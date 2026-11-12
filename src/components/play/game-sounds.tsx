"use client";
import { useSyncExternalStore } from "react";
const key = "mockmeai:game-sounds",
  changed = "mockmeai:game-sounds-changed";
let memory = false;
let audio: AudioContext | undefined;
function enabled() {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? memory : stored === "true";
  } catch {
    return memory;
  }
}
function subscribe(update: () => void) {
  window.addEventListener(changed, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(changed, update);
    window.removeEventListener("storage", update);
  };
}
export function GameSoundToggle() {
  const on = useSyncExternalStore(subscribe, enabled, () => false);
  return (
    <button
      type="button"
      className="mascot-switch"
      role="switch"
      aria-checked={on}
      aria-label="Game sounds"
      onClick={() => {
        memory = !on;
        try {
          localStorage.setItem(key, String(!on));
        } catch {
          /* Session preference remains usable. */
        }
        window.dispatchEvent(new Event(changed));
      }}
    >
      <span>Game sounds</span>
      <span className="mascot-switch-track" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
export function prepareGameSounds() {
  if (!enabled()) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
  } catch {
    /* Sound is optional. */
  }
}
/** Original synthesized tones. No recordings, audio uploads or copied melodies. */
export function playGameSound(
  kind: "correct" | "wrong" | "complete" | "levelup" | "chest",
) {
  if (!enabled() || !audio || audio.state !== "running") return;
  const frequencies =
    kind === "correct"
      ? [660, 880]
      : kind === "wrong"
        ? [240, 190]
        : kind === "chest"
          ? [587, 784, 988]
          : kind === "levelup"
            ? [494, 740, 988, 1175]
            : [523, 659, 880];
  try {
    frequencies.forEach((frequency, i) => {
      if (!audio) return;
      const oscillator = audio.createOscillator(),
        gain = audio.createGain(),
        start = audio.currentTime + i * 0.09;
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.015, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.13);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    /* Playback failure never blocks a round. */
  }
}
