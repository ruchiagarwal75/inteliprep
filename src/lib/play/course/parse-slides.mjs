/** Compile the authored lesson subset: paragraphs, bullet/numbered lists and bold text. */
export function parseSlideBody(markdown) {
  const blocks = [];
  let paragraph = [],
    items = [],
    kind;
  function flush() {
    if (paragraph.length)
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    if (items.length) blocks.push({ kind, items });
    paragraph = [];
    items = [];
    kind = undefined;
  }
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("Diagram:")) {
      flush();
      continue;
    }
    const bullet = /^- (.+)$/u.exec(line),
      numbered = /^\d+\. (.+)$/u.exec(line);
    const match = bullet ?? numbered;
    if (match) {
      const next = bullet ? "bullets" : "numbered";
      if (paragraph.length || (kind && kind !== next)) flush();
      kind = next;
      items.push(match[1]);
    } else {
      if (items.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  if (!blocks.length) throw Error("A slide needs teaching content");
  return blocks;
}

export function parseCourseSlidesMarkdown(markdown, diagrams = {}) {
  const headings = [...markdown.matchAll(/^## S(\d+)\. (.+)$/gmu)];
  if (!headings.length) throw Error("Missing numbered slides");
  return headings.map((heading, index) => {
    if (Number(heading[1]) !== index + 1)
      throw Error("Slides must be numbered in order");
    const source = markdown.slice(
      heading.index + heading[0].length,
      headings[index + 1]?.index ?? markdown.length,
    );
    const markers = [...source.matchAll(/^#### Deep dive: (.+)$/gmu)];
    if (markers.length > 1) throw Error("A slide has at most one deep dive");
    const marker = markers[0];
    return {
      title: heading[2].replace(/\.$/u, ""),
      body: parseSlideBody(marker ? source.slice(0, marker.index) : source),
      ...(diagrams[index + 1] ? { diagram: diagrams[index + 1] } : {}),
      ...(marker
        ? {
            deepDive: parseDeepDive(
              marker[1],
              source.slice(marker.index + marker[0].length),
            ),
          }
        : {}),
    };
  });
}

function parseDeepDive(title, source) {
  const references = [],
    lines = [];
  let diagram;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("Read more:")) {
      const link = /^Read more: \[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/u.exec(
        line,
      );
      if (!link) throw Error("Deep dive references need a title and HTTPS URL");
      references.push({ title: link[1], url: link[2] });
    } else if (line.startsWith("Diagram:")) {
      if (diagram) throw Error("A deep dive has at most one diagram");
      diagram = line.slice("Diagram:".length).trim();
      if (!diagram) throw Error("A deep dive diagram needs a kind");
    } else lines.push(raw);
  }
  if (references.length > 3)
    throw Error("A deep dive has at most three references");
  return {
    title,
    body: parseSlideBody(lines.join("\n")),
    ...(diagram ? { diagram } : {}),
    ...(references.length ? { references } : {}),
  };
}
