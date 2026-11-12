import { expect, it } from "vitest";
import { choiceShortcut } from "./keyboard-play";
const key = (value: string) => ({
  key: value,
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
});
it("maps only 1 to 4 and Enter, respecting busy, modifiers and held keys", () => {
  for (const value of ["1", "2", "3", "4"])
    expect(choiceShortcut(key(value), false)).toBe(Number(value) - 1);
  expect(choiceShortcut(key("Enter"), false)).toBe("submit");
  for (const value of ["0", "5", "a", " "])
    expect(choiceShortcut(key(value), false)).toBeUndefined();
  expect(choiceShortcut(key("1"), true)).toBeUndefined();
  for (const modifier of ["repeat", "ctrlKey", "metaKey", "altKey"] as const)
    expect(
      choiceShortcut({ ...key("Enter"), [modifier]: true }, false),
    ).toBeUndefined();
});
