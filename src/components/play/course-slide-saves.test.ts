import { expect, it } from "vitest";
import { CourseSlideSaves } from "./course-slide-saves";

it("saves every visited slide in order while navigation gets ahead of the network", async () => {
  const calls: number[] = [];
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const saves = new CourseSlideSaves(-1, async (index) => {
    calls.push(index);
    if (index === 0) await pending;
  });
  const first = saves.visit(0);
  saves.visit(1);
  saves.visit(2);
  saves.visit(3);
  saves.visit(4);
  expect(calls).toEqual([0]);
  release();
  await first;
  await saves.flush();
  expect(calls).toEqual([0, 1, 2, 3, 4]);
  await saves.visit(2);
  await saves.visit(4);
  expect(calls).toEqual([0, 1, 2, 3, 4]);
});

it("retries from the failed checkpoint and keeps the quiz gate waiting for the last save", async () => {
  const calls: number[] = [];
  let failing = true;
  const saves = new CourseSlideSaves(1, async (index) => {
    calls.push(index);
    if (failing) throw Error("Offline");
  });
  await expect(saves.visit(4)).rejects.toThrow("Offline");
  expect(calls).toEqual([2]);
  failing = false;
  await saves.flush();
  expect(calls).toEqual([2, 2, 3, 4]);
});
