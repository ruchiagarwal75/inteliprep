import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
export type ReportingContext = {
  requestId: string;
  route: string;
  userId?: string;
  interviewId?: string;
  isTest?: boolean;
  failureReferenceId?: string;
};
const context = new AsyncLocalStorage<ReportingContext>();
export const reportingContext = () => context.getStore();
export const withReportingContext = <T>(
  value: ReportingContext,
  work: () => T,
) => context.run(value, work);
export function setReportingUser(userId?: string) {
  const current = context.getStore();
  if (current) current.userId = userId;
}
export function setInterviewReference(interviewId: string, isTest?: boolean) {
  const current = context.getStore();
  if (current)
    Object.assign(current, {
      interviewId,
      ...(isTest === undefined ? {} : { isTest }),
    });
}
