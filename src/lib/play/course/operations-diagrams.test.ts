import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CourseDiagram } from "@/components/play/course-diagram";
import styles from "@/components/play/course-diagram.module.css";
import { courseTopic } from "./content";
import { COURSE_DIAGRAMS, type CourseDiagramKind } from "./slide-diagrams";
const diagrams: ReadonlyArray<[number, number, CourseDiagramKind]> = [
  [7, 1, "evaluation-layers"],
  [7, 4, "reciprocal-rank"],
  [7, 6, "judge-agreement"],
  [7, 7, "regression-gates"],
  [8, 2, "serving-paths"],
  [8, 3, "index-lag"],
  [8, 5, "sharded-index"],
  [8, 9, "degradation-steps"],
  [9, 1, "failure-buckets"],
  [9, 3, "injection-paths"],
  [9, 4, "safety-gates"],
  [9, 11, "safe-rollout"],
];
const html = (kind: CourseDiagramKind) =>
  renderToStaticMarkup(createElement(CourseDiagram, { kind }));
it.each(diagrams)(
  "maps Topic %s slide %s to accessible responsive %s vector art",
  (level, number, kind) => {
    expect(courseTopic(level)?.slides[number - 1].diagram).toBe(kind);
    const art = html(kind);
    expect(art.match(/<svg /gu)).toHaveLength(2);
    expect(art).toContain('data-diagram-layout="landscape"');
    expect(art).toContain('data-diagram-layout="portrait"');
    expect(art.match(/<title>[^<]{20,}<\/title>/gu)).toHaveLength(2);
    expect(art).toMatch(/aria-label="[^"]{30,}"/u);
    expect(art).not.toMatch(
      /<image|<img|<foreignObject|https?:|<rect\b[^>]*\brx=|#[\da-fA-F]{3,8}\b|gradient/iu,
    );
  },
);
it("preserves the authored metric, serving and safety meanings", () => {
  expect(html("evaluation-layers")).toContain("recall@k, MRR");
  expect(html("reciprocal-rank")).toContain("1 / 2 = 0.5");
  expect(html("judge-agreement")).toContain("90%");
  expect(html("regression-gates")).toContain("95% to 91%");
  expect(html("regression-gates")).toContain(styles.badBar);
  expect(html("serving-paths")).toContain("Streamed answer");
  expect(html("index-lag")).toContain("Index lag: target 5 min");
  expect(html("sharded-index").match(/>Shard [1-4]</gu)).toHaveLength(8);
  expect(html("sharded-index")).toContain("Merge top k");
  expect(html("degradation-steps")).toContain("Links only");
  expect(html("failure-buckets")).toContain(styles.error);
  expect(html("injection-paths")).toContain("Indirect: harder to see");
  expect(html("safety-gates")).toContain("Permission filter");
  expect(html("safe-rollout")).toContain("100%");
  expect(html("safe-rollout")).toContain(styles.error);
});
it("uses green only in the existing Topic 6 citation and faithfulness diagrams", () => {
  for (const kind of COURSE_DIAGRAMS)
    expect(html(kind).includes(styles.good)).toBe(
      ["citation-check", "faithfulness-check"].includes(kind),
    );
});
