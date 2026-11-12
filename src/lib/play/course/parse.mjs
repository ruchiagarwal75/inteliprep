/** Strict compiler for the authored course Markdown. No prose is generated. */
export function parseCourseMarkdown(markdown) {
  return markdown
    .split(/^## Topic /mu)
    .slice(1)
    .map((block) => {
      const heading = /^(\d+): (.+)$/mu.exec(block);
      if (!heading) throw Error("Invalid topic heading");
      const slideSection = block
        .split("### Slides\n")[1]
        ?.split("### Questions\n")[0];
      const questionSection = block.split("### Questions\n")[1];
      if (!slideSection || !questionSection)
        throw Error("Missing course section");
      const slides = [
        ...slideSection.matchAll(/^\d+\. \*\*(.+?)\*\* (.+)$/gmu),
      ].map((m) => ({ title: m[1], lines: [m[2]] }));
      const questions = questionSection
        .split(/^(?=T\d-Q\d+[. ])/mu)
        .filter((s) => /^T\d-Q\d/u.test(s))
        .map((source) => {
          const first = /^(T\d-Q\d+)(?: (\(math\)))?\. (.+)$/mu.exec(source);
          if (!first) throw Error("Invalid question heading");
          const optionRows = [...source.matchAll(/^- (✓ )?(.+)$/gmu)];
          if (
            optionRows.length !== 4 ||
            optionRows.filter((m) => m[1]).length !== 1
          )
            throw Error("A question needs four options and one correct answer");
          const options = optionRows.map((m) => m[2]);
          const correctIndex = optionRows.findIndex((m) => m[1]);
          const title = /^Title: (.+)$/mu.exec(source)?.[1];
          if (!title) throw Error("Missing question title");
          const keyIdea = /^Key idea: (.+)$/mu.exec(source)?.[1];
          const why = /^Why: (.+)$/mu.exec(source)?.[1];
          if (!keyIdea || !why) throw Error("Missing teaching feedback");
          const ifWrong = {};
          for (const match of source.matchAll(/^If wrong \((.+)\): (.+)$/gmu)) {
            const matches = options
              .map((text, index) => ({
                text: text.replace(/^About /u, ""),
                index,
              }))
              .filter((option) => option.text === match[1]);
            if (matches.length !== 1 || matches[0].index === correctIndex)
              throw Error("Wrong-option feedback must match one wrong option");
            ifWrong[String(matches[0].index)] = match[2];
          }
          return {
            id: first[1],
            title,
            type: first[2]
              ? "math"
              : first[3].startsWith("Spot the flaw:")
                ? "flaw"
                : "concept",
            prompt: first[3],
            options,
            correctIndex,
            keyIdea,
            why,
            ifWrong,
          };
        });
      return {
        level: Number(heading[1]),
        title: heading[2],
        slides,
        questions,
      };
    });
}
