import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CourseDiagram } from "@/components/play/course-diagram";
import type { CourseDiagramKind } from "./slide-diagrams";
const kinds: CourseDiagramKind[] = [
  "vector-angle",
  "bi-encoder",
  "hnsw-layers",
  "ivf-clusters",
  "filter-timing",
  "hybrid-merge",
  "rrf-ranks",
  "multi-query",
  "retrieval-funnel",
];
it.each(kinds)(
  "provides two original SVG layouts and text alternatives for %s",
  (kind) => {
    const html = renderToStaticMarkup(createElement(CourseDiagram, { kind }));
    expect(html.match(/<svg /gu)).toHaveLength(2);
    expect(html).toContain('data-diagram-layout="landscape"');
    expect(html).toContain('data-diagram-layout="portrait"');
    const titles = [...html.matchAll(/<title>(.+?)<\/title>/gu)].map(
      (m) => m[1],
    );
    expect(titles).toHaveLength(2);
    expect(titles.every((title) => title.length > 10)).toBe(true);
    expect(html).toMatch(/aria-label="[^"]{30,}"/u);
    expect(html).not.toMatch(
      /<image|<img|<foreignObject|https?:|<rect\b[^>]*\brx=|fill="#/u,
    );
  },
);
