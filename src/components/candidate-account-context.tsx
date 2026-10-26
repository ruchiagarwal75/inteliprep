"use client";

import { createContext, useContext } from "react";
import type { InterviewStorage } from "@/lib/interview-storage";

export type CandidateAccount = {
  userId: string;
  storage: InterviewStorage;
  request: typeof fetch;
  signOut: () => Promise<void>;
};
export const CandidateAccountContext = createContext<
  CandidateAccount | undefined
>(undefined);

export function useCandidateAccount() {
  const account = useContext(CandidateAccountContext);
  if (!account) throw new Error("A signed-in account is required.");
  return account;
}
