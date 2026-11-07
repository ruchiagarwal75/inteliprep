import {
  savedInterviewSchema,
  savedInterviewSummary,
  type SavedInterview,
} from "@/lib/saved-interview";
import { ZodError } from "zod";
import { compareInterviewRecency } from "@/lib/latest-interview";
import { readInterviewRecords } from "@/lib/interview-retention";

import { createInterviewDatabase } from "@/lib/interview-database";

const SESSIONS = "interviews";
const META = "meta";

export class InterviewStorageConflict extends Error {
  constructor(
    message = "This interview changed in another tab. Reopen it from Saved interviews before continuing.",
  ) {
    super(message);
  }
}

/** Each immutable storage instance belongs to one verified account. */
export function createInterviewStorage(userId: string) {
  const { transaction, deactivate } = createInterviewDatabase(userId);
  /** Resolves after transaction commit, not merely after the put request succeeds. */
  function saveInterview(saved: SavedInterview, expectedRevision?: string) {
    return transaction<void>("readwrite", (tx, done, fail) => {
      readInterviewRecords(
        tx,
        (_rows, markers) => {
          const store = tx.objectStore(SESSIONS);
          const request = store.get(saved.id);
          const deleted = tx.objectStore(META).get(`deleted:${saved.id}`);
          deleted.onsuccess = () => {
            try {
              if (deleted.result === true)
                throw new InterviewStorageConflict(
                  "This interview was deleted in another tab.",
                );
              const next = savedInterviewSchema.parse(saved);
              const marker = markers.get(next.interview.problemId);
              if (marker?.id === next.id && marker.deleted)
                throw new InterviewStorageConflict(
                  "This interview was deleted in another tab.",
                );
              const current = savedInterviewSchema.safeParse(request.result);
              if (
                expectedRevision &&
                (!current.success || current.data.revision !== expectedRevision)
              ) {
                fail(new InterviewStorageConflict());
                return;
              }
              store.put(next);

              tx.objectStore(META).put(saved.id, "active");
              done(undefined);
            } catch (cause) {
              fail(
                cause instanceof ZodError
                  ? new Error(
                      "This interview couldn't be saved in this browser. Check the message length and try saving again.",
                    )
                  : cause instanceof Error
                    ? cause
                    : new Error("Browser save failed"),
              );
            }
          };
        },
        fail,
      );
    });
  }

  function readInterview(id: string) {
    return transaction<SavedInterview | undefined>(
      "readonly",
      (tx, done, fail) => {
        readInterviewRecords(
          tx,
          () => {
            const request = tx.objectStore(SESSIONS).get(id);
            request.onsuccess = () => {
              if (request.result === undefined) {
                done(undefined);
                return;
              }
              const parsed = savedInterviewSchema.safeParse(request.result);
              if (!parsed.success) {
                fail(
                  new Error(
                    "This saved interview couldn't be read. Its browser copy has been retained.",
                  ),
                );
                return;
              }
              done(parsed.data);
            };
          },
          fail,
        );
      },
    );
  }

  function listInterviews() {
    return transaction<ReturnType<typeof savedInterviewSummary>[]>(
      "readonly",
      (tx, done, fail) => {
        readInterviewRecords(
          tx,
          (rows) =>
            done(
              rows
                .map(savedInterviewSummary)
                .sort((a, b) => compareInterviewRecency(a, b)),
            ),
          fail,
        );
      },
    );
  }

  function activeInterviewId() {
    return transaction<string | undefined>("readonly", (tx, done, fail) => {
      readInterviewRecords(
        tx,
        () => {
          const request = tx.objectStore(META).get("active");
          request.onsuccess = () =>
            done(
              typeof request.result === "string" ? request.result : undefined,
            );
        },
        fail,
      );
    });
  }

  function selectInterview(id?: string) {
    return transaction<void>("readwrite", (tx, done) => {
      if (id) tx.objectStore(META).put(id, "active");
      else tx.objectStore(META).delete("active");
      done(undefined);
    });
  }

  function deleteInterview(id: string) {
    return transaction<void>("readwrite", (tx, done, fail) => {
      readInterviewRecords(
        tx,
        () => {
          tx.objectStore(META).put(true, `deleted:${id}`);
          tx.objectStore(SESSIONS).delete(id);
          const request = tx.objectStore(META).get("active");
          request.onsuccess = () => {
            if (request.result === id) tx.objectStore(META).delete("active");
            done(undefined);
          };
        },
        fail,
      );
    });
  }

  return {
    saveInterview,
    readInterview,
    listInterviews,
    activeInterviewId,
    selectInterview,
    deleteInterview,
    deactivate,
  };
}
export type InterviewStorage = ReturnType<typeof createInterviewStorage>;
