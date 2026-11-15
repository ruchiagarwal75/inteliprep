"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCandidateAccount } from "./candidate-account-context";
import { mockTrialsSchema, type MockTrial } from "@/lib/mock-trial-public";
import { MockTrialViews } from "./mock-trial-views";

type TrialActions = {
  trials: MockTrial[];
  update: (problemId?: string) => Promise<void>;
};
const Context = createContext<TrialActions | undefined>(undefined);
export function useMockTrials() {
  const value = useContext(Context);
  if (!value) throw new Error("Mock requests require their provider");
  return value;
}
export function MockTrialsProvider({
  initial,
  children,
}: {
  initial: MockTrial[];
  children: ReactNode;
}) {
  const { userId } = useCandidateAccount();
  // Reset on account changes and on fresh server navigation after a trial is used.
  return (
    <MockTrialsState
      key={`${userId}:${JSON.stringify(initial)}`}
      initial={initial}
    >
      {children}
    </MockTrialsState>
  );
}
function MockTrialsState({
  initial,
  children,
}: {
  initial: MockTrial[];
  children: ReactNode;
}) {
  const [trials, setTrials] = useState(initial);
  const { request } = useCandidateAccount();
  const scope = useRef<HTMLDivElement>(null);
  async function update(problemId?: string) {
    const response = await request(
      "/api/mock/requests",
      problemId
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problemId }),
          }
        : { cache: "no-store" },
    );
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Please wait a moment before trying again."
          : "Could not check mock access. Please retry.",
      );
    setTrials(mockTrialsSchema.parse(await response.json()));
  }
  return (
    <Context.Provider value={{ trials, update }}>
      <div ref={scope}>
        <MockTrialViews scope={scope} />
        {children}
      </div>
    </Context.Provider>
  );
}
