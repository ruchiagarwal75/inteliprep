export function choiceShortcut(
  event: {
    key: string;
    repeat: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
  },
  blocked: boolean,
) {
  if (blocked || event.repeat || event.ctrlKey || event.metaKey || event.altKey)
    return;
  if (/^[1-4]$/u.test(event.key)) return Number(event.key) - 1;
  if (event.key === "Enter") return "submit";
}
