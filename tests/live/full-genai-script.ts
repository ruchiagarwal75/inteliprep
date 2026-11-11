import type { ChatMessage } from "@/lib/chat";
export type AdaptiveTurn = {
  minute: number;
  stage: number;
  step: string;
  message: ChatMessage;
  reply: string;
  modelCalls: number;
  image: boolean;
  topic?: string;
};
export type FullScriptRow = {
  minute: number;
  task?: string;
  action?: ChatMessage["action"];
  content?: string;
  diagram?: boolean;
  image?: boolean;
};
/** Only timing and UI controls are scripted. Every candidate answer is generated from the actual conversation. */
export function fullInterviewScript(): FullScriptRow[] {
  return [
    ...[0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5].map((minute) => ({
      minute,
      task: "Ask one or two related clarification questions about raw requirements still unknown. Use the answers already given, do not repeat a question or ask for a design solution. Prioritize constraints that matter to this particular public brief. If the remaining unknowns are your design choices, state your assumptions and readiness to draw instead of inventing another requirement question.",
    })),
    {
      minute: 7.5,
      task: "State your working assumptions and estimate the important capacity dimensions from the supplied raw facts. Show your own arithmetic and units. For an agent, keep math brief and focus on safety and recovery complexity.",
    },
    {
      minute: 8,
      action: "draw",
      content: "Start drawing",
      diagram: true,
      task: "Draw your proposed end-to-end architecture using full node labels and directed edges. Include the components you actually intend to use. In message, briefly state your plan.",
    },
    { minute: 9, action: "explain", content: "Ready to explain" },
    {
      minute: 10,
      task: "Walk through the main request path in your current drawing. Explain each critical decision and stored state concretely. Save deeper operational and rollout topics for the discussion.",
    },
    {
      minute: 11,
      task: "Finish the core walkthrough with the important data boundaries, correctness rules and one justified tradeoff. Use your drawing and previous explanation. Do not repeat the whole walkthrough.",
    },
    { minute: 12, action: "review", content: "Done explaining", image: true },
    ...[13, 14.5, 16, 17.5, 19, 20.5, 22, 23.5, 25, 26.5, 28, 29.5].map(
      (minute) => ({
        minute,
        task: "Answer the actual latest interviewer question directly. If it challenges a previous answer, address the precise gap instead of repeating that answer.",
      }),
    ),
    {
      minute: 30,
      action: "draw",
      content: "Pause to draw",
      diagram: true,
      task: "Revise your drawing based on the discussion. Make one useful concrete change of your own choice. Return the full revised diagram, preserving components still in use. Explain only what changed in message.",
    },
    { minute: 31, action: "explain", content: "Ready to explain" },
    {
      minute: 32,
      task: "Describe only what changed in your latest drawing and why. Do not restart the full walkthrough.",
    },
    { minute: 33, action: "review", content: "Done explaining", image: true },
    ...[34, 35.5, 37, 38.5, 40, 41.5, 43, 44.5].map((minute) => ({
      minute,
      task: "Answer the actual latest interviewer question, including its specific scenario. If asked for a final tradeoff or recap, give it concisely with your concrete rationale.",
    })),
  ];
}
