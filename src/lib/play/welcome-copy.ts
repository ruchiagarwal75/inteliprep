/** Introduce the learning journey before its interview challenge. */
export const WELCOME_PANELS = [
  {
    title: "WELCOME, ENGINEER",
    beats: [
      {
        speaker: "SHARDLING",
        line: "Hi! I'm a Shardling. I'll be your companion.",
      },
      {
        speaker: "SHARDLING",
        line: "Let's get you ready for AI system design interviews.",
      },
    ],
  },
  {
    title: "YOUR FIRST WORLD",
    beats: [
      { speaker: "SHARDLING", line: "Our first world is RAG." },
      {
        speaker: "SHARDLING",
        line: "Here, AI finds facts in documents before it answers.",
      },
      {
        speaker: "GUIDE",
        line: "I'll help you learn, then try each idea yourself.",
      },
      { speaker: "GUIDE", line: "Clear topics to earn XP, stars and chests." },
    ],
  },
  {
    title: "MEET THE INTERVIEWER",
    beats: [
      {
        speaker: "SHARDLING",
        line: "After training, you'll meet the Interviewer.",
      },
      {
        speaker: "SHARDLING",
        line: "The boss challenge is a mock system design interview.",
      },
      {
        speaker: "THE INTERVIEWER",
        line: "Show me what you'd build, and why.",
      },
    ],
  },
  {
    title: "YOUR QUEST BEGINS",
    beats: [
      {
        speaker: "SHARDLING",
        line: "First, let's help AI find the right facts.",
      },
      {
        speaker: "SHARDLING",
        line: "Topic 0 starts with the basics. Let's go!",
      },
    ],
  },
] as const;
