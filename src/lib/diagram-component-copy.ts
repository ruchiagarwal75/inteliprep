export function diagramComponentCopy(label: string) {
  const name = label.replace(/\s+/gu, " ").trim().slice(0, 100);
  if (/^unlabeled\b/iu.test(name)) {
    const shape = name
      .replace(/^unlabeled\s*/iu, "")
      .replace(/rectangle/iu, "box");
    return `an unlabeled ${shape || "component"}`;
  }
  return `a component labeled "${name}"`;
}

export function diagramComponentList(labels: string[]) {
  return new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(labels.map(diagramComponentCopy));
}
