/** Warn about a guessable length cue without changing authored answers. */
export function courseContentWarnings(topics) {
  return topics.flatMap((topic) => {
    const longest = topic.questions.filter(({ options, correctIndex }) =>
      options.every(
        (option, index) =>
          index === correctIndex ||
          options[correctIndex].length > option.length,
      ),
    ).length;
    return longest > topic.questions.length / 2
      ? [
          `Topic ${topic.level}: the correct option is longest in ${longest} of ${topic.questions.length} questions.`,
        ]
      : [];
  });
}
