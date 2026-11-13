/** Final introduction copy. One idea per dialogue box keeps phone text readable. */
export const WELCOME_PANELS = [
  {
    title: "WELCOME, ENGINEER",
    beats: [
      {
        speaker: "SHARDLING",
        line: "Hi! I'm a Shardling, a tiny piece of big AI systems.",
      },
      { speaker: "SHARDLING", line: "Welcome to our world!" },
    ],
  },
  {
    title: "A BOSS AWAITS",
    beats: [
      { speaker: "THE INTERVIEWER", line: "So... you think you know RAG?" },
      { speaker: "SHARDLING", line: "Every world ends with a boss." },
      { speaker: "SHARDLING", line: "The boss is a real mock interview." },
    ],
  },
  {
    title: "TRAIN FOR THE FIGHT",
    beats: [
      {
        speaker: "SHARDLING",
        line: "Train by clearing topics. My friend will guide you.",
      },
      { speaker: "SHARDLING", line: "Earn XP, stars and chests on the way!" },
    ],
  },
  {
    title: "YOUR QUEST BEGINS",
    beats: [
      {
        speaker: "SHARDLING",
        line: "First stop: RAG basics.",
      },
      { speaker: "SHARDLING", line: "The RAG boss is waiting. Let's go!" },
    ],
  },
] as const;
