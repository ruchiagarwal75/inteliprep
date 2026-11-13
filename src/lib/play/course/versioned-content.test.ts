import {
  readFileSync,
  mkdtempSync,
  cpSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { z } from "zod";
import { courseQuestionSchema, courseTopicSchema } from "./definition";
import { parseVersionedQuestions, parseVersionedTopic } from "./parse-v2.mjs";
import { ragCourse } from "./content";
import { courseContentWarnings } from "./content-warnings.mjs";
const files = [
  {
    level: 1,
    name: "topic-1-questions-v2.md",
    slideCount: 13,
    questionCount: 7,
  },
  { level: 2, name: "topic-2-v2.md", slideCount: 13, questionCount: 10 },
  { level: 3, name: "topic-3-v2.md", slideCount: 12, questionCount: 10 },
  ...[4, 5, 6].map((level) => ({
    level,
    name: `topic-${level}-v1.md`,
    slideCount: 12,
    questionCount: 10,
  })),
];
it.each(files)(
  "compiles every authored question field in $name with complete feedback and bounded references",
  (config) => {
    const source = readFileSync(
      `docs/play-content/rag-course/${config.name}`,
      "utf8",
    );
    const topic = ragCourse.find((t) => t.level === config.level);
    if (!topic) throw Error("Missing course topic");
    const questions = z
      .array(courseQuestionSchema)
      .parse(parseVersionedQuestions(source, config));
    expect(questions).toEqual(topic.questions);
    expect(questions.map((q) => q.id)).toEqual(
      Array.from(
        { length: config.questionCount },
        (_, i) => `T${config.level}-Q${i + 1}`,
      ),
    );
    for (const q of questions) {
      expect(Object.keys(q.ifWrong)).toHaveLength(3);
      expect(q.slide).toBeGreaterThan(0);
      expect(q.slide).toBeLessThanOrEqual(topic.slides.length);
    }
    if (config.level > 1) {
      const parsed = courseTopicSchema.parse(
        parseVersionedTopic(source, config),
      );
      expect(parsed.slides).toHaveLength(config.slideCount);
      expect(
        parsed.slides.map((s) => ({ title: s.title, body: s.body })),
      ).toEqual(topic.slides.map((s) => ({ title: s.title, body: s.body })));
    }
  },
);
it("has exactly the supplied length-cue counts and no warnings for Topics 1 to 6", () => {
  const topics = ragCourse.filter((t) => t.level > 0);
  expect(
    topics.map(
      (t) =>
        t.questions.filter((q) =>
          q.options.every(
            (o, i) =>
              i === q.correctIndex ||
              q.options[q.correctIndex].length > o.length,
          ),
        ).length,
    ),
  ).toEqual([1, 0, 2, 1, 1, 1]);
  expect(courseContentWarnings(topics)).toEqual([]);
});
it("rejects malformed fields, option count, correct marks, duplicate or missing feedback, IDs and references", () => {
  const source = readFileSync(
      "docs/play-content/rag-course/topic-1-questions-v2.md",
      "utf8",
    ),
    config = files[0];
  for (const changed of [
    source.replace("Slide: S6\n", ""),
    source.replace("Slide: S6", "Slide: S0"),
    source.replace("Slide: S6", "Slide: S14"),
    source.replace("T1-Q2 ·", "T1-Q1 ·"),
    source.replace(
      "- Vector databases reject chunks over a few hundred tokens",
      "- ✓ Vector databases reject chunks over a few hundred tokens",
    ),
    source.replace(/^- Vector databases.+\n/mu, ""),
    source.replace(/^Key idea: .+\n/mu, ""),
    source.replace(/^Why: .+\n/mu, ""),
    source.replace(/^If wrong .+\n/mu, ""),
    source.replace(
      "If wrong (Bigger chunks need more embedding dimensions to fit)",
      "If wrong (Vector databases reject chunks over a few hundred tokens)",
    ),
  ])
    expect(() => parseVersionedQuestions(changed, config)).toThrow();
});
it("checks the build artifact against the strict authoring compiler", () => {
  expect(
    execFileSync(
      process.execPath,
      ["scripts/build-rag-course.mjs", "--check"],
      { encoding: "utf8" },
    ),
  ).toContain("matches the authored sources");
});

it("fails build verification for a stale compiled artifact or malformed authored input", () => {
  const dir = mkdtempSync(join(tmpdir(), "mockmeai-course-"));
  try {
    cpSync(
      "docs/play-content/rag-course",
      join(dir, "docs/play-content/rag-course"),
      { recursive: true },
    );
    mkdirSync(join(dir, "src/lib/play/course"), { recursive: true });
    const altered = structuredClone(ragCourse);
    altered[1].questions[0].prompt += " stale";
    writeFileSync(
      join(dir, "src/lib/play/course/rag.json"),
      JSON.stringify(altered),
    );
    const run = () =>
      spawnSync(
        process.execPath,
        [resolve("scripts/build-rag-course.mjs"), "--check"],
        { cwd: dir, encoding: "utf8" },
      );
    const stale = run();
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain("Course content changed");
    const input = join(
      dir,
      "docs/play-content/rag-course/topic-1-questions-v2.md",
    );
    writeFileSync(
      input,
      readFileSync(input, "utf8").replace("Slide: S6", "Slide: S0"),
    );
    const malformed = run();
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toContain("reference is out of range");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
